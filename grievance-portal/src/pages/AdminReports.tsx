import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Gauge,
  Layers3,
  MapPinned,
  SlidersHorizontal,
  SmilePlus,
  WandSparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
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
  title: string;
  description: string;
  icon: React.ElementType;
}

interface SavedReport {
  id: string;
  name: string;
  type: string;
  generatedDate: string;
  format: OutputFormat;
}

const STORAGE_KEY = "admin_recent_reports_v1";

const reportTypes: ReportCardOption[] = [
  { id: "summary", title: "Complaints Summary Report", description: "High-level complaint volume, resolution and trend summary.", icon: FileText },
  { id: "department-performance", title: "Department Performance Report", description: "Compare departments by workload and closure efficiency.", icon: Building2 },
  { id: "category-analysis", title: "Category-wise Analysis", description: "Breakdown by complaint categories and pattern changes.", icon: Layers3 },
  { id: "geo-distribution", title: "Geographic Distribution Report", description: "Regional spread and heat zones for complaint concentration.", icon: MapPinned },
  { id: "sla-compliance", title: "SLA Compliance Report", description: "Track SLA adherence, breaches and delay trend.", icon: Gauge },
  { id: "citizen-satisfaction", title: "Citizen Satisfaction Report", description: "Ratings and sentiment insights from citizens.", icon: SmilePlus },
  { id: "custom-builder", title: "Custom Report Builder", description: "Build a report with custom filters and sections.", icon: WandSparkles },
];

const allDepartments = ["Public Works", "Water Supply", "Electricity", "Sanitation", "Traffic"];
const allCategories = ["Roads & Infrastructure", "Water Supply", "Electricity", "Sanitation & Garbage", "Other"];
const allStatuses = ["filed", "assigned", "in-progress", "resolved", "rejected"];
const allPriorities = ["low", "medium", "high", "critical"];

const quickRanges = [
  { label: "This Week", key: "this-week" },
  { label: "This Month", key: "this-month" },
  { label: "Last Quarter", key: "last-quarter" },
] as const;

const includeDefaults = {
  charts: true,
  detailedList: false,
  executiveSummary: true,
  recommendations: true,
  rawData: false,
};

const formatTypeLabel = (id: ReportType) => reportTypes.find((item) => item.id === id)?.title || id;

const readSavedReports = (): SavedReport[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeSavedReports = (reports: SavedReport[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
};

const escapePdfText = (input: string) =>
  input.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const buildSimplePdfBytes = (lines: string[]) => {
  const content = [
    "BT",
    "/F1 14 Tf",
    "72 760 Td",
    ...lines.map((line, idx) => `${idx === 0 ? "" : "0 -22 Td"}(${escapePdfText(line)}) Tj`).filter(Boolean),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj\n",
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream\nendobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += obj;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(pdf);
};

const AdminReports = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ReportType>("summary");
  const [startDate, setStartDate] = useState<string>(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [departments, setDepartments] = useState<string[]>([]);
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
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>(readSavedReports());

  const visibleReports = useMemo(
    () => [...savedReports].sort((a, b) => +new Date(b.generatedDate) - +new Date(a.generatedDate)).slice(0, 5),
    [savedReports],
  );

  const toggleMulti = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

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

  const buildReportName = () => `${formatTypeLabel(selectedType)} (${startDate} to ${endDate})`;

  const handlePreview = () => {
    setPreviewReady(true);
    toast.success("Preview generated from selected configuration");
  };

  const triggerDownload = (report: SavedReport) => {
    const baseName = report.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const csvHeader = "name,type,generatedDate,format\n";
    const csvRow = `"${report.name.replace(/"/g, '""')}","${report.type.replace(/"/g, '""')}","${report.generatedDate}","${report.format}"\n`;
    let blob: Blob;
    let extension = "csv";

    if (report.format === "pdf") {
      const bytes = buildSimplePdfBytes([
        "Grievance Portal Report",
        `Name: ${report.name}`,
        `Type: ${report.type}`,
        `Generated: ${new Date(report.generatedDate).toLocaleString()}`,
        `Format: ${report.format.toUpperCase()}`,
      ]);
      blob = new Blob([bytes], { type: "application/pdf" });
      extension = "pdf";
    } else if (report.format === "excel") {
      const htmlTable = `
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Generated Date</th><th>Format</th></tr></thead>
          <tbody><tr><td>${report.name}</td><td>${report.type}</td><td>${report.generatedDate}</td><td>${report.format.toUpperCase()}</td></tr></tbody>
        </table>
      `;
      blob = new Blob([htmlTable], { type: "application/vnd.ms-excel" });
      extension = "xls";
    } else {
      blob = new Blob([csvHeader + csvRow], { type: "text/csv;charset=utf-8;" });
      extension = "csv";
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const completeGeneration = () => {
    const report: SavedReport = {
      id: crypto.randomUUID(),
      name: buildReportName(),
      type: formatTypeLabel(selectedType),
      generatedDate: new Date().toISOString(),
      format,
    };
    const next = [report, ...savedReports];
    setSavedReports(next);
    writeSavedReports(next);
    setIsGenerating(false);
    setProgress(100);
    toast.success("Report generated successfully");
  };

  const handleGenerate = () => {
    if (!previewReady) {
      toast.error("Preview report before generating");
      return;
    }
    setIsGenerating(true);
    setProgress(0);
    let current = 0;
    const timer = setInterval(() => {
      current += 12;
      if (current >= 100) {
        clearInterval(timer);
        completeGeneration();
      } else {
        setProgress(current);
      }
    }, 280);
  };

  const handleSaveConfiguration = () => {
    toast.success("Configuration saved");
  };

  const handleSchedule = () => {
    if (!scheduleRecurring) {
      toast.error("Enable recurring schedule checkbox first");
      return;
    }
    toast.success("Report schedule saved");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Navbar />
      <main className="container mx-auto space-y-6 px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Generate Reports</h1>
            <p className="text-sm text-muted-foreground">Build, preview, and export governance reports</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => document.getElementById("recent-reports")?.scrollIntoView({ behavior: "smooth" })}>
            <FileSpreadsheet className="h-4 w-4" />
            My Saved Reports
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report Type</CardTitle>
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
                  className={`rounded-xl border p-4 text-left transition-all ${active ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${active ? "text-blue-700" : "text-slate-600"}`} />
                    <span className="font-semibold text-slate-900">{item.title}</span>
                  </div>
                  <p className="text-xs text-slate-600">{item.description}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5" />Report Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-semibold">Time Period</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block">Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1 block">End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickRanges.map((item) => (
                  <Button key={item.key} variant="outline" size="sm" className="gap-2" onClick={() => setQuickRange(item.key)}>
                    <CalendarDays className="h-4 w-4" />
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Department</Label>
                    <div className="flex flex-wrap gap-2">
                      {allDepartments.map((dept) => (
                        <Badge key={dept} variant={departments.includes(dept) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleMulti(dept, departments, setDepartments)}>
                          {dept}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Category</Label>
                    <div className="flex flex-wrap gap-2">
                      {allCategories.map((cat) => (
                        <Badge key={cat} variant={categories.includes(cat) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleMulti(cat, categories, setCategories)}>
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Status</Label>
                    <div className="flex flex-wrap gap-2">
                      {allStatuses.map((status) => (
                        <Badge key={status} variant={statuses.includes(status) ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => toggleMulti(status, statuses, setStatuses)}>
                          {status}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Priority Levels</Label>
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
                <CardHeader><CardTitle className="text-base">Group & Include</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Group By</Label>
                    <Select value={groupBy} onValueChange={(value: GroupByType) => setGroupBy(value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="department">Department</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={include.charts} onCheckedChange={(v) => setInclude((p) => ({ ...p, charts: Boolean(v) }))} />
                      <span className="text-sm">Charts and Graphs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={include.detailedList} onCheckedChange={(v) => setInclude((p) => ({ ...p, detailedList: Boolean(v) }))} />
                      <span className="text-sm">Detailed Complaint List</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={include.executiveSummary} onCheckedChange={(v) => setInclude((p) => ({ ...p, executiveSummary: Boolean(v) }))} />
                      <span className="text-sm">Executive Summary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={include.recommendations} onCheckedChange={(v) => setInclude((p) => ({ ...p, recommendations: Boolean(v) }))} />
                      <span className="text-sm">Recommendations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={include.rawData} onCheckedChange={(v) => setInclude((p) => ({ ...p, rawData: Boolean(v) }))} />
                      <span className="text-sm">Raw Data Export</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Output Options</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="mb-2 block">Format</Label>
              <Select value={format} onValueChange={(value: OutputFormat) => setFormat(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Template</Label>
              <Select value={template} onValueChange={(value: TemplateType) => setTemplate(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(Boolean(v))} />
              <span className="text-sm">Send via email</span>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Checkbox checked={scheduleRecurring} onCheckedChange={(v) => setScheduleRecurring(Boolean(v))} />
              <span className="text-sm">Schedule recurring report</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handlePreview} className="gap-2">
              <FileText className="h-4 w-4" />
              Preview Report
            </Button>
            {previewReady && (
              <div className="grid grid-cols-1 gap-4 rounded-xl border bg-slate-50 p-4 md:grid-cols-[1.2fr_1fr]">
                <div>
                  <p className="font-semibold text-slate-900">{buildReportName()}</p>
                  <p className="text-sm text-slate-600">Type: {formatTypeLabel(selectedType)} • Template: {template} • Format: {format.toUpperCase()}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">Group By: {groupBy}</Badge>
                    <Badge variant="secondary">{departments.length || "All"} departments</Badge>
                    <Badge variant="secondary">{categories.length || "All"} categories</Badge>
                    <Badge variant="secondary">{statuses.length || "All"} statuses</Badge>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-2 w-full rounded bg-blue-100"><div className="h-2 w-2/3 rounded bg-blue-500" /></div>
                    <div className="h-2 w-full rounded bg-emerald-100"><div className="h-2 w-1/2 rounded bg-emerald-500" /></div>
                    <div className="h-2 w-full rounded bg-amber-100"><div className="h-2 w-3/4 rounded bg-amber-500" /></div>
                  </div>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-700">Thumbnail Preview</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-16 rounded bg-slate-100" />
                    <div className="h-16 rounded bg-slate-100" />
                    <div className="h-20 rounded bg-slate-100" />
                    <div className="h-20 rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {isGenerating && (
              <div className="rounded-lg border bg-blue-50 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Generating report...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleGenerate} disabled={isGenerating}>
                Generate Report
              </Button>
              <Button variant="outline" onClick={handleSaveConfiguration}>Save Configuration</Button>
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSchedule}>Schedule Report</Button>
            </div>
          </CardContent>
        </Card>

        <Card id="recent-reports">
          <CardHeader><CardTitle>Recent Reports</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Generated Date</TableHead>
                  <TableHead className="text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No reports generated yet</TableCell>
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
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between rounded-xl border bg-white p-4">
          <Button variant="ghost" className="gap-2" onClick={() => navigate("/admin")}>
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Admin Dashboard
          </Button>
          <Link to="/admin/complaints" className="text-sm text-blue-600 hover:underline">Go to complaints</Link>
        </div>
      </main>
    </div>
  );
};

export default AdminReports;
