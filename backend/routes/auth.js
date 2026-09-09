import { Router } from 'express';
const router = Router();
import {
  register,
  verifyOTP,
  resendOTP,
  login,
  googleLogin,
  sendAadhaarOTP,
  verifyAadhaarOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  getMe,
  logout,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/systemPolicy.js';

// Public routes with brute-force / OTP flooding protection
router.post('/register', register);
router.post('/verify-otp', authRateLimit, verifyOTP);
router.post('/resend-otp', authRateLimit, resendOTP);
router.post('/login', authRateLimit, login);
router.post('/google', googleLogin);
router.post('/forgot-password', authRateLimit, forgotPassword);
router.post('/verify-reset-otp', authRateLimit, verifyResetOTP);
router.post('/reset-password', authRateLimit, resetPassword);

// Protected routes (require authentication)
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/aadhaar/send-otp', protect, authRateLimit, sendAadhaarOTP);
router.post('/aadhaar/verify-otp', protect, authRateLimit, verifyAadhaarOTP);

export default router;
