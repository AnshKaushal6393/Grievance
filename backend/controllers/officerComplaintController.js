import Complaint from "../models/Complaint.js";
import Department from "../models/Department.js";
import { createStatusNotification } from "../utils/notification.js";
export const getMyAssignedComplaints = async (req, res) => {
  try {
    const officerId = req.user.id;

    const {
      status,
      priority,
      search,
      sortBy = "createdAt",
      sortDir = "desc",
      page = 1,
      limit = 10,
    } = req.query;
    const query = { assignedOfficer: officerId };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { complaintId: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    const skip = (page - 1) * limit;
    const sortOrder = sortDir === "asc" ? 1 : -1;
    const complaints = await Complaint.find(query)
      .populate("user", "name email phone")
      .populate("department", "name code")
      .populate("assignedOfficer", "name email")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(query);

    const summary = await Complaint.aggregate([
      { $match: { assignedOfficer: req.user._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const summaryStats = {
      total: 0,
      pending: 0,
      assigned: 0,
      inProgress: 0,
      resolved: 0,
      rejected: 0,
    };
    summary.forEach((s) => {
      summaryStats.total += s.count;
      if (s._id === "filed" || s._id === "pending")
        summaryStats.pending += s.count;
      if (s._id === "assigned") summaryStats.assigned += s.count;
      if (s._id === "in-progress") summaryStats.inProgress += s.count;
      if (s._id === "resolved") summaryStats.resolved += s.count;
      if (s._id === "rejected") summaryStats.rejected += s.count;
    });

    res.status(200).json({
      success: true,
      complaints,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
      summary: summaryStats,
    });
  } catch (error) {
    console.error("Get my complaints error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export const getOfficerDashboard = async (req, res) => {
  try {
    const officerId = req.user._id;
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 7);
    const previousStart = new Date(now);
    previousStart.setDate(previousStart.getDate() - 14);
    const officerDepartment = await Department.findOne({ officers: officerId }).select("name code");

    const openStatuses = ["filed", "assigned", "pending", "in-progress", "in_progress"];
    const pendingStatuses = ["filed", "assigned", "pending"];

    const totalAssigned = await Complaint.countDocuments({
      assignedOfficer: officerId,
      status: { $in: openStatuses },
    });

    const pendingAction = await Complaint.countDocuments({
      assignedOfficer: officerId,
      status: { $in: pendingStatuses },
    });

    const resolvedToday = await Complaint.countDocuments({
      assignedOfficer: officerId,
      status: "resolved",
      resolvedDate: { $gte: today },
    });

    const [currentResolvedAgg, previousResolvedAgg] = await Promise.all([
      Complaint.aggregate([
        {
          $match: {
            assignedOfficer: officerId,
            status: "resolved",
            assignedDate: { $ne: null },
            resolvedDate: { $gte: currentStart, $lte: now },
          },
        },
        {
          $project: {
            responseHours: {
              $divide: [{ $subtract: ["$resolvedDate", "$assignedDate"] }, 1000 * 60 * 60],
            },
          },
        },
        { $group: { _id: null, avgHours: { $avg: "$responseHours" } } },
      ]),
      Complaint.aggregate([
        {
          $match: {
            assignedOfficer: officerId,
            status: "resolved",
            assignedDate: { $ne: null },
            resolvedDate: { $gte: previousStart, $lt: currentStart },
          },
        },
        {
          $project: {
            responseHours: {
              $divide: [{ $subtract: ["$resolvedDate", "$assignedDate"] }, 1000 * 60 * 60],
            },
          },
        },
        { $group: { _id: null, avgHours: { $avg: "$responseHours" } } },
      ]),
    ]);

    const currentAvgHours = Number(currentResolvedAgg?.[0]?.avgHours ?? 0);
    const previousAvgHours = Number(previousResolvedAgg?.[0]?.avgHours ?? 0);
    const avgResponseTime = `${currentAvgHours.toFixed(1)}h`;

    const [currentAssignedCount, previousAssignedCount, currentPendingCount, previousPendingCount, currentResolvedCount, previousResolvedCount] =
      await Promise.all([
        Complaint.countDocuments({
          assignedOfficer: officerId,
          assignedDate: { $gte: currentStart, $lte: now },
        }),
        Complaint.countDocuments({
          assignedOfficer: officerId,
          assignedDate: { $gte: previousStart, $lt: currentStart },
        }),
        Complaint.countDocuments({
          assignedOfficer: officerId,
          status: { $in: pendingStatuses },
          assignedDate: { $gte: currentStart, $lte: now },
        }),
        Complaint.countDocuments({
          assignedOfficer: officerId,
          status: { $in: pendingStatuses },
          assignedDate: { $gte: previousStart, $lt: currentStart },
        }),
        Complaint.countDocuments({
          assignedOfficer: officerId,
          status: "resolved",
          resolvedDate: { $gte: currentStart, $lte: now },
        }),
        Complaint.countDocuments({
          assignedOfficer: officerId,
          status: "resolved",
          resolvedDate: { $gte: previousStart, $lt: currentStart },
        }),
      ]);

    const signed = (n) => `${n >= 0 ? "+" : ""}${n}`;
    const signedHours = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}h`;
    const totalDiff = currentAssignedCount - previousAssignedCount;
    const pendingDiff = currentPendingCount - previousPendingCount;
    const resolvedDiff = currentResolvedCount - previousResolvedCount;
    const responseDiff = currentAvgHours - previousAvgHours;

    const highPriorityComplaints = await Complaint.find({
      assignedOfficer: officerId,
      priority: { $in: ["high", "critical"] },
      status: { $ne: "resolved" },
    })
      .populate("user", "name email")
      .populate("department", "name")
      .select("complaintId title priority category createdAt")
      .limit(5)
      .sort({ priority: -1, createdAt: 1 });

    const statusBreakdown = await Complaint.aggregate([
      { $match: { assignedOfficer: officerId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const deptComplaints = officerDepartment
      ? await Complaint.find({
          department: officerDepartment._id,
          "timeline.0": { $exists: true },
        })
          .select("complaintId title timeline assignedOfficer")
          .populate("assignedOfficer", "name")
          .populate("timeline.updatedBy", "name")
          .sort({ updatedAt: -1 })
          .limit(5)
      : [];

    const recentActivity = deptComplaints.map((c) => ({
      complaintId: c.complaintId,
      officer: c.assignedOfficer?.name || "Unknown",
      action: c.timeline[0]?.status || "updated",
      time: c.timeline[0]?.updatedAt || c.updatedAt,
    }));

    res.status(200).json({
      success: true,
      stats: {
        totalAssigned,
        pendingAction,
        resolvedToday,
        avgResponseTime,
        totalTrend: signed(totalDiff),
        pendingTrend: signed(pendingDiff),
        resolvedTrend: signed(resolvedDiff),
        responseTrend: signedHours(responseDiff),
        totalTrendUp: totalDiff >= 0,
        pendingTrendUp: pendingDiff <= 0,
        resolvedTrendUp: resolvedDiff >= 0,
        responseTrendUp: responseDiff <= 0,
      },
      highPriorityComplaints,
      statusBreakdown,
      recentActivity,
      officer: {
        department: officerDepartment
          ? { id: officerDepartment._id, name: officerDepartment.name, code: officerDepartment.code }
          : null,
      },
    });
  } catch (error) {
    console.error("Officer dashboard error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export const getComplaintsById = async (req, res) => {
  try {
    const officerId = req.user._id;
    const complaintId = req.params.id;

    const complaint = await Complaint.findOne({
      _id: complaintId,
      assignedOfficer: officerId,
    })
      .populate("user", "name email phone")
      .populate("department", "name code contactInfo")
      .populate("assignedOfficer", "name email designation")
      .populate("timeline.updatedBy", "name email");

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found or not assigned to you",
      });
    }

    res.status(200).json({ success: true, complaint });
  } catch (error) {
    console.error("Get complaint error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export const getComplaintById = getComplaintsById;

export const updateComplaintStatus = async (req, res) => {
  try {
    const officerId = req.user._id;
    const complaintId = req.params.id;

    const {
      status,
      actionNotes,
      evidenceImages = [],
      // Inspection fields
      inspectionDate,
      inspectionTime,
      inspectorName,
      inspectionNotes,
      // Resolution fields
      resolutionSummary,
      resolutionImages = [],
      completionDate,
      readyForFeedback,
      // Rejection fields
      rejectionReason,
      rejectionExplanation,
    } = req.body;

    // Validate required fields
    if (!status || !actionNotes) {
      return res.status(400).json({
        success: false,
        message: "Status and action notes are required",
      });
    }

    // Validate status-specific fields
    if (
      status === "Inspection Scheduled" &&
      (!inspectionDate || !inspectionTime || !inspectorName)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Inspection details required" });
    }

    if (status === "Resolved" && !resolutionSummary) {
      return res
        .status(400)
        .json({ success: false, message: "Resolution summary required" });
    }

    if (status === "Rejected" && (!rejectionReason || !rejectionExplanation)) {
      return res
        .status(400)
        .json({ success: false, message: "Rejection details required" });
    }

    // Find complaint - officer can only update assigned to them
    const complaint = await Complaint.findOne({
      _id: complaintId,
      assignedOfficer: officerId,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found or not assigned to you",
      });
    }

    // Normalize status to match DB schema
    const statusMap = {
      Assigned: "assigned",
      "In Progress": "in-progress",
      "Inspection Scheduled": "in-progress",
      "Work in Progress": "in-progress",
      Resolved: "resolved",
      Rejected: "rejected",
    };

    const normalizedStatus = statusMap[status] || status.toLowerCase();

    // Update complaint status and record status history for citizen notifications
    complaint.recordStatusChange(
      normalizedStatus,
      officerId,
      actionNotes,
      "officer",
    );

    // Set resolution date if resolved
    if (normalizedStatus === "resolved") {
      complaint.resolvedDate = completionDate ? new Date(completionDate) : new Date();

      // Store resolution details in complaint schema (if field exists)
      if (!complaint.resolutionDetails) {
        complaint.resolutionDetails = {};
      }
      complaint.resolutionDetails.summary = resolutionSummary;
      complaint.resolutionDetails.images = resolutionImages;
      complaint.resolutionDetails.completedAt = complaint.resolvedDate;
      complaint.resolutionDetails.readyForFeedback = readyForFeedback || false;
    }

    // Set rejection details if rejected
    if (normalizedStatus === "rejected") {
      complaint.rejectionReason = rejectionReason;
      if (!complaint.rejectionDetails) complaint.rejectionDetails = {};
      complaint.rejectionDetails.reason = rejectionReason;
      complaint.rejectionDetails.explanation = rejectionExplanation;
    }

    // Add timeline update
    const timelineUpdate = {
      status: normalizedStatus,
      message: actionNotes,
      updatedBy: officerId,
      updatedAt: new Date(),
    };

    // Add status-specific timeline data
    if (status === "Inspection Scheduled") {
      timelineUpdate.metadata = {
        inspectionDate,
        inspectionTime,
        inspector: inspectorName,
        notes: inspectionNotes,
      };
    }

    if (evidenceImages.length > 0) {
      timelineUpdate.attachments = evidenceImages;
    }

    complaint.timeline.unshift(timelineUpdate);

    await complaint.save();

    await createStatusNotification({
      userId: complaint.user,
      complaint,
      status: normalizedStatus,
      message: actionNotes || `Complaint status updated to ${status}`,
      source: "officer",
      metadata: {
        officerId,
      },
    });

    // Populate response
    const updatedComplaint = await Complaint.findById(complaint._id)
      .populate("user", "name email phone")
      .populate("department", "name code")
      .populate("assignedOfficer", "name email")
      .populate("timeline.updatedBy", "name email");

    res.status(200).json({
      success: true,
      message: `Complaint status updated to ${status}`,
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export const addComplaintNote = async (req, res) => {
  try {
    const officerId = req.user._id;
    const complaintId = req.params.id;
    const { message, attachments = [] } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Note message is required" });
    }

    const complaint = await Complaint.findOne({
      _id: complaintId,
      assignedOfficer: officerId,
    });

    if (!complaint) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Complaint not found or not assigned to you",
        });
    }

    // Add note to timeline (without changing status)
    complaint.timeline.unshift({
      status: complaint.status, // Keep current status
      message,
      updatedBy: officerId,
      updatedAt: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    await complaint.save();

    const updatedComplaint = await Complaint.findById(complaint._id).populate(
      "timeline.updatedBy",
      "name email",
    );

    res.status(200).json({
      success: true,
      message: "Note added successfully",
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error("Add note error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
