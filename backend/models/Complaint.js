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
      enum: ["filed", "assigned", "in_progress", "resolved", "rejected"],
      default: "filed",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
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

complaintSchema.pre('save', async function(next) {
  if (!this.complaintId) {
    // Generate ID like: GR2024001234
    const year = new Date().getFullYear();
    const count = await mongoose.model('Complaint').countDocuments();
    this.complaintId = `GR${year}${String(count + 1).padStart(6, '0')}`;
  }
  next();
});


complaintSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const filed = this.createdAt;
  const diffTime = Math.abs(now - filed);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

complaintSchema.methods.addUpdate = function(message, userId) {
  this.updates.push({
    message,
    updatedBy: userId
  });
  return this.save();
};

complaintSchema.methods.addInternalNote = function(note, userId) {
  this.internalNotes.push({
    note,
    addedBy: userId
  });
  return this.save();
};

complaintSchema.methods.assignTo = function(departmentId, officerId) {
  this.department = departmentId;
  this.assignedOfficer = officerId;
  this.assignedDate = new Date();
  this.status = 'assigned';
  
  // Set estimated resolution (7 days from now by default)
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + 7);
  this.estimatedResolution = estimatedDate;
  
  return this.save();
};

complaintSchema.methods.updateStatus = function(newStatus, userId, message) {
  this.status = newStatus;
  
  if (newStatus === 'resolved') {
    this.resolvedDate = new Date();
  }
  
  if (message) {
    this.addUpdate(message, userId);
  }
  
  return this.save();
};

complaintSchema.statics.getStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    pending: 0,
    'in-progress': 0,
    resolved: 0,
    rejected: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

complaintSchema.statics.getCategoryBreakdown = async function(userId) {
  return await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;