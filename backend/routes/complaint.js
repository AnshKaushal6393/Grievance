import { Router } from 'express';
const router = Router();
import {
  fileComplaint,
  getMyComplaints,
  getComplaintById,
  trackComplaint,
  updateComplaint,
  deleteComplaint,
  getDashboardStats,
  getMyDrafts,
  getCitizenAnalytics,
  getCitizenNotifications,
  getComplaintHistory,
  submitComplaintFeedback,
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
  archiveAllNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  updateComplaintVoiceMetadata,
  submitDraft,
} from '../controllers/complaintController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

// Public routes
router.get('/track/:complaintId', trackComplaint);

// Protected routes (require authentication)
router.post('/create', protect, upload.array('attachments', 5), fileComplaint);
router.get('/my-complaints', protect, getMyComplaints);
router.get('/dashboard/stats', protect, getDashboardStats);
router.get('/dashboard/analytics', protect, getCitizenAnalytics);
router.get('/notifications', protect, getCitizenNotifications);
router.post('/notifications/mark-all-read', protect, markAllNotificationsRead);
router.post('/notifications/:notificationId/read', protect, markNotificationRead);
router.post('/notifications/:notificationId/archive', protect, archiveNotification);
router.post('/notifications/archive-all', protect, archiveAllNotifications);
router.get('/notifications/preferences', protect, getNotificationPreferences);
router.put('/notifications/preferences', protect, updateNotificationPreferences);
router.get('/drafts', protect, getMyDrafts);
router.put('/drafts/:id', protect, upload.array('attachments', 5), updateComplaint);
router.delete('/drafts/:id', protect, deleteComplaint);
router.post('/drafts/:id/submit', protect, submitDraft);
router.get('/:id/history', protect, getComplaintHistory);
router.post('/:id/feedback', protect, submitComplaintFeedback);
router.post('/:id/voice-metadata', protect, updateComplaintVoiceMetadata);
router.get('/:id', protect, getComplaintById);
router.put('/:id', protect, upload.array('attachments', 5), updateComplaint);
router.delete('/:id', protect, deleteComplaint);

export default router;
