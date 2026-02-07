import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    categories: [
      {
        type: String,
        enum: [
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

departmentSchema.index({ name: 1 });
departmentSchema.index({ categories: 1 });

departmentSchema.methods.addOfficer = function(officerId) {
  if (!this.officers.includes(officerId)) {
    this.officers.push(officerId);
    return this.save();
  }
  return this;
};

departmentSchema.methods.removeOfficer = function(officerId) {
  this.officers = this.officers.filter(id => id.toString() !== officerId.toString());
  return this.save();
};

departmentSchema.statics.findByCategory = function(category) {
  return this.findOne({ categories: category, isActive: true });
};

const Department = mongoose.model("Department", departmentSchema);

export default Department;