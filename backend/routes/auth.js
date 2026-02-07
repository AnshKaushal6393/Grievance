import { Router } from 'express';
const router = Router();
import { register, verifyOTP, resendOTP, login, sendAadhaarOTP, verifyAadhaarOTP, forgotPassword, verifyResetOTP, resetPassword, getMe, logout } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

// Public routes
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

// Protected routes (require authentication)
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/aadhaar/send-otp', protect, sendAadhaarOTP);
router.post('/aadhaar/verify-otp', protect, verifyAadhaarOTP);

export default router; 
