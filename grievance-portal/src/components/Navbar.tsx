import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Menu, X, Bell, User, Users, ChevronDown, LayoutDashboard, FileQuestion, LogOut, BarChart3, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import authService from "@/services/authService";
import complaintService from "@/services/complaintService";
import adminService from "@/services/adminService";
import { useLanguage } from "@/contexts/LanguageContext";

type NavbarProps = {
  branding?: {
    siteName?: string;
    logoDataUrl?: string;
  };
};

const Navbar = ({ branding }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const isLoggedIn = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();
  const displayName = currentUser?.name || "User";
  const displayEmail = currentUser?.email || "user@example.com";
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language, setLanguage, getLanguageLabel } = useLanguage();
  const [brandName, setBrandName] = useState("Grievance Portal");
  const [brandLogo, setBrandLogo] = useState("");

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isLoggedIn) {
        setNotificationCount(0);
        return;
      }
      try {
        const response = await complaintService.getNotifications(10);
        setNotificationCount(response?.data?.unreadCount || 0);
      } catch {
        setNotificationCount(0);
      }
    };

    fetchNotifications();
  }, [isLoggedIn, location.pathname]);

  useEffect(() => {
    let mounted = true;

    if (branding) {
      setBrandName(branding.siteName?.trim() || "Grievance Portal");
      setBrandLogo(branding.logoDataUrl || "");
      return () => {
        mounted = false;
      };
    }

    const loadBranding = async () => {
      if (currentUser?.role !== "admin") {
        setBrandName("Grievance Portal");
        setBrandLogo("");
        return;
      }
      try {
        const response = await adminService.getSettings();
        const general = response?.data?.settings?.general;
        if (!mounted) return;
        setBrandName(general?.siteName?.trim() || "Grievance Portal");
        setBrandLogo(general?.logoDataUrl || "");
      } catch {
        if (!mounted) return;
        setBrandName("Grievance Portal");
        setBrandLogo("");
      }
    };

    void loadBranding();
    return () => {
      mounted = false;
    };
  }, [branding, currentUser?.role, location.pathname]);

  const navLinks =
    currentUser?.role === "admin"
      ? [
          { label: t("nav.adminDashboard"), href: "/admin" },
          { label: t("nav.complaints"), href: "/admin/complaints" },
          { label: t("nav.users"), href: "/admin/users" },
          { label: t("nav.departments"), href: "/admin/departments" },
          { label: t("nav.reports"), href: "/admin/reports" },
          { label: t("nav.analytics"), href: "/admin/analytics" },
        ]
      : [
          { label: t("nav.home"), href: "/" },
          { label: t("nav.voiceComplaint"), href: "/voice-complaint" },
          { label: t("nav.about"), href: "/about" },
          { label: t("nav.trackComplaint"), href: "/track-complaint" },
        ];

  const profileMenuItems =
    currentUser?.role === "admin"
      ? [
          { label: t("nav.adminDashboard"), icon: LayoutDashboard, href: "/admin" },
          { label: t("nav.allComplaints"), icon: FileQuestion, href: "/admin/complaints" },
          { label: t("nav.users"), icon: Users, href: "/admin/users" },
          { label: t("nav.departments"), icon: Users, href: "/admin/departments" },
          { label: t("nav.reports"), icon: BarChart3, href: "/admin/reports" },
          { label: t("nav.analytics"), icon: BarChart3, href: "/admin/analytics" },
          { label: t("nav.profile"), icon: User, href: "/profile" },
        ]
      : [
          { label: t("nav.dashboard"), icon: LayoutDashboard, href: "/dashboard" },
          { label: t("nav.voiceComplaint"), icon: Mic, href: "/voice-complaint" },
          { label: t("nav.myComplaints"), icon: FileQuestion, href: "/my-complaints" },
          { label: t("nav.profile"), icon: User, href: "/profile" },
        ];

  const isActiveLink = (href: string) => location.pathname === href;

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      setIsProfileOpen(false);
      setIsOpen(false);
      navigate("/login");
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-card shadow-md border-b border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            {brandLogo ? (
              <img src={brandLogo} alt="Site logo" className="w-10 h-10 rounded-xl border border-border object-cover shadow-md" />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground leading-tight">{brandName}</h1>
              <p className="text-xs text-muted-foreground -mt-0.5">{t("nav.platformSubtitle")}</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActiveLink(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "hi" | "ur")}
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
              aria-label={t("nav.language")}
            >
              <option value="en">{getLanguageLabel("en")}</option>
              <option value="hi">{getLanguageLabel("hi")}</option>
              <option value="ur">{getLanguageLabel("ur")}</option>
            </select>
            {isLoggedIn ? (
              <>
                <button className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                  <Bell className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                </button>

                <div className="relative">
                  <button
                    onClick={() => {
                      setIsProfileOpen(!isProfileOpen);
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{displayName}</span>
                    <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-56 bg-card rounded-xl shadow-lg border border-border py-2 z-50"
                      >
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-sm font-semibold text-foreground">{displayName}</p>
                          <p className="text-xs text-muted-foreground">{displayEmail}</p>
                        </div>
                        {profileMenuItems.map((item) => (
                          <Link
                            key={item.label}
                            to={item.href}
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            <item.icon className="w-4 h-4 text-muted-foreground" />
                            {item.label}
                          </Link>
                        ))}
                        <div className="border-t border-border mt-2 pt-2">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            {t("nav.logout")}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-gray-600" asChild>
                  <Link to="/login">{t("nav.signIn")}</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                  asChild
                >
                  <Link to="/register">{t("nav.signUp")}</Link>
                </Button>
              </>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-card border-t border-border shadow-lg"
          >
            <div className="px-4 py-4 space-y-2">
              <div className="px-1 pb-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t("nav.language")}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "en" | "hi" | "ur")}
                  className="w-full h-10 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
                >
                  <option value="en">{getLanguageLabel("en")}</option>
                  <option value="hi">{getLanguageLabel("hi")}</option>
                  <option value="ur">{getLanguageLabel("ur")}</option>
                </select>
              </div>
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActiveLink(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {!isLoggedIn && (
                <div className="border-t border-border pt-4 mt-4 space-y-2">
                  <Button variant="outline" className="w-full py-3 h-auto" asChild>
                    <Link to="/login" onClick={() => setIsOpen(false)}>{t("nav.signIn")}</Link>
                  </Button>
                  <Button
                    className="w-full py-3 h-auto bg-primary text-primary-foreground hover:bg-primary/90"
                    asChild
                  >
                    <Link to="/register" onClick={() => setIsOpen(false)}>{t("nav.signUp")}</Link>
                  </Button>
                </div>
              )}

              {isLoggedIn && (
                <div className="border-t border-border pt-4 mt-4 space-y-2">
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{displayEmail}</p>
                    </div>
                  </div>
                  {profileMenuItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t("nav.logout")}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
