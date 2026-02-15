import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight,
  Calendar,
  HelpCircle,
  Folder,
  Phone,
  MessageSquare,
  ChevronRight,
  Bell,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import complaintService from "@/services/complaintService";
import authService from "@/services/authService";

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
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<RecentComplaint[]>(
    [],
  );
  const [categories, setCategories] = useState<CategoryBreakdownItem[]>([]);
  const [analytics, setAnalytics] = useState<CitizenAnalyticsSummary | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "in-progress":
        return "bg-blue-100 text-blue-700";
      case "resolved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [dashboardResponse, analyticsResponse, notificationsResponse] = await Promise.all([
        complaintService.getDashboardStats(),
        complaintService.getCitizenAnalytics(),
        complaintService.getNotifications(8),
      ]);

      setStats(dashboardResponse.data.stats);
      setRecentComplaints(
        (dashboardResponse.data.recentComplaints || []).map((c: any) => ({
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
        (dashboardResponse.data.categoryBreakdown || []).map((c: any) => ({
          name: c._id,
          count: c.count,
        })),
      );
      setAnalytics(analyticsResponse.data.summary || null);
      setNotifications(notificationsResponse.data.notifications || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data");
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await complaintService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch {
      console.error("Failed to mark all notifications as read");
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await complaintService.markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item,
        ),
      );
    } catch {
      console.error("Failed to mark notification as read");
    }
  };
  const [currentTime, setCurrentTime] = useState(new Date());
  const currentUser = authService.getCurrentUser();
  const userName = currentUser?.name || "User";

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
  //     bgColor: "bg-blue-50",
  //     textColor: "text-blue-600"
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
  //     statusColor: "bg-blue-100 text-blue-700",
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
    { label: "File New Complaint", icon: Plus, href: "/file-complaint" },
    { label: "Track Complaint", icon: FileText, href: "/track-complaint" },
    { label: "Help & Support", icon: HelpCircle, href: "/help" },
    { label: "Contact Us", icon: Phone, href: "/contact" },
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
                  Welcome back,{" "}
                  <span className="text-blue-600">{userName}!</span>
                </h1>
                <div className="flex items-center gap-2 text-gray-500 mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(currentTime)}</span>
                  <span className="text-gray-300">|</span>
                  <span>{formatTime(currentTime)}</span>
                </div>
              </div>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats &&
                [
                  {
                    label: "Total Complaints",
                    value: stats.total,
                    icon: FileText,
                    bgColor: "bg-blue-50",
                    textColor: "text-blue-600",
                  },
                  {
                    label: "Pending",
                    value: stats.pending,
                    icon: Clock,
                    bgColor: "bg-yellow-50",
                    textColor: "text-yellow-600",
                  },
                  {
                    label: "Resolved",
                    value: stats.resolved,
                    icon: CheckCircle,
                    bgColor: "bg-green-50",
                    textColor: "text-green-600",
                  },
                  {
                    label: "Rejected",
                    value: stats.rejected,
                    icon: XCircle,
                    bgColor: "bg-red-50",
                    textColor: "text-red-600",
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
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
                          File New Complaint
                        </h3>
                        <p className="text-blue-100 text-sm">
                          Report an issue in your area
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
                  Recent Complaints
                </h2>
                <Link
                  to="/my-complaints"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 group"
                >
                  View All
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="space-y-4">
                {recentComplaints.map((complaint, index) => (
                  <motion.div
                    key={complaint.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
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
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
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
                          className="shrink-0 group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-600"
                        >
                          View Details
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
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Analytics Snapshot</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-indigo-50 p-4">
                  <p className="text-sm text-indigo-700">Resolution Rate</p>
                  <p className="text-2xl font-bold text-indigo-900">
                    {analytics?.resolutionRate || "0%"}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">Avg Resolution Time</p>
                  <p className="text-2xl font-bold text-emerald-900">
                    {analytics?.avgResolutionDays || "0 days"}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">Open Complaints</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {analytics?.pendingCount ?? 0}
                  </p>
                </div>
              </div>
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
                Quick Links
              </h3>
              <div className="space-y-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="flex items-center gap-3 p-3 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
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
                <Folder className="w-5 h-5 text-blue-600" />
                Categories
              </h3>
              <div className="space-y-3">
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
              <h3 className="text-lg font-bold mb-2">Need Help?</h3>
              <p className="text-indigo-100 text-sm mb-4">
                Our support team is available 24/7 to assist you with your
                queries.
              </p>
              <Button
                variant="secondary"
                className="w-full bg-white text-indigo-600 hover:bg-indigo-50"
              >
                Contact Support
              </Button>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  Status Notifications
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {notifications.filter((n) => !n.isRead).length} unread
                  </span>
                  {notifications.some((n) => !n.isRead) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={handleMarkAllNotificationsRead}
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {notifications.length === 0 && (
                  <p className="text-sm text-gray-500">No recent status updates.</p>
                )}
                {notifications.map((notification, idx) => (
                  <Link
                    key={`${notification.complaintId}-${idx}`}
                    to={`/track-complaint?complaintId=${notification.complaintId}`}
                    onClick={() => handleMarkNotificationRead(notification.id)}
                    className={`block rounded-xl border p-3 transition-colors ${
                      notification.isRead
                        ? "border-gray-100 bg-gray-50"
                        : "border-blue-200 bg-blue-50 hover:border-blue-300"
                    }`}
                  >
                    <p className="text-xs text-blue-600 font-semibold">
                      {notification.complaintId}
                    </p>
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.updatedAt).toLocaleString()}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
