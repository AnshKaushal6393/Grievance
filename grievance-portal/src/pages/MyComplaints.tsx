import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Calendar,
  ArrowUpDown,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileX2,
  History,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import complaintService from "@/services/complaintService";
import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";

interface Complaint {
  dbId: string;
  id: string;
  title: string;
  category: string;
  status: "pending" | "in-progress" | "resolved" | "rejected";
  priority: "low" | "medium" | "high";
  filedDate: string;
  lastUpdated: string;
  description: string;
  feedbackRating?: number;
  feedbackComment?: string;
}

const MyComplaints = () => {
  const { t } = useLanguage();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [historyComplaintId, setHistoryComplaintId] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null,
  );

  useEffect(() => {
    fetchComplaints();
  }, [
    statusFilter,
    categoryFilter,
    searchQuery,
    sortBy,
    dateRange,
    currentPage,
    itemsPerPage,
  ]);

  // Sample complaints data
  //   const allComplaints: Complaint[] = [
  //     {
  //       id: "GR2024001234",
  //       title: "Road repair needed on Main Street",
  //       category: "Roads",
  //       status: "in-progress",
  //       priority: "high",
  //       filedDate: "2024-01-15",
  //       lastUpdated: "2024-01-18",
  //       description: "Large potholes causing traffic issues",
  //     },
  //     {
  //       id: "GR2024001235",
  //       title: "Street light not working",
  //       category: "Electricity",
  //       status: "pending",
  //       priority: "medium",
  //       filedDate: "2024-01-14",
  //       lastUpdated: "2024-01-14",
  //       description: "Street light pole #45 is not functioning",
  //     },
  //     {
  //       id: "GR2024001236",
  //       title: "Water supply disruption",
  //       category: "Water",
  //       status: "resolved",
  //       priority: "high",
  //       filedDate: "2024-01-10",
  //       lastUpdated: "2024-01-16",
  //       description: "No water supply for the past 3 days",
  //     },
  //     {
  //       id: "GR2024001237",
  //       title: "Garbage collection missed",
  //       category: "Sanitation",
  //       status: "resolved",
  //       priority: "low",
  //       filedDate: "2024-01-08",
  //       lastUpdated: "2024-01-12",
  //       description: "Garbage not collected for a week",
  //     },
  //     {
  //       id: "GR2024001238",
  //       title: "Drainage system blocked",
  //       category: "Sanitation",
  //       status: "pending",
  //       priority: "high",
  //       filedDate: "2024-01-05",
  //       lastUpdated: "2024-01-05",
  //       description: "Sewage overflow on residential street",
  //     },
  //     {
  //       id: "GR2024001239",
  //       title: "Illegal construction noise",
  //       category: "Other",
  //       status: "rejected",
  //       priority: "medium",
  //       filedDate: "2024-01-03",
  //       lastUpdated: "2024-01-06",
  //       description: "Construction work happening during night hours",
  //     },
  //     {
  //       id: "GR2024001240",
  //       title: "Broken park bench",
  //       category: "Other",
  //       status: "in-progress",
  //       priority: "low",
  //       filedDate: "2024-01-02",
  //       lastUpdated: "2024-01-10",
  //       description: "Park bench at Central Park needs repair",
  //     },
  //     {
  //       id: "GR2024001241",
  //       title: "Traffic signal malfunction",
  //       category: "Roads",
  //       status: "resolved",
  //       priority: "high",
  //       filedDate: "2024-01-01",
  //       lastUpdated: "2024-01-04",
  //       description: "Traffic light at intersection not working properly",
  //     },
  //   ];
  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const statusParam =
        statusFilter === "pending"
          ? "filed"
          : statusFilter === "in-progress"
            ? "in_progress"
            : statusFilter;
      const response = await complaintService.getMyComplaints({
        status: statusParam,
        category: categoryFilter,
        search: searchQuery,
        sortBy: sortBy,
        fromDate: dateRange.from,
        toDate: dateRange.to,
        page: currentPage,
        limit: itemsPerPage,
      });
      const payload = response?.data?.complaints
        ? response.data
        : response?.data?.data
          ? response.data.data
          : {};
      const mapped = (payload?.complaints || []).map((c: any) => ({
        dbId: c._id,
        id: c.complaintId || c._id,
        title: c.title,
        category: c.category,
        status:
          c.status === "filed"
            ? "pending"
            : c.status === "in_progress"
              ? "in-progress"
              : c.status === "assigned"
                ? "in-progress"
                : c.status || "pending",
        priority: c.priority || "medium",
        filedDate: c.createdAt,
        lastUpdated: c.updatedAt || c.createdAt,
        description: c.description || "",
        feedbackRating: c.feedback?.rating || 0,
        feedbackComment: c.feedback?.comment || "",
      }));
      // fallback to server-side stats/pagination if needed later
      setComplaints(mapped);
    } catch (error) {
        toast.error(t("myComplaints.errorFetch", "Failed to fetch complaints"));
    } finally{
        setIsLoading(false);
    }
  };

  const openHistory = async (complaint: Complaint) => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryComplaintId(complaint.id);
    try {
      const response = await complaintService.getComplaintHistory(complaint.dbId);
      setHistoryEvents(response?.data?.history || []);
    } catch (error) {
      toast.error(
        t("myComplaints.errorFetchHistory", "Failed to fetch complaint history"),
      );
      setHistoryEvents([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openFeedback = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setFeedbackRating(complaint.feedbackRating || 0);
    setFeedbackComment(complaint.feedbackComment || "");
    setFeedbackOpen(true);
  };

  const handleSubmitFeedback = async () => {
    if (!selectedComplaint) return;
    if (feedbackRating < 1 || feedbackRating > 5) {
      toast.error(
        t("myComplaints.errorSelectRating", "Please select a rating between 1 and 5"),
      );
      return;
    }

    setFeedbackSubmitting(true);
    try {
      await complaintService.submitFeedback(
        selectedComplaint.dbId,
        feedbackRating,
        feedbackComment,
      );
      toast.success(
        t("myComplaints.feedbackSubmitted", "Feedback submitted successfully"),
      );
      setFeedbackOpen(false);
      fetchComplaints();
    } catch (error: any) {
      toast.error(
        error?.message || t("myComplaints.errorSubmitFeedback", "Failed to submit feedback"),
      );
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const categories = [
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: t("myComplaints.status.pending", "Pending"),
          icon: Clock,
          className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        };
      case "in-progress":
        return {
          label: t("myComplaints.status.inProgress", "In Progress"),
          icon: Loader2,
          className: "bg-primary/15 text-primary border-primary/30",
        };
      case "resolved":
        return {
          label: t("myComplaints.status.resolved", "Resolved"),
          icon: CheckCircle2,
          className: "bg-green-100 text-green-800 border-green-200",
        };
      case "rejected":
        return {
          label: t("myComplaints.status.rejected", "Rejected"),
          icon: XCircle,
          className: "bg-red-100 text-red-800 border-red-200",
        };
      default:
        return {
          label: status,
          icon: AlertCircle,
          className: "bg-gray-100 text-gray-800 border-gray-200",
        };
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Roads & Infrastructure": "bg-orange-100 text-orange-800",
      "Water Supply": "bg-cyan-100 text-cyan-800",
      Electricity: "bg-amber-100 text-amber-800",
      "Sanitation & Garbage": "bg-emerald-100 text-emerald-800",
      "Drainage & Sewage": "bg-lime-100 text-lime-800",
      "Street Lights": "bg-yellow-100 text-yellow-800",
      "Parks & Gardens": "bg-green-100 text-green-800",
      Pollution: "bg-red-100 text-red-800",
      Encroachment: "bg-primary/15 text-primary",
      Other: "bg-purple-100 text-purple-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getPriorityDots = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-red-500" />
          </div>
        );
      case "medium":
        return (
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full bg-gray-300" />
          </div>
        );
      case "low":
        return (
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <div className="w-2 h-2 rounded-full bg-gray-300" />
          </div>
        );
      default:
        return null;
    }
  };

  // Filter and sort complaints
  const filteredComplaints = useMemo(() => {
    let result = [...complaints];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((c) => c.category === categoryFilter);
    }

    // Date range filter
    if (dateRange.from) {
      result = result.filter((c) => new Date(c.filedDate) >= dateRange.from!);
    }
    if (dateRange.to) {
      result = result.filter((c) => new Date(c.filedDate) <= dateRange.to!);
    }

    // Sorting
    switch (sortBy) {
      case "latest":
        result.sort(
          (a, b) =>
            new Date(b.filedDate).getTime() - new Date(a.filedDate).getTime(),
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.filedDate).getTime() - new Date(b.filedDate).getTime(),
        );
        break;
      case "priority":
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        result.sort(
          (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority],
        );
        break;
    }

    return result;
  }, [complaints, searchQuery, statusFilter, categoryFilter, sortBy, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-muted/30 to-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {t("myComplaints.title", "My Complaints")}
            </h1>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {complaints.length}
            </Badge>
          </div>
          <p className="text-gray-600 mt-2">
            {t(
              "myComplaints.subtitle",
              "Track and manage all your filed complaints",
            )}
          </p>
        </motion.div>

        {/* Filters Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-4 mb-6"
        >
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder={t("myComplaints.search", "Search complaints...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-gray-200 focus:border-primary"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] rounded-xl">
                <Filter className="w-4 h-4 mr-2 text-gray-500" />
                <SelectValue placeholder={t("myComplaints.filter.status", "Status")} />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">
                  {t("myComplaints.filter.allStatus", "All Status")}
                </SelectItem>
                <SelectItem value="pending">
                  {t("myComplaints.status.pending", "Pending")}
                </SelectItem>
                <SelectItem value="in-progress">
                  {t("myComplaints.status.inProgress", "In Progress")}
                </SelectItem>
                <SelectItem value="resolved">
                  {t("myComplaints.status.resolved", "Resolved")}
                </SelectItem>
                <SelectItem value="rejected">
                  {t("myComplaints.status.rejected", "Rejected")}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] rounded-xl">
                <SelectValue placeholder={t("myComplaints.filter.category", "Category")} />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">
                  {t("myComplaints.filter.allCategories", "All Categories")}
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-xl">
                  <Calendar className="w-4 h-4 mr-2" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd")} -{" "}
                        {format(dateRange.to, "LLL dd")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    t("myComplaints.filter.dateRange", "Date Range")
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 bg-white z-50"
                align="start"
              >
                <CalendarComponent
                  initialFocus
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) =>
                    setDateRange({ from: range?.from, to: range?.to })
                  }
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] rounded-xl">
                <ArrowUpDown className="w-4 h-4 mr-2 text-gray-500" />
                <SelectValue placeholder={t("myComplaints.filter.sort", "Sort")} />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="latest">
                  {t("myComplaints.sort.latest", "Latest")}
                </SelectItem>
                <SelectItem value="oldest">
                  {t("myComplaints.sort.oldest", "Oldest")}
                </SelectItem>
                <SelectItem value="priority">
                  {t("myComplaints.sort.priority", "Priority")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Complaints List */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-12"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </motion.div>
          ) : paginatedComplaints.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {paginatedComplaints.map((complaint, index) => {
                const statusConfig = getStatusConfig(complaint.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <motion.div
                    key={complaint.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="group hover:shadow-xl transition-all duration-300 rounded-2xl border-0 shadow-md overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-6">
                          {/* Left Section - ID and Title */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-mono text-primary bg-primary/10 px-2 py-1 rounded-lg">
                                {complaint.id}
                              </span>
                              <Badge
                                className={cn(
                                  "text-xs",
                                  getCategoryColor(complaint.category),
                                )}
                              >
                                {complaint.category}
                              </Badge>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate group-hover:text-primary transition-colors">
                              {complaint.title}
                            </h3>
                            <p className="text-sm text-gray-500 line-clamp-1">
                              {complaint.description}
                            </p>
                          </div>

                          {/* Middle Section - Status and Priority */}
                          <div className="flex items-center gap-6 lg:gap-8">
                            {/* Status */}
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1",
                                  statusConfig.className,
                                )}
                              >
                                <StatusIcon
                                  className={cn(
                                    "w-3.5 h-3.5",
                                    complaint.status === "in-progress" &&
                                      "animate-spin",
                                  )}
                                />
                                {statusConfig.label}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {t("myComplaints.statusLabel", "Status")}
                              </span>
                            </div>

                            {/* Priority */}
                            <div className="flex flex-col items-center gap-1">
                              {getPriorityDots(complaint.priority)}
                              <span className="text-xs text-gray-500 capitalize">
                                {complaint.priority}
                              </span>
                            </div>

                            {/* Dates */}
                            <div className="hidden md:flex flex-col gap-1 text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <FileText className="w-4 h-4" />
                                <span>
                                  {t("myComplaints.filed", "Filed")}: {formatDate(complaint.filedDate)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {t("myComplaints.updated", "Updated")}: {formatDate(complaint.lastUpdated)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right Section - Action Button */}
                          <div className="lg:ml-4">
                            <div className="flex flex-col lg:flex-row gap-2">
                              <Button
                                variant="outline"
                                className="w-full lg:w-auto rounded-xl"
                                onClick={() => openHistory(complaint)}
                              >
                                <History className="w-4 h-4 mr-2" />
                                {t("myComplaints.history", "History")}
                              </Button>
                              <Link to={`/track-complaint?complaintId=${complaint.id}`}>
                                <Button className="w-full lg:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-white rounded-xl shadow-md hover:shadow-lg transition-all">
                                  <Eye className="w-4 h-4 mr-2" />
                                  {t("myComplaints.viewDetails", "View Details")}
                                </Button>
                              </Link>
                              {complaint.status === "resolved" && !complaint.feedbackRating && (
                                <Button
                                  variant="secondary"
                                  className="w-full lg:w-auto rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  onClick={() => openFeedback(complaint)}
                                >
                                  <Star className="w-4 h-4 mr-2" />
                                  {t("myComplaints.rate", "Rate")}
                                </Button>
                              )}
                              {complaint.status === "resolved" &&
                                (complaint.feedbackRating || 0) > 0 && (
                                  <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1 rounded-lg">
                                    {t("myComplaints.rated", "Rated")} {complaint.feedbackRating}/5
                                  </Badge>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Mobile Dates */}
                        <div className="md:hidden px-6 pb-4 flex gap-4 text-sm text-gray-500">
                          <span>
                            {t("myComplaints.filed", "Filed")}: {formatDate(complaint.filedDate)}
                          </span>
                          <span>•</span>
                          <span>
                            {t("myComplaints.updated", "Updated")}: {formatDate(complaint.lastUpdated)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-14 bg-card rounded-2xl border border-border shadow-sm"
            >
              <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <FileX2 className="w-16 h-16 text-primary/70" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                {t("myComplaints.emptyTitle", "No complaints found")}
              </h3>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                {searchQuery ||
                statusFilter !== "all" ||
                categoryFilter !== "all"
                  ? t(
                      "myComplaints.emptyFiltered",
                      "No complaints match your current filters. Try adjusting your search criteria.",
                    )
                  : t(
                      "myComplaints.emptyDefault",
                      "You haven't filed any complaints yet. Start by filing your first complaint.",
                    )}
              </p>
              <Link to="/file-complaint-options">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-white rounded-xl px-8 py-3 shadow-lg hover:shadow-xl transition-all">
                  <Plus className="w-5 h-5 mr-2" />
                  {t("myComplaints.fileFirst", "File Your First Complaint")}
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {filteredComplaints.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-white rounded-2xl shadow-lg p-4"
          >
            {/* Items per page */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t("myComplaints.show", "Show")}</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(v) => {
                  setItemsPerPage(parseInt(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">
                {t("myComplaints.perPage", "per page")}
              </span>
            </div>

            {/* Page info */}
            <span className="text-sm text-gray-600">
              {t("myComplaints.showing", "Showing")} {(currentPage - 1) * itemsPerPage + 1} {t("myComplaints.to", "to")}{" "}
              {Math.min(currentPage * itemsPerPage, filteredComplaints.length)}{" "}
              {t("myComplaints.of", "of")} {filteredComplaints.length} {t("myComplaints.complaints", "complaints")}
            </span>

            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
                {t("myComplaints.previous", "Previous")}
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "w-9 h-9 rounded-lg",
                        currentPage === page && "bg-primary hover:bg-primary/90",
                      )}
                    >
                      {page}
                    </Button>
                  ),
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded-lg"
              >
                {t("myComplaints.next", "Next")}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </main>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>
              {t("myComplaints.historyTitle", "Complaint History")} - {historyComplaintId}
            </DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
              {historyEvents.length === 0 && (
                <p className="text-sm text-gray-500">
                  {t("myComplaints.noHistory", "No history available.")}
                </p>
              )}
              {historyEvents.map((event, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 capitalize">
                      {(event.status || t("myComplaints.updated", "updated"))
                        .replaceAll("_", " ")
                        .replaceAll("-", " ")}
                    </p>
                    <span className="text-xs text-gray-500">
                      {new Date(event.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{event.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("myComplaints.by", "By")}: {event.updatedBy || t("myComplaints.system", "System")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>{t("myComplaints.rateResolution", "Rate Resolution")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t("myComplaints.shareFeedback", "Share feedback for complaint")}{" "}
              <span className="font-medium">{selectedComplaint?.id}</span>
            </p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      "w-7 h-7",
                      star <= feedbackRating
                        ? "fill-amber-400 text-amber-500"
                        : "text-gray-300",
                    )}
                  />
                </button>
              ))}
            </div>
            <Textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder={t(
                "myComplaints.feedbackPlaceholder",
                "Optional comments about resolution quality...",
              )}
              className="min-h-28"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFeedbackOpen(false)}
              disabled={feedbackSubmitting}
            >
              {t("myComplaints.cancel", "Cancel")}
            </Button>
            <Button onClick={handleSubmitFeedback} disabled={feedbackSubmitting}>
              {feedbackSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("myComplaints.submitting", "Submitting...")}
                </>
              ) : (
                t("myComplaints.submitFeedback", "Submit Feedback")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyComplaints;
