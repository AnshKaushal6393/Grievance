import { Router } from 'express';
const router = Router();
import { fileComplaint, getMyComplaints, getComplaintById, trackComplaint, updateComplaint, deleteComplaint, getDashboardStats, getMyDrafts } from '../controllers/complaintController';
import { protect } from '../middleware/auth';
import { upload } from '../config/cloudinary';

// Public routes
router.get('/track/:complaintId', trackComplaint);

// Protected routes (require authentication)
router.post('/create', protect, upload.array('attachments', 5), fileComplaint);
router.get('/my-complaints', protect, getMyComplaints);
router.get('/dashboard/stats', protect, getDashboardStats);
router.get('/drafts', protect, getMyDrafts);
router.get('/:id', protect, getComplaintById);
router.put('/:id', protect, updateComplaint);
router.delete('/:id', protect, deleteComplaint);

export default router;