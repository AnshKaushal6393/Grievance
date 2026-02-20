import { useEffect, useRef, useState } from "react";
import {
  Calendar, Download, FileText, Clock,
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
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
  const { t } = useLanguage();
  const [selectedRange, setSelectedRange] = useState("30days");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [hoveredZone, setHoveredZone] = useState<number | null>(null);
  const [selectedHeatmapZoneId, setSelectedHeatmapZoneId] = useState<number | null>(null);
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
          total: c.total ?? c.count ?? c.value ?? 0,
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
        setSelectedHeatmapZoneId(d.heatmapZones[0]?.id ?? null);
      } else {
        setHeatmapZones([]);
        setSelectedHeatmapZoneId(null);
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
      const exportFrom =
        selectedRange === "custom" ? dateFrom?.toISOString() : undefined;
      const exportTo =
        selectedRange === "custom" ? dateTo?.toISOString() : undefined;
      adminService
        .exportAnalyticsCsv(selectedRange, exportFrom, exportTo)
        .then((blob: Blob) => {
          const now = new Date();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `admin-analytics-${selectedRange}-${format(now, "yyyyMMdd-HHmm")}.csv`;
          link.click();
          URL.revokeObjectURL(url);
          toast.success(t("analytics.export.success", "Report exported"));
        })
        .catch(() => {
          toast.error(t("analytics.export.failed", "Failed to export report"));
        })
        .finally(() => {
          setIsExporting(false);
        });
      return;
    } catch {
      toast.error(t("analytics.export.failed", "Failed to export report"));
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

  const selectedHeatmapZone =
    heatmapZones.find((zone: any) => zone.id === selectedHeatmapZoneId) ||
    heatmapZones[0] ||
    null;
  const selectedLat =
    selectedHeatmapZone && Number.isFinite(Number(selectedHeatmapZone.lat))
      ? Number(selectedHeatmapZone.lat)
      : null;
  const selectedLng =
    selectedHeatmapZone && Number.isFinite(Number(selectedHeatmapZone.lng))
      ? Number(selectedHeatmapZone.lng)
      : null;
  const selectedMapEmbedUrl =
    selectedLat !== null && selectedLng !== null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${selectedLng - 0.02}%2C${selectedLat - 0.02}%2C${selectedLng + 0.02}%2C${selectedLat + 0.02}&layer=mapnik&marker=${selectedLat}%2C${selectedLng}`
      : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main id="main-content" className="container mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="py-3 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-4">
              <span>Data source: Consolidated grievance records</span>
              <span>Last refreshed: {new Date().toLocaleString("en-IN")}</span>
              <span>Reference: ADM-ANALYTICS</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("analytics.title", "Administrative Analytics Dashboard")}</h1>
              <p className="text-muted-foreground text-sm">{t("analytics.subtitle", "Comprehensive grievance statistics and administrative observations")}</p>
            </div>
            <Button
              onClick={handleExportReport}
              disabled={
                isExporting ||
                (selectedRange === "custom" && (!dateFrom || !dateTo))
              }
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-white"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isExporting ? t("analytics.exporting", "Exporting...") : t("analytics.exportReport", "Export Official Report")}
            </Button>
          </CardContent>
        </Card>

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
                  {isExporting ? t("analytics.exporting", "Exporting...") : t("analytics.exportReport", "Export Official Report")}
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
            <Card key={index} className="transition-colors hover:border-slate-300">
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-lg border bg-slate-50 overflow-hidden h-80">
                {selectedMapEmbedUrl ? (
                  <iframe
                    title="Complaint density map"
                    src={selectedMapEmbedUrl}
                    className="h-full w-full border-0"
                    loading="lazy"
                    allowFullScreen
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
                    {t("analytics.noGeoData", "No geo-density data for selected range")}
                  </div>
                )}
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {heatmapZones.map((zone: any) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setSelectedHeatmapZoneId(zone.id)}
                    onMouseEnter={() => setHoveredZone(zone.id)}
                    onMouseLeave={() => setHoveredZone(null)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                      selectedHeatmapZoneId === zone.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{zone.name}</p>
                        <p className="text-xs text-muted-foreground">{zone.complaints} {t("analytics.complaints", "complaints")}</p>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full ${zone.density === "high" ? "bg-red-500" : zone.density === "medium" ? "bg-yellow-500" : "bg-green-500"}`} />
                    </div>
                  </button>
                ))}
                {heatmapZones.length === 0 && (
                  <p className="rounded border border-dashed p-3 text-sm text-muted-foreground">
                    {t("analytics.noGeoData", "No geo-density data for selected range")}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytical Observations */}
        <Card className="bg-white border-amber-200">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-600" />{t("analytics.aiInsights", "Analytical Observations")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.length === 0 && (
                <div className="p-3 bg-card rounded-lg border border-border text-sm text-muted-foreground">
                  {t("analytics.noInsights", "No insights available for selected range.")}
                </div>
              )}
              {insights.map(insight => (
                <div key={insight.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:bg-slate-50 transition-colors cursor-pointer group">
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
      <Footer />
    </div>
  );
};

export default AnalyticsDashboard;


