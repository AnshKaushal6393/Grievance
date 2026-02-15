import { Router } from 'express';
const router = Router();
import { fileComplaint, getMyComplaints, getComplaintById, trackComplaint, updateComplaint, deleteComplaint, getDashboardStats, getMyDrafts, getCitizenAnalytics, getCitizenNotifications, getComplaintHistory, submitComplaintFeedback, markNotificationRead, markAllNotificationsRead } from '../controllers/complaintController.js';
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
router.get('/drafts', protect, getMyDrafts);
router.get('/:id/history', protect, getComplaintHistory);
router.post('/:id/feedback', protect, submitComplaintFeedback);
router.get('/:id', protect, getComplaintById);
router.put('/:id', protect, updateComplaint);
router.delete('/:id', protect, deleteComplaint);

export default router;
