import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Gauge,
  Layers3,
  Loader2,
  MapPinned,
  SlidersHorizontal,
  SmilePlus,
  WandSparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComplianceInfoBlock from "@/components/ComplianceInfoBlock";
import adminService from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

type ReportType =
  | "summary"
  | "department-performance"
  | "category-analysis"
  | "geo-distribution"
  | "sla-compliance"
  | "citizen-satisfaction"
  | "custom-builder";

type OutputFormat = "pdf" | "excel" | "csv";
type TemplateType = "standard" | "detailed" | "executive";
type GroupByType = "department" | "category" | "date" | "status";

interface ReportCardOption {
  id: ReportType;
  titleKey: string;
  descriptionKey: string;
  icon: React.ElementType;
}

interface SavedReport {
  id: string;
  name: string;
  type: string;
  generatedDate: string;
  format: OutputFormat;
  snapshot?: ReportSnapshot;
}

interface ReportSnapshot {
  dateRange: string;
  groupBy: GroupByType;
  departments: string[];
  categories: string[];
  statuses: string[];
  priorities: string[];
  include: typeof includeDefaults;
  template: TemplateType;
  sendEmail: boolean;
  scheduleRecurring: boolean;
  metrics: {
    totalComplaints: number;
    resolved: number;
    pending: number;
    slaCompliance: string;
  };
  rows: Array<{
    label: string;
    total: number;
    resolved: number;
    pending: number;
  }>;
}

const reportTypes: ReportCardOption[] = [
  { id: "summary", titleKey: "adminReports.types.summary.title", descriptionKey: "adminReports.types.summary.desc", icon: FileText },
  { id: "department-performance", titleKey: "adminReports.types.department.title", descriptionKey: "adminReports.types.department.desc", icon: Building2 },
  { id: "category-analysis", titleKey: "adminReports.types.category.title", descriptionKey: "adminReports.types.category.desc", icon: Layers3 },
  { id: "geo-distribution", titleKey: "adminReports.types.geo.title", descriptionKey: "adminReports.types.geo.desc", icon: MapPinned },
  { id: "sla-compliance", titleKey: "adminReports.types.sla.title", descriptionKey: "adminReports.types.sla.desc", icon: Gauge },
  { id: "citizen-satisfaction", titleKey: "adminReports.types.satisfaction.title", descriptionKey: "adminReports.types.satisfaction.desc", icon: SmilePlus },
  { id: "custom-builder", titleKey: "adminReports.types.custom.title", descriptionKey: "adminReports.types.custom.desc", icon: WandSparkles },
];

const allCategories = ["Roads & Infrastructure", "Water Supply", "Electricity", "Sanitation & Garbage", "Other"];
const allStatuses = ["filed", "assigned", "in-progress", "resolved", "rejected"];
const allPriorities = ["low", "medium", "high", "critical"];

const quickRanges = [
  { labelKey: "adminReports.quick.thisWeek", fallback: "This Week", key: "this-week" },
  { labelKey: "adminReports.quick.thisMonth", fallback: "This Month", key: "this-month" },
  { labelKey: "adminReports.quick.lastQuarter", fallback: "Last Quarter", key: "last-quarter" },
] as const;

const includeDefaults = {
  charts: true,
  detailedList: false,
  executiveSummary: true,
  recommendations: true,
  rawData: false,
};

const AdminReports = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedType, setSelectedType] = useState<ReportType>("summary");
  const [startDate, setStartDate] = useState<string>(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupByType>("department");

  const [include, setInclude] = useState(includeDefaults);
  const [format, setFormat] = useState<OutputFormat>("pdf");
  const [template, setTemplate] = useState<TemplateType>("standard");
  const [sendEmail, setSendEmail] = useState(false);
  const [scheduleRecurring, setScheduleRecurring] = useState(false);

  const [previewReady, setPreviewReady] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<ReportSnapshot | null>(null);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  const reportTypeLabel = (id: ReportType) => {
    const item = reportTypes.find((entry) => entry.id === id);
    if (!item) return id;
    return t(item.titleKey, id);
  };

  const visibleReports = useMemo(
    () => [...savedReports].sort((a, b) => +new Date(b.generatedDate) - +new Date(a.generatedDate)).slice(0, 5),
    [savedReports],
  );

  const toggleMulti = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await adminService.getDepartments();
        const deps = (res?.data?.departments || []).map((d: { name: string }) => d.name);
        setDepartmentOptions(deps);
      } catch {
        setDepartmentOptions([]);
      }
    };
    void loadDepartments();
    void fetchGeneratedReports();
  }, []);

  useEffect(() => {
    setPreviewReady(false);
    setPreviewSnapshot(null);
  }, [
    selectedType,
    startDate,
    endDate,
    departments,
    categories,
    statuses,
    priorities,
    groupBy,
    include,
    template,
    sendEmail,
    scheduleRecurring,
  ]);

  const setQuickRange = (key: (typeof quickRanges)[number]["key"]) => {
    const today = new Date();
    const end = new Date(today);
    const start = new Date(today);
    if (key === "this-week") {
      const day = today.getDay() || 7;
      start.setDate(today.getDate() - day + 1);
    } else if (key === "this-month") {
      start.setDate(1);
    } else {
      const currentQuarter = Math.floor(today.getMonth() / 3) + 1;
      const startMonth = (currentQuarter - 2) * 3;
      if (startMonth < 0) {
        start.setFullYear(today.getFullYear() - 1);
        start.setMonth(9, 1);
        end.setFullYear(today.getFullYear() - 1);
        end.setMonth(11, 31);
      } else {
        start.setMonth(startMonth, 1);
        end.setMonth(startMonth + 2, 31);
      }
    }
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  const buildReportName = () => `${reportTypeLabel(selectedType)} (${startDate} ${t("adminReports.to", "to")} ${endDate})`;

  const buildConfigPayload = () => ({
    startDate,
    endDate,
    departments,
    categories,
    statuses,
    priorities,
    groupBy,
    include,
    template,
    sendEmail,
    scheduleRecurring,
  });

  const fetchGeneratedReports = async () => {
    try {
      const response = await adminService.getGeneratedReports(20);
      const reports = (response?.data?.reports || []).map((report: any) => ({
        id: String(report.id || report._id),
        name: report.name || t("adminReports.reportNameFallback", "Report"),
        type: report.type || report.reportType || "summary",
        generatedDate: report.generatedDate || new Date().toISOString(),
        format: (report.format || "pdf") as OutputFormat,
        snapshot: report.snapshot || undefined,
      }));
      setSavedReports(reports);
    } catch {
      setSavedReports([]);
      toast.error(t("adminReports.loadFailed", "Failed to load generated reports"));
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const response = await adminService.previewReport(buildConfigPayload());
      const snapshot = response?.data?.snapshot as ReportSnapshot;
      setPreviewSnapshot(snapshot);
      setPreviewReady(true);
      toast.success(t("adminReports.previewSuccess", "Preview generated from live backend data"));
    } catch {
      toast.error(t("adminReports.previewFailed", "Failed to fetch live report data"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const triggerDownload = async (report: SavedReport) => {
    try {
      const blob = await adminService.downloadGeneratedReport(report.id, report.format);
      const baseName = report.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const extension = report.format === "excel" ? "xls" : report.format;
      downloadBlob(blob, `${baseName}.${extension}`);
    } catch {
      toast.error(t("adminReports.downloadFailed", "Failed to download report"));
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setProgress(15);
      const response = await adminService.generateReport({
        name: buildReportName(),
        reportType: selectedType,
        format,
        config: buildConfigPayload(),
      });
      const generated = response?.data?.report;
      if (generated?.snapshot) {
        setPreviewSnapshot(generated.snapshot as ReportSnapshot);
        setPreviewReady(true);
      }
      setProgress(100);
      toast.success(t("adminReports.generated", "Report generated successfully"));
      await fetchGeneratedReports();
    } catch {
      toast.error(t("adminReports.fetchFailed", "Could not generate live report"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      await adminService.saveReportConfiguration({
        name: `${reportTypeLabel(selectedType)} ${t("adminReports.configuration", "Configuration")}`,
        reportType: selectedType,
        config: buildConfigPayload(),
      });
      toast.success(t("adminReports.configSaved", "Report configuration saved"));
    } catch {
      toast.error(t("adminReports.configFailed", "Failed to save configuration"));
    }
  };

  const handleSchedule = async () => {
    if (!scheduleRecurring) {
      toast.error(t("adminReports.enableRecurringFirst", "Enable recurring schedule checkbox first"));
      return;
    }
    try {
      await adminService.scheduleReport({
        name: `${reportTypeLabel(selectedType)} ${t("adminReports.schedule", "Schedule")}`,
        reportType: selectedType,
        format,
        config: buildConfigPayload(),
        schedule: {
          frequency: "weekly",
          dayOfWeek: 1,
          time: "09:00",
          timezone: "Asia/Kolkata",
          enabled: true,
        },
      });
      toast.success(t("adminReports.scheduleSaved", "Report schedule has been saved"));
    } catch {
      toast.error(t("adminReports.scheduleFailed", "Failed to save schedule"));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main id="main-content" className="container mx-auto space-y-6 px-4 py-8">
        <ComplianceInfoBlock
          source={t("compliance.adminReports.source", "Administrative report service (live records)")}
          lastSync={new Date().toLocaleString("en-IN")}
          auditReference={t("compliance.adminReports.auditRef", "ADM-REPORTS")}
          retentionNotice={t("compliance.adminReports.retention", "Generated reports are retained according to departmental archival and audit policy.")}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t("adminReports.title", "Administrative Report Generation")}</h1>
            <p className="text-sm text-muted-foreground">{t("adminReports.subtitle", "Configure, preview, and export official grievance records and summaries")}</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => document.getElementById("recent-reports")?.scrollIntoView({ behavior: "smooth" })}>
            <FileSpreadsheet className="h-4 w-4" />
            {t("adminReports.mySavedReports", "My Saved Reports")}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("adminReports.reportType", "Report Type")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {reportTypes.map((item) => {
              const Icon = item.icon;
              const active = selectedType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedType(item.id)}
                  className={`rounded-lg border p-4 text-left transition-colors ${active ? "border-primary bg-primary/10" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-slate-600"}`} />
                    <span className="font-semibold text-slate-900">{t(item.titleKey, "Report Type")}</span>
                  </div>
                  <p className="text-xs text-slate-600">{t(item.descriptionKey, "Report description")}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5" />{t("adminReports.configuration", "Report Configuration")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-semibold">{t("adminReports.timePeriod", "Time Period")}</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block">{t("adminReports.startDate", "Start Date")}</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1 block">{t("adminReports.endDate", "End Date")}</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickRanges.map((item) => (
                  <Button key={item.key} variant="outline" size="sm" className="gap-2" onClick={() => setQuickRange(item.key)}>
                    <CalendarDays className="h-4 w-4" />
                    {t(item.labelKey, item.fallback)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">{t("adminReports.filters", "Filters")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">{t("adminReports.department", "Department")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {departmentOptions.length === 0 ? (
                        <span className="text-xs text-slate-500">{t("adminReports.noDepartments", "No departments loaded")}</span>
                      ) : (
                        departmentOptions.map((dept) => (
                          <Badge key={dept} variant={departments.includes(dept) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleMulti(dept, departments, setDepartments)}>
                            {dept}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">{t("adminReports.category", "Category")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {allCategories.map((cat) => (
                        <Badge key={cat} variant={categories.includes(cat) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleMulti(cat, categories, setCategories)}>
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">{t("adminReports.status", "Status")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {allStatuses.map((status) => (
                        <Badge key={status} variant={statuses.includes(status) ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => toggleMulti(status, statuses, setStatuses)}>
                          {status}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">{t("adminReports.priorityLevels", "Priority Levels")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {allPriorities.map((priority) => (
                        <Badge key={priority} variant={priorities.includes(priority) ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => toggleMulti(priority, priorities, setPriorities)}>
                          {priority}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">{t("adminReports.groupInclude", "Group & Include")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">{t("adminReports.groupBy", "Group By")}</Label>
                    <Select value={groupBy} onValueChange={(value: GroupByType) => setGroupBy(value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="department">{t("adminReports.group.department", "Department")}</SelectItem>
                        <SelectItem value="category">{t("adminReports.group.category", "Category")}</SelectItem>
                        <SelectItem value="date">{t("adminReports.group.date", "Date")}</SelectItem>
                        <SelectItem value="status">{t("adminReports.group.status", "Status")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={include.charts} onCheckedChange={(v) => setInclude((p) => ({ ...p, charts: Boolean(v) }))} />
                      <span className="text-sm">{t("adminReports.include.charts", "Charts and Graphs")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={include.detailedList} onCheckedChange={(v) => setInclude((p) => ({ ...p, detailedList: Boolean(v) }))} />
                      <span className="text-sm">{t("adminReports.include.detailed", "Detailed Complaint List")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={include.executiveSummary} onCheckedChange={(v) => setInclude((p) => ({ ...p, executiveSummary: Boolean(v) }))} />
                      <span className="text-sm">{t("adminReports.include.executive", "Executive Summary")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={include.recommendations} onCheckedChange={(v) => setInclude((p) => ({ ...p, recommendations: Boolean(v) }))} />
                      <span className="text-sm">{t("adminReports.include.recommendations", "Recommendations")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={include.rawData} onCheckedChange={(v) => setInclude((p) => ({ ...p, rawData: Boolean(v) }))} />
                      <span className="text-sm">{t("adminReports.include.rawData", "Raw Data Export")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("adminReports.outputOptions", "Output Options")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="mb-2 block">{t("adminReports.format", "Format")}</Label>
              <Select value={format} onValueChange={(value: OutputFormat) => setFormat(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">{t("adminReports.format.pdf", "PDF")}</SelectItem>
                  <SelectItem value="excel">{t("adminReports.format.excel", "Excel")}</SelectItem>
                  <SelectItem value="csv">{t("adminReports.format.csv", "CSV")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">{t("adminReports.template", "Template")}</Label>
              <Select value={template} onValueChange={(value: TemplateType) => setTemplate(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{t("adminReports.template.standard", "Standard")}</SelectItem>
                  <SelectItem value="detailed">{t("adminReports.template.detailed", "Detailed")}</SelectItem>
                  <SelectItem value="executive">{t("adminReports.template.executive", "Executive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(Boolean(v))} />
              <span className="text-sm">{t("adminReports.sendEmail", "Send via email")}</span>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Checkbox checked={scheduleRecurring} onCheckedChange={(v) => setScheduleRecurring(Boolean(v))} />
              <span className="text-sm">{t("adminReports.scheduleRecurring", "Schedule recurring report")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("adminReports.preview", "Preview")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handlePreview} className="gap-2" disabled={previewLoading}>
              {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {previewLoading ? t("adminReports.loadingPreview", "Loading Preview...") : t("adminReports.previewReport", "Preview Report")}
            </Button>
            {previewReady && previewSnapshot && (
              <div className="grid grid-cols-1 gap-4 rounded-lg border bg-white p-4 md:grid-cols-[1.2fr_1fr]">
                <div>
                  <p className="font-semibold text-slate-900">{buildReportName()}</p>
                  <p className="text-sm text-slate-600">{t("adminReports.preview.meta", "Type: {type} | Template: {template} | Format: {format}").replace("{type}", reportTypeLabel(selectedType)).replace("{template}", t(`adminReports.template.${template}`, template)).replace("{format}", t(`adminReports.format.${format}`, format.toUpperCase()))}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">{t("adminReports.preview.groupBy", "Group By: {value}").replace("{value}", t(`adminReports.group.${groupBy}`, groupBy))}</Badge>
                    <Badge variant="secondary">{t("adminReports.preview.departmentsCount", "{count} departments").replace("{count}", String(departments.length || t("adminReports.all", "All")))}</Badge>
                    <Badge variant="secondary">{t("adminReports.preview.categoriesCount", "{count} categories").replace("{count}", String(categories.length || t("adminReports.all", "All")))}</Badge>
                    <Badge variant="secondary">{t("adminReports.preview.statusesCount", "{count} statuses").replace("{count}", String(statuses.length || t("adminReports.all", "All")))}</Badge>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-slate-600">{t("adminReports.preview.totalComplaints", "Total Complaints: {count}").replace("{count}", String(previewSnapshot.metrics.totalComplaints))}</p>
                    <div className="h-2 w-full rounded bg-primary/15"><div className="h-2 rounded bg-primary/100" style={{ width: `${previewSnapshot.metrics.totalComplaints === 0 ? 0 : Math.max((previewSnapshot.metrics.resolved / previewSnapshot.metrics.totalComplaints) * 100, 4)}%` }} /></div>
                    <p className="text-xs text-slate-600">{t("adminReports.preview.resolvedPending", "Resolved: {resolved} | Pending: {pending}").replace("{resolved}", String(previewSnapshot.metrics.resolved)).replace("{pending}", String(previewSnapshot.metrics.pending))}</p>
                    <div className="h-2 w-full rounded bg-emerald-100"><div className="h-2 rounded bg-emerald-500" style={{ width: `${previewSnapshot.metrics.slaCompliance}` }} /></div>
                    <p className="text-xs text-slate-600">{t("adminReports.preview.sla", "SLA Compliance: {value}").replace("{value}", previewSnapshot.metrics.slaCompliance)}</p>
                  </div>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-700">{t("adminReports.preview.snapshot", "Report Snapshot")}</p>
                  <div className="space-y-2">
                    {previewSnapshot.rows.slice(0, 4).map((row) => (
                      <div key={row.label} className="rounded bg-slate-100 p-2 text-xs text-slate-700">
                        <p className="font-medium">{row.label}</p>
                        <p>{t("adminReports.preview.rowSummary", "Total: {total} | Resolved: {resolved}").replace("{total}", String(row.total)).replace("{resolved}", String(row.resolved))}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("adminReports.actions", "Actions")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {isGenerating && (
              <div className="rounded-lg border bg-primary/10 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{t("adminReports.generating", "Generating report...")}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button className="bg-primary hover:bg-primary/90" onClick={handleGenerate} disabled={isGenerating}>
                {t("adminReports.generateReport", "Generate Report")}
              </Button>
              <Button variant="outline" onClick={handleSaveConfiguration}>{t("adminReports.saveConfiguration", "Save Configuration")}</Button>
              <Button variant="outline" onClick={handleSchedule}>{t("adminReports.scheduleReport", "Schedule Report")}</Button>
            </div>
          </CardContent>
        </Card>

        <Card id="recent-reports">
          <CardHeader><CardTitle>{t("adminReports.recentReports", "Recent Reports")}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("adminReports.name", "Name")}</TableHead>
                    <TableHead>{t("adminReports.type", "Type")}</TableHead>
                    <TableHead>{t("adminReports.generatedDate", "Generated Date")}</TableHead>
                    <TableHead className="text-right">{t("adminReports.download", "Download")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">{t("adminReports.noReports", "No reports generated yet")}</TableCell>
                    </TableRow>
                  ) : (
                    visibleReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.name}</TableCell>
                        <TableCell>{report.type}</TableCell>
                        <TableCell>{new Date(report.generatedDate).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => triggerDownload(report)}>
                            <Download className="h-4 w-4" />
                            {t("adminReports.download", "Download")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between rounded-lg border bg-white p-4">
          <Button variant="ghost" className="gap-2" onClick={() => navigate("/admin")}>
            <ChevronRight className="h-4 w-4 rotate-180" />
            {t("adminReports.backAdmin", "Back to Admin Dashboard")}
          </Button>
          <Link to="/admin/complaints" className="text-sm text-primary hover:underline">{t("adminReports.goComplaints", "Go to complaints")}</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminReports;


