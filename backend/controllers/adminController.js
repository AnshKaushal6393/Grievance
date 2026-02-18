import Complaint from "../models/Complaint.js";
import Department from "../models/Department.js";
import User from "../models/User.js";
import AdminSetting from "../models/AdminSetting.js";
import Notification from "../models/Notification.js";
import { createStatusNotification } from "../utils/notification.js";
import { sendWelcomeEmail } from "../utils/sendOTP.js";
import { publishUserManagementEvent, subscribeUserManagement } from "../utils/realtime.js";

const ADMIN_SETTINGS_KEY = "global";


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

    const sort = { [sortBy === 'filedDate' ? 'createdAt' : sortBy]: sortDir === 'asc' ? 1 : -1 };
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
    const { departmentId, officerId, priority, estimatedDays = 7 } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    if (departmentId) complaint.department = departmentId;
    if (officerId) complaint.assignedOfficer = officerId;
    if (priority) complaint.priority = priority;

    complaint.assignedDate = new Date();
    complaint.recordStatusChange(
      "assigned",
      req.user.id,
      "Complaint assigned by admin",
      "admin",
    );
    const est = new Date();
    est.setDate(est.getDate() + estimatedDays);
    complaint.estimatedResolution = est;

    complaint.updates.push({
      message: `Complaint assigned to department`,
      updatedBy: req.user.id
    });
    complaint.timeline.unshift({
      status: "assigned",
      message: "Complaint assigned by admin",
      updatedBy: req.user.id,
      updatedAt: new Date(),
    });

    await complaint.save();
    await createStatusNotification({
      userId: complaint.user,
      complaint,
      status: "assigned",
      message: "Your complaint has been assigned by admin.",
      source: "admin",
      metadata: { departmentId, officerId },
    });
    await complaint.populate('department', 'name');
    await complaint.populate('assignedOfficer', 'name email');

    res.status(200).json({ success: true, message: 'Complaint assigned successfully', data: { complaint } });
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

    complaint.recordStatusChange(
      status,
      req.user.id,
      message || `Status updated to ${status}`,
      "admin",
    );
    if (status === 'resolved') complaint.resolvedDate = new Date();
    if (status === 'rejected' && rejectionReason) complaint.rejectionReason = rejectionReason;

    if (message) {
      complaint.updates.push({ message, updatedBy: req.user.id });
    }
    complaint.timeline.unshift({
      status,
      message: message || `Status updated to ${status}`,
      updatedBy: req.user.id,
      updatedAt: new Date(),
    });

    await complaint.save();
    await createStatusNotification({
      userId: complaint.user,
      complaint,
      status,
      message: message || `Complaint status updated to ${status}`,
      source: "admin",
    });
    res.status(200).json({ success: true, message: 'Status updated successfully', data: { complaint } });
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

    const update = { status: 'assigned', assignedDate: new Date() };
    if (departmentId) update.department = departmentId;
    if (officerId) update.assignedOfficer = officerId;

    await Complaint.updateMany({ _id: { $in: complaintIds } }, update);

    const complaints = await Complaint.find({ _id: { $in: complaintIds } });
    for (const complaint of complaints) {
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
      await complaint.save();
      await createStatusNotification({
        userId: complaint.user,
        complaint,
        status: "assigned",
        message: "Your complaint was assigned by admin.",
        source: "admin",
      });
    }

    res.status(200).json({ success: true, message: `${complaintIds.length} complaints assigned successfully` });
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
            total: { $size: '$complaints' },
            pending: {
              $size: {
                $filter: { input: '$complaints', as: 'c', cond: { $in: ['$$c.status', ['filed', 'assigned', 'in-progress']] } }
              }
            },
            resolved: {
              $size: {
                $filter: { input: '$complaints', as: 'c', cond: { $eq: ['$$c.status', 'resolved'] } }
              }
            }
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

    const [totalFiled, totalResolved, previousFiled, avgResolutionAgg, slaAgg, categoryBreakdown, statusDist, trendData, deptPerf, topCoords, categoryHotspots] = await Promise.all([
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
        { $group: { _id: '$category', value: { $sum: 1 } } },
        { $project: { name: '$_id', value: 1, _id: 0 } },
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
        { $limit: 5 },
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
              ...matchQuery,
              'feedback.rating': { $gte: 1 }
            }
          },
          { $group: { _id: null, avgRating: { $avg: '$feedback.rating' } } }
        ]),
        Complaint.aggregate([
          {
            $match: {
              createdAt: { $gte: prevStart, $lte: prevEnd },
              isDraft: false,
              'feedback.rating': { $gte: 1 }
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
      const latMin = Math.min(...lats);
      const latMax = Math.max(...lats);
      const lngMin = Math.min(...lngs);
      const lngMax = Math.max(...lngs);
      const latRange = latMax - latMin || 1;
      const lngRange = lngMax - lngMin || 1;

      heatmapZones = topCoords.map((zone, idx) => ({
        id: idx + 1,
        name: `Zone ${idx + 1}`,
        complaints: zone.complaints,
        density: toDensity(zone.complaints),
        x: 15 + ((zone._id.lng - lngMin) / lngRange) * 70,
        y: 15 + ((latMax - zone._id.lat) / latRange) * 70,
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
        x: fallbackPositions[idx]?.x ?? 50,
        y: fallbackPositions[idx]?.y ?? 50,
      }));
    }

    const topCategory = categoryBreakdown[0];
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
        categoryBreakdown,
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
