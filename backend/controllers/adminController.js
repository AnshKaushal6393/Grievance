import Complaint from "../models/Complaint.js";
import Department from "../models/Department.js";
import User from "../models/User.js";
import AdminSetting from "../models/AdminSetting.js";
import Notification from "../models/Notification.js";
import AdminReport from "../models/AdminReport.js";
import { createStatusNotification } from "../utils/notification.js";
import { sendWelcomeEmail } from "../utils/sendOTP.js";
import { publishUserManagementEvent, subscribeUserManagement } from "../utils/realtime.js";
import { invalidateRuntimeSettingsCache } from "../utils/runtimeSettings.js";
import { randomBytes } from "crypto";

const ADMIN_SETTINGS_KEY = "global";

const csvEscape = (value) => {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
};

const generateSystemKey = () => `grv_key_${randomBytes(24).toString("hex")}`;


// @desc    Get all complaints (Admin)
// @route   GET /api/admin/complaints
// @access  Private/Admin
export async function getAllComplaints(req, res) {
  try {
    const {
      search,
      status,
      category,
      department,
      priority,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortDir = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const query = { isDraft: false };

    if (search) {
      query.$or = [
        { complaintId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (status && status !== 'all') query.status = status;
    if (category && category !== 'all') query.category = category;
    if (priority && priority !== 'all') query.priority = priority;
    if (department && department !== 'all') query.department = department;
    if (fromDate) query.createdAt = { $gte: new Date(fromDate) };
    if (toDate) query.createdAt = { ...query.createdAt, $lte: new Date(toDate) };

    const sortableFieldMap = {
      complaintId: "complaintId",
      title: "title",
      category: "category",
      status: "status",
      priority: "priority",
      filedDate: "createdAt",
      createdAt: "createdAt",
      lastUpdated: "updatedAt",
      updatedAt: "updatedAt",
    };
    const mappedSortField = sortableFieldMap[sortBy] || "createdAt";
    const sort = { [mappedSortField]: sortDir === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const complaints = await Complaint.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .populate('user', 'name email phone')
      .populate('department', 'name code')
      .populate('assignedOfficer', 'name email');

    const total = await Complaint.countDocuments(query);

    // Summary stats
    const stats = await Complaint.aggregate([
      { $match: { isDraft: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const summary = { total: 0, pending: 0, assigned: 0, 'in-progress': 0, resolved: 0, rejected: 0 };
    stats.forEach(s => { summary[s._id] = s.count; summary.total += s.count; });

    res.status(200).json({
      success: true,
      data: {
        complaints,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) },
        summary
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Assign complaint to department/officer
// @route   PUT /api/admin/complaints/:id/assign
// @access  Private/Admin
export async function assignComplaint(req, res) {
  try {
    const { departmentId, officerId, priority, estimatedDays } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (!departmentId && !officerId) {
      return res.status(400).json({
        success: false,
        message: "Provide at least departmentId or officerId",
      });
    }

    if (priority) complaint.priority = priority;

    let effectiveDepartmentId = departmentId || complaint.department;
    if (departmentId) complaint.department = departmentId;

    if (officerId) {
      const officerDepartment = await Department.findOne({
        officers: officerId,
        isActive: true,
      }).select("_id");
      if (!officerDepartment) {
        return res.status(400).json({
          success: false,
          message: "Officer is not mapped to any active department",
        });
      }
      if (
        departmentId &&
        String(officerDepartment._id) !== String(departmentId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Selected officer does not belong to selected department",
        });
      }
      if (!departmentId) {
        complaint.department = officerDepartment._id;
        effectiveDepartmentId = officerDepartment._id;
      }
    } else if (!effectiveDepartmentId) {
      return res.status(400).json({
        success: false,
        message: "Department is required when officerId is not provided",
      });
    }

    let statusForNotification = "pending";
    let citizenMessage = "Your complaint has been routed to the department queue.";
    let responseMessage = "Complaint routed successfully";

    if (officerId) {
      complaint.assignedOfficer = officerId;
      complaint.assignedDate = new Date();
      complaint.recordStatusChange(
        "assigned",
        req.user.id,
        "Complaint assigned by admin",
        "admin",
      );
      complaint.updates.push({
        message: "Complaint assigned to officer",
        updatedBy: req.user.id,
      });
      complaint.timeline.unshift({
        status: "assigned",
        message: "Complaint assigned by admin",
        updatedBy: req.user.id,
        updatedAt: new Date(),
      });
      statusForNotification = "assigned";
      citizenMessage = "Your complaint has been assigned to an officer.";
      responseMessage = "Complaint assigned successfully";
    } else {
      complaint.assignedOfficer = null;
      complaint.assignedDate = null;
      complaint.recordStatusChange(
        "pending",
        req.user.id,
        "Complaint routed by admin to department queue",
        "admin",
      );
      complaint.updates.push({
        message: "Complaint routed to department queue",
        updatedBy: req.user.id,
      });
      complaint.timeline.unshift({
        status: "pending",
        message: "Complaint routed by admin to department queue",
        updatedBy: req.user.id,
        updatedAt: new Date(),
      });
    }
    let estimatedResolution = null;
    if (
      estimatedDays !== undefined &&
      estimatedDays !== null &&
      !Number.isNaN(Number(estimatedDays)) &&
      Number(estimatedDays) > 0
    ) {
      estimatedResolution = new Date();
      estimatedResolution.setDate(
        estimatedResolution.getDate() + Number(estimatedDays),
      );
    } else if (effectiveDepartmentId) {
      const departmentForSla = await Department.findById(effectiveDepartmentId)
        .select("slaTargets")
        .lean();
      const slaHours =
        departmentForSla?.slaTargets?.[complaint.priority] || 72;
      estimatedResolution = new Date(Date.now() + slaHours * 60 * 60 * 1000);
    }
    complaint.estimatedResolution = estimatedResolution;

    await complaint.save();
    await createStatusNotification({
      userId: complaint.user,
      complaint,
      status: statusForNotification,
      message: citizenMessage,
      source: "admin",
      metadata: { departmentId: effectiveDepartmentId, officerId },
    });
    await complaint.populate('department', 'name');
    await complaint.populate('assignedOfficer', 'name email');

    res.status(200).json({ success: true, message: responseMessage, data: { complaint } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Update complaint status (Admin)
// @route   PUT /api/admin/complaints/:id/status
// @access  Private/Admin
export async function updateComplaintStatus(req, res) {
  try {
    const { status, message, rejectionReason } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (String(complaint.status || "").toLowerCase() === "resolved") {
      return res.status(400).json({
        success: false,
        message: "Resolved complaints cannot be updated",
      });
    }

    const normalizedStatus = status === "in_progress" ? "in-progress" : status;

    complaint.recordStatusChange(
      normalizedStatus,
      req.user.id,
      message || `Status updated to ${normalizedStatus}`,
      "admin",
    );
    if (normalizedStatus === 'resolved') complaint.resolvedDate = new Date();
    if (normalizedStatus === 'rejected' && rejectionReason) complaint.rejectionReason = rejectionReason;

    if (message) {
      complaint.updates.push({ message, updatedBy: req.user.id });
    }
    complaint.timeline.unshift({
      status: normalizedStatus,
      message: message || `Status updated to ${normalizedStatus}`,
      updatedBy: req.user.id,
      updatedAt: new Date(),
    });

    await complaint.save();
    await createStatusNotification({
      userId: complaint.user,
      complaint,
      status: normalizedStatus,
      message: message || `Complaint status updated to ${normalizedStatus}`,
      source: "admin",
    });
    res.status(200).json({ success: true, message: 'Status updated successfully', data: { complaint } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Escalate complaint priority and add escalation note
// @route   PUT /api/admin/complaints/:id/escalate
// @access  Private/Admin
export async function escalateComplaint(req, res) {
  try {
    const { reason = "Escalated by admin", priority = "high" } = req.body;
    const safePriority = ["low", "medium", "high", "critical"].includes(String(priority))
      ? String(priority)
      : "high";

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }
    if (["resolved", "rejected"].includes(String(complaint.status || "").toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Resolved or rejected complaints cannot be escalated",
      });
    }

    complaint.priority = safePriority;
    complaint.updates.push({
      message: reason,
      updatedBy: req.user.id,
    });
    complaint.timeline.unshift({
      status: complaint.status,
      message: reason,
      updatedBy: req.user.id,
      updatedAt: new Date(),
      metadata: {
        escalated: true,
        escalatedPriority: safePriority,
      },
    });

    await complaint.save();
    await createStatusNotification({
      userId: complaint.user,
      complaint,
      status: complaint.status,
      message: `Your complaint was escalated with priority ${safePriority}.`,
      source: "admin",
    });

    res.status(200).json({
      success: true,
      message: "Complaint escalated successfully",
      data: { complaint },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Delete complaint
// @route   DELETE /api/admin/complaints/:id
// @access  Private/Admin
export async function deleteComplaint(req, res) {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    await Notification.deleteMany({
      $or: [{ complaint: complaint._id }, { complaintId: complaint.complaintId }],
    });
    await complaint.deleteOne();

    res.status(200).json({
      success: true,
      message: "Complaint deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Bulk assign complaints
// @route   PUT /api/admin/complaints/bulk-assign
// @access  Private/Admin
export async function bulkAssign(req, res) {
  try {
    const { complaintIds, departmentId, officerId } = req.body;
    if (!Array.isArray(complaintIds) || complaintIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "complaintIds is required",
      });
    }
    if (!departmentId && !officerId) {
      return res.status(400).json({
        success: false,
        message: "Provide at least departmentId or officerId",
      });
    }

    let effectiveDepartmentId = departmentId || null;
    if (officerId) {
      const officerDepartment = await Department.findOne({
        officers: officerId,
        isActive: true,
      }).select("_id");
      if (!officerDepartment) {
        return res.status(400).json({
          success: false,
          message: "Officer is not mapped to any active department",
        });
      }
      if (
        departmentId &&
        String(officerDepartment._id) !== String(departmentId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Selected officer does not belong to selected department",
        });
      }
      if (!departmentId) effectiveDepartmentId = officerDepartment._id;
    }

    const complaints = await Complaint.find({ _id: { $in: complaintIds } });
    for (const complaint of complaints) {
      if (effectiveDepartmentId) {
        complaint.department = effectiveDepartmentId;
      }
      if (officerId) {
        complaint.assignedOfficer = officerId;
        complaint.assignedDate = new Date();
        complaint.recordStatusChange(
          "assigned",
          req.user.id,
          "Complaint assigned in bulk by admin",
          "admin",
        );
        complaint.timeline.unshift({
          status: "assigned",
          message: "Complaint assigned in bulk by admin",
          updatedBy: req.user.id,
          updatedAt: new Date(),
        });
      } else {
        complaint.assignedOfficer = null;
        complaint.assignedDate = null;
        complaint.recordStatusChange(
          "pending",
          req.user.id,
          "Complaint routed in bulk to department queue",
          "admin",
        );
        complaint.timeline.unshift({
          status: "pending",
          message: "Complaint routed in bulk to department queue",
          updatedBy: req.user.id,
          updatedAt: new Date(),
        });
      }
      await complaint.save();
      await createStatusNotification({
        userId: complaint.user,
        complaint,
        status: officerId ? "assigned" : "pending",
        message: officerId
          ? "Your complaint was assigned by admin."
          : "Your complaint was routed by admin to the department queue.",
        source: "admin",
      });
    }

    res.status(200).json({
      success: true,
      message: officerId
        ? `${complaintIds.length} complaints assigned successfully`
        : `${complaintIds.length} complaints routed successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
export async function getDashboardStats(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalComplaints, todayComplaints, statusBreakdown, categoryBreakdown, trendData, deptPerformance, recentActivity] = await Promise.all([
      Complaint.countDocuments({ isDraft: false }),
      Complaint.countDocuments({ createdAt: { $gte: today }, isDraft: false }),
      Complaint.aggregate([
        { $match: { isDraft: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Complaint.aggregate([
        { $match: { isDraft: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      // Last 30 days trend
      Complaint.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            isDraft: false
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            filed: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Department performance
      Department.aggregate([
        {
          $lookup: {
            from: 'complaints',
            localField: '_id',
            foreignField: 'department',
            as: 'complaints'
          }
        },
        {
          $project: {
            name: 1,
            code: 1,
            total: {
              $size: {
                $filter: {
                  input: '$complaints',
                  as: 'c',
                  cond: { $eq: ['$$c.isDraft', false] },
                },
              },
            },
            pending: {
              $size: {
                $filter: {
                  input: '$complaints',
                  as: 'c',
                  cond: {
                    $and: [
                      { $eq: ['$$c.isDraft', false] },
                      { $in: ['$$c.status', ['filed', 'assigned', 'pending', 'in-progress', 'in_progress']] },
                    ],
                  },
                },
              }
            },
            resolved: {
              $size: {
                $filter: {
                  input: '$complaints',
                  as: 'c',
                  cond: {
                    $and: [
                      { $eq: ['$$c.isDraft', false] },
                      { $eq: ['$$c.status', 'resolved'] },
                    ],
                  },
                },
              }
            },
            avgResolutionHours: {
              $avg: {
                $map: {
                  input: {
                    $filter: {
                      input: '$complaints',
                      as: 'c',
                      cond: {
                        $and: [
                          { $eq: ['$$c.isDraft', false] },
                          { $eq: ['$$c.status', 'resolved'] },
                          { $ne: ['$$c.createdAt', null] },
                        ],
                      },
                    },
                  },
                  as: 'rc',
                  in: {
                    $divide: [
                      {
                        $subtract: [
                          { $ifNull: ['$$rc.resolvedDate', '$$rc.updatedAt'] },
                          '$$rc.createdAt',
                        ],
                      },
                      1000 * 60 * 60,
                    ],
                  },
                },
              },
            },
          }
        }
      ]),
      // Recent activity (last 8)
      Complaint.find({ isDraft: false })
        .sort({ updatedAt: -1 })
        .limit(8)
        .select('complaintId title status updatedAt')
        .populate('user', 'name')
    ]);

    // Build status summary
    const pending = statusBreakdown.find(s => s._id === 'filed')?.count || 0;
    const inProgress = statusBreakdown.find(s => s._id === 'in-progress')?.count || 0;
    const resolved = statusBreakdown.find(s => s._id === 'resolved')?.count || 0;
    const resolutionRate = totalComplaints > 0 ? ((resolved / totalComplaints) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalComplaints,
          todayComplaints,
          pendingReview: pending + inProgress,
          resolutionRate: `${resolutionRate}%`
        },
        statusBreakdown,
        categoryBreakdown,
        trendData,
        deptPerformance,
        recentActivity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Export dashboard trend data as CSV
// @route   GET /api/admin/dashboard/export/trend.csv
// @access  Private/Admin
export async function exportDashboardTrendCsv(req, res) {
  try {
    const trendData = await Complaint.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          isDraft: false,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          filed: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const rows = [
      ["Date", "Filed", "Resolved"],
      ...trendData.map((item) => [item._id, item.filed ?? 0, item.resolved ?? 0]),
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="dashboard-trend-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Export dashboard category data as CSV
// @route   GET /api/admin/dashboard/export/category.csv
// @access  Private/Admin
export async function exportDashboardCategoryCsv(req, res) {
  try {
    const categoryData = await Complaint.aggregate([
      { $match: { isDraft: false } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const rows = [
      ["Category", "Count"],
      ...categoryData.map((item) => [item._id || "Unknown", item.count ?? 0]),
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="dashboard-category-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Get analytics data
// @route   GET /api/admin/analytics
// @access  Private/Admin
export async function getAnalytics(req, res) {
  try {
    const { range = '30days', fromDate, toDate } = req.query;

    let startDate = new Date();
    switch (range) {
      case 'today': startDate.setHours(0, 0, 0, 0); break;
      case '7days': startDate.setDate(startDate.getDate() - 7); break;
      case '30days': startDate.setDate(startDate.getDate() - 30); break;
      case '90days': startDate.setDate(startDate.getDate() - 90); break;
      case 'custom':
        if (fromDate) startDate = new Date(fromDate);
        break;
    }

    const endDate = range === 'custom' && toDate ? new Date(toDate) : new Date();
    const matchQuery = { createdAt: { $gte: startDate, $lte: endDate }, isDraft: false };
    const windowMs = Math.max(endDate.getTime() - startDate.getTime(), 24 * 60 * 60 * 1000);
    const prevStart = new Date(startDate.getTime() - windowMs);
    const prevEnd = new Date(startDate.getTime() - 1);

    const [totalFiled, totalResolved, previousFiled, avgResolutionAgg, slaAgg, categoryBreakdown, statusDist, trendData, categoryTrendData, deptPerf, topCoords, categoryHotspots] = await Promise.all([
      Complaint.countDocuments(matchQuery),
      Complaint.countDocuments({ ...matchQuery, status: 'resolved' }),
      Complaint.countDocuments({ createdAt: { $gte: prevStart, $lte: prevEnd }, isDraft: false }),
      Complaint.aggregate([
        {
          $match: {
            ...matchQuery,
            status: 'resolved',
            resolvedDate: { $ne: null }
          }
        },
        {
          $project: {
            resolutionDays: {
              $divide: [{ $subtract: ['$resolvedDate', '$createdAt'] }, 1000 * 60 * 60 * 24]
            }
          }
        },
        { $group: { _id: null, avgDays: { $avg: '$resolutionDays' } } }
      ]),
      Complaint.aggregate([
        {
          $match: {
            ...matchQuery,
            status: 'resolved',
            resolvedDate: { $ne: null },
            estimatedResolution: { $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            withinSla: {
              $sum: {
                $cond: [{ $lte: ['$resolvedDate', '$estimatedResolution'] }, 1, 0]
              }
            }
          }
        }
      ]),
      Complaint.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$category",
            total: { $sum: 1 },
            pending: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      ["filed", "assigned", "in-progress", "in_progress"],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            resolvedCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "resolved"] },
                      { $ne: ["$resolvedDate", null] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            resolvedDurationDays: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "resolved"] },
                      { $ne: ["$resolvedDate", null] },
                    ],
                  },
                  {
                    $divide: [
                      { $subtract: ["$resolvedDate", "$createdAt"] },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            name: "$_id",
            value: "$total",
            total: "$total",
            pending: 1,
            avgTime: {
              $cond: [
                { $gt: ["$resolvedCount", 0] },
                {
                  $concat: [
                    {
                      $toString: {
                        $round: [
                          {
                            $divide: [
                              "$resolvedDurationDays",
                              "$resolvedCount",
                            ],
                          },
                          1,
                        ],
                      },
                    },
                    " days",
                  ],
                },
                "N/A",
              ],
            },
          },
        },
        { $sort: { value: -1 } }
      ]),
        Complaint.aggregate([
          { $match: matchQuery },
          { $group: { _id: '$status', value: { $sum: 1 } } },
          {
            $project: {
              name: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$_id', 'filed'] }, then: 'Pending' },
                    { case: { $eq: ['$_id', 'assigned'] }, then: 'Pending' },
                    { case: { $in: ['$_id', ['in-progress', 'in_progress']] }, then: 'In Progress' },
                    { case: { $eq: ['$_id', 'resolved'] }, then: 'Resolved' },
                    { case: { $eq: ['$_id', 'rejected'] }, then: 'Rejected' }
                  ],
                  default: 'Other'
                }
              },
              value: 1,
              _id: 0
            }
          },
          { $group: { _id: '$name', value: { $sum: '$value' } } },
          { $project: { _id: 0, name: '$_id', value: 1 } }
        ]),
      Complaint.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            filed: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $in: ['$status', ['filed', 'assigned', 'in-progress', 'in_progress']] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { name: '$_id', filed: 1, resolved: 1, pending: 1, _id: 0 } }
      ]),
      Complaint.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              category: "$category",
            },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id.date",
            category: "$_id.category",
            count: 1,
          },
        },
        { $sort: { date: 1 } },
      ]),
      Department.aggregate([
        {
          $lookup: {
            from: 'complaints',
            let: { departmentId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$department', '$$departmentId'] },
                  createdAt: { $gte: startDate, $lte: endDate },
                  isDraft: false
                }
              }
            ],
            as: 'complaints'
          }
        },
        {
          $project: {
            name: 1,
            total: { $size: '$complaints' },
            pending: {
              $size: {
                $filter: { input: '$complaints', as: 'c', cond: { $in: ['$$c.status', ['filed', 'assigned', 'in-progress', 'in_progress']] } }
              }
            },
            resolved: {
              $size: {
                $filter: { input: '$complaints', as: 'c', cond: { $eq: ['$$c.status', 'resolved'] } }
              }
            },
            avgTime: {
              $let: {
                vars: {
                  resolvedComplaints: {
                    $filter: {
                      input: '$complaints',
                      as: 'c',
                      cond: {
                        $and: [
                          { $eq: ['$$c.status', 'resolved'] },
                          { $ne: ['$$c.resolvedDate', null] }
                        ]
                      }
                    }
                  }
                },
                in: {
                  $cond: [
                    { $gt: [{ $size: '$$resolvedComplaints' }, 0] },
                    {
                      $divide: [
                        {
                          $sum: {
                            $map: {
                              input: '$$resolvedComplaints',
                              as: 'rc',
                              in: { $divide: [{ $subtract: ['$$rc.resolvedDate', '$$rc.createdAt'] }, 1000 * 60 * 60 * 24] }
                            }
                          }
                        },
                        { $size: '$$resolvedComplaints' }
                      ]
                    },
                    0
                  ]
                }
              }
            },
          }
        },
        { $sort: { total: -1 } }
      ]),
      Complaint.aggregate([
        {
          $match: {
            ...matchQuery,
            'location.coordinates.latitude': { $ne: null },
            'location.coordinates.longitude': { $ne: null },
          }
        },
        {
          $group: {
            _id: {
              lat: { $round: ['$location.coordinates.latitude', 2] },
              lng: { $round: ['$location.coordinates.longitude', 2] },
            },
            complaints: { $sum: 1 },
          }
        },
        { $sort: { complaints: -1 } },
        { $limit: 12 },
      ]),
      Complaint.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$category', complaints: { $sum: 1 } } },
        { $sort: { complaints: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const [previousResolved, previousAvgResolutionAgg, previousSlaAgg, satisfactionAgg, previousSatisfactionAgg] =
      await Promise.all([
        Complaint.countDocuments({ createdAt: { $gte: prevStart, $lte: prevEnd }, isDraft: false, status: 'resolved' }),
        Complaint.aggregate([
          {
            $match: {
              createdAt: { $gte: prevStart, $lte: prevEnd },
              isDraft: false,
              status: 'resolved',
              resolvedDate: { $ne: null }
            }
          },
          {
            $project: {
              resolutionDays: {
                $divide: [{ $subtract: ['$resolvedDate', '$createdAt'] }, 1000 * 60 * 60 * 24]
              }
            }
          },
          { $group: { _id: null, avgDays: { $avg: '$resolutionDays' } } }
        ]),
        Complaint.aggregate([
          {
            $match: {
              createdAt: { $gte: prevStart, $lte: prevEnd },
              isDraft: false,
              status: 'resolved',
              resolvedDate: { $ne: null },
              estimatedResolution: { $ne: null }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              withinSla: {
                $sum: { $cond: [{ $lte: ['$resolvedDate', '$estimatedResolution'] }, 1, 0] }
              }
            }
          }
        ]),
        Complaint.aggregate([
          {
            $match: {
              isDraft: false,
              status: "resolved",
              "feedback.rating": { $gte: 1 },
              "feedback.submittedAt": { $gte: startDate, $lte: endDate },
            }
          },
          { $group: { _id: null, avgRating: { $avg: '$feedback.rating' } } }
        ]),
        Complaint.aggregate([
          {
            $match: {
              isDraft: false,
              status: "resolved",
              "feedback.rating": { $gte: 1 },
              "feedback.submittedAt": { $gte: prevStart, $lte: prevEnd },
            }
          },
          { $group: { _id: null, avgRating: { $avg: '$feedback.rating' } } }
        ]),
      ]);

    const resolutionRate = totalFiled > 0 ? ((totalResolved / totalFiled) * 100).toFixed(1) : 0;
    const avgResolutionDays = Number(avgResolutionAgg?.[0]?.avgDays ?? 0).toFixed(1);
    const slaTotal = slaAgg?.[0]?.total ?? 0;
    const slaWithin = slaAgg?.[0]?.withinSla ?? 0;
    const slaCompliance = slaTotal > 0 ? ((slaWithin / slaTotal) * 100).toFixed(1) : "0.0";
    const citizenSatisfaction = Number(satisfactionAgg?.[0]?.avgRating ?? 0).toFixed(1);
    const growthPct = previousFiled > 0 ? (((totalFiled - previousFiled) / previousFiled) * 100).toFixed(1) : "0.0";

    const previousResolutionRateNum = previousFiled > 0 ? (previousResolved / previousFiled) * 100 : 0;
    const previousAvgResolutionDaysNum = Number(previousAvgResolutionAgg?.[0]?.avgDays ?? 0);
    const previousSlaTotal = previousSlaAgg?.[0]?.total ?? 0;
    const previousSlaWithin = previousSlaAgg?.[0]?.withinSla ?? 0;
    const previousSlaComplianceNum = previousSlaTotal > 0 ? (previousSlaWithin / previousSlaTotal) * 100 : 0;
    const previousCitizenSatisfactionNum = Number(previousSatisfactionAgg?.[0]?.avgRating ?? 0);

    const pctChange = (current, previous) => {
      if (!previous || previous === 0) return 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const comparison = {
      totalFiled: pctChange(totalFiled, previousFiled),
      resolutionRate: pctChange(Number(resolutionRate), previousResolutionRateNum),
      avgResolutionTime: pctChange(Number(avgResolutionDays), previousAvgResolutionDaysNum),
      citizenSatisfaction: pctChange(Number(citizenSatisfaction), previousCitizenSatisfactionNum),
      slaCompliance: pctChange(Number(slaCompliance), previousSlaComplianceNum),
    };

    const toDensity = (count) => {
      if (count >= 50) return "high";
      if (count >= 20) return "medium";
      return "low";
    };

    let heatmapZones = [];
    if (topCoords.length > 0) {
      const lats = topCoords.map((c) => c._id.lat);
      const lngs = topCoords.map((c) => c._id.lng);
      const dynamicLatMin = Math.min(...lats);
      const dynamicLatMax = Math.max(...lats);
      const dynamicLngMin = Math.min(...lngs);
      const dynamicLngMax = Math.max(...lngs);
      const allInIndiaBounds =
        lats.every((lat) => lat >= 6 && lat <= 38) &&
        lngs.every((lng) => lng >= 68 && lng <= 98);
      const latMin = allInIndiaBounds ? 6 : dynamicLatMin;
      const latMax = allInIndiaBounds ? 38 : dynamicLatMax;
      const lngMin = allInIndiaBounds ? 68 : dynamicLngMin;
      const lngMax = allInIndiaBounds ? 98 : dynamicLngMax;
      const latRange = latMax - latMin || 1;
      const lngRange = lngMax - lngMin || 1;

      const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

      heatmapZones = topCoords.map((zone, idx) => ({
        id: idx + 1,
        name: `Lat ${zone._id.lat}, Lon ${zone._id.lng}`,
        complaints: zone.complaints,
        density: toDensity(zone.complaints),
        lat: zone._id.lat,
        lng: zone._id.lng,
        x: clamp(((zone._id.lng - lngMin) / lngRange) * 100, 8, 92),
        y: clamp(((latMax - zone._id.lat) / latRange) * 100, 10, 90),
      }));
    } else {
      const fallbackPositions = [
        { x: 45, y: 15 },
        { x: 55, y: 70 },
        { x: 80, y: 40 },
        { x: 15, y: 45 },
        { x: 50, y: 45 },
      ];
      heatmapZones = categoryHotspots.map((zone, idx) => ({
        id: idx + 1,
        name: zone._id || `Zone ${idx + 1}`,
        complaints: zone.complaints,
        density: toDensity(zone.complaints),
        lat: null,
        lng: null,
        x: fallbackPositions[idx]?.x ?? 50,
        y: fallbackPositions[idx]?.y ?? 50,
      }));
    }

    const trendLabels =
      (trendData || []).map((row) => row.name).slice(-7);
    const categoryDateCountMap = new Map();
    (categoryTrendData || []).forEach((row) => {
      const cat = row.category || "Unknown";
      const date = row.date || "";
      if (!categoryDateCountMap.has(cat)) {
        categoryDateCountMap.set(cat, new Map());
      }
      categoryDateCountMap.get(cat).set(date, Number(row.count || 0));
    });

    const categoryBreakdownWithTrend = (categoryBreakdown || []).map((cat) => {
      const categoryName = cat.name || cat._id || "Unknown";
      const dateMap = categoryDateCountMap.get(categoryName) || new Map();
      const trend = trendLabels.length
        ? trendLabels.map((label) => Number(dateMap.get(label) || 0))
        : [0, 0, 0, 0, 0, 0, 0];
      const first = trend[0] ?? 0;
      const last = trend[trend.length - 1] ?? 0;
      const trendDirection = last < first ? "down" : "up";

      return {
        ...cat,
        trend,
        trendDirection,
      };
    });

    const topCategory = categoryBreakdownWithTrend[0];
    const topCategoryShare = topCategory && totalFiled > 0
      ? ((topCategory.value / totalFiled) * 100).toFixed(1)
      : "0.0";
    const pendingDist = statusDist.find((s) => s.name === "Pending")?.value ?? 0;
    const inProgressDist = statusDist.find((s) => s.name === "In Progress")?.value ?? 0;
    const openBacklog = pendingDist + inProgressDist;
    const backlogPct = totalFiled > 0 ? ((openBacklog / totalFiled) * 100).toFixed(1) : "0.0";

    const insights = [];
    insights.push({
      id: 1,
      text: `${Math.abs(Number(growthPct)).toFixed(1)}% ${Number(growthPct) >= 0 ? "increase" : "decrease"} in complaints vs previous period`,
      type: Number(growthPct) >= 0 ? "warning" : "success",
      category: "Trend",
    });

    if (topCategory) {
      insights.push({
        id: 2,
        text: `${topCategory.name} accounts for ${topCategoryShare}% of complaints`,
        type: Number(topCategoryShare) >= 30 ? "alert" : "info",
        category: "Category",
      });
    }

    insights.push({
      id: 3,
      text: `Average resolution time is ${avgResolutionDays} days`,
      type: Number(avgResolutionDays) > 5 ? "warning" : "success",
      category: "Performance",
    });

    insights.push({
      id: 4,
      text: `${backlogPct}% complaints are currently open (pending/in-progress)`,
      type: Number(backlogPct) > 40 ? "critical" : "info",
      category: "Backlog",
    });

    insights.push({
      id: 5,
      text: `SLA compliance is ${slaCompliance}% in selected range`,
      type: Number(slaCompliance) < 70 ? "critical" : "success",
      category: "SLA",
    });

    res.status(200).json({
      success: true,
      data: {
        keyMetrics: {
          totalFiled,
          resolutionRate: `${resolutionRate}%`,
          avgResolutionTime: `${avgResolutionDays} days`,
          citizenSatisfaction: `${citizenSatisfaction}/5`,
          slaCompliance: `${slaCompliance}%`,
          comparison,
        },
        categoryBreakdown: categoryBreakdownWithTrend,
        statusDistribution: statusDist,
        trendData,
        departmentPerformance: deptPerf,
        heatmapZones,
        insights,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

const resolveAnalyticsRange = (range, fromDate, toDate) => {
  let startDate = new Date();
  switch (range) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "7days":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30days":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90days":
      startDate.setDate(startDate.getDate() - 90);
      break;
    case "custom":
      if (fromDate) startDate = new Date(fromDate);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
      break;
  }

  const endDate =
    range === "custom" && toDate ? new Date(toDate) : new Date();
  return { startDate, endDate };
};

// @desc    Export analytics report as CSV (live backend data)
// @route   GET /api/admin/analytics/export.csv
// @access  Private/Admin
export async function exportAnalyticsCsv(req, res) {
  try {
    const { range = "30days", fromDate, toDate } = req.query;
    const { startDate, endDate } = resolveAnalyticsRange(
      String(range),
      fromDate,
      toDate,
    );
    const matchQuery = {
      createdAt: { $gte: startDate, $lte: endDate },
      isDraft: false,
    };

    const [
      totalFiled,
      totalResolved,
      avgResolutionAgg,
      slaAgg,
      satisfactionAgg,
      trendData,
      categoryBreakdown,
      departmentPerformance,
      statusDistribution,
    ] = await Promise.all([
      Complaint.countDocuments(matchQuery),
      Complaint.countDocuments({ ...matchQuery, status: "resolved" }),
      Complaint.aggregate([
        {
          $match: {
            ...matchQuery,
            status: "resolved",
            resolvedDate: { $ne: null },
          },
        },
        {
          $project: {
            resolutionDays: {
              $divide: [
                { $subtract: ["$resolvedDate", "$createdAt"] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
        { $group: { _id: null, avgDays: { $avg: "$resolutionDays" } } },
      ]),
      Complaint.aggregate([
        {
          $match: {
            ...matchQuery,
            status: "resolved",
            resolvedDate: { $ne: null },
            estimatedResolution: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            withinSla: {
              $sum: {
                $cond: [
                  { $lte: ["$resolvedDate", "$estimatedResolution"] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      Complaint.aggregate([
        {
          $match: {
            isDraft: false,
            status: "resolved",
            "feedback.rating": { $gte: 1 },
            "feedback.submittedAt": { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, avgRating: { $avg: "$feedback.rating" } } },
      ]),
      Complaint.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            filed: { $sum: 1 },
            resolved: {
              $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
            },
            pending: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      ["filed", "assigned", "in-progress", "in_progress"],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Complaint.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Department.aggregate([
        {
          $lookup: {
            from: "complaints",
            let: { departmentId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$department", "$$departmentId"] },
                  createdAt: { $gte: startDate, $lte: endDate },
                  isDraft: false,
                },
              },
            ],
            as: "complaints",
          },
        },
        {
          $project: {
            name: 1,
            avgTime: {
              $let: {
                vars: {
                  resolvedComplaints: {
                    $filter: {
                      input: "$complaints",
                      as: "c",
                      cond: {
                        $and: [
                          { $eq: ["$$c.status", "resolved"] },
                          { $ne: ["$$c.resolvedDate", null] },
                        ],
                      },
                    },
                  },
                },
                in: {
                  $cond: [
                    { $gt: [{ $size: "$$resolvedComplaints" }, 0] },
                    {
                      $divide: [
                        {
                          $sum: {
                            $map: {
                              input: "$$resolvedComplaints",
                              as: "rc",
                              in: {
                                $divide: [
                                  {
                                    $subtract: [
                                      "$$rc.resolvedDate",
                                      "$$rc.createdAt",
                                    ],
                                  },
                                  1000 * 60 * 60 * 24,
                                ],
                              },
                            },
                          },
                        },
                        { $size: "$$resolvedComplaints" },
                      ],
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
        { $sort: { name: 1 } },
      ]),
      Complaint.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$status", value: { $sum: 1 } } },
        { $sort: { value: -1 } },
      ]),
    ]);

    const resolutionRate =
      totalFiled > 0 ? ((totalResolved / totalFiled) * 100).toFixed(1) : "0.0";
    const avgResolutionDays = Number(avgResolutionAgg?.[0]?.avgDays ?? 0).toFixed(
      1,
    );
    const slaTotal = slaAgg?.[0]?.total ?? 0;
    const slaWithin = slaAgg?.[0]?.withinSla ?? 0;
    const slaCompliance =
      slaTotal > 0 ? ((slaWithin / slaTotal) * 100).toFixed(1) : "0.0";
    const citizenSatisfaction = Number(
      satisfactionAgg?.[0]?.avgRating ?? 0,
    ).toFixed(1);
    const pendingCount = Math.max(totalFiled - totalResolved, 0);

    const lines = [
      "Section,Key,Value",
      `Meta,Range,${csvEscape(String(range))}`,
      `Meta,From,${csvEscape(startDate.toISOString())}`,
      `Meta,To,${csvEscape(endDate.toISOString())}`,
      `Key Metrics,Total Complaints Filed,${csvEscape(totalFiled)}`,
      `Key Metrics,Resolved,${csvEscape(totalResolved)}`,
      `Key Metrics,Pending,${csvEscape(pendingCount)}`,
      `Key Metrics,Resolution Rate,${csvEscape(`${resolutionRate}%`)}`,
      `Key Metrics,Avg Resolution Time,${csvEscape(`${avgResolutionDays} days`)}`,
      `Key Metrics,Citizen Satisfaction,${csvEscape(`${citizenSatisfaction}/5`)}`,
      `Key Metrics,SLA Compliance,${csvEscape(`${slaCompliance}%`)}`,
      "",
      "Trend Data,Date,Filed,Resolved,Pending",
      ...trendData.map((row) =>
        [
          csvEscape("Trend Data"),
          csvEscape(row._id),
          csvEscape(row.filed ?? 0),
          csvEscape(row.resolved ?? 0),
          csvEscape(row.pending ?? 0),
        ].join(","),
      ),
      "",
      "Category Breakdown,Category,Count",
      ...categoryBreakdown.map((row) =>
        [
          csvEscape("Category Breakdown"),
          csvEscape(row._id || "Unknown"),
          csvEscape(row.count ?? 0),
        ].join(","),
      ),
      "",
      "Department Performance,Department,Avg Resolution Time (days)",
      ...departmentPerformance.map((row) =>
        [
          csvEscape("Department Performance"),
          csvEscape(row.name || "Unknown"),
          csvEscape(Number(row.avgTime ?? 0).toFixed(1)),
        ].join(","),
      ),
      "",
      "Status Distribution,Status,Count",
      ...statusDistribution.map((row) =>
        [
          csvEscape("Status Distribution"),
          csvEscape(row._id || "Unknown"),
          csvEscape(row.value ?? 0),
        ].join(","),
      ),
    ];

    const csv = lines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="admin-analytics-${String(range)}-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

const DEFAULT_INCLUDE = {
  charts: true,
  detailedList: false,
  executiveSummary: true,
  recommendations: true,
  rawData: false,
};

const normalizeStatusForReport = (status = "") => {
  const value = String(status).toLowerCase().trim();
  if (value === "in_progress") return "in-progress";
  return value;
};

const buildSimplePdfBytes = (lines = []) => {
  const escapedLines = lines.map((line) =>
    String(line)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)"),
  );

  const content = [
    "BT",
    "/F1 12 Tf",
    "72 760 Td",
    ...escapedLines
      .slice(0, 28)
      .map((line, idx) => `${idx === 0 ? "" : "0 -20 Td"}(${line}) Tj`)
      .filter(Boolean),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj\n",
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream\nendobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += obj;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
};

const buildReportSnapshot = async (config = {}) => {
  const startDateRaw = config.startDate || new Date().toISOString().slice(0, 10);
  const endDateRaw = config.endDate || new Date().toISOString().slice(0, 10);
  const fromDate = new Date(`${startDateRaw}T00:00:00.000Z`);
  const toDate = new Date(`${endDateRaw}T23:59:59.999Z`);
  const groupBy = ["department", "category", "date", "status"].includes(config.groupBy)
    ? config.groupBy
    : "department";

  const include = {
    ...DEFAULT_INCLUDE,
    ...(config.include || {}),
  };

  const departments = Array.isArray(config.departments) ? config.departments : [];
  const categories = Array.isArray(config.categories) ? config.categories : [];
  const statuses = (Array.isArray(config.statuses) ? config.statuses : []).map(normalizeStatusForReport);
  const priorities = Array.isArray(config.priorities) ? config.priorities : [];

  const query = {
    isDraft: false,
    createdAt: { $gte: fromDate, $lte: toDate },
  };

  if (categories.length > 0) query.category = { $in: categories };
  if (statuses.length > 0) query.status = { $in: statuses };
  if (priorities.length > 0) query.priority = { $in: priorities };

  if (departments.length > 0) {
    const deptDocs = await Department.find({ name: { $in: departments } }).select("_id name").lean();
    const deptIds = deptDocs.map((d) => d._id);
    const includesUnassigned = departments.includes("Unassigned");
    if (deptIds.length === 0 && !includesUnassigned) {
      query.department = { $in: [] };
    } else if (includesUnassigned) {
      query.$or = [
        { department: { $in: deptIds } },
        { department: { $exists: false } },
        { department: null },
      ];
    } else {
      query.department = { $in: deptIds };
    }
  }

  const complaints = await Complaint.find(query)
    .select("category status priority resolvedDate estimatedResolution createdAt department")
    .populate("department", "name")
    .lean();

  const totalComplaints = complaints.length;
  const resolved = complaints.filter((item) => normalizeStatusForReport(item.status) === "resolved").length;
  const pending = complaints.filter((item) =>
    ["filed", "assigned", "in-progress", "pending"].includes(normalizeStatusForReport(item.status)),
  ).length;

  const resolvedWithSla = complaints.filter(
    (item) =>
      normalizeStatusForReport(item.status) === "resolved" &&
      item.resolvedDate &&
      item.estimatedResolution &&
      new Date(item.resolvedDate).getTime() <= new Date(item.estimatedResolution).getTime(),
  ).length;
  const slaCompliance = resolved > 0 ? `${Math.round((resolvedWithSla / resolved) * 100)}%` : "0%";

  const groupKey = (item) => {
    if (groupBy === "department") return item.department?.name || "Unassigned";
    if (groupBy === "category") return item.category || "Unknown";
    if (groupBy === "status") return normalizeStatusForReport(item.status || "unknown");
    return new Date(item.createdAt).toISOString().slice(0, 10);
  };

  const grouped = new Map();
  complaints.forEach((item) => {
    const key = groupKey(item);
    const current = grouped.get(key) || { total: 0, resolved: 0, pending: 0 };
    current.total += 1;
    const normalizedStatus = normalizeStatusForReport(item.status || "");
    if (normalizedStatus === "resolved") current.resolved += 1;
    if (["filed", "assigned", "in-progress", "pending"].includes(normalizedStatus)) current.pending += 1;
    grouped.set(key, current);
  });

  const rows = Array.from(grouped.entries())
    .map(([label, value]) => ({
      label,
      total: value.total,
      resolved: value.resolved,
      pending: value.pending,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  return {
    dateRange: `${startDateRaw} to ${endDateRaw}`,
    groupBy,
    departments,
    categories,
    statuses,
    priorities,
    include,
    template: ["standard", "detailed", "executive"].includes(config.template) ? config.template : "standard",
    sendEmail: Boolean(config.sendEmail),
    scheduleRecurring: Boolean(config.scheduleRecurring),
    metrics: {
      totalComplaints,
      resolved,
      pending,
      slaCompliance,
    },
    rows,
  };
};

const buildReportCsv = (report) => {
  const snapshot = report.snapshot || {};
  const metrics = snapshot.metrics || {};
  const rows = snapshot.rows || [];
  const include = snapshot.include || DEFAULT_INCLUDE;

  const includeTags = [
    include.charts ? "Charts" : null,
    include.detailedList ? "Detailed List" : null,
    include.executiveSummary ? "Executive Summary" : null,
    include.recommendations ? "Recommendations" : null,
    include.rawData ? "Raw Data Export" : null,
  ]
    .filter(Boolean)
    .join(", ");

  const data = [
    "Section,Key,Value",
    `Meta,Name,${csvEscape(report.name || "")}`,
    `Meta,Type,${csvEscape(report.reportType || "")}`,
    `Meta,Generated Date,${csvEscape(new Date(report.generatedDate || Date.now()).toISOString())}`,
    `Meta,Format,${csvEscape(String(report.format || "csv").toUpperCase())}`,
    `Meta,Date Range,${csvEscape(snapshot.dateRange || "N/A")}`,
    `Meta,Group By,${csvEscape(snapshot.groupBy || "N/A")}`,
    `Meta,Template,${csvEscape(snapshot.template || "N/A")}`,
    `Meta,Send Email,${csvEscape(snapshot.sendEmail ? "Yes" : "No")}`,
    `Meta,Schedule Recurring,${csvEscape(snapshot.scheduleRecurring ? "Yes" : "No")}`,
    `Include,Sections,${csvEscape(includeTags || "None")}`,
    `Metrics,Total Complaints,${csvEscape(metrics.totalComplaints ?? 0)}`,
    `Metrics,Resolved,${csvEscape(metrics.resolved ?? 0)}`,
    `Metrics,Pending,${csvEscape(metrics.pending ?? 0)}`,
    `Metrics,SLA Compliance,${csvEscape(metrics.slaCompliance ?? "0%")}`,
    "",
    "Analysis Label,Total,Resolved,Pending",
    ...rows.map((row) =>
      [csvEscape(row.label || ""), csvEscape(row.total ?? 0), csvEscape(row.resolved ?? 0), csvEscape(row.pending ?? 0)].join(","),
    ),
  ];

  return data.join("\n");
};

// @desc    Preview report with live backend data
// @route   POST /api/admin/reports/preview
// @access  Private/Admin
export async function previewReport(req, res) {
  try {
    const snapshot = await buildReportSnapshot(req.body?.config || req.body || {});
    res.status(200).json({
      success: true,
      data: { snapshot },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Generate and persist report
// @route   POST /api/admin/reports/generate
// @access  Private/Admin
export async function generateReport(req, res) {
  try {
    const {
      name = "Administrative Report",
      reportType = "summary",
      format = "pdf",
      config = {},
    } = req.body || {};

    const safeFormat = ["pdf", "excel", "csv"].includes(String(format)) ? String(format) : "pdf";
    const snapshot = await buildReportSnapshot(config);

    const report = await AdminReport.create({
      recordType: "generated",
      name: String(name).trim(),
      reportType: String(reportType).trim(),
      format: safeFormat,
      config,
      snapshot,
      generatedDate: new Date(),
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Report generated successfully",
      data: {
        report: {
          id: report._id,
          name: report.name,
          type: report.reportType,
          generatedDate: report.generatedDate,
          format: report.format,
          snapshot: report.snapshot,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Save report configuration
// @route   POST /api/admin/reports/configuration
// @access  Private/Admin
export async function saveReportConfiguration(req, res) {
  try {
    const { name = "Saved Report Configuration", reportType = "summary", config = {} } = req.body || {};
    const saved = await AdminReport.create({
      recordType: "configuration",
      name: String(name).trim(),
      reportType: String(reportType).trim(),
      format: "pdf",
      config,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Report configuration saved",
      data: { id: saved._id },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Save report schedule
// @route   POST /api/admin/reports/schedule
// @access  Private/Admin
export async function scheduleReport(req, res) {
  try {
    const {
      name = "Scheduled Report",
      reportType = "summary",
      format = "pdf",
      config = {},
      schedule = {},
    } = req.body || {};

    const safeFormat = ["pdf", "excel", "csv"].includes(String(format)) ? String(format) : "pdf";
    const saved = await AdminReport.create({
      recordType: "schedule",
      name: String(name).trim(),
      reportType: String(reportType).trim(),
      format: safeFormat,
      config,
      schedule: {
        frequency: ["daily", "weekly", "monthly"].includes(String(schedule.frequency))
          ? schedule.frequency
          : "weekly",
        dayOfWeek: Number.isFinite(Number(schedule.dayOfWeek)) ? Number(schedule.dayOfWeek) : 1,
        dayOfMonth: Number.isFinite(Number(schedule.dayOfMonth)) ? Number(schedule.dayOfMonth) : 1,
        time: schedule.time || "09:00",
        timezone: schedule.timezone || "Asia/Kolkata",
        enabled: schedule.enabled !== false,
      },
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Report schedule saved",
      data: { id: saved._id },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    List generated reports
// @route   GET /api/admin/reports
// @access  Private/Admin
export async function getGeneratedReports(req, res) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const reports = await AdminReport.find({
      createdBy: req.user.id,
      recordType: "generated",
    })
      .sort({ generatedDate: -1 })
      .limit(limit)
      .select("name reportType format generatedDate snapshot")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        reports: reports.map((report) => ({
          id: report._id,
          name: report.name,
          type: report.reportType,
          generatedDate: report.generatedDate,
          format: report.format,
          snapshot: report.snapshot || null,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Download generated report
// @route   GET /api/admin/reports/:id/download
// @access  Private/Admin
export async function downloadGeneratedReport(req, res) {
  try {
    const report = await AdminReport.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
      recordType: "generated",
    }).lean();

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    const requestedFormat = String(req.query.format || report.format || "csv").toLowerCase();
    const format = ["pdf", "excel", "csv"].includes(requestedFormat) ? requestedFormat : "csv";
    const baseName = String(report.name || "report")
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase();

    if (format === "pdf") {
      const snapshot = report.snapshot || {};
      const metrics = snapshot.metrics || {};
      const rows = snapshot.rows || [];
      const bytes = buildSimplePdfBytes([
        "Grievance Portal Report",
        `Name: ${report.name || ""}`,
        `Type: ${report.reportType || ""}`,
        `Generated: ${new Date(report.generatedDate || Date.now()).toLocaleString()}`,
        `Date Range: ${snapshot.dateRange || "N/A"}`,
        `Group By: ${snapshot.groupBy || "N/A"}`,
        `Total: ${metrics.totalComplaints ?? 0}`,
        `Resolved: ${metrics.resolved ?? 0}`,
        `Pending: ${metrics.pending ?? 0}`,
        `SLA Compliance: ${metrics.slaCompliance ?? "0%"}`,
        ...rows.slice(0, 15).map(
          (row) => `${row.label}: total ${row.total}, resolved ${row.resolved}, pending ${row.pending}`,
        ),
      ]);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.pdf"`);
      return res.status(200).send(bytes);
    }

    if (format === "excel") {
      const snapshot = report.snapshot || {};
      const metrics = snapshot.metrics || {};
      const rows = snapshot.rows || [];
      const htmlTable = `
        <h2>Grievance Portal Report</h2>
        <table border="1" cellspacing="0" cellpadding="6">
          <thead><tr><th>Name</th><th>Type</th><th>Generated Date</th><th>Format</th></tr></thead>
          <tbody><tr><td>${report.name || ""}</td><td>${report.reportType || ""}</td><td>${new Date(report.generatedDate || Date.now()).toLocaleString()}</td><td>${String(report.format || "").toUpperCase()}</td></tr></tbody>
        </table>
        <br />
        <table border="1" cellspacing="0" cellpadding="6">
          <thead><tr><th>Total Complaints</th><th>Resolved</th><th>Pending</th><th>SLA Compliance</th></tr></thead>
          <tbody><tr><td>${metrics.totalComplaints ?? 0}</td><td>${metrics.resolved ?? 0}</td><td>${metrics.pending ?? 0}</td><td>${metrics.slaCompliance ?? "0%"}</td></tr></tbody>
        </table>
        <br />
        <table border="1" cellspacing="0" cellpadding="6">
          <thead><tr><th>Analysis Label</th><th>Total</th><th>Resolved</th><th>Pending</th></tr></thead>
          <tbody>
            ${rows.map((row) => `<tr><td>${row.label}</td><td>${row.total}</td><td>${row.resolved}</td><td>${row.pending}</td></tr>`).join("")}
          </tbody>
        </table>
      `;
      res.setHeader("Content-Type", "application/vnd.ms-excel");
      res.setHeader("Content-Disposition", `attachment; filename="${baseName}.xls"`);
      return res.status(200).send(htmlTable);
    }

    const csv = buildReportCsv(report);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${baseName}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

const ROLE_MAP = {
  citizen: "user",
  user: "user",
  officer: "officer",
  admin: "admin",
};

const DISPLAY_ROLE_MAP = {
  user: "Citizen",
  officer: "Officer",
  admin: "Admin",
};

function normalizeRole(role) {
  if (!role) return undefined;
  return ROLE_MAP[String(role).toLowerCase()] || undefined;
}

function getUserStatus(user) {
  if (user.isBanned) return "banned";
  if (user.isActive) return "active";
  return "inactive";
}

function buildTempPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  values.push(current.trim());
  return values.map((v) => v.replace(/^"|"$/g, "").trim());
}

function parseUsersCsvBuffer(buffer) {
  const text = buffer.toString("utf8");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], error: "CSV must include header and at least one row" };
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const headerMap = {
    name: header.indexOf("name"),
    email: header.indexOf("email"),
    phone: header.indexOf("phone"),
    role: header.indexOf("role"),
    departmentId: header.indexOf("departmentid"),
    password: header.indexOf("password"),
  };

  if (headerMap.name < 0 || headerMap.email < 0 || headerMap.phone < 0) {
    return { rows: [], error: "CSV must include name,email,phone headers" };
  }

  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      name: cols[headerMap.name] || "",
      email: cols[headerMap.email] || "",
      phone: cols[headerMap.phone] || "",
      role: headerMap.role >= 0 ? cols[headerMap.role] : "user",
      departmentId: headerMap.departmentId >= 0 ? cols[headerMap.departmentId] : undefined,
      password: headerMap.password >= 0 ? cols[headerMap.password] : undefined,
    };
  });

  return { rows, error: null };
}

async function getOfficerDepartmentMap(userIds) {
  if (!userIds.length) return {};
  const departments = await Department.find({ officers: { $in: userIds } }).select("name code officers");
  const map = {};
  departments.forEach((dept) => {
    (dept.officers || []).forEach((id) => {
      const key = id.toString();
      if (!map[key]) {
        map[key] = {
          id: dept._id,
          name: dept.name,
          code: dept.code,
        };
      }
    });
  });
  return map;
}

function toUserRow(user, department, stats) {
  return {
    _id: user._id,
    avatarUrl: user.avatarUrl || "",
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    roleLabel: DISPLAY_ROLE_MAP[user.role] || user.role,
    status: getUserStatus(user),
    department: department || null,
    complaintsFiled: stats?.total || 0,
    joinedDate: user.createdAt,
    lastActive: user.lastLogin || user.updatedAt || user.createdAt,
    verification: {
      email: !!user.isEmailVerified,
      phone: !!user.isPhoneVerified,
      aadhaar: !!user.isAadhaarVerified,
    },
    banMeta: {
      reason: user.bannedReason || "",
      bannedAt: user.bannedAt || null,
      isBanned: !!user.isBanned,
    },
  };
}

// @desc    Stream user-management realtime updates (SSE)
// @route   GET /api/admin/stream/users
// @access  Private/Admin
export async function streamUserUpdates(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  send("connected", { ok: true, at: new Date().toISOString() });

  const unsubscribe = subscribeUserManagement((message) => {
    send("user-update", message);
  });

  const keepAlive = setInterval(() => {
    send("ping", { at: new Date().toISOString() });
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
    res.end();
  });
}

// @desc    Get all users for user management
// @route   GET /api/admin/users
// @access  Private/Admin
export async function getAllUsers(req, res) {
  try {
    const {
      search,
      role = "all",
      status = "all",
      department = "all",
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};
    const normalizedRole = normalizeRole(role);
    if (normalizedRole) {
      query.role = normalizedRole;
    }

    const normalizedStatus = String(status || "all").toLowerCase();
    if (normalizedStatus === "active") {
      query.isActive = true;
      query.isBanned = false;
    } else if (normalizedStatus === "inactive") {
      query.isActive = false;
      query.isBanned = false;
    } else if (normalizedStatus === "banned") {
      query.isBanned = true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
    const skip = (parsedPage - 1) * parsedLimit;

    if (department && department !== "all") {
      const dept = await Department.findById(department).select("officers");
      const scopedUserIds = (dept?.officers || []).map((id) => id.toString());
      query.role = "officer";
      query._id = { $in: scopedUserIds };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select(
          "name email phone role isActive isBanned bannedReason bannedAt isEmailVerified isPhoneVerified isAadhaarVerified avatarUrl createdAt updatedAt lastLogin",
        ),
      User.countDocuments(query),
    ]);

    const userIds = users.map((u) => u._id);
    const [officerMap, citizenCounts] = await Promise.all([
      getOfficerDepartmentMap(userIds),
      Complaint.aggregate([
        { $match: { user: { $in: userIds }, isDraft: false } },
        { $group: { _id: "$user", total: { $sum: 1 } } },
      ]),
    ]);

    const statsMap = {};
    citizenCounts.forEach((row) => {
      statsMap[row._id.toString()] = { total: row.total };
    });

    const rows = users.map((u) =>
      toUserRow(
        u,
        u.role === "officer" ? officerMap[u._id.toString()] : null,
        u.role === "user" ? statsMap[u._id.toString()] : null,
      ),
    );

    res.status(200).json({
      success: true,
      data: {
        users: rows,
        pagination: {
          total,
          page: parsedPage,
          pages: Math.ceil(total / parsedLimit),
          limit: parsedLimit,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Get single user details
// @route   GET /api/admin/users/:id
// @access  Private/Admin
export async function getUserDetails(req, res) {
  try {
    const user = await User.findById(req.params.id).select(
      "name email phone role isActive isBanned bannedReason bannedAt isEmailVerified isPhoneVerified isAadhaarVerified avatarUrl createdAt updatedAt lastLogin",
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const [departmentMap, complaintStats, recentComplaints] = await Promise.all([
      getOfficerDepartmentMap([user._id]),
      Complaint.aggregate([
        { $match: { user: user._id, isDraft: false } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            resolved: {
              $sum: {
                $cond: [{ $eq: ["$status", "resolved"] }, 1, 0],
              },
            },
            avgRating: {
              $avg: {
                $cond: [
                  { $gt: ["$feedback.rating", 0] },
                  "$feedback.rating",
                  null,
                ],
              },
            },
          },
        },
      ]),
      Complaint.find({ user: user._id, isDraft: false })
        .sort({ updatedAt: -1 })
        .limit(8)
        .select("complaintId title status updatedAt createdAt"),
    ]);

    const summary = complaintStats[0] || { total: 0, resolved: 0, avgRating: 0 };
    const timeline = recentComplaints.map((c) => ({
      id: c._id,
      label: `${c.complaintId} - ${c.status}`,
      description: c.title,
      at: c.updatedAt || c.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...toUserRow(
            user,
            user.role === "officer" ? departmentMap[user._id.toString()] : null,
            user.role === "user" ? { total: summary.total || 0 } : null,
          ),
          activity: {
            totalComplaints: summary.total || 0,
            resolvedComplaints: summary.resolved || 0,
            avgRating: Number(summary.avgRating || 0).toFixed(1),
            recentTimeline: timeline,
          },
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Create user by admin
// @route   POST /api/admin/users
// @access  Private/Admin
export async function createUserByAdmin(req, res) {
  try {
    const {
      name,
      email,
      phone,
      role = "user",
      departmentId,
      password,
      autoGeneratePassword = true,
      sendWelcome = false,
    } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: "Name, email and phone are required" });
    }

    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    if (normalizedRole === "officer" && !departmentId) {
      return res.status(400).json({ success: false, message: "Department is required for officers" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone }],
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "User already exists with this email or phone" });
    }

    const rawPassword = autoGeneratePassword ? buildTempPassword(10) : password;
    if (!rawPassword || rawPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password: rawPassword,
      role: normalizedRole,
      isEmailVerified: true,
      isPhoneVerified: true,
      address: {
        street: "N/A",
        city: "N/A",
        state: "N/A",
        pincode: "000000",
      },
    });

    if (normalizedRole === "officer" && departmentId) {
      const department = await Department.findById(departmentId);
      if (!department) {
        await user.deleteOne();
        return res.status(404).json({ success: false, message: "Department not found" });
      }
      if (!department.officers.some((id) => id.toString() === user._id.toString())) {
        department.officers.push(user._id);
        await department.save();
      }
    }

    if (sendWelcome) {
      await sendWelcomeEmail(user.email, user.name);
    }
    publishUserManagementEvent("user.created", { userId: user._id, role: normalizedRole, by: req.user.id });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        userId: user._id,
        tempPassword: autoGeneratePassword ? rawPassword : undefined,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: "Duplicate email or phone" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

async function syncOfficerDepartment(userId, nextRole, departmentId) {
  if (nextRole !== "officer") {
    await Department.updateMany(
      { officers: userId },
      { $pull: { officers: userId } },
    );
    return;
  }

  if (!departmentId) return;
  await Department.updateMany(
    { officers: userId, _id: { $ne: departmentId } },
    { $pull: { officers: userId } },
  );
  await Department.findByIdAndUpdate(departmentId, {
    $addToSet: { officers: userId },
  });
}

// @desc    Update user profile, role and department
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export async function updateUserByAdmin(req, res) {
  try {
    const { name, email, phone, role, departmentId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (name) user.name = name;
    if (email) user.email = String(email).toLowerCase().trim();
    if (phone) user.phone = phone;

    const nextRole = role ? normalizeRole(role) : user.role;
    if (role && !nextRole) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }
    user.role = nextRole;

    if (nextRole === "officer" && !departmentId) {
      return res.status(400).json({ success: false, message: "Department is required for officer role" });
    }

    await user.save();
    await syncOfficerDepartment(user._id, nextRole, departmentId);
    publishUserManagementEvent("user.updated", { userId: user._id, by: req.user.id });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: { userId: user._id },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: "Duplicate email or phone" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
export async function updateUserStatus(req, res) {
  try {
    const { status, reason = "" } = req.body;
    const normalized = String(status || "").toLowerCase();
    if (!["active", "inactive", "banned"].includes(normalized)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (normalized === "active") {
      user.isActive = true;
      user.isBanned = false;
      user.bannedReason = "";
      user.bannedAt = null;
      user.bannedBy = null;
    } else if (normalized === "inactive") {
      user.isActive = false;
      user.isBanned = false;
      user.bannedReason = "";
      user.bannedAt = null;
      user.bannedBy = null;
    } else {
      user.isActive = false;
      user.isBanned = true;
      user.bannedReason = reason || "Banned by admin";
      user.bannedAt = new Date();
      user.bannedBy = req.user.id;
    }

    await user.save();
    publishUserManagementEvent("user.status", { userId: user._id, status: normalized, by: req.user.id });
    res.status(200).json({ success: true, message: "User status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Reset password for user
// @route   POST /api/admin/users/:id/reset-password
// @access  Private/Admin
export async function resetUserPassword(req, res) {
  try {
    const { password } = req.body;
    let nextPassword = password;
    if (!nextPassword) {
      nextPassword = buildTempPassword(10);
    }
    if (nextPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.password = nextPassword;
    await user.save();
    publishUserManagementEvent("user.password-reset", { userId: user._id, by: req.user.id });

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
      data: {
        tempPassword: password ? undefined : nextPassword,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Bulk action on users
// @route   POST /api/admin/users/bulk-action
// @access  Private/Admin
export async function bulkUserAction(req, res) {
  try {
    const { userIds = [], action } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: "userIds is required" });
    }

    if (!["activate", "deactivate"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid bulk action" });
    }

    if (action === "activate") {
      await User.updateMany(
        { _id: { $in: userIds } },
        {
          $set: { isActive: true, isBanned: false, bannedReason: "", bannedAt: null, bannedBy: null },
        },
      );
    } else {
      await User.updateMany(
        { _id: { $in: userIds } },
        { $set: { isActive: false, isBanned: false, bannedReason: "", bannedAt: null, bannedBy: null } },
      );
    }

    res.status(200).json({
      success: true,
      message: `Bulk action '${action}' applied to ${userIds.length} users`,
    });
    publishUserManagementEvent("users.bulk", { action, count: userIds.length, by: req.user.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Export users to CSV
// @route   POST /api/admin/users/export
// @access  Private/Admin
export async function exportUsersCsv(req, res) {
  try {
    const { userIds = [] } = req.body || {};
    const query = {};
    if (Array.isArray(userIds) && userIds.length > 0) {
      query._id = { $in: userIds };
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select(
        "name email phone role isActive isBanned isEmailVerified isPhoneVerified isAadhaarVerified createdAt updatedAt lastLogin",
      )
      .lean();

    const officerMap = await getOfficerDepartmentMap(users.map((u) => u._id));

    const rows = [
      [
        "Name",
        "Email",
        "Phone",
        "Role",
        "Status",
        "Department",
        "Email Verified",
        "Phone Verified",
        "Aadhaar Verified",
        "Joined Date",
        "Last Active",
      ],
      ...users.map((user) => {
        const row = toUserRow(
          user,
          user.role === "officer" ? officerMap[user._id.toString()] : null,
          null,
        );
        return [
          row.name,
          row.email,
          row.phone,
          row.role,
          row.status,
          row.department?.name || "",
          row.verification?.email ? "Yes" : "No",
          row.verification?.phone ? "Yes" : "No",
          row.verification?.aadhaar ? "Yes" : "No",
          row.joinedDate ? new Date(row.joinedDate).toISOString() : "",
          row.lastActive ? new Date(row.lastActive).toISOString() : "",
        ];
      }),
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="admin-users-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Delete user by admin (restricted)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export async function deleteUserByAdmin(req, res) {
  try {
    const targetUserId = req.params.id;
    if (String(targetUserId) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const [citizenComplaints, assignedComplaints] = await Promise.all([
      Complaint.countDocuments({ user: targetUserId, isDraft: false }),
      Complaint.countDocuments({
        assignedOfficer: targetUserId,
        status: { $in: ["filed", "assigned", "in-progress", "in_progress"] },
        isDraft: false,
      }),
    ]);

    if (citizenComplaints > 0 || assignedComplaints > 0) {
      return res.status(400).json({
        success: false,
        message:
          "User cannot be deleted because related complaint records exist. Deactivate or ban the account instead.",
      });
    }

    await Promise.all([
      Department.updateMany({ officers: targetUserId }, { $pull: { officers: targetUserId } }),
      Department.updateMany({ headOfDepartment: targetUserId }, { $set: { headOfDepartment: null } }),
      Notification.deleteMany({ user: targetUserId }),
    ]);

    await user.deleteOne();
    publishUserManagementEvent("user.deleted", { userId: targetUserId, by: req.user.id });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createUsersFromRows(rows, sendWelcome = false) {
  const created = [];
  const failed = [];

  for (const row of rows) {
    try {
      const normalizedRole = normalizeRole(row.role || "user");
      if (!normalizedRole) {
        failed.push({ row, reason: "Invalid role" });
        continue;
      }
      if (!row.name || !row.email || !row.phone) {
        failed.push({ row, reason: "name, email and phone are required" });
        continue;
      }
      if (normalizedRole === "officer" && !row.departmentId) {
        failed.push({ row, reason: "Officer requires departmentId" });
        continue;
      }

      const exists = await User.findOne({
        $or: [
          { email: String(row.email || "").toLowerCase().trim() },
          { phone: row.phone },
        ],
      });
      if (exists) {
        failed.push({ row, reason: "Duplicate email or phone" });
        continue;
      }

      const generated = buildTempPassword(10);
      const user = await User.create({
        name: row.name,
        email: String(row.email).toLowerCase().trim(),
        phone: row.phone,
        password: row.password || generated,
        role: normalizedRole,
        isEmailVerified: true,
        isPhoneVerified: true,
        address: {
          street: "N/A",
          city: "N/A",
          state: "N/A",
          pincode: "000000",
        },
      });

      if (normalizedRole === "officer" && row.departmentId) {
        await Department.findByIdAndUpdate(row.departmentId, {
          $addToSet: { officers: user._id },
        });
      }

      if (sendWelcome) {
        await sendWelcomeEmail(user.email, user.name);
      }

      created.push({ id: user._id, email: user.email });
    } catch (err) {
      failed.push({ row, reason: err.message });
    }
  }

  return { created, failed };
}

// @desc    Import users from parsed CSV rows
// @route   POST /api/admin/users/import
// @access  Private/Admin
export async function importUsers(req, res) {
  try {
    const { users = [], sendWelcome = false } = req.body;
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ success: false, message: "No users provided for import" });
    }

    const { created, failed } = await createUsersFromRows(users, !!sendWelcome);

    res.status(200).json({
      success: true,
      message: `Imported ${created.length} users`,
      data: { created, failed },
    });
    publishUserManagementEvent("users.import", { count: created.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Import users via CSV file upload (server-side parse)
// @route   POST /api/admin/users/import-file
// @access  Private/Admin
export async function importUsersFromCsvFile(req, res) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "CSV file is required (field name: file)" });
    }

    const parsed = parseUsersCsvBuffer(req.file.buffer);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const sendWelcome = String(req.body?.sendWelcome ?? "false").toLowerCase() === "true";
    const { created, failed } = await createUsersFromRows(parsed.rows, sendWelcome);

    res.status(200).json({
      success: true,
      message: `Imported ${created.length} users from file`,
      data: { created, failed },
    });
    publishUserManagementEvent("users.import-file", { count: created.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Broadcast admin announcement notifications
// @route   POST /api/admin/notifications/broadcast
// @access  Private/Admin
export async function broadcastAnnouncement(req, res) {
  try {
    const {
      title,
      message,
      priority = "medium",
      actionUrl = "",
      channels = {},
      recipientUserIds = [],
      recipientDepartmentIds = [],
      sendToAllUsers = false,
      roles = ["user", "officer", "admin"],
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    const allowedPriorities = ["low", "medium", "high", "critical"];
    const safePriority = allowedPriorities.includes(String(priority))
      ? String(priority)
      : "medium";
    const batchId = `bcast_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const userIdSet = new Set();

    if (Array.isArray(recipientUserIds)) {
      recipientUserIds
        .filter(Boolean)
        .forEach((id) => userIdSet.add(String(id)));
    }

    if (Array.isArray(recipientDepartmentIds) && recipientDepartmentIds.length) {
      const departments = await Department.find({
        _id: { $in: recipientDepartmentIds },
      }).select("officers headOfDepartment");

      departments.forEach((department) => {
        (department.officers || []).forEach((officerId) =>
          userIdSet.add(String(officerId)),
        );
        if (department.headOfDepartment) {
          userIdSet.add(String(department.headOfDepartment));
        }
      });
    }

    if (sendToAllUsers) {
      const roleList = Array.isArray(roles) && roles.length
        ? roles
        : ["user", "officer", "admin"];
      const users = await User.find({
        role: { $in: roleList },
        isActive: true,
        isBanned: false,
      }).select("_id");
      users.forEach((u) => userIdSet.add(String(u._id)));
    }

    const targetUserIds = [...userIdSet];
    if (!targetUserIds.length) {
      return res.status(400).json({
        success: false,
        message: "Select at least one user or department",
      });
    }

    const now = new Date();
    const docs = targetUserIds.map((userId) => ({
      user: userId,
      complaint: null,
      complaintId: "",
      title: String(title).trim(),
      status: "announcement",
      message: String(message).trim(),
      source: "admin",
      type: "announcement",
      priority: safePriority,
      channels: {
        inApp: channels.inApp !== false,
        email: Boolean(channels.email),
        sms: Boolean(channels.sms),
        push: Boolean(channels.push),
      },
      actionUrl: String(actionUrl || "").trim(),
      metadata: {
        broadcast: true,
        batchId,
        sentBy: req.user.id,
        sentByName: req.user.name || "Admin",
        roleFilters: Array.isArray(roles) ? roles : [],
        sendToAllUsers: Boolean(sendToAllUsers),
      },
      createdAt: now,
      updatedAt: now,
    }));

    await Notification.insertMany(docs, { ordered: false });

    res.status(201).json({
      success: true,
      message: "Broadcast announcement sent",
      data: {
        recipients: targetUserIds.length,
        created: docs.length,
        batchId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Get broadcast announcement history
// @route   GET /api/admin/notifications/broadcast-history
// @access  Private/Admin
export async function getBroadcastAnnouncementHistory(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const match = {
      source: "admin",
      type: "announcement",
      "metadata.broadcast": true,
    };

    const [rows, total] = await Promise.all([
      Notification.aggregate([
        { $match: match },
        {
          $addFields: {
            broadcastBatchId: {
              $ifNull: ["$metadata.batchId", { $toString: "$_id" }],
            },
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$broadcastBatchId",
            createdAt: { $max: "$createdAt" },
            title: { $first: "$title" },
            message: { $first: "$message" },
            priority: { $first: "$priority" },
            actionUrl: { $first: "$actionUrl" },
            channels: { $first: "$channels" },
            sentBy: { $first: "$metadata.sentBy" },
            sentByName: { $first: "$metadata.sentByName" },
            sendToAllUsers: { $first: "$metadata.sendToAllUsers" },
            roleFilters: { $first: "$metadata.roleFilters" },
            recipientCount: { $sum: 1 },
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      Notification.aggregate([
        { $match: match },
        {
          $addFields: {
            broadcastBatchId: {
              $ifNull: ["$metadata.batchId", { $toString: "$_id" }],
            },
          },
        },
        { $group: { _id: "$broadcastBatchId" } },
        { $count: "total" },
      ]),
    ]);

    const totalBatches = total?.[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        history: rows.map((row) => ({
          batchId: row._id,
          createdAt: row.createdAt,
          title: row.title,
          message: row.message,
          priority: row.priority || "medium",
          actionUrl: row.actionUrl || "",
          channels: row.channels || {},
          sentBy: row.sentBy || null,
          sentByName: row.sentByName || "Admin",
          sendToAllUsers: Boolean(row.sendToAllUsers),
          roleFilters: Array.isArray(row.roleFilters) ? row.roleFilters : [],
          recipientCount: row.recipientCount || 0,
        })),
        pagination: {
          total: totalBatches,
          page,
          pages: Math.ceil(totalBatches / limit),
          limit,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Get admin settings
// @route   GET /api/admin/settings
// @access  Private/Admin
export async function getAdminSettings(req, res) {
  try {
    const doc = await AdminSetting.findOne({ key: ADMIN_SETTINGS_KEY }).lean();
    res.status(200).json({
      success: true,
      data: {
        settings: doc?.settings || null,
        updatedAt: doc?.updatedAt || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Upsert admin settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
export async function updateAdminSettings(req, res) {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: "A valid settings object is required",
      });
    }

    const doc = await AdminSetting.findOneAndUpdate(
      { key: ADMIN_SETTINGS_KEY },
      {
        $set: {
          settings,
          updatedBy: req.user?._id || null,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    invalidateRuntimeSettingsCache();

    res.status(200).json({
      success: true,
      message: "Admin settings updated successfully",
      data: {
        settings: doc.settings,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Rotate system runtime keys
// @route   POST /api/admin/settings/rotate-keys
// @access  Private/Admin
export async function rotateSystemKeys(req, res) {
  try {
    const doc = await AdminSetting.findOne({ key: ADMIN_SETTINGS_KEY }).lean();
    const currentSettings = doc?.settings || {};
    const now = new Date();

    const nextKey = generateSystemKey();
    const nextSettings = {
      ...currentSettings,
      system: {
        ...(currentSettings.system || {}),
        keyRotation: {
          keyId: `key_${Date.now()}`,
          rotatedAt: now.toISOString(),
          rotatedBy: req.user?._id?.toString() || null,
        },
      },
      api: {
        ...(currentSettings.api || {}),
        runtimeKey: nextKey,
        runtimeKeyLastRotatedAt: now.toISOString(),
      },
    };

    await AdminSetting.findOneAndUpdate(
      { key: ADMIN_SETTINGS_KEY },
      {
        $set: {
          settings: nextSettings,
          updatedBy: req.user?._id || null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    invalidateRuntimeSettingsCache();

    return res.status(200).json({
      success: true,
      message: "System keys rotated successfully",
      data: {
        rotatedAt: now.toISOString(),
        keyId: nextSettings.system.keyRotation.keyId,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
