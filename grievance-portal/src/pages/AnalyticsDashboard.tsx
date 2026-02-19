import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Calendar, Download, FileText, Clock,
  CheckCircle, TrendingUp, TrendingDown, Lightbulb, ChevronRight,
  ArrowUpRight, ArrowDownRight, MapPin, Loader2, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { format, subDays } from "date-fns";
import adminService from "@/services/adminService";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const timeRanges = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7days" },
  { label: "30 Days", value: "30days" },
  { label: "90 Days", value: "90days" },
  { label: "Custom", value: "custom" },
];

const EMPTY_METRICS = [
  { title: "Total Complaints Filed", value: "0", change: 0, trend: "up", icon: FileText, color: "text-primary", bgColor: "bg-primary/15" },
  { title: "Resolution Rate", value: "0%", change: 0, trend: "up", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
  { title: "Avg Resolution Time", value: "0.0 days", change: 0, trend: "down", icon: Clock, color: "text-orange-600", bgColor: "bg-orange-100" },
  { title: "Citizen Satisfaction", value: "0.0/5", change: 0, trend: "up", icon: Star, color: "text-amber-600", bgColor: "bg-amber-100" },
  { title: "SLA Compliance", value: "0%", change: 0, trend: "down", icon: TrendingUp, color: "text-purple-600", bgColor: "bg-purple-100" },
];

const CHART_COLORS = ["hsl(221 83% 53%)","hsl(142 76% 36%)","hsl(48 96% 53%)","hsl(0 84% 60%)","hsl(280 65% 60%)"];
const STATUS_COLORS: Record<string, string> = {
  Pending: "hsl(48 96% 53%)",
  "In Progress": "hsl(221 83% 53%)",
  Resolved: "hsl(142 76% 36%)",
  Rejected: "hsl(0 84% 60%)",
};

const getDeptBarColor = (time: number) => {
  if (time <= 3) return "hsl(142 76% 36%)";
  if (time <= 5) return "hsl(48 96% 53%)";
  return "hsl(0 84% 60%)";
};

const SparklineChart = ({ data, direction }: { data: number[]; direction: "up" | "down" }) => {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 80},${24 - ((v - min) / range) * 24}`).join(" ");
  return (
    <svg width={80} height={24} className="inline-block">
      <polyline fill="none" stroke={direction === "up" ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)"} strokeWidth="2" points={points} />
    </svg>
  );
};

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedRange, setSelectedRange] = useState("30days");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [hoveredZone, setHoveredZone] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Chart data — start with fallbacks, replace when API loads
  const [keyMetrics, setKeyMetrics] = useState(EMPTY_METRICS);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [heatmapZones, setHeatmapZones] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);

  // ✅ Prevent infinite loop: track last fetched params
  const lastFetchRef = useRef<string>("");

  useEffect(() => {
    // Only re-fetch when range or custom dates actually change
    if (selectedRange === "custom" && (!dateFrom || !dateTo)) return;
    const key = selectedRange === "custom"
      ? `custom-${dateFrom?.toDateString()}-${dateTo?.toDateString()}`
      : selectedRange;
    if (lastFetchRef.current === key) return;
    lastFetchRef.current = key;
    fetchAnalytics();
  }, [selectedRange, dateFrom, dateTo]);

  const fetchAnalytics = async () => {
    try {
      if (selectedRange === "custom" && (!dateFrom || !dateTo)) return;
      setIsLoading(true);
      const res = await adminService.getAnalytics(
        selectedRange,
        selectedRange === "custom" ? dateFrom?.toISOString() : undefined,
        selectedRange === "custom" ? dateTo?.toISOString() : undefined,
      );
      const d = res?.data;
      if (!d) return;

      // ✅ Map metrics
      if (d.keyMetrics) {
        const cmp = d.keyMetrics.comparison || {};
        setKeyMetrics([
          { title: "Total Complaints Filed", value: d.keyMetrics.totalFiled ?? "0", change: Number(cmp.totalFiled ?? 0), trend: Number(cmp.totalFiled ?? 0) >= 0 ? "up" : "down", icon: FileText, color: "text-primary", bgColor: "bg-primary/15" },
          { title: "Resolution Rate", value: d.keyMetrics.resolutionRate ?? "0%", change: Number(cmp.resolutionRate ?? 0), trend: Number(cmp.resolutionRate ?? 0) >= 0 ? "up" : "down", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
          { title: "Avg Resolution Time", value: d.keyMetrics.avgResolutionTime ?? "0.0 days", change: Number(cmp.avgResolutionTime ?? 0), trend: Number(cmp.avgResolutionTime ?? 0) >= 0 ? "up" : "down", icon: Clock, color: "text-orange-600", bgColor: "bg-orange-100" },
          { title: "Citizen Satisfaction", value: d.keyMetrics.citizenSatisfaction ?? "0.0/5", change: Number(cmp.citizenSatisfaction ?? 0), trend: Number(cmp.citizenSatisfaction ?? 0) >= 0 ? "up" : "down", icon: Star, color: "text-amber-600", bgColor: "bg-amber-100" },
          { title: "SLA Compliance", value: d.keyMetrics.slaCompliance ?? "0%", change: Number(cmp.slaCompliance ?? 0), trend: Number(cmp.slaCompliance ?? 0) >= 0 ? "up" : "down", icon: TrendingUp, color: "text-purple-600", bgColor: "bg-purple-100" },
        ]);
      }

      // ✅ Map trend data
      if (d.trendData?.length) {
        setTrendData(d.trendData.map((t: any) => ({
          name: t.name ?? t._id ?? "",
          filed: t.filed ?? 0,
          resolved: t.resolved ?? 0,
          pending: t.pending ?? 0,
        })));
      }

      // ✅ Map category
      if (d.categoryBreakdown?.length) {
        setCategoryData(d.categoryBreakdown.map((c: any, i: number) => ({
          name: c.name ?? c._id ?? "Unknown",
          value: c.value ?? c.count ?? 0,
          color: CHART_COLORS[i % CHART_COLORS.length],
        })));
        setCategoryBreakdown(d.categoryBreakdown.map((c: any) => ({
          category: c.name ?? c._id ?? "Unknown",
          total: c.total ?? c.count ?? 0,
          pending: c.pending ?? 0,
          avgTime: c.avgTime ?? "N/A",
          trend: c.trend ?? [0, 0, 0, 0, 0, 0, 0],
          trendDirection: c.trendDirection ?? "up",
        })));
      }

      // ✅ Map dept performance
      if (d.departmentPerformance?.length) {
        setDeptData(d.departmentPerformance.map((dp: any) => ({
          name: dp.name ?? "Unknown",
          time: Number(dp.avgTime ?? dp.time ?? 0),
          color: CHART_COLORS[0],
        })));
      } else {
        setDeptData([]);
      }

      const statusMap: Record<string, number> = {
        Pending: 0,
        "In Progress": 0,
        Resolved: 0,
        Rejected: 0,
      };
      (d.statusDistribution || []).forEach((s: any) => {
        const key = s.name ?? "Other";
        if (Object.prototype.hasOwnProperty.call(statusMap, key)) {
          statusMap[key] += Number(s.value ?? 0);
        }
      });
      setStatusData([
        { name: "Pending", value: statusMap.Pending, color: STATUS_COLORS.Pending },
        { name: "In Progress", value: statusMap["In Progress"], color: STATUS_COLORS["In Progress"] },
        { name: "Resolved", value: statusMap.Resolved, color: STATUS_COLORS.Resolved },
        { name: "Rejected", value: statusMap.Rejected, color: STATUS_COLORS.Rejected },
      ]);

      if (d.heatmapZones?.length) {
        setHeatmapZones(d.heatmapZones);
      } else {
        setHeatmapZones([]);
      }

      if (d.insights?.length) {
        setInsights(d.insights);
      } else {
        setInsights([]);
      }

    } catch (_err: any) {
      setKeyMetrics(EMPTY_METRICS);
      setTrendData([]);
      setDeptData([]);
      setCategoryData([]);
      setStatusData([]);
      setCategoryBreakdown([]);
      setHeatmapZones([]);
      setInsights([]);
      toast.error(t("analytics.error.loadData", "Failed to load analytics data"));
    } finally {
      setIsLoading(false);
    }
  };

  const csvEscape = (value: string | number) => {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportReport = () => {
    try {
      if (selectedRange === "custom" && (!dateFrom || !dateTo)) {
        toast.error(t("analytics.error.selectRange", "Select both start and end dates for custom range"));
        return;
      }
      if (selectedRange === "custom" && dateFrom && dateTo && dateFrom > dateTo) {
        toast.error(t("analytics.error.invalidRange", "Start date cannot be after end date"));
        return;
      }

      setIsExporting(true);

      const lines: string[] = [];
      const now = new Date();
      const rangeLabel =
        selectedRange === "custom"
          ? `${format(dateFrom!, "yyyy-MM-dd")} to ${format(dateTo!, "yyyy-MM-dd")}`
          : timeRanges.find((r) => r.value === selectedRange)?.label || selectedRange;

      lines.push(t("analytics.export.title", "Admin Analytics Report"));
      lines.push(`Generated At,${csvEscape(now.toISOString())}`);
      lines.push(`Time Range,${csvEscape(rangeLabel)}`);
      lines.push("");

      lines.push(t("analytics.export.keyMetrics", "Key Metrics"));
      lines.push(t("analytics.export.metricValue", "Metric,Value"));
      keyMetrics.forEach((m) => lines.push(`${csvEscape(m.title)},${csvEscape(m.value)}`));
      lines.push("");

      lines.push(t("analytics.export.trendData", "Trend Data"));
      lines.push(t("analytics.export.periodFiledResolvedPending", "Period,Filed,Resolved,Pending"));
      trendData.forEach((t: any) =>
        lines.push(
          `${csvEscape(t.name ?? "")},${csvEscape(t.filed ?? 0)},${csvEscape(t.resolved ?? 0)},${csvEscape(t.pending ?? 0)}`,
        ),
      );
      lines.push("");

      lines.push(t("analytics.export.categoryDistribution", "Category Distribution"));
      lines.push(t("analytics.export.categoryValue", "Category,Value"));
      categoryData.forEach((c: any) =>
        lines.push(`${csvEscape(c.name ?? "")},${csvEscape(c.value ?? 0)}`),
      );
      lines.push("");

      lines.push(t("analytics.export.departmentPerformance", "Department Performance"));
      lines.push(t("analytics.export.departmentAvgTime", "Department,Avg Resolution Time (days)"));
      deptData.forEach((d: any) =>
        lines.push(`${csvEscape(d.name ?? "")},${csvEscape(d.time ?? 0)}`),
      );
      lines.push("");

      lines.push(t("analytics.export.statusDistribution", "Status Distribution"));
      lines.push(t("analytics.export.statusValue", "Status,Value"));
      statusData.forEach((s: any) =>
        lines.push(`${csvEscape(s.name ?? "")},${csvEscape(s.value ?? 0)}`),
      );

      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `admin-analytics-${selectedRange}-${format(now, "yyyyMMdd-HHmm")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("analytics.export.success", "Report exported"));
    } catch {
      toast.error(t("analytics.export.failed", "Failed to export report"));
    } finally {
      setIsExporting(false);
    }
  };

  const getDensityColor = (density: string) => {
    if (density === "high") return "bg-red-500/70 hover:bg-red-500/90";
    if (density === "medium") return "bg-yellow-500/70 hover:bg-yellow-500/90";
    return "bg-green-500/70 hover:bg-green-500/90";
  };

  const getInsightBadgeColor = (type: string) => {
    const map: Record<string, string> = {
      warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
      alert:   "bg-orange-100 text-orange-800 border-orange-300",
      info:    "bg-primary/15 text-primary border-primary/40",
      critical:"bg-red-100 text-red-800 border-red-300",
      success: "bg-green-100 text-green-800 border-green-300",
    };
    return map[type] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}><ArrowLeft className="h-5 w-5" /></Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("analytics.title", "Analytics Dashboard")}</h1>
                <p className="text-muted-foreground text-sm">{t("analytics.subtitle", "Comprehensive grievance analytics and insights")}</p>
              </div>
            </div>
            <Button
              onClick={handleExportReport}
              disabled={
                isExporting ||
                (selectedRange === "custom" && (!dateFrom || !dateTo))
              }
              className="hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90 text-white"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExporting ? t("analytics.exporting", "Exporting...") : t("analytics.exportReport", "Export Report")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Time Range Selector */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">{t("analytics.timeRange", "Time Range:")}</span>
              <div className="flex flex-wrap gap-2">
                {timeRanges.map(range => (
                  <Button key={range.value} variant={selectedRange === range.value ? "default" : "outline"} size="sm" onClick={() => setSelectedRange(range.value)}>
                    {range.label}
                  </Button>
                ))}
              </div>
              {selectedRange === "custom" && (
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-2" />{dateFrom ? format(dateFrom, "MMM dd, yyyy") : t("analytics.startDate", "Start Date")}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">{t("analytics.to", "to")}</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-2" />{dateTo ? format(dateTo, "MMM dd, yyyy") : t("analytics.endDate", "End Date")}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              <div className="ml-auto">
                <Button
                  onClick={handleExportReport}
                  disabled={
                    isExporting ||
                    (selectedRange === "custom" && (!dateFrom || !dateTo))
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-white"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isExporting ? t("analytics.exporting", "Exporting...") : t("analytics.exportReport", "Export Report")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
              {t("analytics.loading", "Loading analytics...")}
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {keyMetrics.map((metric, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}><metric.icon className={`h-5 w-5 ${metric.color}`} /></div>
                  <div className={`flex items-center gap-1 text-sm ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    {metric.trend === "up" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {Math.abs(metric.change)}%
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{metric.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="min-h-[380px]">
            <CardHeader><CardTitle className="text-lg">{t("analytics.trends", "Complaint Trends Over Time")}</CardTitle></CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  {t("analytics.noTrendData", "No trend data for selected range")}
                </div>
              ) : (
                <div className="w-full" style={{ height: 300, minHeight: 300, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Legend />
                      <Line type="monotone" dataKey="filed" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} name={t("analytics.filed", "Filed")} />
                      <Line type="monotone" dataKey="resolved" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} name={t("analytics.resolved", "Resolved")} />
                      <Line type="monotone" dataKey="pending" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 4 }} name={t("analytics.pending", "Pending")} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-h-[380px]">
            <CardHeader><CardTitle className="text-lg">{t("analytics.departmentPerformance", "Department Performance Comparison")}</CardTitle></CardHeader>
            <CardContent>
              {deptData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  {t("analytics.noDepartmentData", "No department performance data")}
                </div>
              ) : (
                <div className="w-full" style={{ height: 300, minHeight: 300, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={60} />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={v => [`${v} ${t("analytics.days", "days")}`, t("analytics.avgResolution", "Avg Resolution")]} />
                      <Bar dataKey="time" radius={[4, 4, 0, 0]}>
                        {deptData.map((d, i) => <Cell key={i} fill={getDeptBarColor(Number(d.time || 0))} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="min-h-[360px]">
            <CardHeader><CardTitle className="text-lg">{t("analytics.complaintsByCategory", "Complaints by Category")}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-full" style={{ height: 280, minHeight: 280, minWidth: 0 }}>
                  {categoryData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      {t("analytics.noCategoryData", "No category distribution data")}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                          labelLine={false} onClick={d => setSelectedCategory(d.name)} style={{ cursor: "pointer" }}
                        >
                          {categoryData.map((entry, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}
                              opacity={selectedCategory === null || selectedCategory === entry.name ? 1 : 0.4} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={v => [`${v}`, t("analytics.count", "Count")]} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {categoryData.map((cat, i) => (
                    <Badge key={cat.name} variant="outline" className={`cursor-pointer transition-all ${selectedCategory === cat.name ? "ring-2 ring-primary" : ""}`}
                      style={{ borderColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                    >
                      <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[360px]">
            <CardHeader><CardTitle className="text-lg">{t("analytics.statusDistribution", "Status Distribution")}</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-full" style={{ height: 280, minHeight: 280, minWidth: 0 }}>
                  {statusData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      {t("analytics.noStatusData", "No status distribution data")}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="space-y-3">
                  {statusData.map(s => (
                    <div key={s.name} className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-sm text-foreground">{s.name}</span>
                      <span className="text-sm font-semibold text-foreground ml-auto">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geographic Heatmap */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5" />{t("analytics.heatmap", "Complaint Density Heat Map")}</CardTitle></CardHeader>
          <CardContent>
            <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg h-80 overflow-hidden">
              <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 opacity-20">
                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="border border-slate-400" />)}
              </div>
              {heatmapZones.map(zone => (
                <div key={zone.id}
                  className={`absolute cursor-pointer transition-all duration-300 rounded-full flex items-center justify-center ${getDensityColor(zone.density)} ${hoveredZone === zone.id ? "z-10 scale-125" : ""}`}
                  style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${Math.max(40, zone.complaints / 2)}px`, height: `${Math.max(40, zone.complaints / 2)}px`, transform: "translate(-50%, -50%)" }}
                  onMouseEnter={() => setHoveredZone(zone.id)} onMouseLeave={() => setHoveredZone(null)}
                >
                  {hoveredZone === zone.id && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap border border-border">
                      <p className="font-semibold">{zone.name}</p><p>{zone.complaints} {t("analytics.complaints", "complaints")}</p>
                    </div>
                  )}
                  <span className="text-white font-bold text-xs">{zone.complaints}</span>
                </div>
              ))}
              {heatmapZones.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                  {t("analytics.noGeoData", "No geo-density data for selected range")}
                </div>
              )}
              <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 border border-border">
                <p className="text-xs font-semibold text-foreground mb-2">{t("analytics.density", "Density")}</p>
                <div className="space-y-1">
                  {[{ color: "bg-red-500", label: t("analytics.high", "High (>50)") }, { color: "bg-yellow-500", label: t("analytics.medium", "Medium (20-50)") }, { color: "bg-green-500", label: t("analytics.low", "Low (<20)") }].map(l => (
                    <div key={l.label} className="flex items-center gap-2 text-xs">
                      <span className={`w-3 h-3 rounded-full ${l.color}`} /><span className="text-muted-foreground">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-600" />{t("analytics.aiInsights", "AI-Generated Insights")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.length === 0 && (
                <div className="p-3 bg-card rounded-lg border border-border text-sm text-muted-foreground">
                  {t("analytics.noInsights", "No insights available for selected range.")}
                </div>
              )}
              {insights.map(insight => (
                <div key={insight.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getInsightBadgeColor(insight.type)}>{insight.category}</Badge>
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
          <CardHeader><CardTitle className="text-lg">{t("analytics.categoryBreakdown", "Category Breakdown")}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("analytics.category", "Category")}</TableHead>
                  <TableHead className="text-right">{t("analytics.total", "Total")}</TableHead>
                  <TableHead className="text-right">{t("analytics.pending", "Pending")}</TableHead>
                  <TableHead className="text-right">{t("analytics.avgTime", "Avg Time")}</TableHead>
                  <TableHead className="text-center">{t("analytics.trend", "Trend")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {t("analytics.noBreakdownData", "No category breakdown data")}
                    </TableCell>
                  </TableRow>
                ) : categoryBreakdown.map(row => (
                  <TableRow key={row.category} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{row.category}</TableCell>
                    <TableCell className="text-right">{row.total}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={row.pending > 50 ? "border-red-300 text-red-700" : "border-green-300 text-green-700"}>{row.pending}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.avgTime}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <SparklineChart data={row.trend} direction={row.trendDirection as "up" | "down"} />
                        {row.trendDirection === "up" ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
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
