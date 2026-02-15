import Complaint from "../models/Complaint.js";
import Department from "../models/Department.js";
import Notification from "../models/Notification.js";
import { getFileType } from "../config/cloudinary.js";
import { createStatusNotification } from "../utils/notification.js";

const ACTIVE_COMPLAINT_STATUSES = ["filed", "assigned", "pending", "in-progress", "in_progress"];

const CATEGORY_ALIASES = {
  "Sanitation & Garbage": ["Sanitation", "Waste Collection", "sanitation"],
  "Drainage & Sewage": ["Sewage", "drainage"],
  "Street Lights": ["Streetlights", "streetlights"],
  "Parks & Gardens": ["Parks & Recreation", "parks"],
  Other: ["others"],
};

const findDepartmentForCategory = async (category) => {
  const aliases = CATEGORY_ALIASES[category] || [];
  return await Department.findOne({
    isActive: true,
    categories: { $in: [category, ...aliases] },
  }).select("_id slaTargets officers");
};

const pickLeastLoadedOfficer = async (department) => {
  if (!department?.officers?.length) return null;

  const workload = await Complaint.aggregate([
    {
      $match: {
        department: department._id,
        assignedOfficer: { $in: department.officers },
        status: { $in: ACTIVE_COMPLAINT_STATUSES },
      },
    },
    { $group: { _id: "$assignedOfficer", activeCount: { $sum: 1 } } },
  ]);

  const loadMap = new Map(workload.map((w) => [String(w._id), w.activeCount]));

  return [...department.officers]
    .sort((a, b) => {
      const loadA = loadMap.get(String(a)) || 0;
      const loadB = loadMap.get(String(b)) || 0;
      if (loadA !== loadB) return loadA - loadB;
      return String(a).localeCompare(String(b));
    })[0];
};

export const fileComplaint = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      address,
      latitude,
      longitude,
      isDraft,
    } = req.body;
    if (!isDraft) {
      if (!title || !category || !description || !address) {
        return res.status(400).json({
          success: false,
          message: "Please provide all required fields",
        });
      }
    }
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        attachments.push({
          fileUrl: file.path,
          fileType: getFileType(file.mimetype),
          fileName: file.originalname,
          fileSize: file.size,
        });
      });
    }
    const complaint = await Complaint.create({
      user: req.user.id,
      title,
      category,
      description,
      location: {
        address,
        coordinates: {
          latitude: latitude || null,
          longitude: longitude || null,
        },
      },
      attachments,
      isDraft: isDraft || false,
    });

    if (!isDraft) {
      complaint.recordStatusChange(
        "filed",
        req.user.id,
        "Complaint filed by citizen",
        "user",
      );
      complaint.timeline.unshift({
        status: "filed",
        message: "Complaint filed by citizen",
        updatedBy: req.user.id,
        updatedAt: new Date(),
      });
    }

    if (!isDraft) {
      const department = await findDepartmentForCategory(category);
      if (department) {
        complaint.department = department._id;

        const selectedOfficer = await pickLeastLoadedOfficer(department);
        if (selectedOfficer) {
          complaint.assignedOfficer = selectedOfficer;
          complaint.assignedDate = new Date();
          complaint.recordStatusChange(
            "assigned",
            selectedOfficer,
            "Complaint assigned to department officer",
            "system",
          );
          complaint.timeline.unshift({
            status: "assigned",
            message: "Complaint assigned to department officer",
            updatedBy: selectedOfficer,
            updatedAt: new Date(),
          });
          await createStatusNotification({
            userId: complaint.user,
            complaint,
            status: "assigned",
            message: "Your complaint has been assigned to an officer.",
            source: "system",
          });

          const slaHours = department.slaTargets?.[complaint.priority] || 72;
          complaint.estimatedResolution = new Date(
            Date.now() + slaHours * 60 * 60 * 1000,
          );
        }

        await complaint.save();
      }
    }
    await complaint.populate("user", "name email phone");
    await complaint.populate("department", "name contactInfo");
    await complaint.populate("assignedOfficer", "name email phone");

    res.status(201).json({
      success: true,
      message: isDraft
        ? "Complaint saved as draft"
        : "Complaint filed successfully",
      data: {
        complaint,
      },
    });
  } catch (error) {
    console.error("File complaint error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to file complaint",
      error: error.message,
    });
  }
};

export const getMyComplaints = async (req, res) => {
  try {
    const {
      status,
      category,
      search,
      sortBy,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query;

    const query = { user: req.user.id, isDraft: false };
    if (status && status !== "all") {
      if (status === "in_progress" || status === "in-progress") {
        query.status = { $in: ["in_progress", "in-progress", "assigned"] };
      } else {
        query.status = status;
      }
    }
    if (category && category !== "all") {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { complaintId: { $regex: search, $options: "i" } },
      ];
    }

    if (fromDate) {
      query.createdAt = { $gte: new Date(fromDate) };
    }
    if (toDate) {
      query.createdAt = { ...query.createdAt, $lte: new Date(toDate) };
    }

    let sort = {};
    switch (sortBy) {
      case "latest":
        sort = { createdAt: -1 };
        break;
      case "oldest":
        sort = { createdAt: 1 };
        break;
      case "priority":
        sort = { priority: -1, createdAt: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const complaints = await Complaint.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .populate("department", "name contactInfo")
      .populate("assignedOfficer", "name email phone");

    const total = await Complaint.countDocuments(query);

    const stats = await Complaint.getStats(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        complaints,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
        stats,
      },
    });
  } catch (error) {
    console.error("Get my complaints error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch complaints",
      error: error.message,
    });
  }
};

export const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("user", "name email phone address")
      .populate("department", "name description contactInfo")
      .populate("assignedOfficer", "name email phone")
      .populate("updates.updatedBy", "name role");

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (
      complaint.user._id.toString() !== req.user.id &&
      req.user.role !== "admin" &&
      req.user.role !== "officer"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this complaint",
      });
    }
    res.status(200).json({
      success: true,
      data: {
        complaint,
      },
    });
  } catch (error) {
    console.error("Get complaint error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch complaint",
      error: error.message,
    });
  }
};

export const trackComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;

    const complaint = await Complaint.findOne({
      complaintId: complaintId.toUpperCase(),
      isPubliclyTrackable: true,
    })
      .select("-user -internalNotes -isDraft")
      .populate("department", "name contactInfo");

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found or not publicly trackable",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        complaint: {
          id: complaint.complaintId,
          title: complaint.title,
          category: complaint.category,
          status:
            complaint.status === "in_progress"
              ? "in-progress"
              : complaint.status,
          filedDate: complaint.createdAt,
          assignedDate: complaint.assignedDate,
          lastUpdate: complaint.updatedAt,
          estimatedResolution: complaint.estimatedResolution,
          department: complaint.department
            ? complaint.department.name
            : "Not assigned yet",
          updates: complaint.updates.map((update) => ({
            message: update.message,
            updatedAt: update.updatedAt,
          })),
        },
      },
    });
  } catch (error) {
    console.error("Track complaint error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track complaint",
      error: error.message,
    });
  }
};

export const updateComplaint = async (req, res) => {
  try {
    let complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }
    if (complaint.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this complaint",
      });
    }

    if (complaint.status !== "filed" && !complaint.isDraft) {
      return res.status(400).json({
        success: false,
        message: "Cannot update complaint once it has been assigned",
      });
    }
    const { title, category, description, address, latitude, longitude } =
      req.body;

    if (title) complaint.title = title;
    if (category) complaint.category = category;
    if (description) complaint.description = description;
    if (address) complaint.location.address = address;
    if (latitude) complaint.location.coordinates.latitude = latitude;
    if (longitude) complaint.location.coordinates.longitude = longitude;

    await complaint.save();

    res.status(200).json({
      success: true,
      message: "Complaint updated successfully",
      data: {
        complaint,
      },
    });
  } catch (error) {
    console.error("Update complaint error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update complaint",
      error: error.message,
    });
  }
};

export const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }
    if (complaint.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this complaint",
      });
    }

    if (!complaint.isDraft) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete filed complaints. Please contact support.",
      });
    }

    await complaint.remove();

    res.status(200).json({
      success: true,
      message: "Draft complaint deleted successfully",
    });
  } catch (error) {
    console.error("Delete complaint error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete complaint",
      error: error.message,
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await Complaint.getStats(userId);
    const categoryBreakdown = await Complaint.getCategoryBreakdown(userId);

    const recentComplaints = await Complaint.find({
      user: userId,
      isDraft: false,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("complaintId title category status createdAt")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        stats,
        categoryBreakdown,
        recentComplaints,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};

export const getCitizenAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 5);
    startDate.setDate(1);

    const [totalComplaints, resolvedCount, rejectedCount, pendingCount, avgResolutionAgg, monthlyTrend] =
      await Promise.all([
        Complaint.countDocuments({ user: userId, isDraft: false }),
        Complaint.countDocuments({ user: userId, isDraft: false, status: "resolved" }),
        Complaint.countDocuments({ user: userId, isDraft: false, status: "rejected" }),
        Complaint.countDocuments({
          user: userId,
          isDraft: false,
          status: { $in: ["filed", "assigned", "in-progress", "in_progress"] },
        }),
        Complaint.aggregate([
          {
            $match: {
              user: req.user._id,
              isDraft: false,
              status: "resolved",
              resolvedDate: { $ne: null },
            },
          },
          {
            $project: {
              resolutionDays: {
                $divide: [{ $subtract: ["$resolvedDate", "$createdAt"] }, 1000 * 60 * 60 * 24],
              },
            },
          },
          { $group: { _id: null, avgDays: { $avg: "$resolutionDays" } } },
        ]),
        Complaint.aggregate([
          {
            $match: {
              user: req.user._id,
              isDraft: false,
              createdAt: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              total: { $sum: 1 },
              resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    const resolutionRate = totalComplaints > 0 ? ((resolvedCount / totalComplaints) * 100).toFixed(1) : "0.0";
    const avgResolutionDays = Number(avgResolutionAgg?.[0]?.avgDays || 0).toFixed(1);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalComplaints,
          pendingCount,
          resolvedCount,
          rejectedCount,
          resolutionRate: `${resolutionRate}%`,
          avgResolutionDays: `${avgResolutionDays} days`,
        },
        monthlyTrend: monthlyTrend.map((m) => ({
          month: m._id,
          filed: m.total,
          resolved: m.resolved,
        })),
      },
    });
  } catch (error) {
    console.error("Citizen analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch citizen analytics",
      error: error.message,
    });
  }
};

export const getCitizenNotifications = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);

    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: {
        notifications: notifications.map((n) => ({
          id: n._id,
          complaintId: n.complaintId,
          title: n.title,
          status: n.status,
          message: n.message,
          source: n.source,
          type: n.type,
          isRead: n.isRead,
          readAt: n.readAt,
          updatedAt: n.createdAt,
        })),
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Citizen notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findOne({
      _id: notificationId,
      user: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notification",
      error: error.message,
    });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: { updated: result.modifiedCount || 0 },
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notifications",
      error: error.message,
    });
  }
};

export const getComplaintHistory = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const complaint = await Complaint.findOne({ _id: complaintId, user: req.user.id })
      .select("complaintId title status createdAt resolvedDate statusHistory timeline updates")
      .populate("statusHistory.updatedBy", "name role")
      .populate("timeline.updatedBy", "name role")
      .populate("updates.updatedBy", "name role");

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const history = [
      ...(complaint.statusHistory || []).map((entry) => ({
        status: entry.status,
        message: entry.message || `Status changed to ${entry.status}`,
        updatedAt: entry.updatedAt,
        updatedBy: entry.updatedBy?.name || "System",
        source: entry.source || "system",
      })),
      ...(complaint.timeline || []).map((entry) => ({
        status: entry.status || complaint.status,
        message: entry.message || "Complaint updated",
        updatedAt: entry.updatedAt,
        updatedBy: entry.updatedBy?.name || "System",
        source: "timeline",
      })),
    ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.status(200).json({
      success: true,
      data: {
        complaintId: complaint.complaintId,
        title: complaint.title,
        currentStatus: complaint.status,
        createdAt: complaint.createdAt,
        resolvedDate: complaint.resolvedDate,
        history,
      },
    });
  } catch (error) {
    console.error("Complaint history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch complaint history",
      error: error.message,
    });
  }
};

export const submitComplaintFeedback = async (req, res) => {
  try {
    const { rating, comment = "" } = req.body;
    const complaint = await Complaint.findOne({ _id: req.params.id, user: req.user.id });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.status !== "resolved") {
      return res.status(400).json({
        success: false,
        message: "Feedback can only be submitted after complaint resolution",
      });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    complaint.feedback = {
      rating: numericRating,
      comment: String(comment || "").trim(),
      submittedAt: new Date(),
      submittedBy: req.user.id,
    };

    complaint.timeline.unshift({
      status: complaint.status,
      message: `Citizen submitted feedback (${numericRating}/5)`,
      updatedBy: req.user.id,
      updatedAt: new Date(),
      metadata: { rating: numericRating },
    });

    await complaint.save();

    res.status(200).json({
      success: true,
      message: "Feedback submitted successfully",
      data: {
        complaintId: complaint.complaintId,
        feedback: complaint.feedback,
      },
    });
  } catch (error) {
    console.error("Submit feedback error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
      error: error.message,
    });
  }
};

export const getMyDrafts = async (req, res) => {
  try {
    const drafts = await Complaint.find({
      user: req.user.id,
      isDraft: true,
    })
      .sort({ updatedAt: -1 })
      .select("title category description createdAt updatedAt");

    res.status(200).json({
      success: true,
      data: {
        drafts,
        count: drafts.length,
      },
    });
  } catch (error) {
    console.error("Get drafts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch drafts",
      error: error.message,
    });
  }
};
