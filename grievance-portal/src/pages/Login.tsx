import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, FileText, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import authService from "@/services/authService";
import { useLanguage } from "@/contexts/LanguageContext";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const Login = () => {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const navigate = useNavigate();

  const navigateByRole = (role?: string) => {
    if (role === "admin") {
      navigate("/admin");
    } else if (role === "officer") {
      navigate("/officer");
    } else {
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    let isCancelled = false;

    const handleGoogleCredential = async (response: { credential?: string }) => {
      if (!response?.credential) {
        toast.error("Google login token is missing. Please try again.");
        return;
      }

      setIsGoogleLoading(true);
      try {
        const loginResponse = await authService.googleLogin({
          credential: response.credential,
          rememberMe,
        });
        toast.success(loginResponse.message || t("login.success"));
        const role = loginResponse?.data?.user?.role;
        navigateByRole(role);
      } catch (error: any) {
        toast.error(error?.message || "Google login failed");
      } finally {
        setIsGoogleLoading(false);
      }
    };

    const initializeGoogle = () => {
      if (isCancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 360,
      });
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const scriptId = "google-identity-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener("load", initializeGoogle);

    return () => {
      isCancelled = true;
      script?.removeEventListener("load", initializeGoogle);
    };
  }, [googleClientId, rememberMe, t, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(t("login.errorMissingCreds"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login({
        email,
        password,
        rememberMe,
      });

      toast.success(response.message || t("login.success"));
      const role = response?.data?.user?.role;
      navigateByRole(role);

    } catch (error: any) {
      toast.error(error?.message || t("login.errorInvalidCreds"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-125"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-10 space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-gray-900">{t("login.welcomeBack")}</h1>
              <p className="text-gray-500 text-lg">
                {t("login.accessAccount")}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email */}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="email"
                placeholder={t("login.emailOrPhone")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isGoogleLoading}
                className="w-full py-4 pl-12 pr-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("login.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isGoogleLoading}
                className="w-full py-4 pl-12 pr-12 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading || isGoogleLoading}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading || isGoogleLoading}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-gray-600 text-sm">{t("login.rememberMe")}</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
              >
                {t("login.forgotPassword")}
              </Link>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-4 h-auto text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t("login.signingIn")}
                </>
              ) : (
                t("login.signIn")
              )}
            </Button>

            {googleClientId ? (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <div
                    ref={googleButtonRef}
                    className={`min-h-11 ${isGoogleLoading ? "opacity-60 pointer-events-none" : ""}`}
                  />
                </div>
              </>
            ) : null}
          </form>

          {/* Footer */}
          <div className="space-y-4 pt-4">
            <p className="text-center text-gray-600">
              {t("login.noAccount")}{" "}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                {t("login.signUpNow")}
              </Link>
            </p>
            <Link
              to="/track-complaint"
              className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                {t("login.trackWithoutLogin")}
              </span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
