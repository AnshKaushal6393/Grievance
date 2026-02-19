import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Lock, Shield, Info, Loader2, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import authService from "@/services/authService";
import { useLanguage } from "@/contexts/LanguageContext";

const AadhaarVerification = () => {
  const { t } = useLanguage();
  const [aadhaar, setAadhaar] = useState(["", "", ""]);
  const [consent, setConsent] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState<string>("");
  const aadhaarRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  const handleAadhaarChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 4);
    const newAadhaar = [...aadhaar];
    newAadhaar[index] = cleanValue;
    setAadhaar(newAadhaar);

    if (cleanValue.length === 4 && index < 2) {
      aadhaarRefs.current[index + 1]?.focus();
    }
  };

  const handleAadhaarKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !aadhaar[index] && index > 0) {
      aadhaarRefs.current[index - 1]?.focus();
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

  const isAadhaarValid = aadhaar.every((part) => part.length === 4);
  const isOtpComplete = otp.every((digit) => digit !== "");

  const handleSendOtp = async () => {
    if (!isAadhaarValid || !consent) return;
    const aadhaarNumber = aadhaar.join("");
    setIsSendingOtp(true);
    try {
      const response = await authService.sendAadhaarOTP({ aadhaarNumber });
      setMaskedPhone(response?.data?.maskedPhone || "");
      setOtpSent(true);
      toast.success(response.message || t("aadhaar.otpSent", "OTP sent successfully"));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error: any) {
      toast.error(error?.message || t("aadhaar.otpSendFailed", "Failed to send Aadhaar OTP"));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerify = async () => {
    if (!isOtpComplete) return;
    const otpCode = otp.join("");
    setIsVerifying(true);
    try {
      const response = await authService.verifyAadhaarOTP(otpCode);
      toast.success(response.message || t("aadhaar.verified", "Aadhaar verified successfully"));
      setIsVerified(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error: any) {
      toast.error(error?.message || t("aadhaar.invalidOtp", "Invalid OTP. Please try again."));
      setOtp(Array(6).fill(""));
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  useEffect(() => {
    if (isOtpComplete && otpSent && !isVerifying && !isVerified) {
      handleVerify();
    }
  }, [otp, otpSent]);

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-muted/40 to-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-125">
        <div className="bg-card text-card-foreground rounded-3xl shadow-2xl p-10 space-y-8 relative overflow-hidden border border-border/60">
          <AnimatePresence>
            {isVerified && (
              <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-card/95 rounded-3xl flex flex-col items-center justify-center z-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-lg"><CheckCircle2 className="w-12 h-12 text-primary-foreground" /></motion.div>
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 text-2xl font-bold text-foreground">{t("aadhaar.verifiedTitle", "Aadhaar Verified!")}</motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-muted-foreground mt-2">{t("aadhaar.redirecting", "Redirecting to dashboard...")}</motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <Link to="/verify-otp" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /><span className="text-sm">{t("common.back", "Back")}</span></Link>
            <button onClick={handleSkip} className="text-muted-foreground hover:text-foreground text-sm transition-colors">{t("aadhaar.skipNow", "Skip for now")}</button>
          </div>

          <div className="text-center space-y-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg"><CreditCard className="w-10 h-10 text-primary-foreground" /></motion.div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">{t("aadhaar.title", "Verify with Aadhaar")}</h1>
              <p className="text-muted-foreground">{t("aadhaar.subtitle", "Link your Aadhaar for secure authentication")}</p>
            </div>
          </div>

          {!otpSent ? (
            <>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">{t("aadhaar.number", "Aadhaar Number")}</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="p-3 bg-muted rounded-xl"><Lock className="w-5 h-5 text-muted-foreground" /></div>
                    {aadhaar.map((part, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input ref={(el) => {aadhaarRefs.current[index] = el}} type="text" inputMode="numeric" maxLength={4} value={part} onChange={(e) => handleAadhaarChange(index, e.target.value)} onKeyDown={(e) => handleAadhaarKeyDown(index, e)} placeholder="0000" className="w-20 py-3 text-center text-lg font-mono rounded-xl border border-input bg-background hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all" />
                        {index < 2 && <span className="text-muted-foreground text-xl font-bold">-</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">e.g., 1234-5678-9012</p>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="w-5 h-5 mt-0.5 rounded border-input text-primary focus:ring-ring" />
                  <span className="text-muted-foreground text-sm">
                    {t("aadhaar.consent", "I consent to share my Aadhaar details for verification purposes.")}{" "}
                    <Link to="/privacy" className="text-primary hover:text-primary/80 font-medium">{t("common.privacyPolicy", "Privacy Policy")}</Link>
                  </span>
                </label>

                <div className="bg-accent/20 border border-accent/60 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-accent/40 rounded-lg"><Shield className="w-5 h-5 text-accent-foreground" /></div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{t("aadhaar.secureTitle", "Your Aadhaar is encrypted and secure")}</p>
                      <p className="text-sm text-muted-foreground">{t("aadhaar.secureDesc", "We use it only for verification purposes")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleSendOtp} disabled={!isAadhaarValid || !consent || isSendingOtp} className="w-full py-4 h-auto text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-lg hover:shadow-xl transition-all">
                {isSendingOtp ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t("aadhaar.sendingOtp", "Sending OTP...")}</>) : (<>{t("aadhaar.sendOtpBtn", "Send OTP to Aadhaar-linked Mobile")}<ArrowRight className="w-5 h-5 ml-2" /></>)}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-muted-foreground">{t("aadhaar.enterOtp", "Enter OTP sent to Aadhaar-linked mobile")}{" "}{maskedPhone ? <span className="font-bold text-foreground">{maskedPhone}</span> : <span className="font-bold text-foreground">****----</span>}</p>
                </div>

                <div className="flex justify-center gap-3">
                  {otp.map((digit, index) => (
                    <input key={index} ref={(el) => {otpRefs.current[index] = el}} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(index, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(index, e)} className={`w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none ${digit ? "border-primary bg-primary/10 text-primary" : "border-input bg-background hover:border-ring/50"} focus:border-primary focus:ring-4 focus:ring-ring/20`} />
                  ))}
                </div>
              </div>

              <Button onClick={handleVerify} disabled={!isOtpComplete || isVerifying} className="w-full py-4 h-auto text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-lg hover:shadow-xl transition-all">
                {isVerifying ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t("aadhaar.verifying", "Verifying...")}</>) : t("aadhaar.verifyBtn", "Verify Aadhaar")}
              </Button>
            </>
          )}

          <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div><div className="relative flex justify-center text-sm"><span className="px-4 bg-card text-muted-foreground">{t("common.or", "OR")}</span></div></div>

          <div className="space-y-2">
            <Button onClick={handleSkip} variant="outline" className="w-full py-4 h-auto text-lg font-semibold border-2 border-border hover:bg-muted rounded-xl transition-all">{t("aadhaar.continueWithout", "Continue without Aadhaar")}</Button>
            <p className="text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Info className="w-4 h-4" />{t("aadhaar.verifyLater", "You can verify later in settings")}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AadhaarVerification;
