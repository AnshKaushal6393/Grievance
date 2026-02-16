import mongoose from "mongoose";

const adminSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
      trim: true,
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

adminSettingSchema.index({ key: 1 }, { unique: true });

const AdminSetting = mongoose.model("AdminSetting", adminSettingSchema);

export default AdminSetting;
