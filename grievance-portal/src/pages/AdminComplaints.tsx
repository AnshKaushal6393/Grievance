import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import adminService from "@/services/adminService";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Eye,
  UserPlus,
  Flag,
  MoreHorizontal,
  Edit,
  Trash2,
  XCircle,
  Check,
  X,
  Calendar,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Users,
  Clock,
  CheckCircle,
  Circle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "pending" | "assigned" | "in-progress" | "resolved" | "rejected";
  priority: "low" | "medium" | "high" | "critical";
  citizenName: string;
  citizenEmail: string;
  department: string | null;
  filedDate: string;
  lastUpdated: string;
}

const categories = [
  "Roads & Infrastructure",
  "Water Supply",
  "Electricity",
  "Sanitation",
  "Traffic",
  "Environment",
  "Parks & Recreation",
  "Municipal",
];

const departments = [
  "Water Department",
  "Electricity Board",
  "Sanitation Department",
  "Traffic Police",
  "Environment Agency",
  "PWD",
  "Health Department",
];

const statuses = ["pending", "assigned", "in-progress", "resolved", "rejected"];
const priorities = ["low", "medium", "high", "critical"];

const AdminComplaints = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortColumn, setSortColumn] = useState<string>("filedDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [quickViewComplaint, setQuickViewComplaint] =
    useState<Complaint | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [totalPages,setTotalPages]=useState(1);

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getAllComplaints({
        search: searchQuery,
        status: selectedStatuses.join(","),
        priority: selectedPriority,
        department: selectedDepartment,
        sortBy: sortColumn,
        sortDir: sortDirection,
        page: currentPage,
        limit: itemsPerPage,
      });
      setComplaints(res.data.complaints);
      setTotalPages(res.data.totalPages);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [
    searchQuery,
    currentPage,
    sortColumn,
    sortDirection,
    selectedStatuses,
    selectedPriority,
    selectedDepartment,
    itemsPerPage,
  ]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          className:
            "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
          icon: Clock,
        };
      case "assigned":
        return {
          label: "Assigned",
          className:
            "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
          icon: Users,
        };
      case "in-progress":
        return {
          label: "In Progress",
          className:
            "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
          icon: Loader2,
        };
      case "resolved":
        return {
          label: "Resolved",
          className:
            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
          icon: CheckCircle,
        };
      case "rejected":
        return {
          label: "Rejected",
          className:
            "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          icon: XCircle,
        };
      default:
        return {
          label: status,
          className: "bg-gray-100 text-gray-800",
          icon: Circle,
        };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "low":
        return {
          label: "Low",
          dotClass: "bg-gray-400",
          textClass: "text-gray-600",
        };
      case "medium":
        return {
          label: "Medium",
          dotClass: "bg-amber-400",
          textClass: "text-amber-600",
        };
      case "high":
        return {
          label: "High",
          dotClass: "bg-orange-500",
          textClass: "text-orange-600",
        };
      case "critical":
        return {
          label: "Critical",
          dotClass: "bg-red-500",
          textClass: "text-red-600",
        };
      default:
        return {
          label: priority,
          dotClass: "bg-gray-400",
          textClass: "text-gray-600",
        };
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Roads & Infrastructure":
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      "Water Supply":
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
      Electricity:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      Sanitation:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      Traffic:
        "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
      Environment:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      "Parks & Recreation":
        "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
      Municipal:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    };
    return colors[category] || "bg-gray-100 text-gray-700";
  };
  const paginatedComplaints = complaints;
  

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedComplaints.map((c) => c.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRows([...selectedRows, id]);
    } else {
      setSelectedRows(selectedRows.filter((r) => r !== id));
    }
  };

  const toggleStatusFilter = (status: string) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  const toggleCategoryFilter = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setSelectedDepartment("");
    setSelectedPriority("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const SortableHeader = ({
    column,
    children,
  }: {
    column: string;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-2">
        {children}
        <ArrowUpDown
          className={`h-4 w-4 ${sortColumn === column ? "text-primary" : "text-muted-foreground"}`}
        />
        {sortColumn === column &&
          (sortDirection === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          ))}
      </div>
    </TableHead>
  );

  const handleAssign = async (id: string, departmentId: string) => {
    await adminService.assignComplaint(id, { departmentId });
    toast.success("Complaint assigned!");
    fetchComplaints();
  };

  const handleBulkAssign = async (departmentId: string) => {
    await adminService.bulkAssign(selectedRows, departmentId);
    toast.success(`${selectedRows.length} complaints assigned!`);
    setSelectedRows([]);
    fetchComplaints();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">
              All Complaints
            </h1>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {complaints.length}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
            <Button
              variant={showAdvancedFilters ? "default" : "outline"}
              className="gap-2"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="h-4 w-4" />
              Advanced Filters
              {(selectedStatuses.length > 0 ||
                selectedCategories.length > 0 ||
                selectedDepartment ||
                selectedPriority ||
                dateFrom ||
                dateTo) && (
                <Badge className="ml-1 bg-primary-foreground text-primary h-5 w-5 p-0 flex items-center justify-center rounded-full">
                  !
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                      <label className="text-sm font-medium mb-2 block">
                        Search
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by ID, Title, or Description..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Status Multi-select */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Status
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between"
                          >
                            {selectedStatuses.length > 0
                              ? `${selectedStatuses.length} selected`
                              : "All Statuses"}
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2">
                          {statuses.map((status) => (
                            <div
                              key={status}
                              className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                              onClick={() => toggleStatusFilter(status)}
                            >
                              <Checkbox
                                checked={selectedStatuses.includes(status)}
                              />
                              <span className="capitalize">
                                {status.replace("-", " ")}
                              </span>
                            </div>
                          ))}
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Category Multi-select */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Category
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between"
                          >
                            {selectedCategories.length > 0
                              ? `${selectedCategories.length} selected`
                              : "All Categories"}
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2">
                          {categories.map((category) => (
                            <div
                              key={category}
                              className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                              onClick={() => toggleCategoryFilter(category)}
                            >
                              <Checkbox
                                checked={selectedCategories.includes(category)}
                              />
                              <span className="text-sm">{category}</span>
                            </div>
                          ))}
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Department */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Department
                      </label>
                      <Select
                        value={selectedDepartment}
                        onValueChange={setSelectedDepartment}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Departments" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Priority
                      </label>
                      <Select
                        value={selectedPriority}
                        onValueChange={setSelectedPriority}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Priorities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priorities</SelectItem>
                          {priorities.map((priority) => (
                            <SelectItem
                              key={priority}
                              value={priority}
                              className="capitalize"
                            >
                              {priority}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date From */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Date From
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-2"
                          >
                            <Calendar className="h-4 w-4" />
                            {dateFrom
                              ? format(dateFrom, "dd MMM yyyy")
                              : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={dateFrom}
                            onSelect={setDateFrom}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Date To */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Date To
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-2"
                          >
                            <Calendar className="h-4 w-4" />
                            {dateTo
                              ? format(dateTo, "dd MMM yyyy")
                              : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={dateTo}
                            onSelect={setDateTo}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4 pt-4 border-t">
                    <Button onClick={() => setCurrentPage(1)}>
                      Apply Filters
                    </Button>
                    <Button variant="outline" onClick={clearAllFilters}>
                      Clear All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedRows.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      {selectedRows.length} complaints selected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Bulk Assign
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Bulk Export
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Mark as Reviewed
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedRows([])}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Complaints Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedRows.length === paginatedComplaints.length &&
                          paginatedComplaints.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <SortableHeader column="id">ID</SortableHeader>
                    <SortableHeader column="title">Title</SortableHeader>
                    <SortableHeader column="category">Category</SortableHeader>
                    <SortableHeader column="status">Status</SortableHeader>
                    <SortableHeader column="priority">Priority</SortableHeader>
                    <SortableHeader column="citizenName">
                      Citizen
                    </SortableHeader>
                    <SortableHeader column="department">
                      Department
                    </SortableHeader>
                    <SortableHeader column="filedDate">
                      Filed Date
                    </SortableHeader>
                    <SortableHeader column="lastUpdated">
                      Last Updated
                    </SortableHeader>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedComplaints.map((complaint) => {
                    const statusConfig = getStatusConfig(complaint.status);
                    const priorityConfig = getPriorityConfig(
                      complaint.priority,
                    );
                    const StatusIcon = statusConfig.icon;

                    return (
                      <>
                        <TableRow
                          key={complaint.id}
                          className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                            selectedRows.includes(complaint.id)
                              ? "bg-primary/5"
                              : ""
                          }`}
                          onClick={() =>
                            setExpandedRow(
                              expandedRow === complaint.id
                                ? null
                                : complaint.id,
                            )
                          }
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRows.includes(complaint.id)}
                              onCheckedChange={(checked) =>
                                handleSelectRow(
                                  complaint.id,
                                  checked as boolean,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm font-medium text-primary">
                            {complaint.id}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="truncate font-medium">
                              {complaint.title}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={getCategoryColor(complaint.category)}
                            >
                              {complaint.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${statusConfig.className} gap-1`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${priorityConfig.dotClass}`}
                              />
                              <span
                                className={`text-sm ${priorityConfig.textClass}`}
                              >
                                {priorityConfig.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{complaint.citizenName}</TableCell>
                          <TableCell>
                            {complaint.department ? (
                              <span className="text-sm">
                                {complaint.department}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">
                                Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(complaint.filedDate)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(complaint.lastUpdated)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => setQuickViewComplaint(complaint)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => setIsAssigning(true)}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                              >
                                <Flag className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem className="gap-2">
                                    <Edit className="h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2">
                                    <XCircle className="h-4 w-4" />
                                    Close Complaint
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="gap-2 text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expandable Row */}
                        <AnimatePresence>
                          {expandedRow === complaint.id && (
                            <TableRow>
                              <TableCell colSpan={11} className="p-0">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="bg-muted/30 p-4 border-t"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium mb-2">
                                        Description
                                      </h4>
                                      <p className="text-sm text-muted-foreground">
                                        {complaint.description}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">
                                        Contact Details
                                      </h4>
                                      <p className="text-sm text-muted-foreground">
                                        {complaint.citizenEmail}
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          )}
                        </AnimatePresence>
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(v) => {
                    setItemsPerPage(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>of {complaints.length} complaints</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick View Modal */}
      <Dialog
        open={!!quickViewComplaint}
        onOpenChange={() => setQuickViewComplaint(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="font-mono text-primary">
                {quickViewComplaint?.id}
              </span>
              {quickViewComplaint && (
                <Badge
                  className={
                    getStatusConfig(quickViewComplaint.status).className
                  }
                >
                  {getStatusConfig(quickViewComplaint.status).label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {quickViewComplaint && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">
                  {quickViewComplaint.title}
                </h3>
                <p className="text-muted-foreground mt-2">
                  {quickViewComplaint.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <Badge
                    variant="secondary"
                    className={getCategoryColor(quickViewComplaint.category)}
                  >
                    {quickViewComplaint.category}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`w-2 h-2 rounded-full ${getPriorityConfig(quickViewComplaint.priority).dotClass}`}
                    />
                    <span
                      className={
                        getPriorityConfig(quickViewComplaint.priority).textClass
                      }
                    >
                      {getPriorityConfig(quickViewComplaint.priority).label}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Citizen</p>
                  <p className="font-medium">
                    {quickViewComplaint.citizenName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {quickViewComplaint.citizenEmail}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">
                    {quickViewComplaint.department || "Unassigned"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Filed Date</p>
                  <p className="font-medium">
                    {formatDate(quickViewComplaint.filedDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">
                    {formatDate(quickViewComplaint.lastUpdated)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Complaint
                </Button>
                <Button variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Assign
                </Button>
                <Button variant="outline" className="gap-2">
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
