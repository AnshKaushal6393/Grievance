import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import adminService from "@/services/adminService";
import {
  FileText, TrendingUp, Clock, CheckCircle2, AlertTriangle,
  BarChart3, Users, Settings, Download, Bell, ChevronRight,
  ArrowUpRight, ArrowDownRight, Search, Filter, MoreHorizontal,
  Building2, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { toast } from "sonner";

// ✅ Icon map for alerts — backend sends type string, we map to icon
const ALERT_ICON_MAP: Record<string, React.ElementType> = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  sla: Clock,
  department: Users,
  default: AlertTriangle,
};

// ✅ Color map for activity feed
const ACTIVITY_COLOR_MAP: Record<string, string> = {
  filed: "bg-blue-500",
  assigned: "bg-purple-500",
  resolved: "bg-green-500",
  rejected: "bg-red-500",
  sla: "bg-orange-500",
  default: "bg-gray-400",
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [trendChartData, setTrendChartData] = useState<any[]>([]);
  const [categoryChartData, setCategoryChartData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const sortedDepartments = [...deptData]
    .filter(dept => dept.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await adminService.getDashboardStats();
      const { stats, trendData, categoryBreakdown, deptPerformance, recentActivity } = res.data;

      const getTrend = (current: number, previous: number | null) => {
        if (previous === null || previous === undefined || previous <= 0) return { trend: null, trendUp: true };
        const diff = ((current - previous) / previous) * 100;
        return { trend: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`, trendUp: diff >= 0 };
      };

      const lastTwoDays = (trendData ?? []).slice(-2);
      const todayFiled = trendData?.[trendData.length - 1]?.filed ?? stats.todayComplaints ?? 0;
      const prevFiled = lastTwoDays.length === 2 ? lastTwoDays[0].filed ?? 0 : null;
      const todayTrend = getTrend(todayFiled, prevFiled);

      // ✅ Build static alerts (backend doesn't return icon objects)
      setAlerts([
        {
          id: 1,
          title: `${stats.pendingReview} complaints pending review`,
          type: "critical",
          action: () => navigate("/admin/complaints"),
        },
        {
          id: 2,
          title: "Check department workloads",
          type: "warning",
          action: () => navigate("/admin/departments"),
        },
        {
          id: 3,
          title: "SLA targets need review",
          type: "warning",
          action: () => navigate("/admin/departments"),
        },
      ]);

      setStatsData([
        {
          title: "Total Complaints", value: stats.totalComplaints, subtitle: "All time",
          trend: null, trendUp: true, icon: FileText, iconBg: "bg-blue-100", iconColor: "text-blue-600",
        },
        {
          title: "Today's Complaints", value: stats.todayComplaints, subtitle: "Since midnight",
          trend: todayTrend.trend, trendUp: todayTrend.trendUp, icon: TrendingUp, iconBg: "bg-green-100", iconColor: "text-green-600",
        },
        {
          title: "Pending Review", value: stats.pendingReview, subtitle: "Awaiting action",
          trend: null, trendUp: false, icon: Clock, iconBg: "bg-orange-100", iconColor: "text-orange-600",
        },
        {
          title: "Resolution Rate", value: stats.resolutionRate, subtitle: "Last 30 days",
          trend: null, trendUp: true, icon: CheckCircle2, iconBg: "bg-purple-100", iconColor: "text-purple-600",
        },
      ]);

      // ✅ Map trend data — backend returns { _id: "2024-01-15", filed: N, resolved: N }
      setTrendChartData(
        (trendData ?? []).map((d: any) => ({
          date: d._id ?? d.date ?? "",
          filed: d.filed ?? 0,
          resolved: d.resolved ?? 0,
        }))
      );

      // ✅ Map category data — backend returns { _id: "roads", count: N }
      const CATEGORY_COLORS = ["#3B82F6","#06B6D4","#F59E0B","#10B981","#8B5CF6","#EF4444","#F97316","#84CC16"];
      setCategoryChartData(
        (categoryBreakdown ?? []).map((d: any, i: number) => ({
          name: d._id ?? d.name ?? "Unknown",
          value: d.count ?? d.value ?? 0,
          color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        }))
      );

      // ✅ Map dept performance — backend returns { name, total, pending, resolved }
      setDeptData(
        (deptPerformance ?? []).map((d: any) => ({
          id: d._id ?? d.id,
          name: d.name ?? "Unknown",
          total: d.total ?? 0,
          pending: d.pending ?? 0,
          resolved: d.resolved ?? 0,
          avgTime: d.avgTime ?? "N/A",
          score: d.score ?? Math.round(((d.resolved ?? 0) / Math.max(d.total ?? 1, 1)) * 100),
        }))
      );

      // ✅ Map activity feed — backend returns { complaintId, title, status, updatedAt, user }
      setActivityFeed(
        (recentActivity ?? []).map((a: any, i: number) => ({
          id: a._id ?? i,
          message: `${a.complaintId ?? "Complaint"} — ${a.title ?? ""} [${a.status ?? "updated"}]`,
          time: a.updatedAt ? new Date(a.updatedAt).toDateString?.() ?? new Date(a.updatedAt).toLocaleTimeString() : "",
          color: ACTIVITY_COLOR_MAP[a.status ?? "default"] ?? ACTIVITY_COLOR_MAP.default,
        }))
      );
    } catch (error: any) {
      // Fallback data so UI doesn't break when admin APIs aren't ready
      toast.error(error.response?.data?.message || "Failed to load dashboard (showing sample data)");
      const sampleStats = {
        totalComplaints: 1280,
        todayComplaints: 12,
        pendingReview: 34,
        resolutionRate: "82%",
      };
      setAlerts([
        { id: 1, title: `${sampleStats.pendingReview} complaints pending review`, type: "critical" },
      ]);
      setStatsData([
        { title: "Total Complaints", value: sampleStats.totalComplaints, subtitle: "All time", trend: null, trendUp: true, icon: FileText, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
        { title: "Today's Complaints", value: sampleStats.todayComplaints, subtitle: "Since midnight", trend: null, trendUp: true, icon: TrendingUp, iconBg: "bg-green-100", iconColor: "text-green-600" },
        { title: "Pending Review", value: sampleStats.pendingReview, subtitle: "Awaiting action", trend: null, trendUp: false, icon: Clock, iconBg: "bg-orange-100", iconColor: "text-orange-600" },
        { title: "Resolution Rate", value: sampleStats.resolutionRate, subtitle: "Last 30 days", trend: null, trendUp: true, icon: CheckCircle2, iconBg: "bg-purple-100", iconColor: "text-purple-600" },
      ]);
      setTrendChartData([
        { date: "2026-02-05", filed: 12, resolved: 9 },
        { date: "2026-02-06", filed: 10, resolved: 11 },
        { date: "2026-02-07", filed: 14, resolved: 12 },
      ]);
      setCategoryChartData([
        { name: "Roads", value: 24, color: "#3B82F6" },
        { name: "Water", value: 18, color: "#06B6D4" },
        { name: "Electricity", value: 12, color: "#F59E0B" },
      ]);
      setDeptData([
        { id: "1", name: "PWD", total: 120, pending: 30, resolved: 80, avgTime: "2.1d", score: 78 },
        { id: "2", name: "Water", total: 90, pending: 15, resolved: 70, avgTime: "1.8d", score: 82 },
      ]);
      setActivityFeed([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-xs text-gray-500">Grievance Management System</p>
                </div>
              </div>
            </div>
            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/admin/complaints">
                <Button variant="outline" size="sm" className="gap-2"><FileText className="w-4 h-4" />All Complaints</Button>
              </Link>
              <Link to="/admin/departments">
                <Button variant="outline" size="sm" className="gap-2"><Users className="w-4 h-4" />Departments</Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => toast.info("Report generation coming soon")}
              >
                <Download className="w-4 h-4" />
                Generate Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => toast.info("Settings page is under construction")}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
            </div>

            {/* Mobile actions in dropdown */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open admin menu">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Navigate</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate("/admin/complaints")}>
                    <FileText className="w-4 h-4 mr-2" /> All Complaints
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/departments")}>
                    <Users className="w-4 h-4 mr-2" /> Departments
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toast.info("Report generation coming soon")}>
                    <Download className="w-4 h-4 mr-2" /> Generate Report
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Settings page is under construction")}>
                    <Settings className="w-4 h-4 mr-2" /> Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Alerts Section — ✅ icon resolved from type, no crash */}
        {alerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alerts.map((alert, index) => {
              const AlertIcon = ALERT_ICON_MAP[alert.type] ?? ALERT_ICON_MAP.default;
              return (
                <motion.div key={alert.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl border cursor-pointer hover:shadow-lg transition-all ${
                    alert.type === "critical" ? "bg-red-50 border-red-200 hover:border-red-300" : "bg-orange-50 border-orange-200 hover:border-orange-300"
                  }`}
                  onClick={alert.action}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${alert.type === "critical" ? "bg-red-100" : "bg-orange-100"}`}>
                      <AlertIcon className={`w-5 h-5 ${alert.type === "critical" ? "text-red-600" : "text-orange-600"}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${alert.type === "critical" ? "text-red-800" : "text-orange-800"}`}>{alert.title}</p>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${alert.type === "critical" ? "text-red-400" : "text-orange-400"}`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${stat.iconBg}`}><stat.icon className={`w-6 h-6 ${stat.iconColor}`} /></div>
                {stat.trend && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stat.trendUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.trend}
                  </div>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
                <p className="text-xs text-gray-400">{stat.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[360px]"
          >
            <div className="flex items-center justify-between mb-6">
              <div><h3 className="text-lg font-semibold text-gray-900">Complaints Trend</h3><p className="text-sm text-gray-500">Last 30 Days</p></div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Chart actions">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => fetchStats()}>Refresh data</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>Export CSV (soon)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {trendChartData.length > 0 ? (
              <div className="w-full" style={{ height: 300, minHeight: 300, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "12px" }} />
                    <Line type="monotone" dataKey="filed" stroke="#3B82F6" strokeWidth={3} dot={{ fill: "#3B82F6", strokeWidth: 2 }} name="Filed" />
                    <Line type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={3} dot={{ fill: "#10B981", strokeWidth: 2 }} name="Resolved" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No trend data yet.</p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[360px]"
          >
            <div className="flex items-center justify-between mb-6">
              <div><h3 className="text-lg font-semibold text-gray-900">Complaints by Category</h3><p className="text-sm text-gray-500">Distribution Overview</p></div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Category chart actions">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => fetchStats()}>Refresh data</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>Export CSV (soon)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {categoryChartData.length > 0 ? (
              <div className="w-full" style={{ height: 300, minHeight: 300, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {categoryChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color ?? "#3B82F6"} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "12px" }} formatter={(v: number|undefined) => [`${v}`, "Count"]} />
                    <Legend verticalAlign="bottom" height={36} formatter={value => <span className="text-sm text-gray-600">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No category data yet.</p>
            )}
          </motion.div>
        </div>

        {/* Department Performance Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Department Performance</h3>
                <p className="text-sm text-gray-500">Track and compare department metrics</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search departments..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full sm:w-64" />
                </div>
                <Button variant="outline" size="sm" className="gap-2"><Filter className="w-4 h-4" />Filter</Button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[{ key: "name", label: "Department" }, { key: "total", label: "Total" }, { key: "pending", label: "Pending" }, { key: "resolved", label: "Resolved" }, { key: "avgTime", label: "Avg Time" }, { key: "score", label: "Performance" }]
                    .map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {col.label}
                          {sortColumn === col.key && <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                        </div>
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedDepartments.map(dept => (
                  <tr key={dept.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{dept.total}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{dept.pending}</span></td>
                    <td className="px-6 py-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{dept.resolved}</span></td>
                    <td className="px-6 py-4 text-gray-600">{dept.avgTime}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${getScoreColor(dept.score)} transition-all`} style={{ width: `${dept.score}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{dept.score}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-6">
            <div><h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3><p className="text-sm text-gray-500">Latest updates and actions</p></div>
            <Link to="/admin/complaints">
              <Button variant="ghost" size="sm" className="gap-2 text-blue-600">
                View All
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-4">
            {activityFeed.map((activity, index) => (
              <motion.div key={activity.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${activity.color}`} />
                  {index < activityFeed.length - 1 && <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gray-200" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                </div>
              </motion.div>
            ))}
            {activityFeed.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;
