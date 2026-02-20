import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Please provide a title for the complaint"],
      trim: true,
      maxlength: [200, "Title cannot be more than 200 characters"],
    },
    category: {
      type: String,
      required: [true, "Please provide a category for the complaint"],
      enum: [
        "Roads & Infrastructure",
        "Water Supply",
        "Electricity",
        "Sanitation & Garbage",
        "Drainage & Sewage",
        "Street Lights",
        "Parks & Gardens",
        "Pollution",
        "Encroachment",
        "Other",
      ],
    },
    description: {
      type: String,
      required: [true, "Please provide a description for the complaint"],
      trim: true,
      maxlength: [1000, "Description cannot be more than 1000 characters"],
    },
    location: {
      address: {
        type: String,
        required: [true, "Please provide an address for the complaint"],
      },
      coordinates: {
        latitude: {
          type: Number,
          default: null,
        },
        longitude: {
          type: Number,
          default: null,
        },
      },
    },
    voiceMetadata: {
      source: {
        type: String,
        enum: ["voice", "text", "mixed"],
        default: "text",
      },
      language: {
        type: String,
        enum: ["hi", "en", "ur", "other"],
        default: "other",
      },
      locale: {
        type: String,
        default: "",
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: null,
      },
      transcript: {
        type: String,
        trim: true,
        maxlength: [4000, "Transcript cannot be more than 4000 characters"],
        default: "",
      },
      capturedAt: {
        type: Date,
        default: null,
      },
    },

    attachments: [
      {
        fileUrl: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          required: true,
          enum: ["image", "video"],
        },
        fileName: {
          type: String,
          required: true,
        },
        fileSize: {
          type: Number,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    status: {
      type: String,
      enum: [
        "filed",
        "assigned",
        "pending",
        "in_progress",
        "in-progress",
        "resolved",
        "rejected",
      ],
      default: "filed",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedDate: {
      type: Date,
      default: null,
    },
    estimatedResolution: {
      type: Date,
      default: null,
    },
    resolvedDate: {
      type: Date,
      default: null,
    },
    updates: [
      {
        message: {
          type: String,
          required: true,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    internalNotes: [
      {
        note: {
          type: String,
          required: true,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    rejectionReason: {
      type: String,
      default: null,
    },
    rejectionDetails: {
      reason: String,
      explanation: String,
    },
    resolutionDetails: {
      summary: String,
      images: [String],
      completedAt: Date,
      readyForFeedback: Boolean,
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      comment: {
        type: String,
        trim: true,
        maxlength: [1000, "Feedback cannot exceed 1000 characters"],
        default: "",
      },
      submittedAt: {
        type: Date,
        default: null,
      },
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        message: {
          type: String,
          default: "",
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        source: {
          type: String,
          enum: ["system", "admin", "officer", "user"],
          default: "system",
        },
      },
    ],
    timeline: [
      {
        status: String,
        message: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        attachments: [String],
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],
    isDraft: {
      type: Boolean,
      default: false,
    },

    isPubliclyTrackable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

complaintSchema.index({ complaintId: 1 });
complaintSchema.index({ user: 1, status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ createdAt: -1 });

complaintSchema.pre("validate", async function () {
  if (this.complaintId) return;
  const year = new Date().getFullYear();
  const count = await mongoose.model("Complaint").countDocuments();
  this.complaintId = `GR${year}${String(count + 1).padStart(6, "0")}`;
});

complaintSchema.virtual("ageInDays").get(function () {
  const now = new Date();
  const filed = this.createdAt;
  const diffTime = Math.abs(now - filed);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

complaintSchema.methods.addUpdate = function (message, userId) {
  this.updates.push({
    message,
    updatedBy: userId,
  });
  return this.save();
};

complaintSchema.methods.addInternalNote = function (note, userId) {
  this.internalNotes.push({
    note,
    addedBy: userId,
  });
  return this.save();
};

complaintSchema.methods.assignTo = function (departmentId, officerId) {
  this.department = departmentId;
  this.assignedOfficer = officerId;
  this.assignedDate = new Date();
  this.status = "assigned";

  // Set estimated resolution (7 days from now by default)
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + 7);
  this.estimatedResolution = estimatedDate;

  return this.save();
};

complaintSchema.methods.updateStatus = function (newStatus, userId, message) {
  this.status = newStatus;

  if (newStatus === "resolved") {
    this.resolvedDate = new Date();
  }

  if (message) {
    this.addUpdate(message, userId);
  }

  return this.save();
};

complaintSchema.methods.recordStatusChange = function (
  newStatus,
  userId,
  message = "",
  source = "system",
) {
  this.status = newStatus;

  if (newStatus === "resolved") {
    this.resolvedDate = new Date();
  }

  this.statusHistory.unshift({
    status: newStatus,
    message,
    updatedBy: userId || null,
    source,
    updatedAt: new Date(),
  });
};

complaintSchema.statics.getStats = async function (userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      total: 0,
      pending: 0,
      "in-progress": 0,
      resolved: 0,
      rejected: 0,
    };
  }
  const stats = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    pending: 0,
    "in-progress": 0,
    resolved: 0,
    rejected: 0,
  };

  stats.forEach((stat) => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

complaintSchema.statics.getCategoryBreakdown = async function (userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return [];
  }
  return await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;
