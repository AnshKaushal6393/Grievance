import mongoose from "mongoose";

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },
    categories: {
      status_update: { type: Boolean, default: true },
      assignment: { type: Boolean, default: true },
      reminder: { type: Boolean, default: true },
      escalation: { type: Boolean, default: true },
      announcement: { type: Boolean, default: true },
      feedback: { type: Boolean, default: true },
      system: { type: Boolean, default: true },
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: "22:00" },
      end: { type: String, default: "07:00" },
      timezone: { type: String, default: "Asia/Kolkata" },
    },
    digest: {
      frequency: {
        type: String,
        enum: ["none", "daily", "weekly"],
        default: "daily",
      },
      lastSentAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

const NotificationPreference = mongoose.model(
  "NotificationPreference",
  notificationPreferenceSchema,
);

export default NotificationPreference;
