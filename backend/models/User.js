import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      match: [/^[0-9]{10}$/, "Please provide a valid 10-digit phone number"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [8, "Password must be at least 8 characters long"],
      select: false,
    },

    address: {
      street: {
        type: String,
        required: [true, "Street is required"],
        trim: true,
      },
      city: {
        type: String,
        required: [true, "City is required"],
      },
      state: {
        type: String,
        required: [true, "State is required"],
      },
      pincode: {
        type: String,
        required: [true, "Pincode is required"],
        match: [/^[0-9]{6}$/, "Please provide a valid 6-digit pincode"],
      },
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isAadhaarVerified: {
      type: Boolean,
      default: false,
    },

    aadhaar: {
      number: {
        type: String,
        default: null,
        match: [
          /^[0-9]{12}$/,
          "Please provide a valid 12-digit Aadhaar number",
        ],
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
    },

    otp: {
      code: {
        type: String,
        select: false,
      },
      expiresAt: {
        type: Date,
        select: false,
      },
      purpose: {
        type: String,
        enum: [
          "registration",
          "login",
          "password-reset",
          "aadhaar-verification",
        ],
        select: false,
      },
    },

    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "officer", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ "aadhaar.number": 1 }, { sparse: true });

userSchema.pre("save", async function () {
  // Only hash password if it's modified or new
  if (!this.isModified("password")) return;

  // Generate salt and hash password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

userSchema.methods.generateOTP = function(purpose = 'registration') {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set OTP with 15 minutes expiry
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    purpose: purpose
  };
  
  return otp;
};

userSchema.methods.verifyOTP = function(candidateOTP, purpose) {
  if (!this.otp || !this.otp.code) {
    return { success: false, message: 'No OTP found' };
  }
  
  if (this.otp.purpose !== purpose) {
    return { success: false, message: 'OTP purpose mismatch' };
  }
  
  if (new Date() > this.otp.expiresAt) {
    return { success: false, message: 'OTP has expired' };
  }
  
  if (this.otp.code !== candidateOTP) {
    return { success: false, message: 'Invalid OTP' };
  }
  
  // OTP is valid
  return { success: true, message: 'OTP verified successfully' };
};

userSchema.methods.clearOTP = function() {
  this.otp = {
    code: undefined,
    expiresAt: undefined,
    purpose: undefined
  };
};

userSchema.statics.findByEmailOrPhone = function(identifier) {
  // Check if identifier is email or phone
  const isEmail = identifier.includes('@');
  
  if (isEmail) {
    return this.findOne({ email: identifier.toLowerCase() });
  } else {
    return this.findOne({ phone: identifier });
  }
};

const User = mongoose.model("User", userSchema);

export default User;
