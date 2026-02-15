import Notification from "../models/Notification.js";

export const createStatusNotification = async ({
  userId,
  complaint,
  status,
  message,
  source = "system",
  metadata = {},
}) => {
  if (!userId || !complaint?._id || !complaint?.complaintId) return null;

  return Notification.create({
    user: userId,
    complaint: complaint._id,
    complaintId: complaint.complaintId,
    title: complaint.title || "Complaint update",
    status,
    message:
      message ||
      `Your complaint ${complaint.complaintId} status changed to ${status}`,
    source,
    metadata,
  });
};
