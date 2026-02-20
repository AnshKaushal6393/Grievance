import mongoose from "mongoose";

const reportConfigSchema = new mongoose.Schema(
  {
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    departments: { type: [String], default: [] },
    categories: { type: [String], default: [] },
    statuses: { type: [String], default: [] },
    priorities: { type: [String], default: [] },
    groupBy: { type: String, enum: ["department", "category", "date", "status"], default: "department" },
    include: {
      charts: { type: Boolean, default: true },
      detailedList: { type: Boolean, default: false },
      executiveSummary: { type: Boolean, default: true },
      recommendations: { type: Boolean, default: true },
      rawData: { type: Boolean, default: false },
    },
    template: { type: String, enum: ["standard", "detailed", "executive"], default: "standard" },
    sendEmail: { type: Boolean, default: false },
    scheduleRecurring: { type: Boolean, default: false },
  },
  { _id: false },
);

const reportSnapshotSchema = new mongoose.Schema(
  {
    dateRange: { type: String, default: "" },
    groupBy: { type: String, default: "department" },
    departments: { type: [String], default: [] },
    categories: { type: [String], default: [] },
    statuses: { type: [String], default: [] },
    priorities: { type: [String], default: [] },
    include: {
      charts: { type: Boolean, default: true },
      detailedList: { type: Boolean, default: false },
      executiveSummary: { type: Boolean, default: true },
      recommendations: { type: Boolean, default: true },
      rawData: { type: Boolean, default: false },
    },
    template: { type: String, default: "standard" },
    sendEmail: { type: Boolean, default: false },
    scheduleRecurring: { type: Boolean, default: false },
    metrics: {
      totalComplaints: { type: Number, default: 0 },
      resolved: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      slaCompliance: { type: String, default: "0%" },
    },
    rows: {
      type: [
        {
          label: { type: String, default: "" },
          total: { type: Number, default: 0 },
          resolved: { type: Number, default: 0 },
          pending: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
  },
  { _id: false },
);

const adminReportSchema = new mongoose.Schema(
  {
    recordType: {
      type: String,
      enum: ["generated", "configuration", "schedule"],
      default: "generated",
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    reportType: { type: String, required: true, trim: true, maxlength: 100 },
    format: { type: String, enum: ["pdf", "excel", "csv"], default: "pdf" },
    config: { type: reportConfigSchema, default: () => ({}) },
    snapshot: { type: reportSnapshotSchema, default: null },
    schedule: {
      frequency: { type: String, enum: ["daily", "weekly", "monthly"], default: "weekly" },
      dayOfWeek: { type: Number, min: 0, max: 6, default: 1 },
      dayOfMonth: { type: Number, min: 1, max: 31, default: 1 },
      time: { type: String, default: "09:00" },
      timezone: { type: String, default: "Asia/Kolkata" },
      enabled: { type: Boolean, default: true },
    },
    generatedDate: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
  },
  { timestamps: true },
);

const AdminReport = mongoose.model("AdminReport", adminReportSchema);

export default AdminReport;
