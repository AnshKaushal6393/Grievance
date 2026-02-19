import { Router } from "express";
const router = Router();
import {
  getMyAssignedComplaints,
  getOfficerDashboard,
  getComplaintById,
  updateComplaintStatus,
  addComplaintNote,
  getDepartmentQueueComplaints,
  claimDepartmentComplaint,
} from "../controllers/officerComplaintController.js";

import { protect, authorize } from "../middleware/auth.js";

// All routes require authentication and officer role
router.use(protect);
router.use(authorize("officer", "admin")); // Admin can also access officer routes

// Dashboard
router.get("/dashboard/stats", getOfficerDashboard);

// My complaints
router.get("/my-complaints", getMyAssignedComplaints);
router.get("/queue", getDepartmentQueueComplaints);
router.get("/complaints/:id", getComplaintById);
router.post("/complaints/:id/claim", claimDepartmentComplaint);

// Update complaint
router.put("/complaints/:id/status", updateComplaintStatus);
router.post("/complaints/:id/note", addComplaintNote);

export default router;
