import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Department code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxLength: 10,
    },
    description: {
      type: String,
      trim: true,
    },
    categories: [
      {
        type: String,
        enum: [
          // legacy keys
          "roads",
          "water",
          "electricity",
          "sanitation",
          "drainage",
          "streetlights",
          "parks",
          "pollution",
          "encroachment",
          "others",
          // full list matching frontend allCategories
          "Roads & Infrastructure",
          "Bridges",
          "Public Buildings",
          "Water Supply",
          "Pipelines",
          "Water Quality",
          "Electricity",
          "Streetlights",
          "Power Outages",
          "Sanitation",
          "Waste Collection",
          "Sewage",
          "Traffic",
          "Road Safety",
          "Signals",
          "Environment",
          "Pollution",
          "Green Initiatives",
          "Parks & Recreation",
          "Municipal",
          "Health",
          "Education",
        ],
      },
    ],
    headOfDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    officers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    contactInfo: {
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    maxCapacity: { type: Number, default: 50 },

    slaTargets: {
      low: { type: Number, default: 168 },
      medium: { type: Number, default: 72 },
      high: { type: Number, default: 24 },
      critical: { type: Number, default: 4 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

departmentSchema.index({ name: 1 });
departmentSchema.index({ categories: 1 });
departmentSchema.index({ isActive: 1 });



departmentSchema.methods.addOfficer = function (officerId) {
  if (!this.officers.includes(officerId)) {
    this.officers.push(officerId);
    return this.save();
  }
  return this;
};

departmentSchema.methods.removeOfficer = function (officerId) {
  this.officers = this.officers.filter(
    (id) => id.toString() !== officerId.toString(),
  );
  return this.save();
};

departmentSchema.statics.findByCategory = function (category) {
  return this.findOne({ categories: category, isActive: true });
};

const Department = mongoose.model("Department", departmentSchema);

export default Department;
