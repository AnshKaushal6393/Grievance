import Complaint from "../models/Complaint.js";
import Department from "../models/Department.js";
import { createStatusNotification } from "../utils/notification.js";


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
                  { case: { $eq: ['$_id', 'assigned'] }, then: 'Assigned' },
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
        }
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

    const resolutionRate = totalFiled > 0 ? ((totalResolved / totalFiled) * 100).toFixed(1) : 0;
    const avgResolutionDays = Number(avgResolutionAgg?.[0]?.avgDays ?? 0).toFixed(1);
    const slaTotal = slaAgg?.[0]?.total ?? 0;
    const slaWithin = slaAgg?.[0]?.withinSla ?? 0;
    const slaCompliance = slaTotal > 0 ? ((slaWithin / slaTotal) * 100).toFixed(1) : "0.0";
    const growthPct = previousFiled > 0 ? (((totalFiled - previousFiled) / previousFiled) * 100).toFixed(1) : "0.0";

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
          slaCompliance: `${slaCompliance}%`
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
