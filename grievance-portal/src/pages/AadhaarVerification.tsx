import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Lock, Shield, Info, Loader2, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const AadhaarVerification = () => {
  const [aadhaar, setAadhaar] = useState(["", "", ""]);
  const [consent, setConsent] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
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
    setIsSendingOtp(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSendingOtp(false);
    setOtpSent(true);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsVerifying(false);
    setIsVerified(true);
    setTimeout(() => navigate("/dashboard"), 2000);
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  // Auto-submit OTP
  useEffect(() => {
    if (isOtpComplete && otpSent && !isVerifying && !isVerified) {
      handleVerify();
    }
  }, [otp, otpSent]);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-125"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-10 space-y-8 relative overflow-hidden">
          {/* Success Animation */}
          <AnimatePresence>
            {isVerified && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/95 rounded-3xl flex flex-col items-center justify-center z-10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-24 h-24 bg-linear-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg"
                >
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 text-2xl font-bold text-gray-900"
                >
                  Aadhaar Verified!
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-gray-500 mt-2"
                >
                  Redirecting to dashboard...
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back Button */}
          <div className="flex items-center justify-between">
            <Link to="/verify-otp" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </Link>
            <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
              Skip for now
            </button>
          </div>

          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
            >
              <CreditCard className="w-10 h-10 text-white" />
            </motion.div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">Verify with Aadhaar</h1>
              <p className="text-gray-500">Link your Aadhaar for secure authentication</p>
            </div>
          </div>

          {!otpSent ? (
            <>
              {/* Aadhaar Input */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Aadhaar Number</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="p-3 bg-gray-100 rounded-xl">
                      <Lock className="w-5 h-5 text-gray-500" />
                    </div>
                    {aadhaar.map((part, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          ref={(el) => {aadhaarRefs.current[index] = el}}
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={part}
                          onChange={(e) => handleAadhaarChange(index, e.target.value)}
                          onKeyDown={(e) => handleAadhaarKeyDown(index, e)}
                          placeholder="0000"
                          className="w-20 py-3 text-center text-lg font-mono rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        {index < 2 && <span className="text-gray-400 text-xl font-bold">-</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-400">e.g., 1234-5678-9012</p>
              </div>

              {/* Consent Section */}
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-600 text-sm">
                    I consent to share my Aadhaar details for verification purposes.{" "}
                    <Link to="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
                      Privacy Policy
                    </Link>
                  </span>
                </label>

                {/* Info Box */}
                <div className="bg-linear-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Shield className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-green-800">Your Aadhaar is encrypted and secure</p>
                      <p className="text-sm text-green-600">We use it only for verification purposes</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Send OTP Button */}
              <Button
                onClick={handleSendOtp}
                disabled={!isAadhaarValid || !consent || isSendingOtp}
                className="w-full py-4 h-auto text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Send OTP to Aadhaar-linked Mobile
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* OTP Section */}
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-600">
                    Enter OTP sent to Aadhaar-linked mobile ending with{" "}
                    <span className="font-bold">****5678</span>
                  </p>
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
                          ? "border-green-500 bg-green-50 text-green-600"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300"
                      } focus:border-green-500 focus:ring-4 focus:ring-green-100`}
                    />
                  ))}
                </div>
              </div>

              {/* Verify Button */}
              <Button
                onClick={handleVerify}
                disabled={!isOtpComplete || isVerifying}
                className="w-full py-4 h-auto text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Aadhaar"
                )}
              </Button>
            </>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Continue Without Aadhaar */}
          <div className="space-y-2">
            <Button
              onClick={handleSkip}
              variant="outline"
              className="w-full py-4 h-auto text-lg font-semibold border-2 border-gray-200 hover:bg-gray-50 rounded-xl transition-all"
            >
              Continue without Aadhaar
            </Button>
            <p className="text-center text-gray-400 text-sm flex items-center justify-center gap-2">
              <Info className="w-4 h-4" />
              You can verify later in settings
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AadhaarVerification;
