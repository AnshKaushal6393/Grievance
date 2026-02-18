import Notification from "../models/Notification.js";

const STATUS_PRIORITY_MAP = {
  rejected: "high",
  resolved: "medium",
  assigned: "medium",
  filed: "low",
  "in-progress": "high",
  in_progress: "high",
};

const STATUS_TYPE_MAP = {
  assigned: "assignment",
  rejected: "escalation",
  resolved: "status_update",
  "in-progress": "status_update",
  in_progress: "status_update",
  filed: "status_update",
};

export const createStatusNotification = async ({
  userId,
  complaint,
  status,
  message,
  source = "system",
  type,
  priority,
  channels,
  actionUrl,
  expiresAt,
  metadata = {},
}) => {
  if (!userId || !complaint?._id || !complaint?.complaintId) return null;

  const normalizedStatus = String(status || "").toLowerCase();
  return Notification.create({
    user: userId,
    complaint: complaint._id,
    complaintId: complaint.complaintId,
    title: complaint.title || "Complaint update",
    status,
    type: type || STATUS_TYPE_MAP[normalizedStatus] || "status_update",
    priority: priority || STATUS_PRIORITY_MAP[normalizedStatus] || "medium",
    message:
      message ||
      `Your complaint ${complaint.complaintId} status changed to ${status}`,
    source,
    channels: {
      inApp: channels?.inApp ?? true,
      email: channels?.email ?? false,
      sms: channels?.sms ?? false,
      push: channels?.push ?? false,
    },
    actionUrl:
      actionUrl || `/track-complaint?complaintId=${complaint.complaintId}`,
    expiresAt: expiresAt || null,
    metadata,
  });
};

export const createSystemNotification = async ({
  userId,
  title,
  message,
  type = "system",
  priority = "medium",
  channels,
  actionUrl = "",
  metadata = {},
}) => {
  if (!userId || !title || !message) return null;
  return Notification.create({
    user: userId,
    complaint: metadata?.complaint || null,
    complaintId: metadata?.complaintId || "N/A",
    title,
    status: metadata?.status || "info",
    type,
    priority,
    message,
    source: "system",
    channels: {
      inApp: channels?.inApp ?? true,
      email: channels?.email ?? false,
      sms: channels?.sms ?? false,
      push: channels?.push ?? false,
    },
    actionUrl,
    metadata,
  });
};
