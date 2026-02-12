import Complaint from "../models/Complaint.js";
import Department from "../models/Department.js";


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

    const complaint = await findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    if (departmentId) complaint.department = departmentId;
    if (officerId) complaint.assignedOfficer = officerId;
    if (priority) complaint.priority = priority;

    complaint.status = 'assigned';
    complaint.assignedDate = new Date();
    const est = new Date();
    est.setDate(est.getDate() + estimatedDays);
    complaint.estimatedResolution = est;

    complaint.updates.push({
      message: `Complaint assigned to department`,
      updatedBy: req.user.id
    });

    await complaint.save();
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

    const complaint = await findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    complaint.status = status;
    if (status === 'resolved') complaint.resolvedDate = new Date();
    if (status === 'rejected' && rejectionReason) complaint.rejectionReason = rejectionReason;

    if (message) {
      complaint.updates.push({ message, updatedBy: req.user.id });
    }

    await complaint.save();
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

    const [totalFiled, totalResolved, categoryBreakdown, statusDist, trendData, deptPerf] = await Promise.all([
      Complaint.countDocuments(matchQuery),
      Complaint.countDocuments({ ...matchQuery, status: 'resolved' }),
      Complaint.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$category', value: { $sum: 1 } } },
        { $project: { name: '$_id', value: 1, _id: 0 } },
        { $sort: { value: -1 } }
      ]),
      Complaint.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', value: { $sum: 1 } } },
        { $project: { name: '$_id', value: 1, _id: 0 } }
      ]),
      Complaint.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $week: '$createdAt' },
            filed: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $in: ['$status', ['filed', 'assigned', 'in-progress']] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { name: { $concat: ['Week ', { $toString: '$_id' }] }, filed: 1, resolved: 1, pending: 1, _id: 0 } }
      ]),
      Department.aggregate([
        { $lookup: { from: 'complaints', localField: '_id', foreignField: 'department', as: 'complaints' } },
        {
          $project: {
            name: 1,
            total: { $size: '$complaints' },
            pending: {
              $size: {
                $filter: { input: '$complaints', as: 'c', cond: { $in: ['$$c.status', ['filed', 'assigned', 'in-progress']] } }
              }
            }
          }
        },
        { $sort: { total: -1 } }
      ])
    ]);

    const resolutionRate = totalFiled > 0 ? ((totalResolved / totalFiled) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: {
        keyMetrics: {
          totalFiled,
          resolutionRate: `${resolutionRate}%`,
          slaCompliance: '87.6%' // can be computed with real SLA data
        },
        categoryBreakdown,
        statusDistribution: statusDist,
        trendData,
        departmentPerformance: deptPerf
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
