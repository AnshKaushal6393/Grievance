import Complaint from "../models/Complaint.js";
import Department from "../models/Department.js";
import Notification from "../models/Notification.js";
import NotificationPreference from "../models/NotificationPreference.js";
import { getFileType } from "../config/cloudinary.js";
import { createStatusNotification } from "../utils/notification.js";

const CATEGORY_ALIASES = {
  "Sanitation & Garbage": ["Sanitation", "Waste Collection", "sanitation"],
  "Drainage & Sewage": ["Sewage", "drainage"],
  "Street Lights": ["Streetlights", "streetlights"],
  "Parks & Gardens": ["Parks & Recreation", "parks"],
  Other: ["others"],
};

const CATEGORY_KEYWORDS = {
  "Roads & Infrastructure": [
    "road",
    "pothole",
    "footpath",
    "sidewalk",
    "bridge",
    "asphalt",
    "street damage",
  ],
  "Water Supply": [
    "water",
    "pipeline",
    "pipe leak",
    "no water",
    "drinking water",
    "tap",
    "seepage",
  ],
  Electricity: [
    "electricity",
    "power",
    "voltage",
    "transformer",
    "power cut",
    "outage",
  ],
  "Sanitation & Garbage": [
    "garbage",
    "trash",
    "waste",
    "cleaning",
    "dirty",
    "dump",
    "sanitation",
  ],
  "Drainage & Sewage": [
    "drain",
    "drainage",
    "sewage",
    "sewer",
    "manhole",
    "waterlogging",
    "stagnant water",
  ],
  "Street Lights": [
    "street light",
    "streetlight",
    "light pole",
    "lamp",
    "dark road",
  ],
  "Parks & Gardens": [
    "park",
    "garden",
    "playground",
    "tree",
    "grass",
  ],
  Pollution: [
    "pollution",
    "smoke",
    "air quality",
    "noise",
    "contamination",
  ],
  Encroachment: [
    "encroachment",
    "illegal construction",
    "occupation",
    "blocked road",
    "blocked footpath",
  ],
};

const DEPARTMENT_CATEGORY_MAP = {
  "Roads & Infrastructure": ["Roads & Infrastructure", "roads", "Bridges"],
  "Water Supply": ["Water Supply", "water", "Pipelines", "Water Quality"],
  Electricity: ["Electricity", "electricity", "Power Outages"],
  "Sanitation & Garbage": ["Sanitation", "Waste Collection", "sanitation"],
  "Drainage & Sewage": ["Sewage", "drainage"],
  "Street Lights": ["Streetlights", "streetlights"],
  "Parks & Gardens": ["Parks & Recreation", "parks"],
  Pollution: ["Pollution", "pollution", "Environment"],
  Encroachment: ["encroachment"],
  Other: ["others", "Municipal"],
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no", ""].includes(normalized)) return false;
  }
  return false;
};

const normalizeCategoryInput = (category) => {
  if (!category) return "";
  const trimmed = String(category).trim();
  if (!trimmed) return "";

  const directMatch = Object.keys(CATEGORY_ALIASES).find(
    (key) => key.toLowerCase() === trimmed.toLowerCase(),
  );
  if (directMatch) return directMatch;

  const aliasMatch = Object.entries(CATEGORY_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => alias.toLowerCase() === trimmed.toLowerCase()),
  );
  if (aliasMatch) return aliasMatch[0];

  return "";
};

const inferCategoryFromText = ({ title = "", description = "" }) => {
  const text = `${title} ${description}`.toLowerCase();
  if (!text.trim()) return "Other";

  let bestMatch = { category: "Other", score: 0 };
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce(
      (total, keyword) => (text.includes(keyword.toLowerCase()) ? total + 1 : total),
      0,
    );
    if (score > bestMatch.score) {
      bestMatch = { category, score };
    }
  }
  return bestMatch.category;
};

const resolveComplaintCategory = ({ category, title, description }) => {
  const normalized = normalizeCategoryInput(category);
  if (normalized) return normalized;
  return inferCategoryFromText({ title, description });
};

const findDepartmentForCategory = async (category) => {
  const aliases = DEPARTMENT_CATEGORY_MAP[category] || CATEGORY_ALIASES[category] || [];
  return await Department.findOne({
    isActive: true,
    categories: { $in: [category, ...aliases] },
  }).select("_id slaTargets");
};

const assignComplaintWorkflow = async (complaint) => {
  const department = await findDepartmentForCategory(complaint.category);
  if (department) {
    complaint.department = department._id;
    complaint.status = "pending";
    complaint.recordStatusChange(
      "pending",
      null,
      "Complaint routed to department queue for review",
      "system",
    );
    complaint.timeline.unshift({
      status: "pending",
      message: "Complaint routed to department queue for review",
      updatedBy: null,
      updatedAt: new Date(),
    });
    await createStatusNotification({
      userId: complaint.user,
      complaint,
      status: "pending",
      message: "Your complaint has been routed to the relevant department.",
      source: "system",
    });

    const slaHours = department.slaTargets?.[complaint.priority] || 72;
    complaint.estimatedResolution = new Date(
      Date.now() + slaHours * 60 * 60 * 1000,
    );
  }

  await complaint.save();
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
      source,
      voiceLanguage,
      voiceLocale,
      voiceConfidence,
      voiceTranscript,
    } = req.body;
    const draftMode = parseBoolean(isDraft);
    if (!draftMode) {
      if (!title || !description || !address) {
        return res.status(400).json({
          success: false,
          message: "Please provide title, description and address",
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
    const parsedVoiceConfidence =
      voiceConfidence !== undefined && voiceConfidence !== null
        ? Number(voiceConfidence)
        : null;
    const safeVoiceConfidence =
      parsedVoiceConfidence !== null &&
      !Number.isNaN(parsedVoiceConfidence) &&
      parsedVoiceConfidence >= 0 &&
      parsedVoiceConfidence <= 1
        ? parsedVoiceConfidence
        : null;

    const complaint = await Complaint.create({
      user: req.user.id,
      title,
      category: resolveComplaintCategory({ category, title, description }),
      description,
      location: {
        address,
        coordinates: {
          latitude: latitude || null,
          longitude: longitude || null,
        },
      },
      attachments,
      isDraft: draftMode,
      voiceMetadata:
        source === "voice"
          ? {
              source: "voice",
              language: ["hi", "en", "ur"].includes(voiceLanguage)
                ? voiceLanguage
                : "other",
              locale: voiceLocale || "",
              confidence: safeVoiceConfidence,
              transcript: voiceTranscript || "",
              capturedAt: new Date(),
            }
          : undefined,
    });

    if (!draftMode) {
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
      await assignComplaintWorkflow(complaint);
    }
    await complaint.populate("user", "name email phone");
    await complaint.populate("department", "name contactInfo");
    await complaint.populate("assignedOfficer", "name email phone");

    res.status(201).json({
      success: true,
      message: draftMode
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
    if (req.files && req.files.length > 0 && complaint.isDraft) {
      const attachments = req.files.map((file) => ({
        fileUrl: file.path,
        fileType: getFileType(file.mimetype),
        fileName: file.originalname,
        fileSize: file.size,
      }));
      complaint.attachments = [...(complaint.attachments || []), ...attachments]
        .slice(0, 5);
    }

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

    await complaint.deleteOne();

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

export const submitDraft = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      user: req.user.id,
      isDraft: true,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Draft complaint not found",
      });
    }

    if (
      !complaint.title ||
      !complaint.description ||
      !complaint.location?.address
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete title, description and address",
      });
    }

    complaint.isDraft = false;
    complaint.category = resolveComplaintCategory({
      category: complaint.category,
      title: complaint.title,
      description: complaint.description,
    });
    complaint.recordStatusChange(
      "filed",
      req.user.id,
      "Draft complaint submitted by citizen",
      "user",
    );
    complaint.timeline.unshift({
      status: "filed",
      message: "Draft complaint submitted by citizen",
      updatedBy: req.user.id,
      updatedAt: new Date(),
    });

    await assignComplaintWorkflow(complaint);
    await complaint.populate("department", "name contactInfo");
    await complaint.populate("assignedOfficer", "name email phone");

    res.status(200).json({
      success: true,
      message: "Draft submitted successfully",
      data: { complaint },
    });
  } catch (error) {
    console.error("Submit draft error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit draft",
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

export const updateComplaintVoiceMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      source = "voice",
      language = "other",
      locale = "",
      confidence = null,
      transcript = "",
    } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (complaint.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update voice metadata for this complaint",
      });
    }

    const parsedConfidence =
      confidence === null || confidence === undefined
        ? null
        : Number(confidence);
    const safeConfidence =
      parsedConfidence !== null &&
      !Number.isNaN(parsedConfidence) &&
      parsedConfidence >= 0 &&
      parsedConfidence <= 1
        ? parsedConfidence
        : null;

    complaint.voiceMetadata = {
      source: source === "voice" || source === "mixed" ? source : "text",
      language: ["hi", "en", "ur"].includes(language) ? language : "other",
      locale: String(locale || ""),
      confidence: safeConfidence,
      transcript: String(transcript || "").slice(0, 4000),
      capturedAt: new Date(),
    };

    await complaint.save();

    res.status(200).json({
      success: true,
      message: "Voice metadata updated successfully",
      data: {
        complaintId: complaint.complaintId,
        voiceMetadata: complaint.voiceMetadata,
      },
    });
  } catch (error) {
    console.error("Update complaint voice metadata error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update voice metadata",
      error: error.message,
    });
  }
};

const mapNotificationPayload = (n) => ({
  id: n._id,
  complaintId: n.complaintId,
  title: n.title,
  status: n.status,
  message: n.message,
  source: n.source,
  type: n.type,
  priority: n.priority || "medium",
  channels: n.channels || {},
  actionUrl: n.actionUrl || "",
  isRead: n.isRead,
  readAt: n.readAt,
  isArchived: Boolean(n.archivedAt),
  archivedAt: n.archivedAt || null,
  updatedAt: n.createdAt,
});

export const getCitizenNotifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      100,
    );
    const skip = (page - 1) * limit;

    const query = { user: req.user.id };
    const isReadParam = req.query.isRead;
    const type = String(req.query.type || "").trim();
    const priority = String(req.query.priority || "").trim();
    const source = String(req.query.source || "").trim();
    const search = String(req.query.search || "").trim();
    const includeArchived =
      String(req.query.includeArchived || "false").toLowerCase() === "true";

    if (isReadParam === "true") query.isRead = true;
    if (isReadParam === "false") query.isRead = false;
    if (type && type !== "all") query.type = type;
    if (priority && priority !== "all") {
      if (priority.includes(",")) {
        query.priority = {
          $in: priority
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        };
      } else {
        query.priority = priority;
      }
    }
    if (source && source !== "all") query.source = source;
    if (!includeArchived) query.archivedAt = null;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
        { complaintId: { $regex: search, $options: "i" } },
      ];
    }

    const [notifications, total, unreadCount, summary] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({
        user: req.user.id,
        isRead: false,
        archivedAt: null,
      }),
      Notification.aggregate([
        { $match: { user: req.user._id, archivedAt: null } },
        {
          $group: {
            _id: null,
            highPriorityCount: {
              $sum: {
                $cond: [{ $in: ["$priority", ["high", "critical"]] }, 1, 0],
              },
            },
            byType: {
              $push: "$type",
            },
          },
        },
      ]),
    ]);

    const typeCounts = (summary?.[0]?.byType || []).reduce((acc, typeValue) => {
      const key = String(typeValue || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        notifications: notifications.map(mapNotificationPayload),
        unreadCount,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
        summary: {
          highPriorityCount: summary?.[0]?.highPriorityCount || 0,
          typeCounts,
        },
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
    const markAsRead =
      req.body?.isRead === undefined ? true : Boolean(req.body?.isRead);
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

    notification.isRead = markAsRead;
    notification.readAt = markAsRead ? new Date() : null;
    await notification.save();

    res.status(200).json({
      success: true,
      message: markAsRead
        ? "Notification marked as read"
        : "Notification marked as unread",
      data: {
        notification: mapNotificationPayload(notification),
      },
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
    const query = { user: req.user.id };
    if (String(req.body?.type || "").trim()) {
      query.type = String(req.body.type).trim();
    }
    if (req.body?.onlyUnread !== false) {
      query.isRead = false;
    }
    if (req.body?.includeArchived !== true) {
      query.archivedAt = null;
    }

    const result = await Notification.updateMany(query, {
      $set: { isRead: true, readAt: new Date() },
    });

    res.status(200).json({
      success: true,
      message: "Notifications marked as read",
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

export const archiveNotification = async (req, res) => {
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

    notification.archivedAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification archived",
      data: {
        notification: mapNotificationPayload(notification),
      },
    });
  } catch (error) {
    console.error("Archive notification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive notification",
      error: error.message,
    });
  }
};

export const archiveAllNotifications = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.id, archivedAt: null },
      { $set: { archivedAt: new Date() } },
    );

    res.status(200).json({
      success: true,
      message: "All notifications archived",
      data: { updated: result.modifiedCount || 0 },
    });
  } catch (error) {
    console.error("Archive all notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive notifications",
      error: error.message,
    });
  }
};

export const getNotificationPreferences = async (req, res) => {
  try {
    let preference = await NotificationPreference.findOne({
      user: req.user.id,
    }).lean();

    if (!preference) {
      preference = await NotificationPreference.create({ user: req.user.id });
      preference = preference.toObject();
    }

    res.status(200).json({
      success: true,
      data: {
        preferences: preference,
      },
    });
  } catch (error) {
    console.error("Get notification preferences error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load notification preferences",
      error: error.message,
    });
  }
};

export const updateNotificationPreferences = async (req, res) => {
  try {
    const payload = req.body?.preferences;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({
        success: false,
        message: "A valid preferences object is required",
      });
    }

    const updated = await NotificationPreference.findOneAndUpdate(
      { user: req.user.id },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    res.status(200).json({
      success: true,
      message: "Notification preferences updated",
      data: {
        preferences: updated,
      },
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notification preferences",
      error: error.message,
    });
  }
};

export const seedDemoNotifications = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Demo seed is disabled in production",
      });
    }

    const count = Math.min(
      Math.max(parseInt(req.body?.count || "10", 10), 1),
      30,
    );
    const userId = req.user.id;
    const now = Date.now();

    const complaints = await Complaint.find({
      user: userId,
      isDraft: false,
    })
      .sort({ updatedAt: -1 })
      .limit(6)
      .select("_id complaintId title status")
      .lean();

    const templates = [
      {
        type: "status_update",
        priority: "medium",
        source: "system",
        message: "Status updated to in-progress by field team.",
      },
      {
        type: "assignment",
        priority: "medium",
        source: "admin",
        message: "Complaint assigned to relevant department.",
      },
      {
        type: "escalation",
        priority: "high",
        source: "system",
        message: "SLA warning: complaint is close to breach.",
      },
      {
        type: "announcement",
        priority: "low",
        source: "admin",
        message: "Service notice: scheduled maintenance tonight.",
      },
      {
        type: "reminder",
        priority: "medium",
        source: "system",
        message: "Reminder: please review and rate resolved complaint.",
      },
      {
        type: "feedback",
        priority: "low",
        source: "officer",
        message: "Your feedback helps improve response quality.",
      },
      {
        type: "escalation",
        priority: "critical",
        source: "system",
        message: "Critical SLA breach detected. Immediate action required.",
      },
    ];

    const docs = Array.from({ length: count }).map((_, idx) => {
      const complaint = complaints[idx % Math.max(complaints.length, 1)] || null;
      const template = templates[idx % templates.length];
      const createdAt = new Date(now - idx * 60 * 60 * 1000);
      const isRead = idx % 3 === 0;

      return {
        user: userId,
        complaint: complaint?._id || null,
        complaintId: complaint?.complaintId || `DEMO-${String(1000 + idx)}`,
        title: complaint?.title || "Demo notification",
        status: complaint?.status || "info",
        message: template.message,
        source: template.source,
        type: template.type,
        priority: template.priority,
        channels: {
          inApp: true,
          email: idx % 2 === 0,
          sms: idx % 5 === 0,
          push: idx % 4 === 0,
        },
        actionUrl: complaint?.complaintId
          ? `/track-complaint?complaintId=${complaint.complaintId}`
          : "/dashboard",
        isRead,
        readAt: isRead ? createdAt : null,
        metadata: { demo: true },
        createdAt,
        updatedAt: createdAt,
      };
    });

    await Notification.insertMany(docs);

    res.status(201).json({
      success: true,
      message: `Seeded ${docs.length} demo notifications`,
      data: {
        created: docs.length,
      },
    });
  } catch (error) {
    console.error("Seed demo notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to seed demo notifications",
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
      .select(
        "_id complaintId title category description location attachments createdAt updatedAt",
      );

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
