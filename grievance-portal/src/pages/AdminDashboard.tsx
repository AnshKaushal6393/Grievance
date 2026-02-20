import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import adminService from "@/services/adminService";
import {
  FileText, TrendingUp, Clock, CheckCircle2, AlertTriangle,
  Users, ChevronRight, ArrowUpRight, ArrowDownRight, Search, Filter,
  MoreHorizontal, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import { useLanguage } from "@/contexts/LanguageContext";

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
  filed: "bg-primary/100",
  assigned: "bg-purple-500",
  pending: "bg-amber-500",
  "in-progress": "bg-blue-500",
  in_progress: "bg-blue-500",
  resolved: "bg-green-500",
  rejected: "bg-red-500",
  sla: "bg-orange-500",
  default: "bg-gray-400",
};

const AdminDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<"all" | "active" | "resolved" | "unassigned">("all");
  const [sortColumn, setSortColumn] = useState<string>("total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [trendChartData, setTrendChartData] = useState<any[]>([]);
  const [categoryChartData, setCategoryChartData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingTrend, setIsExportingTrend] = useState(false);
  const [isExportingCategory, setIsExportingCategory] = useState(false);

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
    .filter(dept => {
      if (departmentFilter === "active") return (dept.pending ?? 0) > 0;
      if (departmentFilter === "resolved") return (dept.resolved ?? 0) > 0;
      if (departmentFilter === "unassigned") return (dept.total ?? 0) === 0;
      return true;
    })
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
    setIsLoading(true);
    try {
      const res = await adminService.getDashboardStats();
      const payload = res?.data || {};
      const {
        stats = {},
        trendData = [],
        categoryBreakdown = [],
        deptPerformance = [],
        recentActivity = [],
      } = payload;
      const normalizedStats = {
        totalComplaints: Number(stats.totalComplaints ?? 0),
        todayComplaints: Number(stats.todayComplaints ?? 0),
        pendingReview: Number(stats.pendingReview ?? 0),
        resolutionRate: String(stats.resolutionRate ?? "0%"),
      };

      const getTrend = (current: number, previous: number | null) => {
        if (previous === null || previous === undefined || previous <= 0) return { trend: null, trendUp: true };
        const diff = ((current - previous) / previous) * 100;
        return { trend: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`, trendUp: diff >= 0 };
      };

      const lastTwoDays = (trendData ?? []).slice(-2);
      const todayFiled = trendData?.[trendData.length - 1]?.filed ?? normalizedStats.todayComplaints;
      const prevFiled = lastTwoDays.length === 2 ? lastTwoDays[0].filed ?? 0 : null;
      const todayTrend = getTrend(todayFiled, prevFiled);

      // ✅ Build static alerts (backend doesn't return icon objects)
      setAlerts([
        {
          id: 1,
          title: `${normalizedStats.pendingReview} grievances pending administrative action`,
          type: "critical",
          action: () => navigate("/admin/complaints"),
        },
        {
          id: 2,
          title: "Department workload review required",
          type: "warning",
          action: () => navigate("/admin/departments"),
        },
        {
          id: 3,
          title: "SLA compliance review required",
          type: "warning",
          action: () => navigate("/admin/departments"),
        },
      ]);

      setStatsData([
        {
          title: "Total Grievances Registered", value: normalizedStats.totalComplaints, subtitle: "Cumulative records",
          trend: null, trendUp: true, icon: FileText, iconBg: "bg-primary/15", iconColor: "text-primary",
        },
        {
          title: "Grievances Registered Today", value: normalizedStats.todayComplaints, subtitle: "Since 00:00 hrs",
          trend: todayTrend.trend, trendUp: todayTrend.trendUp, icon: TrendingUp, iconBg: "bg-green-100", iconColor: "text-green-600",
        },
        {
          title: "Pending Administrative Action", value: normalizedStats.pendingReview, subtitle: "Awaiting disposal action",
          trend: null, trendUp: false, icon: Clock, iconBg: "bg-orange-100", iconColor: "text-orange-600",
        },
        {
          title: "Disposal Rate", value: normalizedStats.resolutionRate, subtitle: "Previous 30 days",
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
          avgTime:
            typeof (d.avgResolutionHours ?? d.avgTimeHours) === "number" &&
            Number.isFinite(d.avgResolutionHours ?? d.avgTimeHours)
              ? (d.avgResolutionHours ?? d.avgTimeHours) < 24
                ? `${(d.avgResolutionHours ?? d.avgTimeHours).toFixed(1)} hrs`
                : `${((d.avgResolutionHours ?? d.avgTimeHours) / 24).toFixed(1)} days`
              : d.avgTime ?? "N/A",
          score: d.score ?? Math.round(((d.resolved ?? 0) / Math.max(d.total ?? 1, 1)) * 100),
        }))
      );

      // ✅ Map activity feed — backend returns { complaintId, title, status, updatedAt, user }
      setActivityFeed(
        (recentActivity ?? []).map((a: any, i: number) => ({
          id: a._id ?? i,
          message: `${a.complaintId ?? "Complaint"} - ${a.title ?? ""} [${a.status ?? "updated"}]`,
          time: a.updatedAt ? new Date(a.updatedAt).toLocaleString() : "",
          color: ACTIVITY_COLOR_MAP[a.status ?? "default"] ?? ACTIVITY_COLOR_MAP.default,
        }))
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to load dashboard data.");
      setAlerts([]);
      setStatsData([]);
      setTrendChartData([]);
      setCategoryChartData([]);
      setDeptData([]);
      setActivityFeed([]);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCsvBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTrendCsv = async () => {
    try {
      setIsExportingTrend(true);
      const blob = await adminService.exportDashboardTrendCsv();
      downloadCsvBlob(
        blob,
        `dashboard-trend-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      toast.success("Trend data exported");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to export trend data");
    } finally {
      setIsExportingTrend(false);
    }
  };

  const handleExportCategoryCsv = async () => {
    try {
      setIsExportingCategory(true);
      const blob = await adminService.exportDashboardCategoryCsv();
      downloadCsvBlob(
        blob,
        `dashboard-category-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      toast.success("Category data exported");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to export category data");
    } finally {
      setIsExportingCategory(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
          <div className="flex flex-wrap items-center gap-4">
            <span>Administrative data source: National Grievance Platform</span>
            <span>Last refreshed: {new Date().toLocaleString("en-IN")}</span>
            <span>Reference: ADM-DASHBOARD</span>
          </div>
        </div>
        {/* Alerts Section — ✅ icon resolved from type, no crash */}
        {alerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alerts.map((alert, index) => {
              const AlertIcon = ALERT_ICON_MAP[alert.type] ?? ALERT_ICON_MAP.default;
              return (
                <motion.div key={alert.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors hover:border-slate-300 ${
                    alert.type === "critical" ? "bg-red-50 border-red-200 hover:border-red-300" : "bg-orange-50 border-orange-200 hover:border-orange-300"
                  }`}
                  onClick={alert.action}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${alert.type === "critical" ? "bg-red-100" : "bg-orange-100"}`}>
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
              className="bg-white rounded-lg p-6 border border-gray-200"
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded ${stat.iconBg}`}><stat.icon className={`w-6 h-6 ${stat.iconColor}`} /></div>
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
        {isLoading && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            Loading latest administrative records...
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-lg p-6 border border-gray-200 min-h-[360px]"
          >
            <div className="flex items-center justify-between mb-6">
              <div><h3 className="text-lg font-semibold text-gray-900">Grievance Trend</h3><p className="text-sm text-gray-500">Previous 30 days</p></div>
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
                  <DropdownMenuItem onClick={handleExportTrendCsv} disabled={isExportingTrend}>
                    {isExportingTrend ? "Exporting..." : "Export CSV"}
                  </DropdownMenuItem>
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
              <p className="text-sm text-gray-500">Trend data is not available.</p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-lg p-6 border border-gray-200 min-h-[360px]"
          >
            <div className="flex items-center justify-between mb-6">
              <div><h3 className="text-lg font-semibold text-gray-900">Grievances by Category</h3><p className="text-sm text-gray-500">Distribution overview</p></div>
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
                  <DropdownMenuItem onClick={handleExportCategoryCsv} disabled={isExportingCategory}>
                    {isExportingCategory ? "Exporting..." : "Export CSV"}
                  </DropdownMenuItem>
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
              <p className="text-sm text-gray-500">Category data is not available.</p>
            )}
          </motion.div>
        </div>

        {/* Department Performance Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Department Performance Register</h3>
                <p className="text-sm text-gray-500">Comparative departmental workload and disposal metrics</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search departments" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ring text-sm w-full sm:w-72" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                      <Filter className="w-4 h-4" />
                      Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Department Filter</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={departmentFilter === "all"}
                      onCheckedChange={() => setDepartmentFilter("all")}
                    >
                      All Departments
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={departmentFilter === "active"}
                      onCheckedChange={() => setDepartmentFilter("active")}
                    >
                      Has Pending Complaints
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={departmentFilter === "resolved"}
                      onCheckedChange={() => setDepartmentFilter("resolved")}
                    >
                      Has Resolved Complaints
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={departmentFilter === "unassigned"}
                      onCheckedChange={() => setDepartmentFilter("unassigned")}
                    >
                      No Assigned Complaints
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                          {sortColumn === col.key && <span className="text-primary">{sortDirection === "asc" ? "↑" : "↓"}</span>}
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
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
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
                {sortedDepartments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                      No departments match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white rounded-lg p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div><h3 className="text-lg font-semibold text-gray-900">Recent Administrative Activity</h3><p className="text-sm text-gray-500">Latest recorded updates and actions</p></div>
            <Link to="/admin/complaints">
              <Button variant="ghost" size="sm" className="gap-2 text-primary">
                View Activity Register
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-4">
            {activityFeed.map((activity, index) => (
              <motion.div key={activity.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                className="flex items-start gap-4 p-3 rounded hover:bg-gray-50 transition-colors"
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
            {activityFeed.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No recent administrative activity</p>}
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;


