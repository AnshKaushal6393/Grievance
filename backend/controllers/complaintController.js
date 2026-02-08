import Complaint from "../models/Complaint.js";
import Department from "../models/Department.js";
import { getFileType } from "../config/cloudinary.js";

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
      const department = await Department.findByCategory(category);
      if (department) {
        complaint.department = department._id;
        await complaint.save();
      }
    }
    await complaint.populate("user", "name email phone");
    await complaint.populate("department", "name contactInfo");

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
      query.status = status;
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
          status: complaint.status,
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
