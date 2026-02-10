import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Clock,
  Star,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { format, subDays } from "date-fns";

const timeRanges = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7days" },
  { label: "30 Days", value: "30days" },
  { label: "90 Days", value: "90days" },
  { label: "Custom", value: "custom" },
];

const keyMetrics = [
  {
    title: "Total Complaints Filed",
    value: "2,847",
    change: 12.5,
    trend: "up",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    title: "Resolution Rate",
    value: "78.4%",
    change: 5.2,
    trend: "up",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    title: "Avg Resolution Time",
    value: "4.2 days",
    change: -8.3,
    trend: "down",
    icon: Clock,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  {
    title: "Citizen Satisfaction",
    value: "4.2/5",
    change: 3.1,
    trend: "up",
    icon: Star,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  {
    title: "SLA Compliance",
    value: "87.6%",
    change: -2.1,
    trend: "down",
    icon: TrendingUp,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
];

const trendData = [
  { name: "Week 1", filed: 120, resolved: 95, pending: 25 },
  { name: "Week 2", filed: 145, resolved: 110, pending: 35 },
  { name: "Week 3", filed: 130, resolved: 125, pending: 40 },
  { name: "Week 4", filed: 165, resolved: 140, pending: 65 },
  { name: "Week 5", filed: 155, resolved: 150, pending: 70 },
  { name: "Week 6", filed: 180, resolved: 160, pending: 90 },
  { name: "Week 7", filed: 170, resolved: 165, pending: 95 },
  { name: "Week 8", filed: 195, resolved: 175, pending: 115 },
];

const departmentData = [
  { name: "Public Works", time: 4.2, color: "hsl(var(--chart-1))" },
  { name: "Water Dept", time: 3.8, color: "hsl(var(--chart-2))" },
  { name: "Electricity", time: 5.1, color: "hsl(var(--chart-3))" },
  { name: "Sanitation", time: 3.2, color: "hsl(var(--chart-4))" },
  { name: "Transport", time: 6.5, color: "hsl(var(--chart-5))" },
];

const categoryData = [
  { name: "Roads & Potholes", value: 28, color: "hsl(var(--chart-1))" },
  { name: "Water Supply", value: 22, color: "hsl(var(--chart-2))" },
  { name: "Electricity", value: 18, color: "hsl(var(--chart-3))" },
  { name: "Sanitation", value: 15, color: "hsl(var(--chart-4))" },
  { name: "Drainage", value: 10, color: "hsl(var(--chart-5))" },
  { name: "Others", value: 7, color: "hsl(220 14% 70%)" },
];

const statusData = [
  { name: "Pending", value: 245, color: "hsl(48 96% 53%)" },
  { name: "In Progress", value: 180, color: "hsl(221 83% 53%)" },
  { name: "Resolved", value: 520, color: "hsl(142 76% 36%)" },
  { name: "Rejected", value: 45, color: "hsl(0 84% 60%)" },
];

const heatmapZones = [
  { id: 1, name: "North Zone", complaints: 78, density: "high", x: 45, y: 15 },
  { id: 2, name: "South Zone", complaints: 42, density: "medium", x: 55, y: 70 },
  { id: 3, name: "East Zone", complaints: 65, density: "high", x: 80, y: 40 },
  { id: 4, name: "West Zone", complaints: 28, density: "medium", x: 15, y: 45 },
  { id: 5, name: "Central Zone", complaints: 95, density: "high", x: 50, y: 45 },
  { id: 6, name: "North-East", complaints: 18, density: "low", x: 75, y: 20 },
  { id: 7, name: "North-West", complaints: 35, density: "medium", x: 25, y: 20 },
  { id: 8, name: "South-East", complaints: 12, density: "low", x: 78, y: 65 },
  { id: 9, name: "South-West", complaints: 22, density: "medium", x: 22, y: 68 },
];

const insights = [
  {
    id: 1,
    text: "45% increase in water complaints this week",
    type: "warning",
    category: "Water Supply",
  },
  {
    id: 2,
    text: "North Zone showing 30% longer resolution time",
    type: "alert",
    category: "Performance",
  },
  {
    id: 3,
    text: "Road complaints spike on weekends",
    type: "info",
    category: "Trends",
  },
  {
    id: 4,
    text: "3 departments need additional staff",
    type: "critical",
    category: "Resources",
  },
  {
    id: 5,
    text: "Citizen satisfaction improved by 12% this month",
    type: "success",
    category: "Satisfaction",
  },
];

const categoryBreakdown = [
  {
    category: "Roads & Potholes",
    total: 456,
    pending: 78,
    avgTime: "3.2 days",
    trend: [12, 18, 15, 22, 19, 25, 28],
    trendDirection: "up",
  },
  {
    category: "Water Supply",
    total: 389,
    pending: 45,
    avgTime: "4.1 days",
    trend: [20, 22, 18, 15, 12, 14, 11],
    trendDirection: "down",
  },
  {
    category: "Electricity",
    total: 312,
    pending: 62,
    avgTime: "5.5 days",
    trend: [8, 12, 15, 18, 20, 22, 25],
    trendDirection: "up",
  },
  {
    category: "Sanitation",
    total: 278,
    pending: 34,
    avgTime: "2.8 days",
    trend: [15, 14, 16, 15, 13, 12, 11],
    trendDirection: "down",
  },
  {
    category: "Drainage",
    total: 198,
    pending: 28,
    avgTime: "4.8 days",
    trend: [10, 12, 11, 13, 14, 15, 16],
    trendDirection: "up",
  },
];

const SparklineChart = ({
  data,
  direction,
}: {
  data: number[];
  direction: "up" | "down";
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  const height = 24;
  const width = 80;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        fill="none"
        stroke={direction === "up" ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)"}
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
};

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState("30days");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [hoveredZone, setHoveredZone] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const getDensityColor = (density: string) => {
    switch (density) {
      case "high":
        return "bg-red-500/70 hover:bg-red-500/90";
      case "medium":
        return "bg-yellow-500/70 hover:bg-yellow-500/90";
      case "low":
        return "bg-green-500/70 hover:bg-green-500/90";
      default:
        return "bg-muted";
    }
  };

  const getInsightBadgeColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "alert":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "info":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "success":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Analytics Dashboard
                </h1>
                <p className="text-muted-foreground text-sm">
                  Comprehensive grievance analytics and insights
                </p>
              </div>
            </div>
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Time Range Selector */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                Time Range:
              </span>
              <div className="flex flex-wrap gap-2">
                {timeRanges.map((range) => (
                  <Button
                    key={range.value}
                    variant={selectedRange === range.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRange(range.value)}
                    className={
                      selectedRange === range.value
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }
                  >
                    {range.label}
                  </Button>
                ))}
              </div>

              {selectedRange === "custom" && (
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        {dateRange.from
                          ? format(dateRange.from, "MMM dd, yyyy")
                          : "Start Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) =>
                          setDateRange((prev) => ({ ...prev, from: date }))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        {dateRange.to
                          ? format(dateRange.to, "MMM dd, yyyy")
                          : "End Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) =>
                          setDateRange((prev) => ({ ...prev, to: date }))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {keyMetrics.map((metric, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div
                    className={`p-2 rounded-lg ${metric.bgColor}`}
                  >
                    <metric.icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      metric.trend === "up"
                        ? metric.title.includes("Time")
                          ? "text-red-600"
                          : "text-green-600"
                        : metric.title.includes("Time")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {metric.trend === "up" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {Math.abs(metric.change)}%
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-foreground">
                    {metric.value}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {metric.title}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  vs. previous period
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart - Complaint Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Complaint Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="filed"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Filed"
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Resolved"
                  />
                  <Line
                    type="monotone"
                    dataKey="pending"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Pending"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar Chart - Department Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Department Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    label={{
                      value: "Avg Resolution (days)",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "hsl(var(--muted-foreground))" },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [`${value} days`, "Avg Resolution Time"]}
                  />
                  <Bar dataKey="time" radius={[4, 4, 0, 0]}>
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart - Complaints by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Complaints by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                      onClick={(data) => setSelectedCategory(data.name)}
                      style={{ cursor: "pointer" }}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          opacity={
                            selectedCategory === null ||
                            selectedCategory === entry.name
                              ? 1
                              : 0.4
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [`${value}%`, "Percentage"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2">
                  {categoryData.map((category) => (
                    <Badge
                      key={category.name}
                      variant="outline"
                      className={`cursor-pointer transition-all ${
                        selectedCategory === category.name
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      style={{ borderColor: category.color }}
                      onClick={() =>
                        setSelectedCategory(
                          selectedCategory === category.name ? null : category.name
                        )
                      }
                    >
                      <span
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Donut Chart - Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ value }) => value}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {statusData.map((status) => (
                    <div key={status.name} className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-sm text-foreground">
                        {status.name}
                      </span>
                      <span className="text-sm font-semibold text-foreground ml-auto">
                        {status.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geographic Heat Map */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Complaint Density Heat Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg h-80 overflow-hidden">
              {/* Grid overlay */}
              <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 opacity-20">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="border border-slate-400" />
                ))}
              </div>

              {/* Zone markers */}
              {heatmapZones.map((zone) => (
                <div
                  key={zone.id}
                  className={`absolute cursor-pointer transition-all duration-300 rounded-full flex items-center justify-center ${getDensityColor(
                    zone.density
                  )} ${hoveredZone === zone.id ? "z-10 scale-125" : ""}`}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${Math.max(40, zone.complaints / 2)}px`,
                    height: `${Math.max(40, zone.complaints / 2)}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onMouseEnter={() => setHoveredZone(zone.id)}
                  onMouseLeave={() => setHoveredZone(null)}
                  onClick={() => console.log(`Filter by zone: ${zone.name}`)}
                >
                  {hoveredZone === zone.id && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap border border-border">
                      <p className="font-semibold">{zone.name}</p>
                      <p>{zone.complaints} complaints</p>
                    </div>
                  )}
                  <span className="text-white font-bold text-xs">
                    {zone.complaints}
                  </span>
                </div>
              ))}

              {/* Legend */}
              <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 border border-border">
                <p className="text-xs font-semibold text-foreground mb-2">
                  Density
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-muted-foreground">High (&gt;50)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-muted-foreground">Medium (20-50)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">Low (&lt;20)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              AI-Generated Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => console.log(`View details for: ${insight.text}`)}
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={getInsightBadgeColor(insight.type)}
                    >
                      {insight.category}
                    </Badge>
                    <span className="text-foreground">{insight.text}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Avg Time</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryBreakdown.map((row) => (
                  <TableRow
                    key={row.category}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => console.log(`Drill down: ${row.category}`)}
                  >
                    <TableCell className="font-medium">{row.category}</TableCell>
                    <TableCell className="text-right">{row.total}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          row.pending > 50
                            ? "border-red-300 text-red-700"
                            : "border-green-300 text-green-700"
                        }
                      >
                        {row.pending}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.avgTime}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <SparklineChart
                          data={row.trend}
                          direction={row.trendDirection as "up" | "down"}
                        />
                        {row.trendDirection === "up" ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AnalyticsDashboard;
