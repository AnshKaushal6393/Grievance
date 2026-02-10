import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { sendOTPEmail, sendOTPSMS } from "../utils/sendOTP.js";

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      street,
      city,
      state,
      pincode,
    } = req.body;

    if (!name || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    if (!street || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "Address fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 10-digit phone number",
      });
    }

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 6-digit pincode",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email or phone number",
      });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password,
      address: {
        street,
        city,
        state,
        pincode,
      },
    });

    const otp = user.generateOTP("registration");
    await user.save();

    await sendOTPEmail(email, otp, name);
    await sendOTPSMS(phone, otp);

    res.status(201).json({
      success: true,
      message: "Registration successful! OTP sent to your email and phone",
      data: {
        userId: user._id,
        email: user.email,
        phone: user.phone,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: error.message,
      });
    }
    if (error?.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || "field";
      return res.status(400).json({
        success: false,
        message: `Duplicate ${field}. Please use another ${field}.`,
      });
    }
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
      error: error.message,
    });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "Please provide userId and OTP",
      });
    }
    const user = await User.findById(userId).select(
      "+otp.code +otp.expiresAt +otp.purpose",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const verification = user.verifyOTP(otp, "registration");

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message,
      });
    }
    user.isEmailVerified = true;
    user.isPhoneVerified = true;
    user.clearOTP();
    await user.save();

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
        },
        token,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
      error: error.message,
    });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const { userId, purpose } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Please provide userId",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate new OTP
    const otp = user.generateOTP(purpose || "registration");
    await user.save();

    // Send OTP
    await sendOTPEmail(user.email, otp, user.name);
    await sendOTPSMS(user.phone, otp);

    res.status(200).json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email/phone and password",
      });
    }

    // Find user by email or phone (with password field)
    const user = await User.findByEmailOrPhone(email).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token (longer expiry if rememberMe is true)
    const tokenExpiry = rememberMe ? "30d" : "7d";
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: tokenExpiry },
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          isAadhaarVerified: user.isAadhaarVerified,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
      error: error.message,
    });
  }
};

export const sendAadhaarOTP = async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 12-digit Aadhaar number",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if Aadhaar already linked to another account
    const existingAadhaar = await User.findOne({
      "aadhaar.number": aadhaarNumber,
      _id: { $ne: userId },
    });
    if (existingAadhaar) {
      return res.status(400).json({
        success: false,
        message: "This Aadhaar number is already linked to another account",
      });
    }

    // Store Aadhaar number temporarily
    user.aadhaar.number = aadhaarNumber;

    // Generate OTP
    const otp = user.generateOTP("aadhaar-verification");
    await user.save();

    // In production, this would call actual Aadhaar API
    // For now, send OTP to user's registered phone
    await sendOTPSMS(user.phone, otp);

    res.status(200).json({
      success: true,
      message: "OTP sent to your Aadhaar-linked mobile number",
      data: {
        maskedPhone: `****${user.phone.slice(-4)}`,
      },
    });
  } catch (error) {
    console.error("Aadhaar OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send Aadhaar OTP",
      error: error.message,
    });
  }
};

export const verifyAadhaarOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.user.id;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "Please provide OTP",
      });
    }

    const user = await User.findById(userId).select(
      "+otp.code +otp.expiresAt +otp.purpose",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify OTP
    const verification = user.verifyOTP(otp, "aadhaar-verification");

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message,
      });
    }

    // Mark Aadhaar as verified
    user.isAadhaarVerified = true;
    user.aadhaar.verifiedAt = new Date();
    user.clearOTP();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Aadhaar verified successfully",
      data: {
        isAadhaarVerified: true,
        verifiedAt: user.aadhaar.verifiedAt,
      },
    });
  } catch (error) {
    console.error("Aadhaar verification error:", error);
    res.status(500).json({
      success: false,
      message: "Aadhaar verification failed",
      error: error.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide email address",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists or not (security)
      return res.status(200).json({
        success: true,
        message: "If your email is registered, you will receive an OTP",
      });
    }

    // Generate OTP for password reset
    const otp = user.generateOTP("password-reset");
    await user.save();

    // Send OTP via email
    await sendOTPEmail(user.email, otp, user.name);

    res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email",
      data: {
        userId: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process request",
      error: error.message,
    });
  }
};


export const verifyResetOTP = async (req,res)=>{
    try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId and OTP'
      });
    }

    const user = await User.findById(userId).select(
      "+otp.code +otp.expiresAt +otp.purpose",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify OTP
    const verification = user.verifyOTP(otp, 'password-reset');

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // Generate password reset token
    const resetToken = jwt.sign(
      { id: user._id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    user.clearOTP();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified. You can now reset your password',
      data: {
        resetToken
      }
    });

  } catch (error) {
    console.error('Reset OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message
    });
  }
}


export const resetPassword = async(req,res)=>{
    try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const user = await User.findById(decoded.id).select('+passwordResetToken +passwordResetExpires');

    if (!user || user.passwordResetToken !== resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    if (new Date() > user.passwordResetExpires) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
}

export const getMe = async (req,res)=>{
    try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          isAadhaarVerified: user.isAadhaarVerified,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
}

export const logout = async (req,res)=>{
   try {
    // In a stateless JWT setup, logout is handled client-side by removing the token
    // But we can track logout on server if needed

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  } 
}
