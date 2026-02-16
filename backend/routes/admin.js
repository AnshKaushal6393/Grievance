import { Router } from 'express';
const router = Router();
import { protect, authorize } from '../middleware/auth.js';

import {
  getAllComplaints,
  assignComplaint,
  updateComplaintStatus,
  bulkAssign,
  getDashboardStats,
  getAnalytics,
  getAllUsers,
  getUserDetails,
  createUserByAdmin,
  updateUserByAdmin,
  updateUserStatus,
  resetUserPassword,
  bulkUserAction,
  importUsers,
} from '../controllers/adminController.js';

import { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment, addOfficer, removeOfficer } from '../controllers/departmentController.js';

// All routes require admin role
router.use(protect, authorize('admin'));

// --- Dashboard & Analytics ---
router.get('/dashboard/stats', getDashboardStats);
router.get('/analytics', getAnalytics);

// --- Complaint Management ---
router.get('/complaints', getAllComplaints);
router.put('/complaints/bulk-assign', bulkAssign);
router.put('/complaints/:id/assign', assignComplaint);
router.put('/complaints/:id/status', updateComplaintStatus);

// --- Department Management ---
router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.get('/departments/:id', getDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);
router.post('/departments/:id/officers', addOfficer);
router.delete('/departments/:id/officers/:officerId', removeOfficer);

// --- User Management ---
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.post('/users', createUserByAdmin);
router.put('/users/:id', updateUserByAdmin);
router.put('/users/:id/status', updateUserStatus);
router.post('/users/:id/reset-password', resetUserPassword);
router.post('/users/bulk-action', bulkUserAction);
router.post('/users/import', importUsers);

export default router;
