import api from "@/lib/api";

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface OTPData {
  userId: string;
  otp: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AadhaarData {
  aadhaarNumber: string;
}

export const authService = {
  // register
  register: async (data: RegisterData) => {
    try {
      const response = await api.post("/auth/register", data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "Registration failed" };
    }
  },
  // otp verify
  verifyOTP: async (data: OTPData) => {
    try {
      const response = await api.post("/auth/verify-otp", data);

      // Save token and user data
      if (response.data.success && response.data.data.token) {
        localStorage.setItem("token", response.data.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "OTP verification failed" };
    }
  },

  //   resend
  resendOTP: async (userId: string, purpose: string = "registration") => {
    try {
      const response = await api.post("/auth/resend-otp", { userId, purpose });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "Failed to resend OTP" };
    }
  },

  //   login
  login: async (data: LoginData) => {
    try {
      const response = await api.post("/auth/login", data);

      // Save token and user data
      if (response.data.success && response.data.data.token) {
        localStorage.setItem("token", response.data.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "Login failed" };
    }
  },

  //   logout

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage regardless of API call success
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get("/auth/me");

      // Update user data in localStorage
      if (response.data.success && response.data.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "Failed to fetch profile" };
    }
  },
  // Forgot password - send OTP
  forgotPassword: async (data: ForgotPasswordData) => {
    try {
      const response = await api.post("/auth/forgot-password", data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "Failed to send reset OTP" };
    }
  },

  // Verify reset password OTP
  verifyResetOTP: async (data: OTPData) => {
    try {
      const response = await api.post("/auth/verify-reset-otp", data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "OTP verification failed" };
    }
  },

  // Reset password
  resetPassword: async (data: ResetPasswordData) => {
    try {
      const response = await api.post("/auth/reset-password", data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "Password reset failed" };
    }
  },

  // Send Aadhaar OTP
  sendAadhaarOTP: async (data: AadhaarData) => {
    try {
      const response = await api.post("/auth/aadhaar/send-otp", data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "Failed to send Aadhaar OTP" };
    }
  },

  // Verify Aadhaar OTP
  verifyAadhaarOTP: async (otp: string) => {
    try {
      const response = await api.post("/auth/aadhaar/verify-otp", { otp });

      // Update user data in localStorage
      if (response.data.success) {
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        userData.isAadhaarVerified = true;
        localStorage.setItem("user", JSON.stringify(userData));
      }

      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: "Aadhaar verification failed" };
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem("token");
    return !!token;
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get token
  getToken: () => {
    return localStorage.getItem("token");
  },
};

export default authService;
