import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, Loader2, KeyRound, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import authService from "@/services/authService";
import { useLanguage } from "@/contexts/LanguageContext";

type Step = "email" | "otp" | "newPassword" | "success";

const ForgotPassword = () => {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(45);
  const [resetUserId, setResetUserId] = useState("");
  const [resetToken, setResetToken] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  // Timer for OTP step
  useEffect(() => {
    if (step === "otp" && timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(t("register.errorValidEmail", "Please enter your email address"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword({ email: email.trim() });
      const userId = response?.data?.userId;
      if (!userId) {
        toast.success(response.message || t("forgot.sendOtp"));
        return;
      }

      setResetUserId(userId);
      setOtp(Array(6).fill(""));
      setStep("otp");
      setTimer(45);
      toast.success(response.message || t("forgot.sendOtp"));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error: any) {
      toast.error(error?.message || "Failed to send reset OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const isOtpComplete = otp.every((digit) => digit !== "");

  const handleVerifyOtp = async () => {
    if (!resetUserId) {
      toast.error(t("forgot.resendOtp", "Please request OTP again"));
      setStep("email");
      return;
    }

    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      toast.error(t("forgot.verifyOtp", "Please enter a valid 6-digit OTP"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.verifyResetOTP({
        userId: resetUserId,
        otp: otpCode,
      });

      const token = response?.data?.resetToken;
      if (!token) {
      toast.error(t("forgot.verifyOtp", "Failed to verify OTP"));
        return;
      }

      setResetToken(token);
      setStep("newPassword");
      toast.success(response.message || t("forgot.verifyOtp"));
    } catch (error: any) {
      toast.error(error?.message || t("forgot.verifyOtp", "OTP verification failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!newPassword) return { strength: 0, label: "", color: "" };
    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++;

    const configs = [
      { label: "Weak", color: "bg-red-500" },
      { label: "Fair", color: "bg-orange-500" },
      { label: "Good", color: "bg-yellow-500" },
      { label: "Strong", color: "bg-green-500" },
    ];

    return { strength, ...configs[strength - 1] || configs[0] };
  };

  const passwordStrength = getPasswordStrength();
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const isPasswordValid = newPassword.length >= 8 && passwordsMatch;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetToken) {
      toast.error(t("forgot.verifyOtp", "Session expired. Please verify OTP again"));
      setStep("otp");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t("forgot.passwordMismatch"));
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.resetPassword({
        resetToken,
        newPassword,
        confirmPassword,
      });
      toast.success(response.message || t("forgot.successTitle"));
      setStep("success");
      setTimeout(() => navigate("/login"), 3000);
    } catch (error: any) {
      toast.error(error?.message || t("forgot.resetPassword", "Password reset failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleResendOtp = async () => {
    if (!email.trim()) {
      toast.error(t("register.errorValidEmail", "Please enter your email again"));
      setStep("email");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword({ email: email.trim() });
      const userId = response?.data?.userId;
      if (!userId) {
      toast.success(response.message || t("forgot.sendOtp"));
        return;
      }

      setResetUserId(userId);
      setTimer(45);
      setOtp(Array(6).fill(""));
      toast.success(response.message || t("forgot.resendOtp"));
      otpRefs.current[0]?.focus();
    } catch (error: any) {
      toast.error(error?.message || "Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const slideVariants = {
    enter: { x: 20, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 },
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-muted/40 to-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-125"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-10 space-y-8 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === "email" && (
              <motion.div
                key="email"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Back Button */}
                <Link to="/login" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">{t("forgot.backLogin")}</span>
                </Link>

                {/* Header */}
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <KeyRound className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">{t("forgot.title")}</h1>
                    <p className="text-gray-500">{t("forgot.subtitle")}</p>
                  </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      placeholder={t("forgot.emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full py-4 pl-12 pr-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!email || isLoading}
                    className="w-full py-4 h-auto text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:from-gray-300 disabled:to-gray-400 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {t("forgot.sendingOtp")}
                      </>
                    ) : (
                      t("forgot.sendOtp")
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div
                key="otp"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Back Button */}
                <button
                  onClick={() => setStep("email")}
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">{t("forgot.back")}</span>
                </button>

                {/* Header */}
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <Mail className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">{t("forgot.verifyTitle")}</h1>
                    <p className="text-gray-500">
                      {t("forgot.verifySubtitle")} <span className="font-medium">{email}</span>
                    </p>
                  </div>
                </div>

                {/* OTP Input */}
                <div className="flex justify-center gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {otpRefs.current[index] = el}}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={`w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none ${
                        digit
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300"
                      } focus:border-primary focus:ring-4 focus:ring-ring/20`}
                    />
                  ))}
                </div>

                {/* Timer */}
                <div className="text-center">
                  {timer > 0 ? (
                    <p className="text-gray-500">
                      {t("forgot.resendIn")}{" "}
                      <span className="font-mono font-bold text-primary">{formatTimer(timer)}</span>
                    </p>
                  ) : (
                    <button
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="text-primary hover:text-primary/80 font-semibold transition-colors inline-flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t("forgot.sending")}
                        </>
                      ) : (
                        t("forgot.resendOtp")
                      )}
                    </button>
                  )}
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  disabled={!isOtpComplete || isLoading}
                  className="w-full py-4 h-auto text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t("forgot.verifying")}
                    </>
                  ) : (
                    t("forgot.verifyOtp")
                  )}
                </Button>
              </motion.div>
            )}

            {step === "newPassword" && (
              <motion.div
                key="newPassword"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Header */}
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <Lock className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">{t("forgot.newPasswordTitle")}</h1>
                    <p className="text-gray-500">{t("forgot.newPasswordSubtitle")}</p>
                  </div>
                </div>

                {/* Password Form */}
                <form onSubmit={handleResetPassword} className="space-y-6">
                  {/* New Password */}
                  <div className="space-y-2">
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder={t("forgot.newPassword")}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full py-4 pl-12 pr-12 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                level <= passwordStrength.strength ? passwordStrength.color : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-sm ${passwordStrength.color?.replace("bg-", "text-")}`}>
                          {passwordStrength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t("forgot.confirmPassword")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full py-4 pl-12 pr-12 rounded-xl border bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400 ${
                        confirmPassword
                          ? passwordsMatch
                            ? "border-green-500 focus:ring-green-500"
                            : "border-red-500 focus:ring-red-500"
                          : "border-gray-200 focus:ring-ring"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-sm text-red-500">{t("forgot.passwordMismatch")}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={!isPasswordValid || isLoading}
                    className="w-full py-4 h-auto text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {t("forgot.resetting")}
                      </>
                    ) : (
                      t("forgot.resetPassword")
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="text-center space-y-8 py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg"
                >
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-gray-900">{t("forgot.successTitle")}</h1>
                  <p className="text-gray-500">{t("forgot.successSubtitle")}</p>
                </div>
                <p className="text-gray-400">{t("forgot.redirecting")}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
