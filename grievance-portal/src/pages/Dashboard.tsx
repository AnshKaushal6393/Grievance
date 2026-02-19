import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Mic,
  ArrowRight,
  Calendar,
  HelpCircle,
  Folder,
  Phone,
  MessageSquare,
  ChevronRight,
  Bell,
  TrendingUp,
  RefreshCw,
  Archive,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import complaintService from "@/services/complaintService";
import authService from "@/services/authService";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface DashboardStats {
  total: number;
  pending: number;
  resolved: number;
  rejected: number;
}

interface RecentComplaint {
  id: string;
  title: string;
  category: string;
  status: string;
  date: string;
}

interface CategoryBreakdownItem {
  name: string;
  count: number;
}

interface CitizenAnalyticsSummary {
  totalComplaints: number;
  pendingCount: number;
  resolvedCount: number;
  rejectedCount: number;
  resolutionRate: string;
  avgResolutionDays: string;
}

interface NotificationItem {
  id: string;
  complaintId: string;
  title: string;
  status: string;
  message: string;
  updatedAt: string;
  isRead?: boolean;
  source?: string;
  type?: string;
  priority?: "low" | "medium" | "high" | "critical";
  actionUrl?: string;
  isArchived?: boolean;
}

interface DraftComplaint {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
}

const Dashboard = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<RecentComplaint[]>(
    [],
  );
  const [categories, setCategories] = useState<CategoryBreakdownItem[]>([]);
  const [analytics, setAnalytics] = useState<CitizenAnalyticsSummary | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [drafts, setDrafts] = useState<DraftComplaint[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<
    "all" | "unread" | "high"
  >("all");
  const [notificationPage, setNotificationPage] = useState(1);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
  const [notificationSummary, setNotificationSummary] = useState({
    unreadCount: 0,
    highPriorityCount: 0,
  });
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState<any>(null);
  const [isSeedingDemoNotifications, setIsSeedingDemoNotifications] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "in-progress":
        return "bg-primary/15 text-primary";
      case "resolved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [dashboardResponse, analyticsResponse, draftsResponse] = await Promise.all([
        complaintService.getDashboardStats(),
        complaintService.getCitizenAnalytics(),
        complaintService.getDrafts(),
      ]);

      const dashboardData = dashboardResponse?.data || {};
      const analyticsData = analyticsResponse?.data || {};

      setStats(dashboardData.stats || null);
      setRecentComplaints(
        (dashboardData.recentComplaints || []).map((c: any) => ({
          id: c.complaintId,
          title: c.title,
          category: c.category,
          status: c.status,
          date: new Date(c.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        })),
      );
      setCategories(
        (dashboardData.categoryBreakdown || []).map((c: any) => ({
          name: c._id || "Others",
          count: c.count,
        })),
      );
      setAnalytics(analyticsData.summary || null);
      setDrafts(
        (draftsResponse?.data?.drafts || []).map((d: any) => ({
          id: String(d._id),
          title: d.title || "Untitled Draft",
          category: d.category || "Other",
          updatedAt: d.updatedAt,
        })),
      );
    } catch (error) {
      toast.error(t("dashboard.errorLoadData", "Failed to load dashboard data"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = async (reset = false) => {
    const pageToLoad = reset ? 1 : notificationPage;
    const filters: any = { page: pageToLoad, limit: 8 };
    if (notificationFilter === "unread") filters.isRead = false;
    if (notificationFilter === "high") filters.priority = "high,critical";

    const response = await complaintService.getNotifications(filters);
    const data = response?.data || {};
    const incoming = data.notifications || [];

    setNotifications((prev) => {
      if (reset) return incoming;
      const merged = [...prev];
      incoming.forEach((item: NotificationItem) => {
        if (!merged.find((existing) => existing.id === item.id)) {
          merged.push(item);
        }
      });
      return merged;
    });

    const pages = data.pagination?.pages || 1;
    setHasMoreNotifications(pageToLoad < pages);
    setNotificationPage(pageToLoad + 1);
    setNotificationSummary({
      unreadCount: data.unreadCount || 0,
      highPriorityCount: data.summary?.highPriorityCount || 0,
    });
  };

  useEffect(() => {
    setNotificationPage(1);
    fetchNotifications(true).catch(() => {
      toast.error(t("dashboard.errorLoadNotifications", "Failed to load notifications"));
    });
  }, [notificationFilter]);

  const loadNotificationPreferences = async () => {
    try {
      const response = await complaintService.getNotificationPreferences();
      setNotificationPreferences(response?.data?.preferences || null);
    } catch {
      toast.error(
        t(
          "dashboard.errorLoadNotificationPrefs",
          "Failed to load notification preferences",
        ),
      );
    }
  };

  const updatePreference = (path: string, value: any) => {
    setNotificationPreferences((prev: any) => {
      const next = { ...(prev || {}) };
      const parts = path.split(".");
      let ref = next;
      for (let i = 0; i < parts.length - 1; i += 1) {
        const key = parts[i];
        ref[key] = { ...(ref[key] || {}) };
        ref = ref[key];
      }
      ref[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const saveNotificationPreferences = async () => {
    try {
      setIsSavingPrefs(true);
      await complaintService.updateNotificationPreferences(notificationPreferences || {});
      toast.success(
        t("dashboard.notificationPrefsUpdated", "Notification preferences updated"),
      );
    } catch {
      toast.error(
        t(
          "dashboard.errorUpdateNotificationPrefs",
          "Failed to update notification preferences",
        ),
      );
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleSeedDemoNotifications = async () => {
    try {
      setIsSeedingDemoNotifications(true);
      await complaintService.seedDemoNotifications(12);
      setNotificationPage(1);
      await fetchNotifications(true);
      toast.success(
        t("dashboard.demoNotificationsGenerated", "Demo notifications generated"),
      );
    } catch {
      toast.error(
        t("dashboard.errorGenerateDemoNotifications", "Failed to generate demo notifications"),
      );
    } finally {
      setIsSeedingDemoNotifications(false);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await complaintService.markAllNotificationsRead({
        onlyUnread: true,
        includeArchived: false,
      });
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setNotificationSummary((prev) => ({ ...prev, unreadCount: 0 }));
    } catch {
      toast.error(
        t("dashboard.errorMarkNotificationsRead", "Failed to mark notifications as read"),
      );
    }
  };

  const handleMarkNotificationRead = async (
    notificationId: string,
    isRead: boolean = true,
  ) => {
    try {
      await complaintService.markNotificationRead(notificationId, isRead);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, isRead } : item,
        ),
      );
      setNotificationSummary((prev) => ({
        ...prev,
        unreadCount: Math.max(
          0,
          prev.unreadCount + (isRead ? -1 : 1),
        ),
      }));
    } catch {
      toast.error(t("dashboard.errorUpdateNotification", "Failed to update notification"));
    }
  };

  const handleArchiveNotification = async (notificationId: string) => {
    try {
      await complaintService.archiveNotification(notificationId);
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
    } catch {
      toast.error(t("dashboard.errorArchiveNotification", "Failed to archive notification"));
    }
  };

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-700";
      case "high":
        return "bg-orange-100 text-orange-700";
      case "medium":
        return "bg-primary/15 text-primary";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const performDeleteDraft = async (draftId: string) => {
    try {
      await complaintService.deleteDraft(draftId);
      setDrafts((prev) => prev.filter((item) => item.id !== draftId));
      toast.success(t("dashboard.draftDeleted", "Draft deleted"));
    } catch {
      toast.error(t("dashboard.errorDeleteDraft", "Failed to delete draft"));
    }
  };
  const handleDeleteDraft = (draftId: string) => {
    toast(t("dashboard.deleteDraftPrompt", "Delete this draft complaint?"), {
      description: t(
        "dashboard.deleteDraftPromptDesc",
        "This action cannot be undone.",
      ),
      action: {
        label: t("dashboard.delete", "Delete"),
        onClick: () => {
          void performDeleteDraft(draftId);
        },
      },
      cancel: {
        label: t("dashboard.cancel", "Cancel"),
        onClick: () => {},
      },
      duration: 8000,
    });
  };
  const [currentTime, setCurrentTime] = useState(new Date());
  const currentUser = authService.getCurrentUser();
  const userName = currentUser?.name || t("dashboard.userFallback", "User");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // const stats = [
  //   {
  //     label: "Total Complaints",
  //     value: 12,
  //     icon: FileText,
  //     color: "from-blue-500 to-blue-600",
  //     bgColor: "bg-primary/10",
  //     textColor: "text-primary"
  //   },
  //   {
  //     label: "Pending",
  //     value: 4,
  //     icon: Clock,
  //     color: "from-yellow-500 to-orange-500",
  //     bgColor: "bg-yellow-50",
  //     textColor: "text-yellow-600"
  //   },
  //   {
  //     label: "Resolved",
  //     value: 7,
  //     icon: CheckCircle,
  //     color: "from-green-500 to-emerald-500",
  //     bgColor: "bg-green-50",
  //     textColor: "text-green-600"
  //   },
  //   {
  //     label: "Rejected",
  //     value: 1,
  //     icon: XCircle,
  //     color: "from-red-500 to-rose-500",
  //     bgColor: "bg-red-50",
  //     textColor: "text-red-600"
  //   },
  // ];

  // const recentComplaints = [
  //   {
  //     id: "GR2024001234",
  //     title: "Street Light Not Working on Main Road",
  //     category: "Infrastructure",
  //     status: "Pending",
  //     statusColor: "bg-yellow-100 text-yellow-700",
  //     date: "15 Jan 2024"
  //   },
  //   {
  //     id: "GR2024001198",
  //     title: "Garbage Not Collected for 3 Days",
  //     category: "Sanitation",
  //     status: "In Progress",
  //     statusColor: "bg-primary/15 text-primary",
  //     date: "12 Jan 2024"
  //   },
  //   {
  //     id: "GR2024001156",
  //     title: "Water Supply Issue in Block C",
  //     category: "Water",
  //     status: "Resolved",
  //     statusColor: "bg-green-100 text-green-700",
  //     date: "08 Jan 2024"
  //   },
  // ];

  const quickLinks = [
    {
      label: t("dashboard.quick.fileComplaint", "File New Complaint"),
      icon: Plus,
      href: "/file-complaint",
    },
    {
      label: t("dashboard.quick.fileVoice", "File by Voice"),
      icon: Mic,
      href: "/voice-complaint",
    },
    {
      label: t("dashboard.quick.trackComplaint", "Track Complaint"),
      icon: FileText,
      href: "/track-complaint",
    },
    {
      label: t("dashboard.quick.helpSupport", "Help & Support"),
      icon: HelpCircle,
      href: "/help",
    },
    { label: t("dashboard.quick.contact", "Contact Us"), icon: Phone, href: "/contact" },
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const statCards = [
    {
      label: t("dashboard.stats.total", "Total Complaints"),
      value: stats?.total ?? 0,
      icon: FileText,
      bgColor: "bg-primary/10",
      textColor: "text-primary",
    },
    {
      label: t("dashboard.stats.pending", "Pending"),
      value: stats?.pending ?? 0,
      icon: Clock,
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-600",
    },
    {
      label: t("dashboard.stats.resolved", "Resolved"),
      value: stats?.resolved ?? 0,
      icon: CheckCircle,
      bgColor: "bg-green-50",
      textColor: "text-green-600",
    },
    {
      label: t("dashboard.stats.rejected", "Rejected"),
      value: stats?.rejected ?? 0,
      icon: XCircle,
      bgColor: "bg-red-50",
      textColor: "text-red-600",
    },
  ];

  const notificationFilterLabel = (filter: "all" | "unread" | "high") => {
    if (filter === "all") return t("dashboard.notifications.filterAll", "All");
    if (filter === "unread") {
      return t("dashboard.notifications.filterUnread", "Unread");
    }
    return t("dashboard.notifications.filterHigh", "High");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {t("dashboard.welcomeBack", "Welcome back")},{" "}
                  <span className="text-primary">{userName}!</span>
                </h1>
                <div className="flex items-center gap-2 text-gray-500 mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(currentTime)}</span>
                  <span className="text-gray-300">|</span>
                  <span>{formatTime(currentTime)}</span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={fetchDashboardData}
                disabled={isLoading}
                className="w-fit"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                {t("dashboard.refresh", "Refresh")}
              </Button>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group ${
                      isLoading && !stats ? "animate-pulse" : ""
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                  </motion.div>
                ))}
            </div>

            {/* Quick Action Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link to="/file-complaint">
                <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Plus className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">
                          {t("dashboard.hero.title", "File New Complaint")}
                        </h3>
                        <p className="text-blue-100 text-sm">
                          {t("dashboard.hero.subtitle", "Report an issue in your area")}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Recent Complaints */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {t("dashboard.recent.title", "Recent Complaints")}
                </h2>
                <Link
                  to="/my-complaints"
                  className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 group"
                >
                  {t("dashboard.recent.viewAll", "View All")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="space-y-4">
                {!isLoading && recentComplaints.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
                    <p className="text-sm text-gray-600 mb-3">
                      {t(
                        "dashboard.recent.empty",
                        "No complaints yet. File your first complaint to track updates here.",
                      )}
                    </p>
                    <Link to="/file-complaint">
                      <Button size="sm">
                        {t("dashboard.recent.fileComplaint", "File a Complaint")}
                      </Button>
                    </Link>
                  </div>
                )}
                {recentComplaints.map((complaint, index) => (
                  <motion.div
                    key={complaint.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="border border-gray-100 rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-gray-400">
                            {complaint.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}
                          >
                            {complaint.status}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                          {complaint.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600">
                            {complaint.category}
                          </span>
                          <span className="text-xs text-gray-400">
                            {complaint.date}
                          </span>
                        </div>
                      </div>
                      <Link to={`/track-complaint?complaintId=${complaint.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:text-primary"
                        >
                          {t("dashboard.viewDetails", "View Details")}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Citizen Analytics Snapshot */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="bg-white rounded-2xl shadow-sm p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-gray-900">
                  {t("dashboard.analytics.title", "Analytics Snapshot")}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-primary/10 p-4">
                  <p className="text-sm text-primary/80">
                    {t("dashboard.analytics.resolutionRate", "Resolution Rate")}
                  </p>
                  <p className="text-2xl font-bold text-primary-foreground">
                    {analytics?.resolutionRate || "0%"}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">
                    {t("dashboard.analytics.avgResolutionTime", "Avg Resolution Time")}
                  </p>
                  <p className="text-2xl font-bold text-emerald-900">
                    {analytics?.avgResolutionDays || t("dashboard.analytics.zeroDays", "0 days")}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">
                    {t("dashboard.analytics.openComplaints", "Open Complaints")}
                  </p>
                  <p className="text-2xl font-bold text-amber-900">
                    {analytics?.pendingCount ?? 0}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Saved Drafts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {t("dashboard.drafts.title", "Saved Drafts")}
                </h2>
                <span className="text-sm text-gray-500">
                  {drafts.length} {t("dashboard.drafts.count", "drafts")}
                </span>
              </div>
              {drafts.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t(
                    "dashboard.drafts.empty",
                    'No drafts yet. Use "Save as Draft" on complaint form.',
                  )}
                </p>
              ) : (
                <div className="space-y-3">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="rounded-xl border border-gray-200 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{draft.title}</p>
                        <p className="text-xs text-gray-500">
                          {draft.category} · Updated{" "}
                          {new Date(draft.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/file-complaint?draftId=${draft.id}`}>
                          <Button size="sm" variant="outline">
                            {t("dashboard.resume", "Resume")}
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleDeleteDraft(draft.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {t("dashboard.delete", "Delete")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:w-80 space-y-6"
          >
            {/* Quick Links */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("dashboard.quickLinks", "Quick Links")}
              </h3>
              <div className="space-y-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="flex items-center gap-3 p-3 rounded-xl text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors group"
                  >
                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <link.icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Folder className="w-5 h-5 text-primary" />
                {t("dashboard.categories.title", "Categories")}
              </h3>
              <div className="space-y-3">
                {!isLoading && categories.length === 0 && (
                  <p className="text-sm text-gray-500">
                    {t(
                      "dashboard.categories.empty",
                      "Category insights will appear once complaints are filed.",
                    )}
                  </p>
                )}
                {categories.map((category) => (
                  <div
                    key={category.name}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <span className="text-sm text-gray-700">
                      {category.name}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                      {category.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Help & Support */}
            <div className="bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                {t("dashboard.help.title", "Need Help?")}
              </h3>
              <p className="text-indigo-100 text-sm mb-4">
                {t(
                  "dashboard.help.subtitle",
                  "Our support team is available 24/7 to assist you with your queries.",
                )}
              </p>
              <Button
                variant="secondary"
                className="w-full bg-white text-primary hover:bg-primary/10"
              >
                {t("dashboard.help.contact", "Contact Support")}
              </Button>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  {t("dashboard.notifications.title", "Status Notifications")}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      const next = !showNotificationPrefs;
                      setShowNotificationPrefs(next);
                      if (next && !notificationPreferences) {
                        void loadNotificationPreferences();
                      }
                    }}
                  >
                    {t("dashboard.notifications.preferences", "Preferences")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleSeedDemoNotifications}
                    disabled={isSeedingDemoNotifications}
                  >
                    {isSeedingDemoNotifications
                      ? t("dashboard.notifications.generating", "Generating...")
                      : t("dashboard.notifications.generateDemo", "Generate Demo")}
                  </Button>
                  <span className="text-xs text-gray-500">
                    {notificationSummary.unreadCount}{" "}
                    {t("dashboard.notifications.unread", "unread")}
                  </span>
                  <span className="text-xs text-orange-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {notificationSummary.highPriorityCount}{" "}
                    {t("dashboard.notifications.highPriority", "high priority")}
                  </span>
                  {notifications.some((n) => !n.isRead) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={handleMarkAllNotificationsRead}
                    >
                      {t("dashboard.notifications.markAllRead", "Mark all read")}
                    </Button>
                  )}
                </div>
              </div>
              {showNotificationPrefs && (
                <div className="mb-3 rounded-lg border border-gray-200 p-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-700 uppercase">
                    {t("dashboard.notifications.deliveryChannels", "Delivery Channels")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                    {[
                      { key: "inApp", label: "In-App" },
                      { key: "email", label: "Email" },
                      { key: "sms", label: "SMS" },
                      { key: "push", label: "Push" },
                    ].map((channel) => (
                      <label
                        key={channel.key}
                        className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(
                            notificationPreferences?.channels?.[channel.key],
                          )}
                          onChange={(e) =>
                            updatePreference(
                              `channels.${channel.key}`,
                              e.target.checked,
                            )
                          }
                        />
                        {channel.label}
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase">
                      {t("dashboard.notifications.digest", "Digest")}
                    </label>
                    <select
                      className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                      value={notificationPreferences?.digest?.frequency || "daily"}
                      onChange={(e) =>
                        updatePreference("digest.frequency", e.target.value)
                      }
                    >
                      <option value="none">{t("dashboard.none", "None")}</option>
                      <option value="daily">{t("dashboard.daily", "Daily")}</option>
                      <option value="weekly">{t("dashboard.weekly", "Weekly")}</option>
                    </select>
                  </div>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={saveNotificationPreferences}
                    disabled={isSavingPrefs}
                  >
                    {isSavingPrefs
                      ? t("dashboard.saving", "Saving...")
                      : t("dashboard.notifications.savePreferences", "Save Preferences")}
                  </Button>
                </div>
              )}
              <div className="mb-3 flex items-center gap-2">
                {(["all", "unread", "high"] as const).map((filter) => (
                  <Button
                    key={filter}
                    type="button"
                    size="sm"
                    variant={notificationFilter === filter ? "default" : "outline"}
                    className="h-7 px-2 text-xs capitalize"
                    onClick={() => setNotificationFilter(filter)}
                  >
                    {notificationFilterLabel(filter)}
                  </Button>
                ))}
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {notifications.length === 0 && (
                  <p className="text-sm text-gray-500">
                    {t("dashboard.notifications.empty", "No recent status updates.")}
                  </p>
                )}
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`block rounded-xl border p-3 transition-colors ${
                      notification.isRead
                        ? "border-gray-100 bg-gray-50"
                        : "border-primary/30 bg-primary/10 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/track-complaint?complaintId=${notification.complaintId}`}
                          onClick={() => handleMarkNotificationRead(notification.id, true)}
                        >
                          <p className="text-xs text-primary font-semibold">
                            {notification.complaintId}
                          </p>
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">
                            {notification.message}
                          </p>
                        </Link>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getPriorityBadgeClass(notification.priority)}`}
                          >
                            {notification.priority || "low"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-gray-100 text-gray-600">
                            {notification.type || "status_update"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              handleMarkNotificationRead(notification.id, true)
                            }
                          >
                            {t("dashboard.notifications.markRead", "Mark read")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleArchiveNotification(notification.id)}
                        >
                          <Archive className="w-3 h-3 text-gray-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {hasMoreNotifications && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fetchNotifications(false)}
                  >
                    {t("dashboard.loadMore", "Load more")}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
