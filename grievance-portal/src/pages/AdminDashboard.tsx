import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Users,
  Settings,
  Download,
  Bell,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  MoreHorizontal,
  Zap,
  Droplets,
  Truck,
  Trash2,
  Building2,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Mock data for charts
const trendData = [
  { date: "Jan 1", filed: 45, resolved: 38 },
  { date: "Jan 5", filed: 52, resolved: 45 },
  { date: "Jan 10", filed: 48, resolved: 50 },
  { date: "Jan 15", filed: 70, resolved: 55 },
  { date: "Jan 20", filed: 65, resolved: 60 },
  { date: "Jan 25", filed: 58, resolved: 62 },
  { date: "Jan 30", filed: 72, resolved: 68 },
];

const categoryData = [
  { name: "Roads", value: 35, color: "#3B82F6" },
  { name: "Water", value: 25, color: "#06B6D4" },
  { name: "Electricity", value: 20, color: "#F59E0B" },
  { name: "Sanitation", value: 12, color: "#10B981" },
  { name: "Others", value: 8, color: "#8B5CF6" },
];

const departmentData = [
  { id: 1, name: "Roads & Infrastructure", total: 156, pending: 23, resolved: 133, avgTime: "3.2 days", score: 85 },
  { id: 2, name: "Water Supply", total: 89, pending: 15, resolved: 74, avgTime: "2.8 days", score: 92 },
  { id: 3, name: "Electricity Board", total: 124, pending: 45, resolved: 79, avgTime: "4.5 days", score: 64 },
  { id: 4, name: "Sanitation", total: 67, pending: 8, resolved: 59, avgTime: "2.1 days", score: 88 },
  { id: 5, name: "Public Works", total: 45, pending: 12, resolved: 33, avgTime: "5.2 days", score: 73 },
];

const activityData = [
  { id: 1, type: "filed", message: "New complaint filed by Rahul Kumar", time: "2 mins ago", color: "bg-blue-500" },
  { id: 2, type: "assigned", message: "GR2024001234 assigned to Roads Dept", time: "15 mins ago", color: "bg-purple-500" },
  { id: 3, type: "resolved", message: "GR2024001189 marked as resolved", time: "32 mins ago", color: "bg-green-500" },
  { id: 4, type: "sla", message: "SLA breached for GR2024000987", time: "1 hour ago", color: "bg-red-500" },
  { id: 5, type: "filed", message: "New complaint filed by Priya Singh", time: "1.5 hours ago", color: "bg-blue-500" },
  { id: 6, type: "resolved", message: "GR2024001156 marked as resolved", time: "2 hours ago", color: "bg-green-500" },
  { id: 7, type: "assigned", message: "GR2024001245 assigned to Water Dept", time: "3 hours ago", color: "bg-purple-500" },
  { id: 8, type: "filed", message: "New complaint filed by Amit Patel", time: "4 hours ago", color: "bg-blue-500" },
];

const alerts = [
  { id: 1, title: "5 complaints breaching SLA", type: "critical", icon: AlertTriangle },
  { id: 2, title: "3 departments overloaded", type: "warning", icon: Users },
  { id: 3, title: "12 complaints pending >7 days", type: "critical", icon: Clock },
];

const AdminDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const sortedDepartments = [...departmentData]
    .filter((dept) => dept.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortColumn as keyof typeof a];
      const bVal = b[sortColumn as keyof typeof b];
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

  const stats = [
    {
      title: "Total Complaints",
      value: "2,847",
      subtitle: "All time",
      trend: "+12.5%",
      trendUp: true,
      icon: FileText,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Today's Complaints",
      value: "47",
      subtitle: "Since midnight",
      trend: "+8.2%",
      trendUp: true,
      icon: TrendingUp,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Pending Review",
      value: "156",
      subtitle: "Awaiting action",
      trend: "-5.3%",
      trendUp: false,
      icon: Clock,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      title: "Resolution Rate",
      value: "87.3%",
      subtitle: "Last 30 days",
      trend: "+2.1%",
      trendUp: true,
      icon: CheckCircle2,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
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

            {/* Quick Actions */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/my-complaints">
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="w-4 h-4" />
                  View All Complaints
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="w-4 h-4" />
                Manage Departments
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Generate Report
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Alerts Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {alerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl border cursor-pointer hover:shadow-lg transition-all ${
                alert.type === "critical"
                  ? "bg-red-50 border-red-200 hover:border-red-300"
                  : "bg-orange-50 border-orange-200 hover:border-orange-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    alert.type === "critical" ? "bg-red-100" : "bg-orange-100"
                  }`}
                >
                  <alert.icon
                    className={`w-5 h-5 ${
                      alert.type === "critical" ? "text-red-600" : "text-orange-600"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      alert.type === "critical" ? "text-red-800" : "text-orange-800"
                    }`}
                  >
                    {alert.title}
                  </p>
                </div>
                <ChevronRight
                  className={`w-5 h-5 ${
                    alert.type === "critical" ? "text-red-400" : "text-orange-400"
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    stat.trendUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {stat.trendUp ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {stat.trend}
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
                <p className="text-xs text-gray-400">{stat.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Complaints Trend</h3>
                <p className="text-sm text-gray-500">Last 30 Days</p>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="filed"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: "#3B82F6", strokeWidth: 2 }}
                    name="Filed"
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: "#10B981", strokeWidth: 2 }}
                    name="Resolved"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600">Filed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600">Resolved</span>
              </div>
            </div>
          </motion.div>

          {/* Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Complaints by Category</h3>
                <p className="text-sm text-gray-500">Distribution Overview</p>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value: number) => [`${value}%`, "Percentage"]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Department Performance Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
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
                  <input
                    type="text"
                    placeholder="Search departments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full sm:w-64"
                  />
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { key: "name", label: "Department" },
                    { key: "total", label: "Total" },
                    { key: "pending", label: "Pending" },
                    { key: "resolved", label: "Resolved" },
                    { key: "avgTime", label: "Avg Time" },
                    { key: "score", label: "Performance" },
                  ].map((column) => (
                    <th
                      key={column.key}
                      onClick={() => handleSort(column.key)}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {column.label}
                        {sortColumn === column.key && (
                          <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedDepartments.map((dept) => (
                  <tr
                    key={dept.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{dept.total}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        {dept.pending}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {dept.resolved}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{dept.avgTime}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getScoreColor(dept.score)} transition-all`}
                            style={{ width: `${dept.score}%` }}
                          />
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

        {/* Recent Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <p className="text-sm text-gray-500">Latest updates and actions</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-2 text-blue-600">
              View All
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {activityData.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${activity.color}`} />
                  {index < activityData.length - 1 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gray-200" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;
