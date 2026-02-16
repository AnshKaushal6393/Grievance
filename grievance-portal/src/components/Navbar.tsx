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
  const { t } = useLanguage();
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
          { label: "Voice Complaint", href: "/voice-complaint" },
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
          { label: "Voice Complaint", icon: Mic, href: "/voice-complaint" },
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
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            {brandLogo ? (
              <img src={brandLogo} alt="Site logo" className="w-10 h-10 rounded-xl border object-cover shadow-md" />
            ) : (
              <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{brandName}</h1>
              <p className="text-xs text-gray-500 -mt-0.5">{t("nav.platformSubtitle")}</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActiveLink(link.href)
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <button className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
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
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{displayName}</span>
                    <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50"
                      >
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                          <p className="text-xs text-gray-500">{displayEmail}</p>
                        </div>
                        {profileMenuItems.map((item) => (
                          <Link
                            key={item.label}
                            to={item.href}
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <item.icon className="w-4 h-4 text-gray-400" />
                            {item.label}
                          </Link>
                        ))}
                        <div className="border-t border-gray-100 mt-2 pt-2">
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
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                  asChild
                >
                  <Link to="/register">{t("nav.signUp")}</Link>
                </Button>
              </>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
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
            className="md:hidden bg-white border-t border-gray-100 shadow-lg"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActiveLink(link.href)
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {!isLoggedIn && (
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                  <Button variant="outline" className="w-full py-3 h-auto" asChild>
                    <Link to="/login" onClick={() => setIsOpen(false)}>{t("nav.signIn")}</Link>
                  </Button>
                  <Button
                    className="w-full py-3 h-auto bg-gradient-to-r from-blue-600 to-indigo-600"
                    asChild
                  >
                    <Link to="/register" onClick={() => setIsOpen(false)}>{t("nav.signUp")}</Link>
                  </Button>
                </div>
              )}

              {isLoggedIn && (
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                      <p className="text-xs text-gray-500">{displayEmail}</p>
                    </div>
                  </div>
                  {profileMenuItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-gray-400" />
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
