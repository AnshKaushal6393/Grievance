import { Fragment, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import adminService from "@/services/adminService";
import {
  Search, Filter, Download, ChevronDown, ChevronUp, Eye, UserPlus,
  Flag, MoreHorizontal, Edit, Trash2, XCircle, Check, X, Calendar,
  ArrowUpDown, ChevronLeft, ChevronRight, FileSpreadsheet, Users,
  Clock, CheckCircle, Circle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComplianceInfoBlock from "@/components/ComplianceInfoBlock";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// ✅ Normalized complaint shape used in UI
interface Complaint {
  id: string;          // mapped from _id
  complaintId: string; // GR2024XXXXXX
  title: string;
  description: string;
  category: string;
  status: "filed" | "pending" | "assigned" | "in-progress" | "resolved" | "rejected";
  priority: "low" | "medium" | "high" | "critical";
  citizenName: string;
  citizenEmail: string;
  department: string | null;
  departmentId: string | null;
  filedDate: string;
  lastUpdated: string;
}

// ✅ Map raw backend document → UI Complaint
const mapComplaint = (c: any): Complaint => ({
  id: c._id ?? c.id,
  complaintId: c.complaintId ?? c._id,
  title: c.title ?? "",
  description: c.description ?? "",
  category: c.category ?? "",
  status:
    c.status === "in_progress"
      ? "in-progress"
      : (c.status ?? "filed"),
  priority: c.priority ?? "low",
  citizenName: c.user?.name ?? c.citizenName ?? "Unknown",
  citizenEmail: c.user?.email ?? c.citizenEmail ?? "",
  department: c.department?.name ?? c.department ?? null,
  departmentId: c.department?._id ?? null,
  filedDate: c.createdAt ?? c.filedDate ?? "",
  lastUpdated: c.updatedAt ?? c.lastUpdated ?? "",
});

const categories = [
  "all",
  "Roads & Infrastructure",
  "Water Supply",
  "Electricity",
  "Sanitation & Garbage",
  "Drainage & Sewage",
  "Street Lights",
  "Parks & Gardens",
  "Pollution",
  "Encroachment",
  "Other",
];
const statuses = ["all","filed","pending","assigned","in-progress","resolved","rejected"];
const priorities = ["low","medium","high","critical"];
const focusRingClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

const AdminComplaints = () => {
  const { t } = useLanguage();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortColumn, setSortColumn] = useState<string>("filedDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [quickViewComplaint, setQuickViewComplaint] = useState<Complaint | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState<{id:string; name:string}[]>([]);
  const [isMutating, setIsMutating] = useState(false);
  const [statusDialogComplaint, setStatusDialogComplaint] = useState<Complaint | null>(null);
  const [statusDialogValue, setStatusDialogValue] = useState<Complaint["status"]>("filed");
  const [statusDialogRejectionReason, setStatusDialogRejectionReason] = useState("");
  const [assignDialogComplaint, setAssignDialogComplaint] = useState<Complaint | null>(null);
  const [assignDialogDepartmentId, setAssignDialogDepartmentId] = useState("");
  const [assignDialogBulkMode, setAssignDialogBulkMode] = useState(false);
  const [escalateDialogComplaint, setEscalateDialogComplaint] = useState<Complaint | null>(null);
  const [escalateDialogReason, setEscalateDialogReason] = useState("");
  const [confirmDialogComplaint, setConfirmDialogComplaint] = useState<Complaint | null>(null);
  const [confirmDialogAction, setConfirmDialogAction] = useState<"close" | "delete" | null>(null);

  const buildQuery = (override?: Partial<Record<string, any>>) => ({
    search: searchQuery || undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    priority: selectedPriority !== "all" ? selectedPriority : undefined,
    department: selectedDepartment !== "all" ? selectedDepartment : undefined,
    fromDate: dateFrom ? dateFrom.toISOString() : undefined,
    toDate: dateTo ? dateTo.toISOString() : undefined,
    sortBy: sortColumn,
    sortDir: sortDirection,
    page: currentPage,
    limit: itemsPerPage,
    ...override,
  });

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getAllComplaints(buildQuery());

      // ✅ Map backend docs to normalized UI shape
      const raw = res?.data?.complaints ?? [];
      setComplaints(raw.map(mapComplaint));

      // ✅ Use pagination object from backend
      const pagination = res?.data?.pagination;
      setTotalComplaints(pagination?.total ?? raw.length);
      setTotalPages(pagination?.pages ?? 1);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          t("adminComplaints.errorFetch", "Failed to fetch complaints"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, [searchQuery, currentPage, sortColumn, sortDirection, selectedStatus, selectedPriority, selectedDepartment, selectedCategory, dateFrom, dateTo, itemsPerPage]);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await adminService.getDepartments();
        const deps = res?.data?.departments || [];
        setDepartmentOptions(deps.map((d:any) => ({ id: d._id, name: d.name })));
      } catch {
        setDepartmentOptions([]);
      }
    };
    loadDepartments();
  }, []);

  const getStatusConfig = (status: string) => {
    const map: Record<string, any> = {
      filed:       { label: t("adminComplaints.status.filed", "Filed"),       className: "bg-amber-100 text-amber-800",   icon: Clock },
      pending:     { label: t("adminComplaints.status.pending", "Pending"),     className: "bg-amber-100 text-amber-800",   icon: Clock },
      assigned:    { label: t("adminComplaints.status.assigned", "Assigned"),    className: "bg-primary/15 text-primary",     icon: Users },
      "in-progress":{ label: t("adminComplaints.status.inProgress", "In Progress"),className: "bg-purple-100 text-purple-800", icon: Loader2 },
      resolved:    { label: t("adminComplaints.status.resolved", "Resolved"),    className: "bg-green-100 text-green-800",   icon: CheckCircle },
      rejected:    { label: t("adminComplaints.status.rejected", "Rejected"),    className: "bg-red-100 text-red-800",       icon: XCircle },
    };
    return map[status] ?? { label: status, className: "bg-gray-100 text-gray-800", icon: Circle };
  };

  const getPriorityConfig = (priority: string) => {
    const map: Record<string, any> = {
      low:      { label: t("adminComplaints.priority.low", "Low"),      dotClass: "bg-gray-400",   textClass: "text-gray-600" },
      medium:   { label: t("adminComplaints.priority.medium", "Medium"),   dotClass: "bg-amber-400",  textClass: "text-amber-600" },
      high:     { label: t("adminComplaints.priority.high", "High"),     dotClass: "bg-orange-500", textClass: "text-orange-600" },
      critical: { label: t("adminComplaints.priority.critical", "Critical"), dotClass: "bg-red-500",    textClass: "text-red-600" },
    };
    return map[priority] ?? { label: priority, dotClass: "bg-gray-400", textClass: "text-gray-600" };
  };

  const getCategoryColor = (category: string) => {
    const map: Record<string, string> = {
      "Roads & Infrastructure": "bg-slate-100 text-slate-700",
      "Water Supply": "bg-cyan-100 text-cyan-700",
      Electricity: "bg-yellow-100 text-yellow-700",
      "Sanitation & Garbage": "bg-emerald-100 text-emerald-700",
      "Drainage & Sewage": "bg-indigo-100 text-indigo-700",
      "Street Lights": "bg-amber-100 text-amber-700",
      "Parks & Gardens": "bg-lime-100 text-lime-700",
      Pollution: "bg-rose-100 text-rose-700",
      Encroachment: "bg-orange-100 text-orange-700",
      Other: "bg-gray-100 text-gray-700",
    };
    return map[category] || "bg-gray-100 text-gray-700";
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) setSortDirection(d => d === "asc" ? "desc" : "asc");
    else { setSortColumn(column); setSortDirection("asc"); }
  };

  const handleSelectAll = (checked: boolean) =>
    setSelectedRows(checked ? complaints.map(c => c.id) : []);

  const handleSelectRow = (id: string, checked: boolean) =>
    setSelectedRows(prev => checked ? [...prev, id] : prev.filter(r => r !== id));

  const clearAllFilters = () => {
    setSearchQuery(""); 
    setSelectedStatus("all"); 
    setSelectedCategory("all");
    setSelectedDepartment("all"); 
    setSelectedPriority("all"); 
    setDateFrom(undefined); 
    setDateTo(undefined);
    setCurrentPage(1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const handleAssignDialogSubmit = async () => {
    if (!assignDialogDepartmentId) {
      toast.error(t("adminComplaints.invalidDepartment", "Invalid department selection"));
      return;
    }
    try {
      setIsMutating(true);
      if (assignDialogBulkMode) {
        await adminService.bulkAssign(selectedRows, assignDialogDepartmentId);
        toast.success(t("adminComplaints.bulkAssignSuccess", "Bulk assignment completed"));
        setSelectedRows([]);
      } else if (assignDialogComplaint) {
        await adminService.assignComplaint(assignDialogComplaint.id, {
          departmentId: assignDialogDepartmentId,
        });
        toast.success(t("adminComplaints.assignSuccess", "Complaint assigned successfully"));
      }
      setAssignDialogComplaint(null);
      setAssignDialogDepartmentId("");
      setAssignDialogBulkMode(false);
      await fetchComplaints();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          t("adminComplaints.assignFailed", "Failed to assign complaint"),
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleRowAssign = (complaint: Complaint) => {
    if (departmentOptions.length === 0) {
      toast.error(t("adminComplaints.noDepartments", "No departments available"));
      return;
    }
    setAssignDialogComplaint(complaint);
    setAssignDialogDepartmentId(complaint.departmentId || "");
    setAssignDialogBulkMode(false);
  };

  const handleEscalateDialogSubmit = async () => {
    if (!escalateDialogComplaint) return;
    if (!escalateDialogReason.trim()) {
      toast.error(t("adminComplaints.escalationReason", "Enter escalation reason"));
      return;
    }
    try {
      setIsMutating(true);
      await adminService.escalateComplaint(escalateDialogComplaint.id, {
        reason: escalateDialogReason.trim(),
        priority: "critical",
      });
      toast.success(t("adminComplaints.escalateSuccess", "Complaint escalated successfully"));
      setEscalateDialogComplaint(null);
      setEscalateDialogReason(t("adminComplaints.escalatedByAdmin", "Escalated by admin"));
      await fetchComplaints();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("adminComplaints.escalateFailed", "Failed to escalate complaint"));
    } finally {
      setIsMutating(false);
    }
  };

  const handleRowEscalate = (complaint: Complaint) => {
    setEscalateDialogComplaint(complaint);
    setEscalateDialogReason(t("adminComplaints.escalatedByAdmin", "Escalated by admin"));
  };

  const handleStatusDialogSubmit = async () => {
    if (!statusDialogComplaint) return;
    if (statusDialogValue === "rejected" && !statusDialogRejectionReason.trim()) {
      toast.error(t("adminComplaints.rejectionReasonRequired", "Rejection reason is required"));
      return;
    }
    try {
      setIsMutating(true);
      await adminService.updateComplaintStatus(
        statusDialogComplaint.id,
        statusDialogValue,
        `Status updated by admin to ${statusDialogValue}`,
        statusDialogValue === "rejected"
          ? statusDialogRejectionReason.trim()
          : undefined,
      );
      toast.success(t("adminComplaints.editSuccess", "Complaint updated successfully"));
      setStatusDialogComplaint(null);
      setStatusDialogRejectionReason("");
      await fetchComplaints();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("adminComplaints.editFailed", "Failed to update complaint"));
    } finally {
      setIsMutating(false);
    }
  };

  const handleRowEdit = (complaint: Complaint) => {
    setStatusDialogComplaint(complaint);
    setStatusDialogValue(complaint.status);
    setStatusDialogRejectionReason("");
  };

  const handleRowClose = (complaint: Complaint) => {
    setConfirmDialogComplaint(complaint);
    setConfirmDialogAction("close");
  };

  const handleRowDelete = (complaint: Complaint) => {
    setConfirmDialogComplaint(complaint);
    setConfirmDialogAction("delete");
  };

  const handleConfirmDialogSubmit = async () => {
    if (!confirmDialogComplaint || !confirmDialogAction) return;
    try {
      setIsMutating(true);
      if (confirmDialogAction === "close") {
        await adminService.updateComplaintStatus(
          confirmDialogComplaint.id,
          "resolved",
          "Complaint closed by admin",
        );
        toast.success(t("adminComplaints.closeSuccess", "Complaint closed successfully"));
      } else {
        await adminService.deleteComplaint(confirmDialogComplaint.id);
        toast.success(t("adminComplaints.deleteSuccess", "Complaint deleted successfully"));
        setQuickViewComplaint(null);
      }
      setConfirmDialogComplaint(null);
      setConfirmDialogAction(null);
      await fetchComplaints();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          (confirmDialogAction === "close"
            ? t("adminComplaints.closeFailed", "Failed to close complaint")
            : t("adminComplaints.deleteFailed", "Failed to delete complaint")),
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleAssignComplaint = async () => {
    if (!quickViewComplaint) return;
    await handleRowAssign(quickViewComplaint);
  };

  const handleEscalateComplaint = async () => {
    if (!quickViewComplaint) return;
    await handleRowEscalate(quickViewComplaint);
  };

  const handleEditComplaint = () => {
    if (!quickViewComplaint) return;
    handleRowEdit(quickViewComplaint);
  };

  const handleBulkAssign = async () => {
    if (selectedRows.length === 0) {
      toast.info(t("adminComplaints.noneSelected", "No complaints selected"));
      return;
    }
    if (departmentOptions.length === 0) {
      toast.error(t("adminComplaints.noDepartments", "No departments available"));
      return;
    }
    setAssignDialogComplaint(null);
    setAssignDialogDepartmentId("");
    setAssignDialogBulkMode(true);
  };

  const exportSelectedToCsv = () => {
    const selected = complaints.filter((c) => selectedRows.includes(c.id));
    if (selected.length === 0) return;
    const headers = [
      t("adminComplaints.csv.id", "ID"),
      t("adminComplaints.csv.title", "Title"),
      t("adminComplaints.csv.category", "Category"),
      t("adminComplaints.csv.status", "Status"),
      t("adminComplaints.csv.priority", "Priority"),
      t("adminComplaints.csv.citizen", "Citizen"),
      t("adminComplaints.csv.email", "Email"),
      t("adminComplaints.csv.department", "Department"),
      t("adminComplaints.csv.filedDate", "Filed Date"),
      t("adminComplaints.csv.lastUpdated", "Last Updated"),
    ];
    const csv = [
      headers.join(","),
      ...selected.map(r => [
        r.complaintId,
        `"${(r.title || "").replace(/"/g,'""')}"`,
        r.category,
        r.status,
        r.priority,
        `"${(r.citizenName || "").replace(/"/g,'""')}"`,
        r.citizenEmail,
        r.department || "",
        formatDate(r.filedDate),
        formatDate(r.lastUpdated),
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `complaints-selected-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t("adminComplaints.exportReady", "Export ready"));
  };

  const exportToCsv = async () => {
    try {
      setIsExporting(true);
      const res = await adminService.getAllComplaints(buildQuery({ page: 1, limit: 2000 }));
      const raw = res?.data?.complaints ?? [];
      const rows: Complaint[] = raw.map(mapComplaint);
      const headers = [
        t("adminComplaints.csv.id", "ID"),
        t("adminComplaints.csv.title", "Title"),
        t("adminComplaints.csv.category", "Category"),
        t("adminComplaints.csv.status", "Status"),
        t("adminComplaints.csv.priority", "Priority"),
        t("adminComplaints.csv.citizen", "Citizen"),
        t("adminComplaints.csv.email", "Email"),
        t("adminComplaints.csv.department", "Department"),
        t("adminComplaints.csv.filedDate", "Filed Date"),
        t("adminComplaints.csv.lastUpdated", "Last Updated"),
      ];
      const csv = [
        headers.join(","),
        ...rows.map(r => [
          r.complaintId,
          `"${(r.title || "").replace(/"/g,'""')}"`,
          r.category,
          r.status,
          r.priority,
          `"${(r.citizenName || "").replace(/"/g,'""')}"`,
          r.citizenEmail,
          r.department || "",
          formatDate(r.filedDate),
          formatDate(r.lastUpdated),
        ].join(","))
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `complaints-${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("adminComplaints.exportReady", "Export ready"));
    } catch (err:any) {
      toast.error(err.response?.data?.message || t("adminComplaints.exportFailed", "Export failed"));
    } finally {
      setIsExporting(false);
    }
  };

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort(column)}>
      <div className="flex items-center gap-2">
        {children}
        <ArrowUpDown className={`h-4 w-4 ${sortColumn === column ? "text-primary" : "text-muted-foreground"}`} />
        {sortColumn === column && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </div>
    </TableHead>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main id="main-content" className="container mx-auto px-4 py-8">
        <ComplianceInfoBlock
          className="mb-6"
          source={t("compliance.adminComplaints.source", "Administrative complaint register (live transactional data)")}
          lastSync={new Date().toLocaleString("en-IN")}
          auditReference={t("compliance.adminComplaints.auditRef", "ADM-COMPLAINTS")}
          retentionNotice={t("compliance.adminComplaints.retention", "Complaint lifecycle logs are retained for statutory review and audit traceability.")}
        />
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">
              {t("adminComplaints.title", "All Complaints")}
            </h1>
            <Badge variant="secondary" className="text-lg px-3 py-1">{totalComplaints}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={exportToCsv} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {isExporting
                ? t("adminComplaints.exporting", "Exporting...")
                : t("adminComplaints.exportCsv", "Export to CSV")}
            </Button>
            <Button variant={showAdvancedFilters ? "default" : "outline"} className="gap-2" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
              <Filter className="h-4 w-4" />
              {t("adminComplaints.advancedFilters", "Advanced Filters")}
              {(selectedStatus !== "all" || selectedCategory !== "all" || selectedDepartment !== "all" || selectedPriority !== "all" || dateFrom || dateTo || searchQuery) && (
                <Badge className="ml-1 bg-primary-foreground text-primary h-5 w-5 p-0 flex items-center justify-center rounded-full">!</Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="xl:col-span-2">
                      <label htmlFor="admin-complaints-search" className="text-sm font-medium mb-2 block">
                        {t("adminComplaints.search", "Search")}
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="admin-complaints-search"
                          placeholder={t(
                            "adminComplaints.searchPlaceholder",
                            "Search by ID, Title, or Description...",
                          )}
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="admin-complaints-status" className="text-sm font-medium mb-2 block">
                        {t("adminComplaints.status", "Status")}
                      </label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger id="admin-complaints-status">
                          <SelectValue placeholder={t("adminComplaints.allStatuses", "All Statuses")} />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map(status => (
                            <SelectItem key={status} value={status} className="capitalize">
                              {status === "all"
                                ? t("adminComplaints.allStatuses", "All Statuses")
                                : status.replace("-", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label htmlFor="admin-complaints-priority" className="text-sm font-medium mb-2 block">
                        {t("adminComplaints.priority", "Priority")}
                      </label>
                      <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                        <SelectTrigger id="admin-complaints-priority">
                          <SelectValue placeholder={t("adminComplaints.allPriorities", "All Priorities")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            {t("adminComplaints.allPriorities", "All Priorities")}
                          </SelectItem>
                          {priorities.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label htmlFor="admin-complaints-department" className="text-sm font-medium mb-2 block">
                        {t("adminComplaints.department", "Department")}
                      </label>
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger id="admin-complaints-department">
                          <SelectValue placeholder={t("adminComplaints.allDepartments", "All Departments")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            {t("adminComplaints.allDepartments", "All Departments")}
                          </SelectItem>
                          {departmentOptions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label htmlFor="admin-complaints-category" className="text-sm font-medium mb-2 block">
                        {t("adminComplaints.category", "Category")}
                      </label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger id="admin-complaints-category">
                          <SelectValue placeholder={t("adminComplaints.allCategories", "All Categories")} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(c => (
                            <SelectItem key={c} value={c}>
                              {c === "all" ? t("adminComplaints.allCategories", "All Categories") : c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="xl:col-span-2">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex-1">
                        <label htmlFor="admin-complaints-from-date" className="text-sm font-medium mb-2 block">
                          {t("adminComplaints.fromDate", "From date")}
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button id="admin-complaints-from-date" variant="outline" className="w-full justify-between">
                              {dateFrom
                                ? format(dateFrom, "dd MMM yyyy")
                                : t("adminComplaints.selectStartDate", "Select start date")}
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-2">
                            <CalendarComponent mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex-1">
                        <label htmlFor="admin-complaints-to-date" className="text-sm font-medium mb-2 block">
                          {t("adminComplaints.toDate", "To date")}
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button id="admin-complaints-to-date" variant="outline" className="w-full justify-between">
                              {dateTo
                                ? format(dateTo, "dd MMM yyyy")
                                : t("adminComplaints.selectEndDate", "Select end date")}
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-2">
                            <CalendarComponent mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                    <Button onClick={() => setCurrentPage(1)}>
                      {t("adminComplaints.applyFilters", "Apply Filters")}
                    </Button>
                    <Button variant="outline" onClick={clearAllFilters}>
                      {t("adminComplaints.clearAll", "Clear All")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk Actions */}
        <AnimatePresence>
          {selectedRows.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      {selectedRows.length} {t("adminComplaints.selected", "complaints selected")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-2" onClick={handleBulkAssign} disabled={isMutating}>
                      <UserPlus className="h-4 w-4" />
                      {t("adminComplaints.bulkAssign", "Bulk Assign")}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2" onClick={exportSelectedToCsv}>
                      <Download className="h-4 w-4" />
                      {t("adminComplaints.bulkExport", "Bulk Export")}
                    </Button>
                    <Button size="sm" variant="ghost" className={focusRingClass} onClick={() => setSelectedRows([])} aria-label={t("adminComplaints.clearSelection", "Clear selection")}><X className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox checked={selectedRows.length === complaints.length && complaints.length > 0} onCheckedChange={handleSelectAll} />
                    </TableHead>
                    <SortableHeader column="complaintId">{t("adminComplaints.table.id", "ID")}</SortableHeader>
                    <SortableHeader column="title">{t("adminComplaints.table.title", "Title")}</SortableHeader>
                    <SortableHeader column="category">{t("adminComplaints.table.category", "Category")}</SortableHeader>
                    <SortableHeader column="status">{t("adminComplaints.table.status", "Status")}</SortableHeader>
                    <SortableHeader column="priority">{t("adminComplaints.table.priority", "Priority")}</SortableHeader>
                    <SortableHeader column="citizenName">{t("adminComplaints.table.citizen", "Citizen")}</SortableHeader>
                    <SortableHeader column="department">{t("adminComplaints.table.department", "Department")}</SortableHeader>
                    <SortableHeader column="filedDate">{t("adminComplaints.table.filedDate", "Filed Date")}</SortableHeader>
                    <SortableHeader column="lastUpdated">{t("adminComplaints.table.lastUpdated", "Last Updated")}</SortableHeader>
                    <TableHead className="text-right">{t("adminComplaints.table.actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={11} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                  ) : complaints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                        {t("adminComplaints.noComplaints", "No complaints found")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    complaints.map(complaint => {
                      const statusConfig = getStatusConfig(complaint.status);
                      const priorityConfig = getPriorityConfig(complaint.priority);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <Fragment key={complaint.id}>
                          <TableRow key={complaint.id}
                            className={`hover:bg-muted/30 transition-colors cursor-pointer ${selectedRows.includes(complaint.id) ? "bg-primary/5" : ""}`}
                            onClick={() => setExpandedRow(expandedRow === complaint.id ? null : complaint.id)}
                          >
                            <TableCell onClick={e => e.stopPropagation()}>
                              <Checkbox checked={selectedRows.includes(complaint.id)} onCheckedChange={checked => handleSelectRow(complaint.id, checked as boolean)} />
                            </TableCell>
                            <TableCell className="font-mono text-sm font-medium text-primary">{complaint.complaintId}</TableCell>
                            <TableCell className="max-w-[200px]"><p className="truncate font-medium">{complaint.title}</p></TableCell>
                            <TableCell><Badge variant="secondary" className={getCategoryColor(complaint.category)}>{complaint.category}</Badge></TableCell>
                            <TableCell><Badge className={`${statusConfig.className} gap-1`}><StatusIcon className="h-3 w-3" />{statusConfig.label}</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${priorityConfig.dotClass}`} />
                                <span className={`text-sm ${priorityConfig.textClass}`}>{priorityConfig.label}</span>
                              </div>
                            </TableCell>
                            <TableCell>{complaint.citizenName}</TableCell>
                            <TableCell>
                              {complaint.department
                                ? <span className="text-sm">{complaint.department}</span>
                                : <span className="text-muted-foreground text-sm italic">{t("adminComplaints.unassigned", "Unassigned")}</span>}
                            </TableCell>
                            <TableCell className="text-sm">{formatDate(complaint.filedDate)}</TableCell>
                            <TableCell className="text-sm">{formatDate(complaint.lastUpdated)}</TableCell>
                            <TableCell onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button size="icon" variant="ghost" className={`h-8 w-8 ${focusRingClass}`} onClick={() => setQuickViewComplaint(complaint)} aria-label={t("adminComplaints.aria.viewComplaint", "View complaint details")}><Eye className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className={`h-8 w-8 ${focusRingClass}`} onClick={() => handleRowAssign(complaint)} disabled={isMutating} aria-label={t("adminComplaints.aria.assignComplaint", "Assign complaint")}><UserPlus className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className={`h-8 w-8 ${focusRingClass}`} onClick={() => handleRowEscalate(complaint)} disabled={isMutating} aria-label={t("adminComplaints.aria.escalateComplaint", "Escalate complaint")}><Flag className="h-4 w-4" /></Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className={`h-8 w-8 ${focusRingClass}`} aria-label={t("adminComplaints.aria.moreActions", "More actions")}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="gap-2" onClick={() => handleRowEdit(complaint)}><Edit className="h-4 w-4" />{t("adminComplaints.edit", "Edit")}</DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2" onClick={() => handleRowClose(complaint)}><XCircle className="h-4 w-4" />{t("adminComplaints.closeComplaint", "Close Complaint")}</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleRowDelete(complaint)}><Trash2 className="h-4 w-4" />{t("adminComplaints.delete", "Delete")}</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                          <AnimatePresence>
                            {expandedRow === complaint.id && (
                              <TableRow>
                                <TableCell colSpan={11} className="p-0">
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-muted/30 p-4 border-t">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div><h4 className="font-medium mb-2">{t("adminComplaints.description", "Description")}</h4><p className="text-sm text-muted-foreground">{complaint.description}</p></div>
                                      <div><h4 className="font-medium mb-2">{t("adminComplaints.contact", "Contact")}</h4><p className="text-sm text-muted-foreground">{complaint.citizenEmail}</p></div>
                                    </div>
                                  </motion.div>
                                </TableCell>
                              </TableRow>
                            )}
                          </AnimatePresence>
                        </Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-4 border-t p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t("adminComplaints.showing", "Showing")}</span>
                <Select value={itemsPerPage.toString()} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10,25,50,100].map(n => <SelectItem key={n} value={`${n}`}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span>{t("adminComplaints.of", "of")} {totalComplaints} {t("adminComplaints.complaints", "complaints")}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                  {t("adminComplaints.previous", "Previous")}
                </Button>
                <div className="flex flex-wrap items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                    return (
                      <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(pageNum)}>{pageNum}</Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  {t("adminComplaints.next", "Next")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Quick View Modal */}
      <Dialog open={!!quickViewComplaint} onOpenChange={() => setQuickViewComplaint(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="font-mono text-primary">{quickViewComplaint?.complaintId}</span>
              {quickViewComplaint && <Badge className={getStatusConfig(quickViewComplaint.status).className}>{getStatusConfig(quickViewComplaint.status).label}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {quickViewComplaint && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{quickViewComplaint.title}</h3>
                <p className="text-muted-foreground mt-2">{quickViewComplaint.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div><p className="text-sm text-muted-foreground">{t("adminComplaints.category", "Category")}</p><Badge variant="secondary" className={getCategoryColor(quickViewComplaint.category)}>{quickViewComplaint.category}</Badge></div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("adminComplaints.priority", "Priority")}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${getPriorityConfig(quickViewComplaint.priority).dotClass}`} />
                    <span className={getPriorityConfig(quickViewComplaint.priority).textClass}>{getPriorityConfig(quickViewComplaint.priority).label}</span>
                  </div>
                </div>
                <div><p className="text-sm text-muted-foreground">{t("adminComplaints.table.citizen", "Citizen")}</p><p className="font-medium">{quickViewComplaint.citizenName}</p><p className="text-sm text-muted-foreground">{quickViewComplaint.citizenEmail}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("adminComplaints.department", "Department")}</p><p className="font-medium">{quickViewComplaint.department || t("adminComplaints.unassigned", "Unassigned")}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("adminComplaints.table.filedDate", "Filed Date")}</p><p className="font-medium">{formatDate(quickViewComplaint.filedDate)}</p></div>
                <div><p className="text-sm text-muted-foreground">{t("adminComplaints.table.lastUpdated", "Last Updated")}</p><p className="font-medium">{formatDate(quickViewComplaint.lastUpdated)}</p></div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button className="gap-2" onClick={handleEditComplaint}>
                  <Edit className="h-4 w-4" />
                  {t("adminComplaints.editComplaint", "Edit Complaint")}
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleAssignComplaint}>
                  <UserPlus className="h-4 w-4" />
                  {t("adminComplaints.assign", "Assign")}
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleEscalateComplaint}>
                  <Flag className="h-4 w-4" />
                  {t("adminComplaints.escalate", "Escalate")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!statusDialogComplaint}
        onOpenChange={(open) => {
          if (!open) {
            setStatusDialogComplaint(null);
            setStatusDialogRejectionReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("adminComplaints.updateStatus", "Update Complaint Status")}
            </DialogTitle>
          </DialogHeader>
          {statusDialogComplaint && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {statusDialogComplaint.complaintId}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("adminComplaints.status", "Status")}
                </label>
                <Select
                  value={statusDialogValue}
                  onValueChange={(value) => setStatusDialogValue(value as Complaint["status"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filed">{t("adminComplaints.status.filed", "Filed")}</SelectItem>
                    <SelectItem value="pending">{t("adminComplaints.status.pending", "Pending")}</SelectItem>
                    <SelectItem value="assigned">{t("adminComplaints.status.assigned", "Assigned")}</SelectItem>
                    <SelectItem value="in-progress">{t("adminComplaints.status.inProgress", "In Progress")}</SelectItem>
                    <SelectItem value="resolved">{t("adminComplaints.status.resolved", "Resolved")}</SelectItem>
                    <SelectItem value="rejected">{t("adminComplaints.status.rejected", "Rejected")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {statusDialogValue === "rejected" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("adminComplaints.rejectionReason", "Rejection Reason")}
                  </label>
                  <Input
                    value={statusDialogRejectionReason}
                    onChange={(e) => setStatusDialogRejectionReason(e.target.value)}
                    placeholder={t("adminComplaints.rejectionReasonPrompt", "Enter rejection reason")}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusDialogComplaint(null);
                    setStatusDialogRejectionReason("");
                    toast.info(t("adminComplaints.editCancelled", "Update cancelled"));
                  }}
                >
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button onClick={handleStatusDialogSubmit} disabled={isMutating}>
                  {isMutating ? t("common.loading", "Loading") : t("common.update", "Update")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={assignDialogBulkMode || !!assignDialogComplaint}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDialogComplaint(null);
            setAssignDialogDepartmentId("");
            setAssignDialogBulkMode(false);
            toast.info(t("adminComplaints.assignCancelled", "Assignment cancelled"));
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {assignDialogBulkMode
                ? t("adminComplaints.bulkAssign", "Bulk Assign")
                : t("adminComplaints.assign", "Assign")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {assignDialogBulkMode
                ? `${selectedRows.length} ${t("adminComplaints.selected", "complaints selected")}`
                : assignDialogComplaint?.complaintId}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("adminComplaints.department", "Department")}
              </label>
              <Select
                value={assignDialogDepartmentId}
                onValueChange={setAssignDialogDepartmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("adminComplaints.selectDepartment", "Select department")} />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAssignDialogComplaint(null);
                  setAssignDialogDepartmentId("");
                  setAssignDialogBulkMode(false);
                  toast.info(t("adminComplaints.assignCancelled", "Assignment cancelled"));
                }}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={handleAssignDialogSubmit} disabled={isMutating}>
                {isMutating ? t("common.loading", "Loading") : t("common.update", "Update")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!escalateDialogComplaint}
        onOpenChange={(open) => {
          if (!open) {
            setEscalateDialogComplaint(null);
            setEscalateDialogReason(t("adminComplaints.escalatedByAdmin", "Escalated by admin"));
            toast.info(t("adminComplaints.escalateCancelled", "Escalation cancelled"));
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("adminComplaints.escalate", "Escalate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">{escalateDialogComplaint?.complaintId}</div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("adminComplaints.escalationReason", "Enter escalation reason")}
              </label>
              <Input
                value={escalateDialogReason}
                onChange={(e) => setEscalateDialogReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEscalateDialogComplaint(null);
                  setEscalateDialogReason(t("adminComplaints.escalatedByAdmin", "Escalated by admin"));
                  toast.info(t("adminComplaints.escalateCancelled", "Escalation cancelled"));
                }}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={handleEscalateDialogSubmit} disabled={isMutating}>
                {isMutating ? t("common.loading", "Loading") : t("common.update", "Update")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmDialogAction && !!confirmDialogComplaint}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialogComplaint(null);
            setConfirmDialogAction(null);
            toast.info(
              confirmDialogAction === "close"
                ? t("adminComplaints.closeCancelled", "Close action cancelled")
                : t("adminComplaints.deleteCancelled", "Delete action cancelled"),
            );
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDialogAction === "close"
                ? t("adminComplaints.closeComplaint", "Close Complaint")
                : t("adminComplaints.delete", "Delete")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {confirmDialogComplaint?.complaintId}
            </div>
            <p className="text-sm">
              {confirmDialogAction === "close"
                ? t("adminComplaints.closeConfirm", "Close this complaint as resolved?")
                : t("adminComplaints.deleteConfirm", "Delete this complaint permanently?")}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmDialogComplaint(null);
                  setConfirmDialogAction(null);
                  toast.info(
                    confirmDialogAction === "close"
                      ? t("adminComplaints.closeCancelled", "Close action cancelled")
                      : t("adminComplaints.deleteCancelled", "Delete action cancelled"),
                  );
                }}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                variant={confirmDialogAction === "delete" ? "destructive" : "default"}
                onClick={handleConfirmDialogSubmit}
                disabled={isMutating}
              >
                {isMutating ? t("common.loading", "Loading") : t("common.confirm", "Confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default AdminComplaints;

