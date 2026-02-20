import { Router } from 'express';
const router = Router();
import { protect, authorize } from '../middleware/auth.js';
import multer from "multer";

import {
  getAllComplaints,
  assignComplaint,
  updateComplaintStatus,
  escalateComplaint,
  deleteComplaint,
  bulkAssign,
  getDashboardStats,
  exportDashboardTrendCsv,
  exportDashboardCategoryCsv,
  getAnalytics,
  exportAnalyticsCsv,
  getAllUsers,
  getUserDetails,
  createUserByAdmin,
  updateUserByAdmin,
  updateUserStatus,
  deleteUserByAdmin,
  resetUserPassword,
  bulkUserAction,
  exportUsersCsv,
  importUsers,
  importUsersFromCsvFile,
  streamUserUpdates,
  previewReport,
  generateReport,
  saveReportConfiguration,
  scheduleReport,
  getGeneratedReports,
  downloadGeneratedReport,
  getAdminSettings,
  updateAdminSettings,
  rotateSystemKeys,
  broadcastAnnouncement,
  getBroadcastAnnouncementHistory,
} from '../controllers/adminController.js';

import { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment, addOfficer, removeOfficer } from '../controllers/departmentController.js';

// All routes require admin role
router.use(protect, authorize('admin'));
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === "text/csv" || file.originalname.toLowerCase().endsWith(".csv");
    if (!ok) return cb(new Error("Only CSV files are allowed"));
    cb(null, true);
  },
});

// --- Dashboard & Analytics ---
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/export/trend.csv', exportDashboardTrendCsv);
router.get('/dashboard/export/category.csv', exportDashboardCategoryCsv);
router.get('/analytics', getAnalytics);
router.get('/analytics/export.csv', exportAnalyticsCsv);
router.post('/reports/preview', previewReport);
router.post('/reports/generate', generateReport);
router.post('/reports/configuration', saveReportConfiguration);
router.post('/reports/schedule', scheduleReport);
router.get('/reports', getGeneratedReports);
router.get('/reports/:id/download', downloadGeneratedReport);

// --- Complaint Management ---
router.get('/complaints', getAllComplaints);
router.put('/complaints/bulk-assign', bulkAssign);
router.put('/complaints/:id/assign', assignComplaint);
router.put('/complaints/:id/status', updateComplaintStatus);
router.put('/complaints/:id/escalate', escalateComplaint);
router.delete('/complaints/:id', deleteComplaint);

// --- Department Management ---
router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.get('/departments/:id', getDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);
router.post('/departments/:id/officers', addOfficer);
router.delete('/departments/:id/officers/:officerId', removeOfficer);

// --- User Management ---
router.get('/stream/users', streamUserUpdates);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.post('/users', createUserByAdmin);
router.put('/users/:id', updateUserByAdmin);
router.delete('/users/:id', deleteUserByAdmin);
router.put('/users/:id/status', updateUserStatus);
router.post('/users/:id/reset-password', resetUserPassword);
router.post('/users/bulk-action', bulkUserAction);
router.post('/users/export', exportUsersCsv);
router.post('/users/import', importUsers);
router.post('/users/import-file', csvUpload.single("file"), importUsersFromCsvFile);
router.post('/notifications/broadcast', broadcastAnnouncement);
router.get('/notifications/broadcast-history', getBroadcastAnnouncementHistory);

// --- Admin Settings ---
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);
router.post('/settings/rotate-keys', rotateSystemKeys);

export default router;
