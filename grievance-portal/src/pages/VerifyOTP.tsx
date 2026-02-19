import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Loader2, CheckCircle2, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import authService from "@/services/authService";
import { useLanguage } from "@/contexts/LanguageContext";

const VerifyOTP = () => {
  const { t } = useLanguage();
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [timer, setTimer] = useState(45);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const userId = location.state?.userId;
  const email = location.state?.email;
  const phone = location.state?.phone;

  useEffect(() => {
    if (!userId) {
      toast.error(t("verifyOtp.noUser", "No user information found. Please login again."));
      navigate("/login");
    }
  }, [userId, navigate, t]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((tm) => tm - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (otp.every((digit) => digit !== "") && !isVerifying && !isVerified) {
      handleVerify();
    }
  }, [otp]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    pastedData.split("").forEach((digit, i) => { if (i < 6) newOtp[i] = digit; });
    setOtp(newOtp);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleResend = async () => {
    if (!userId) return;
    setIsResending(true);
    try {
      await authService.resendOTP(userId, "registration");
      toast.success(t("verifyOtp.resent", "OTP resent successfully"));
      setTimer(45);
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } catch {
      toast.error(t("verifyOtp.resendFailed", "Failed to resend OTP"));
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    if (!userId) return;
    const otpCode = otp.join("");
    if (otpCode.length !== 6) return;
    setIsVerifying(true);
    try {
      const response = await authService.verifyOTP({ userId, otp: otpCode });
      toast.success(response.message || t("verifyOtp.success", "OTP verified successfully"));
      setIsVerified(true);
      setTimeout(() => navigate("/aadhaar-verification"), 2000);
    } catch (error: any) {
      toast.error(error?.message || t("verifyOtp.invalid", "Invalid OTP. Please try again."));
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isComplete = otp.every((digit) => digit !== "");
  const maskedEmail = email ? email.replace(/(.{2}).+(@.+)/, "$1***$3") : t("verifyOtp.emailFallback", "your email");
  const maskedPhone = phone ? `******${phone.slice(-4)}` : t("verifyOtp.phoneFallback", "your phone");

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-muted/40 to-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-125">
        <div className="bg-white rounded-3xl shadow-2xl p-10 space-y-8">
          <Link to="/register" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /><span className="text-sm">{t("common.back", "Back")}</span></Link>

          <div className="text-center space-y-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-20 h-20 bg-linear-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg"><ShieldCheck className="w-10 h-10 text-white" /></motion.div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">{t("verifyOtp.title", "Verify Your Account")}</h1>
              <p className="text-muted-foreground">{t("verifyOtp.subtitle", "Enter the 6-digit OTP sent to your email/phone")}</p>
              <div className="flex items-center justify-center gap-2 text-foreground"><Mail className="w-4 h-4" /><span className="font-medium">{maskedEmail}</span></div>
              <p className="text-sm text-muted-foreground">& {maskedPhone}</p>
            </div>
          </div>

          <AnimatePresence>
            {isVerified && (
              <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/95 rounded-3xl flex flex-col items-center justify-center z-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-24 h-24 bg-linear-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg"><CheckCircle2 className="w-12 h-12 text-white" /></motion.div>
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 text-2xl font-bold text-gray-900">{t("verifyOtp.verifiedTitle", "Verified Successfully!")}</motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-muted-foreground mt-2">{t("verifyOtp.redirecting", "Redirecting to next step...")}</motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center gap-3" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <motion.input key={index} ref={(el) => { inputRefs.current[index] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleInputChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(index, e)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className={`w-14 h-14 sm:w-15 sm:h-15 text-center text-2xl font-bold rounded-xl border-2 transition-all ${digit ? "border-primary bg-primary/10 text-primary" : "border-gray-300 bg-gray-50 hover:border-gray-400"} focus:border-primary focus:ring-4 focus:ring-ring/20`} />
            ))}
          </div>

          <div className="text-center">
            {timer > 0 ? (
              <p className="text-muted-foreground">{t("verifyOtp.resendIn", "Resend OTP in")} <span className="font-mono font-bold text-primary">{formatTimer(timer)}</span></p>
            ) : (
              <button type="button" onClick={handleResend} disabled={isResending} className="text-primary hover:text-primary/80 font-semibold transition-colors inline-flex items-center gap-2">
                {isResending ? <><Loader2 className="w-4 h-4 animate-spin" />{t("common.sending", "Sending...")}</> : t("verifyOtp.resend", "Resend OTP")}
              </button>
            )}
          </div>

          <Button onClick={handleVerify} disabled={!isComplete || isVerifying} className="w-full py-4 h-auto text-lg font-semibold bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 rounded-xl shadow-lg hover:shadow-xl transition-all">
            {isVerifying ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t("verifyOtp.verifying", "Verifying...")}</> : t("verifyOtp.verify", "Verify OTP")}
          </Button>

          <div className="text-center space-y-3 pt-4 border-t border-gray-100">
            <p className="text-muted-foreground">{t("verifyOtp.didntReceive", "Didn't receive the code?")} {timer === 0 && (<button type="button" onClick={handleResend} disabled={isResending} className="text-primary hover:text-primary/80 font-semibold transition-colors">{t("verifyOtp.resend", "Resend OTP")}</button>)}</p>
            <Link to="/register" className="block text-muted-foreground hover:text-foreground text-sm transition-colors">{t("verifyOtp.changeEmailPhone", "Change email/phone")}</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyOTP;
