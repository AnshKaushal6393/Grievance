import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  FileQuestion,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  Settings,
  User,
  Users,
  X,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import authService from "@/services/authService";
import complaintService from "@/services/complaintService";
import adminService from "@/services/adminService";
import { useLanguage } from "@/contexts/LanguageContext";
import GovernmentTopStrip from "@/components/GovernmentTopStrip";

type NavbarProps = {
  branding?: {
    siteName?: string;
    logoDataUrl?: string;
  };
};

type NavNotification = {
  id?: string;
  _id?: string;
  title?: string;
  message?: string;
  isRead?: boolean;
  updatedAt?: string;
  createdAt?: string;
  actionUrl?: string;
  priority?: "low" | "medium" | "high" | "critical";
};

const Navbar = ({ branding }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NavNotification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [fontScale, setFontScale] = useState<"sm" | "md" | "lg">("md");
  const isLoggedIn = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();
  const displayName = currentUser?.name || "User";
  const displayEmail = currentUser?.email || "user@example.com";
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language, setLanguage, getLanguageLabel } = useLanguage();
  const [brandName, setBrandName] = useState("Grievance Portal");
  const [brandLogo, setBrandLogo] = useState("");
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isLoggedIn) {
        setNotificationCount(0);
        setNotifications([]);
        return;
      }
      try {
        setIsLoadingNotifications(true);
        const response = await complaintService.getNotifications({ limit: 6, includeArchived: false });
        const payload = response?.data || {};
        setNotificationCount(payload.unreadCount || 0);
        setNotifications(payload.notifications || []);
      } catch {
        setNotificationCount(0);
        setNotifications([]);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, [isLoggedIn, location.pathname]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!notificationPanelRef.current) return;
      const target = event.target as Node;
      if (!notificationPanelRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener("mousedown", handleDocumentClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [isNotificationsOpen]);

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

  useEffect(() => {
    const sizes: Record<typeof fontScale, string> = { sm: "14px", md: "16px", lg: "18px" };
    document.documentElement.style.fontSize = sizes[fontScale];
  }, [fontScale]);

  const navLinks =
    currentUser?.role === "admin"
      ? [
          { label: t("nav.adminDashboard", "Admin Dashboard"), href: "/admin" },
          { label: t("nav.complaints", "Complaints"), href: "/admin/complaints" },
          { label: t("nav.users", "Users"), href: "/admin/users" },
          { label: t("nav.departments", "Departments"), href: "/admin/departments" },
          { label: t("nav.reports", "Reports"), href: "/admin/reports" },
          { label: t("nav.analytics", "Analytics"), href: "/admin/analytics" },
          { label: t("nav.settings", "Settings"), href: "/admin/settings" },
        ]
      : currentUser?.role === "officer"
        ? [
            { label: t("nav.dashboard", "Dashboard"), href: "/officer" },
            { label: t("nav.departmentQueue", "Department Queue"), href: "/officer#department-queue" },
            { label: t("nav.assignedCases", "Assigned Cases"), href: "/officer#assigned-complaints" },
            { label: t("nav.slaAlerts", "SLA Alerts"), href: "/officer#sla-alerts" },
          ]
        : [
            { label: t("nav.home", "Home"), href: "/" },
            { label: t("nav.fileGrievance", "File Grievance"), href: "/file-complaint-options" },
            { label: t("nav.trackComplaint", "Track Grievance"), href: "/track-complaint" },
            { label: t("nav.about", "Help"), href: "/about" },
          ];

  const profileMenuItems =
    currentUser?.role === "admin"
      ? [
          { label: t("nav.adminDashboard", "Admin Dashboard"), icon: LayoutDashboard, href: "/admin" },
          { label: t("nav.allComplaints", "All Complaints"), icon: FileQuestion, href: "/admin/complaints" },
          { label: t("nav.users", "Users"), icon: Users, href: "/admin/users" },
          { label: t("nav.departments", "Departments"), icon: Users, href: "/admin/departments" },
          { label: t("nav.reports", "Reports"), icon: BarChart3, href: "/admin/reports" },
          { label: t("nav.analytics", "Analytics"), icon: BarChart3, href: "/admin/analytics" },
          { label: t("nav.settings", "Settings"), icon: Settings, href: "/admin/settings" },
          { label: t("nav.profile", "Profile"), icon: User, href: "/profile" },
        ]
      : currentUser?.role === "officer"
        ? [
            { label: t("nav.dashboard", "Dashboard"), icon: LayoutDashboard, href: "/officer" },
            { label: t("nav.profile", "Profile"), icon: User, href: "/profile" },
          ]
        : [
            { label: t("nav.dashboard", "Dashboard"), icon: LayoutDashboard, href: "/dashboard" },
            { label: t("nav.voiceComplaint", "Voice Complaint"), icon: Mic, href: "/voice-complaint" },
            { label: t("nav.myComplaints", "My Complaints"), icon: FileQuestion, href: "/my-complaints" },
            { label: t("nav.profile", "Profile"), icon: User, href: "/profile" },
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

  const getNotificationsRoute = () => {
    if (currentUser?.role === "admin") return "/admin";
    if (currentUser?.role === "officer") return "/officer";
    return "/dashboard";
  };

  const handleNotificationsClick = () => {
    setIsProfileOpen(false);
    setIsNotificationsOpen((prev) => !prev);
  };

  const handleNotificationItemClick = async (item: NavNotification) => {
    const notificationId = item.id || item._id;
    if (notificationId && !item.isRead) {
      try {
        await complaintService.markNotificationRead(notificationId, true);
        setNotifications((prev) =>
          prev.map((n) =>
            (n.id || n._id) === notificationId ? { ...n, isRead: true } : n,
          ),
        );
        setNotificationCount((prev) => Math.max(0, prev - 1));
      } catch {
        // keep navigation behavior even if mark-read fails
      }
    }
    setIsNotificationsOpen(false);
    navigate(item.actionUrl || getNotificationsRoute());
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await complaintService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setNotificationCount(0);
    } catch {
      // non-blocking UI action
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <a
          href="#main-content"
          className="skip-link absolute left-2 top-2 z-[70] rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        >
          {t("nav.skipContent", "Skip to main content")}
        </a>

        <GovernmentTopStrip
          rightContent={
            <div className="flex items-center gap-2">
              <span>{t("nav.textSize", "Text Size")}</span>
              <button type="button" className="rounded border border-slate-500 px-1" onClick={() => setFontScale("sm")} aria-label={t("nav.textSizeSmall", "Decrease text size")}>A-</button>
              <button type="button" className="rounded border border-slate-500 px-1" onClick={() => setFontScale("md")} aria-label={t("nav.textSizeDefault", "Default text size")}>A</button>
              <button type="button" className="rounded border border-slate-500 px-1" onClick={() => setFontScale("lg")} aria-label={t("nav.textSizeLarge", "Increase text size")}>A+</button>
            </div>
          }
        />

        <div className="border-b border-border bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link to="/" className="flex items-center gap-3" aria-label={t("nav.home", "Home")}>
              <img
                src="/gov-emblem.svg"
                alt={t("nav.departmentLogo", "Department logo")}
                className="h-10 w-10 border border-border object-contain p-1"
              />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("nav.goiDept", "Public Grievance Redressal")}</p>
                <p className="text-lg font-semibold leading-tight text-foreground">{brandName}</p>
              </div>
            </Link>

            <div className="hidden items-center gap-2 md:flex">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "hi" | "ur")}
                className="h-9 rounded border border-input bg-background px-2 text-sm text-foreground"
                aria-label={t("nav.language", "Language")}
              >
                <option value="en">{getLanguageLabel("en")}</option>
                <option value="hi">{getLanguageLabel("hi")}</option>
                <option value="ur">{getLanguageLabel("ur")}</option>
              </select>
              <span className="text-xs text-muted-foreground">{t("nav.helpline", "Helpline: 1800-000-0000")}</span>
            </div>
          </div>
        </div>

        <nav className="border-b border-border bg-slate-50" aria-label={t("nav.primary", "Primary")}> 
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`rounded px-3 py-2 text-sm font-medium ${
                    isActiveLink(link.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden items-center gap-2 md:flex">
              {isLoggedIn ? (
                <>
                  <div className="relative" ref={notificationPanelRef}>
                    <button type="button" className="relative rounded p-2 text-slate-700 hover:bg-slate-200" aria-label={t("nav.notifications", "Notifications")} onClick={handleNotificationsClick} aria-expanded={isNotificationsOpen} aria-haspopup="menu">
                      <Bell className="h-5 w-5" />
                      {notificationCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                          {notificationCount > 99 ? "99+" : notificationCount}
                        </span>
                      )}
                    </button>

                    {isNotificationsOpen && (
                      <div className="absolute right-0 mt-2 w-80 rounded border border-border bg-white p-2 shadow" role="menu" aria-label={t("nav.notifications", "Notifications")}>
                        <div className="mb-2 flex items-center justify-between border-b border-border px-2 pb-2">
                          <p className="text-sm font-semibold">{t("nav.notifications", "Notifications")}</p>
                          {notificationCount > 0 && (
                            <button type="button" className="text-xs text-primary hover:underline" onClick={handleMarkAllNotificationsRead}>
                              {t("nav.markAllRead", "Mark all read")}
                            </button>
                          )}
                        </div>

                        <div className="max-h-72 space-y-1 overflow-y-auto">
                          {isLoadingNotifications ? (
                            <p className="px-2 py-3 text-sm text-muted-foreground">{t("common.loading", "Loading...")}</p>
                          ) : notifications.length === 0 ? (
                            <p className="px-2 py-3 text-sm text-muted-foreground">{t("nav.noNotifications", "No notifications")}</p>
                          ) : (
                            notifications.map((item) => {
                              const id = item.id || item._id || `${item.title}-${item.updatedAt}`;
                              const when = new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleString();
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => handleNotificationItemClick(item)}
                                  className={`w-full rounded px-2 py-2 text-left hover:bg-slate-50 ${item.isRead ? "opacity-80" : ""}`}
                                >
                                  <p className="line-clamp-1 text-sm font-medium text-slate-900">{item.title || t("nav.notification", "Notification")}</p>
                                  <p className="line-clamp-2 text-xs text-muted-foreground">{item.message || ""}</p>
                                  <p className="mt-1 text-[10px] text-muted-foreground">{when}</p>
                                </button>
                              );
                            })
                          )}
                        </div>

                        <div className="mt-2 border-t border-border px-2 pt-2">
                          <button type="button" className="text-xs text-primary hover:underline" onClick={() => { setIsNotificationsOpen(false); navigate(getNotificationsRoute()); }}>
                            {t("nav.viewAllNotifications", "View all notifications")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        setIsProfileOpen((prev) => !prev);
                      }}
                      className="flex items-center gap-2 rounded border border-border bg-white px-2 py-1.5"
                      aria-label={t("nav.profileMenu", "Profile menu")}
                      aria-expanded={isProfileOpen}
                      aria-haspopup="menu"
                    >
                      <User className="h-4 w-4" />
                      <span className="text-sm">{displayName}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isProfileOpen && (
                      <div className="absolute right-0 mt-2 w-56 border border-border bg-white py-2 shadow" role="menu" aria-label={t("nav.profileMenu", "Profile menu")}>
                        <div className="border-b border-border px-4 py-2">
                          <p className="text-sm font-semibold">{displayName}</p>
                          <p className="text-xs text-muted-foreground">{displayEmail}</p>
                        </div>
                        {profileMenuItems.map((item) => (
                          <Link
                            key={item.label}
                            to={item.href}
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100"
                          >
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            {item.label}
                          </Link>
                        ))}
                        <div className="mt-2 border-t border-border pt-2">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            <LogOut className="h-4 w-4" />
                            {t("nav.logout", "Logout")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/login">{t("nav.signIn", "Sign In")}</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/register">{t("nav.signUp", "Sign Up")}</Link>
                  </Button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="rounded border border-border bg-white p-2 md:hidden"
              aria-label={t("nav.menu", "Menu")}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {isOpen && (
          <div className="border-t border-border bg-white md:hidden">
            <div className="space-y-2 px-4 py-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("nav.language", "Language")}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "hi" | "ur")}
                className="h-10 w-full rounded border border-input bg-background px-2 text-sm text-foreground"
                aria-label={t("nav.language", "Language")}
              >
                <option value="en">{getLanguageLabel("en")}</option>
                <option value="hi">{getLanguageLabel("hi")}</option>
                <option value="ur">{getLanguageLabel("ur")}</option>
              </select>
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block rounded px-3 py-2 text-sm ${
                    isActiveLink(link.href) ? "bg-primary text-primary-foreground" : "hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>
      <div id="main-content" tabIndex={-1} />
    </>
  );
};

export default Navbar;
