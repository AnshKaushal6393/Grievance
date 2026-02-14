import { useState, useEffect } from "react";
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
import { toast } from "sonner";

// ✅ Normalized complaint shape used in UI
interface Complaint {
  id: string;          // mapped from _id
  complaintId: string; // GR2024XXXXXX
  title: string;
  description: string;
  category: string;
  status: "filed" | "assigned" | "in-progress" | "resolved" | "rejected";
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
  status: c.status ?? "filed",
  priority: c.priority ?? "low",
  citizenName: c.user?.name ?? c.citizenName ?? "Unknown",
  citizenEmail: c.user?.email ?? c.citizenEmail ?? "",
  department: c.department?.name ?? c.department ?? null,
  departmentId: c.department?._id ?? null,
  filedDate: c.createdAt ?? c.filedDate ?? "",
  lastUpdated: c.updatedAt ?? c.lastUpdated ?? "",
});

const categories = ["all","Roads & Infrastructure","Water Supply","Electricity","Sanitation","Traffic","Environment","Parks & Recreation","Municipal","Health","Education"];
const statuses = ["all","filed","assigned","in-progress","resolved","rejected"];
const priorities = ["low","medium","high","critical"];

const AdminComplaints = () => {
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
      toast.error(err.response?.data?.message || "Failed to fetch complaints");
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
      filed:       { label: "Filed",       className: "bg-amber-100 text-amber-800",   icon: Clock },
      pending:     { label: "Pending",     className: "bg-amber-100 text-amber-800",   icon: Clock },
      assigned:    { label: "Assigned",    className: "bg-blue-100 text-blue-800",     icon: Users },
      "in-progress":{ label: "In Progress",className: "bg-purple-100 text-purple-800", icon: Loader2 },
      resolved:    { label: "Resolved",    className: "bg-green-100 text-green-800",   icon: CheckCircle },
      rejected:    { label: "Rejected",    className: "bg-red-100 text-red-800",       icon: XCircle },
    };
    return map[status] ?? { label: status, className: "bg-gray-100 text-gray-800", icon: Circle };
  };

  const getPriorityConfig = (priority: string) => {
    const map: Record<string, any> = {
      low:      { label: "Low",      dotClass: "bg-gray-400",   textClass: "text-gray-600" },
      medium:   { label: "Medium",   dotClass: "bg-amber-400",  textClass: "text-amber-600" },
      high:     { label: "High",     dotClass: "bg-orange-500", textClass: "text-orange-600" },
      critical: { label: "Critical", dotClass: "bg-red-500",    textClass: "text-red-600" },
    };
    return map[priority] ?? { label: priority, dotClass: "bg-gray-400", textClass: "text-gray-600" };
  };

  const getCategoryColor = (category: string) => {
    const map: Record<string, string> = {
      "Roads & Infrastructure": "bg-slate-100 text-slate-700",
      "Water Supply": "bg-cyan-100 text-cyan-700",
      "roads": "bg-slate-100 text-slate-700",
      "water": "bg-cyan-100 text-cyan-700",
      "electricity": "bg-yellow-100 text-yellow-700",
      "sanitation": "bg-emerald-100 text-emerald-700",
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

  const handleEditComplaint = () => {
    if (!quickViewComplaint) return;
    toast.info(`Edit flow coming soon for ${quickViewComplaint.complaintId}`);
  };

  const handleAssignComplaint = () => {
    if (!quickViewComplaint) return;
    toast.info(`Assign flow coming soon for ${quickViewComplaint.complaintId}`);
  };

  const handleEscalateComplaint = () => {
    if (!quickViewComplaint) return;
    toast.info(`Escalation flow coming soon for ${quickViewComplaint.complaintId}`);
  };

  // Row-level handlers (non-modal)
  const handleRowAssign = (complaintId: string) => {
    toast.info(`Assign flow coming soon for ${complaintId}`);
  };

  const handleRowEscalate = (complaintId: string) => {
    toast.info(`Escalation flow coming soon for ${complaintId}`);
  };

  const handleRowEdit = (complaintId: string) => {
    toast.info(`Edit flow coming soon for ${complaintId}`);
  };

  const handleRowClose = (complaintId: string) => {
    toast.info(`Close complaint flow coming soon for ${complaintId}`);
  };

  const handleRowDelete = (complaintId: string) => {
    toast.info(`Delete complaint flow coming soon for ${complaintId}`);
  };

  const exportToCsv = async () => {
    try {
      setIsExporting(true);
      const res = await adminService.getAllComplaints(buildQuery({ page: 1, limit: 2000 }));
      const raw = res?.data?.complaints ?? [];
      const rows: Complaint[] = raw.map(mapComplaint);
      const headers = ["ID","Title","Category","Status","Priority","Citizen","Email","Department","Filed Date","Last Updated"];
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
      toast.success("Export ready");
    } catch (err:any) {
      toast.error(err.response?.data?.message || "Export failed");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">All Complaints</h1>
            <Badge variant="secondary" className="text-lg px-3 py-1">{totalComplaints}</Badge>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2" onClick={exportToCsv} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {isExporting ? "Exporting..." : "Export to CSV"}
            </Button>
            <Button variant={showAdvancedFilters ? "default" : "outline"} className="gap-2" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
              <Filter className="h-4 w-4" />Advanced Filters
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                      <label className="text-sm font-medium mb-2 block">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search by ID, Title, or Description..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                        <SelectContent>
                          {statuses.map(status => (
                            <SelectItem key={status} value={status} className="capitalize">
                              {status === "all" ? "All Statuses" : status.replace("-", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Priority</label>
                      <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                        <SelectTrigger><SelectValue placeholder="All Priorities" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priorities</SelectItem>
                          {priorities.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Department</label>
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          {departmentOptions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                        <SelectContent>
                          {categories.map(c => (
                            <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="lg:col-span-2 flex gap-3">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">From date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              {dateFrom ? format(dateFrom, "dd MMM yyyy") : "Select start date"}
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-2">
                            <CalendarComponent mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">To date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              {dateTo ? format(dateTo, "dd MMM yyyy") : "Select end date"}
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
                  <div className="flex gap-3 mt-4 pt-4 border-t">
                    <Button onClick={() => setCurrentPage(1)}>Apply Filters</Button>
                    <Button variant="outline" onClick={clearAllFilters}>Clear All</Button>
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
                    <span className="font-medium">{selectedRows.length} complaints selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-2"><UserPlus className="h-4 w-4" />Bulk Assign</Button>
                    <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" />Bulk Export</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedRows([])}><X className="h-4 w-4" /></Button>
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
                    <SortableHeader column="complaintId">ID</SortableHeader>
                    <SortableHeader column="title">Title</SortableHeader>
                    <SortableHeader column="category">Category</SortableHeader>
                    <SortableHeader column="status">Status</SortableHeader>
                    <SortableHeader column="priority">Priority</SortableHeader>
                    <SortableHeader column="citizenName">Citizen</SortableHeader>
                    <SortableHeader column="department">Department</SortableHeader>
                    <SortableHeader column="filedDate">Filed Date</SortableHeader>
                    <SortableHeader column="lastUpdated">Last Updated</SortableHeader>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={11} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                  ) : complaints.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center py-12 text-muted-foreground">No complaints found</TableCell></TableRow>
                  ) : (
                    complaints.map(complaint => {
                      const statusConfig = getStatusConfig(complaint.status);
                      const priorityConfig = getPriorityConfig(complaint.priority);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <>
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
                                : <span className="text-muted-foreground text-sm italic">Unassigned</span>}
                            </TableCell>
                            <TableCell className="text-sm">{formatDate(complaint.filedDate)}</TableCell>
                            <TableCell className="text-sm">{formatDate(complaint.lastUpdated)}</TableCell>
                            <TableCell onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQuickViewComplaint(complaint)}><Eye className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRowAssign(complaint.complaintId)}><UserPlus className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRowEscalate(complaint.complaintId)}><Flag className="h-4 w-4" /></Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="gap-2" onClick={() => handleRowEdit(complaint.complaintId)}><Edit className="h-4 w-4" />Edit</DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2" onClick={() => handleRowClose(complaint.complaintId)}><XCircle className="h-4 w-4" />Close Complaint</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleRowDelete(complaint.complaintId)}><Trash2 className="h-4 w-4" />Delete</DropdownMenuItem>
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
                                      <div><h4 className="font-medium mb-2">Description</h4><p className="text-sm text-muted-foreground">{complaint.description}</p></div>
                                      <div><h4 className="font-medium mb-2">Contact</h4><p className="text-sm text-muted-foreground">{complaint.citizenEmail}</p></div>
                                    </div>
                                  </motion.div>
                                </TableCell>
                              </TableRow>
                            )}
                          </AnimatePresence>
                        </>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing</span>
                <Select value={itemsPerPage.toString()} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10,25,50,100].map(n => <SelectItem key={n} value={`${n}`}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span>of {totalComplaints} complaints</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                    return (
                      <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(pageNum)}>{pageNum}</Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Next<ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <div><p className="text-sm text-muted-foreground">Category</p><Badge variant="secondary" className={getCategoryColor(quickViewComplaint.category)}>{quickViewComplaint.category}</Badge></div>
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${getPriorityConfig(quickViewComplaint.priority).dotClass}`} />
                    <span className={getPriorityConfig(quickViewComplaint.priority).textClass}>{getPriorityConfig(quickViewComplaint.priority).label}</span>
                  </div>
                </div>
                <div><p className="text-sm text-muted-foreground">Citizen</p><p className="font-medium">{quickViewComplaint.citizenName}</p><p className="text-sm text-muted-foreground">{quickViewComplaint.citizenEmail}</p></div>
                <div><p className="text-sm text-muted-foreground">Department</p><p className="font-medium">{quickViewComplaint.department || "Unassigned"}</p></div>
                <div><p className="text-sm text-muted-foreground">Filed Date</p><p className="font-medium">{formatDate(quickViewComplaint.filedDate)}</p></div>
                <div><p className="text-sm text-muted-foreground">Last Updated</p><p className="font-medium">{formatDate(quickViewComplaint.lastUpdated)}</p></div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button className="gap-2" onClick={handleEditComplaint}>
                  <Edit className="h-4 w-4" />
                  Edit Complaint
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleAssignComplaint}>
                  <UserPlus className="h-4 w-4" />
                  Assign
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleEscalateComplaint}>
                  <Flag className="h-4 w-4" />
                  Escalate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminComplaints;
