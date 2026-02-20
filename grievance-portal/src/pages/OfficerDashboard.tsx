import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ClipboardList, Clock, CheckCircle, Timer, AlertTriangle, TrendingUp,
  TrendingDown, Eye, MessageSquare, RefreshCw, FileText, Users, Bell, Loader2,
  Building2, ArrowRight, AlertCircle, User, Activity, LogOut,
} from "lucide-react";
import officerService from "@/services/officerService";
import authService from "@/services/authService";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import GovernmentTopStrip from "@/components/GovernmentTopStrip";
import ComplianceInfoBlock from "@/components/ComplianceInfoBlock";

const OfficerDashboard = () => {
  const { t, language, setLanguage, getLanguageLabel } = useLanguage();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // API data states
  const [statsData, setStatsData] = useState<any[]>([]);
  const [highPriorityComplaints, setHighPriorityComplaints] = useState<any[]>([]);
  const [allComplaints, setAllComplaints] = useState<any[]>([]);
  const [departmentQueueComplaints, setDepartmentQueueComplaints] = useState<any[]>([]);
  const [teamActivity, setTeamActivity] = useState<any[]>([]);
  const [officerInfo, setOfficerInfo] = useState<{ department?: { name?: string; code?: string } } | null>(null);
  const [claimingComplaintId, setClaimingComplaintId] = useState<string | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // User data (from localStorage or context)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const officerData = {
    name: user.name || t("officer.officer", "Officer"),
    department: officerInfo?.department?.name || user.department?.name || t("officer.department", "Department"),
    departmentCode: officerInfo?.department?.code || user.department?.code || "DEPT",
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const refreshTimer = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(refreshTimer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard stats
      const dashRes = await officerService.getDashboardStats();
      const { stats, highPriorityComplaints: hpComplaints, recentActivity, officer } = dashRes;
      setOfficerInfo(officer || null);

      // Map stats to cards
      setStatsData([
        {
          title: t("officer.stats.assigned", "Assigned to Me"),
          value: stats.totalAssigned.toString(),
          icon: ClipboardList,
          trend: stats.totalTrend || "+0",
          trendUp: stats.totalTrendUp ?? true,
          subtitle: t("officer.stats.assignedSub", "Total active"),
          color: "text-primary",
          bgColor: "bg-primary/10",
        },
        {
          title: t("officer.stats.pending", "Pending Action"),
          value: stats.pendingAction.toString(),
          icon: Clock,
          trend: stats.pendingTrend || "+0",
          trendUp: stats.pendingTrendUp ?? true,
          subtitle: t("officer.stats.pendingSub", "Needs attention"),
          color: "text-orange-600",
          bgColor: "bg-orange-50",
        },
        {
          title: t("officer.stats.resolvedToday", "Resolved Today"),
          value: stats.resolvedToday.toString(),
          icon: CheckCircle,
          trend: stats.resolvedTrend || "+0",
          trendUp: stats.resolvedTrendUp ?? true,
          subtitle: t("officer.stats.resolvedSub", "Resolved cases"),
          color: "text-green-600",
          bgColor: "bg-green-50",
        },
        {
          title: t("officer.stats.avgResponse", "Avg Response Time (7d)"),
          value: stats.avgResponseTime || "0.0h",
          icon: Timer,
          trend: stats.responseTrend || "+0.0h",
          trendUp: stats.responseTrendUp ?? true,
          subtitle: t("officer.stats.avgResponseSub", "Vs previous 7 days"),
          color: "text-purple-600",
          bgColor: "bg-purple-50",
        },
      ]);

      // Map high priority complaints
      setHighPriorityComplaints(
        (hpComplaints || []).map((c: any) => {
          const mapped = {
            id: c.complaintId,
            _id: c._id,
            title: c.title,
            priority: c.priority === "critical"
              ? t("officer.priority.critical", "Critical")
              : t("officer.priority.high", "High"),
            rawPriority: c.priority,
            createdAt: c.createdAt,
            estimatedResolution: c.estimatedResolution,
            filedDate: new Date(c.createdAt).toLocaleDateString(),
            category: c.category || t("officer.general", "General"),
          };
          const dueDate = getDueDate(mapped);
          const hours = dueDate ? getHoursRemaining(dueDate) : 0;
          const roundedHours = hours >= 0 ? Math.ceil(hours) : -Math.ceil(Math.abs(hours));
          return {
            ...mapped,
            slaHoursRemaining: roundedHours,
          };
        })
      );

      // Fetch full complaint list
      const complaintsRes = await officerService.getMyComplaints({ limit: 20 });
      setAllComplaints(
        (complaintsRes.complaints || []).map((c: any) => ({
          id: c.complaintId,
          _id: c._id,
          title: c.title,
          status: capitalizeStatus(c.status),
          rawStatus: c.status,
          priority: capitalizeFirst(c.priority),
          rawPriority: c.priority,
          createdAt: c.createdAt,
          estimatedResolution: c.estimatedResolution,
          date: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        }))
      );

      const queueRes = await officerService.getDepartmentQueue({ limit: 20 });
      const officerDepartmentName =
        (officer?.department?.name || user.department?.name || "").toLowerCase();
      const queueMapped = (queueRes?.data?.complaints || []).map((c: any) => ({
        id: c.complaintId,
        _id: c._id,
        title: c.title,
        category: c.category,
        priority: capitalizeFirst(c.priority || "medium"),
        status: capitalizeStatus(c.status),
        departmentName: c.department?.name || c.departmentName || "",
        date: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      }));
      const queueFiltered = officerDepartmentName
        ? queueMapped.filter((c: any) => {
            const dept = String(c.departmentName || "").toLowerCase();
            return !dept || dept === officerDepartmentName;
          })
        : queueMapped;
      setDepartmentQueueComplaints(queueFiltered);

      // Map recent activity
      setTeamActivity(
        (recentActivity || []).map((a: any) => ({
          officer: a.officer || "Officer",
          action: mapActionStatus(a.action),
          complaintId: a.complaintId,
          time: formatTimeAgo(a.time),
          color: getActivityColor(a.action),
        }))
      );

    } catch (error: any) {
      toast.error(error.response?.data?.message || t("officer.errorLoad", "Failed to load dashboard"));
    } finally {
      // no-op
    }
  };

  const capitalizeStatus = (status: string) => {
    const map: Record<string, string> = {
      filed: t("officer.status.pending", "Pending"),
      pending: t("officer.status.pending", "Pending"),
      assigned: t("officer.status.assigned", "Assigned"),
      "in-progress": t("officer.status.inProgress", "In Progress"),
      in_progress: t("officer.status.inProgress", "In Progress"),
      resolved: t("officer.status.resolved", "Resolved"),
      rejected: t("officer.status.rejected", "Rejected"),
    };
    return map[status] || status;
  };

  const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const mapActionStatus = (action: string) => {
    const map: Record<string, string> = {
      'resolved': 'resolved',
      'in-progress': 'inspected',
      'assigned': 'updated status of',
      'rejected': 'escalated',
    };
    return map[action] || 'updated';
  };

  const getActivityColor = (action: string) => {
    const map: Record<string, string> = {
      'resolved': 'bg-green-500',
      'in-progress': 'bg-primary/100',
      'assigned': 'bg-purple-500',
      'rejected': 'bg-red-500',
    };
    return map[action] || 'bg-gray-500';
  };

  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t("officer.time.justNow", "Just now");
    if (diffMins < 60) return `${diffMins} ${t("officer.time.minsAgo", "mins ago")}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} ${t("officer.time.hoursAgo", "hours ago")}`;
    }
    return then.toLocaleDateString();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const getSLAColor = (hours: number) => {
    if (hours <= 4) return "text-red-600 bg-red-50";
    if (hours <= 12) return "text-orange-600 bg-orange-50";
    return "text-green-600 bg-green-50";
  };

  const getSLAUrgency = (hours: number) => {
    if (hours <= 0) return t("officer.sla.breached", "BREACHED");
    if (hours <= 4) return t("officer.sla.urgent", "URGENT");
    if (hours <= 12) return t("officer.sla.warning", "Warning");
    return t("officer.sla.onTrack", "On Track");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "Assigned": return "bg-blue-100 text-blue-800";
      case "In Progress": return "bg-primary/15 text-primary";
      case "Need Review": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "bg-red-500";
      case "High": return "bg-orange-500";
      case "Medium": return "bg-yellow-500";
      default: return "bg-green-500";
    }
  };

  const pendingComplaints = allComplaints.filter(c => c.status === "Pending");
  const inProgressComplaints = allComplaints.filter(c => c.status === "In Progress");
  const reviewComplaints = allComplaints.filter(
    (c) => c.status === "Assigned" || c.status === "Need Review",
  );
  const notificationCount = highPriorityComplaints.length;

  const getSlaHoursByPriority = (priority?: string) => {
    const p = String(priority || "").toLowerCase();
    if (p === "critical") return 4;
    if (p === "high") return 24;
    if (p === "medium") return 72;
    return 168;
  };

  const getDueDate = (complaint: any) => {
    if (complaint?.estimatedResolution) {
      const byEstimate = new Date(complaint.estimatedResolution);
      if (!Number.isNaN(byEstimate.getTime())) return byEstimate;
    }
    if (complaint?.createdAt) {
      const created = new Date(complaint.createdAt);
      if (!Number.isNaN(created.getTime())) {
        return new Date(created.getTime() + getSlaHoursByPriority(complaint.rawPriority || complaint.priority) * 60 * 60 * 1000);
      }
    }
    return null;
  };

  const getHoursRemaining = (dueDate: Date) => {
    return (dueDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
  };

  const slaAlerts = useMemo(() => {
    const activeComplaints = allComplaints.filter((c: any) => {
      const s = String(c.rawStatus || c.status || "").toLowerCase();
      return s !== "resolved" && s !== "rejected";
    });

    const evaluated = activeComplaints
      .map((c: any) => {
        const dueDate = getDueDate(c);
        if (!dueDate) return null;
        const hoursRemaining = getHoursRemaining(dueDate);
        return { ...c, dueDate, hoursRemaining };
      })
      .filter(Boolean) as Array<any>;

    const breached = evaluated
      .filter((c) => c.hoursRemaining <= 0)
      .sort((a, b) => a.hoursRemaining - b.hoursRemaining);
    const near = evaluated
      .filter((c) => c.hoursRemaining > 0 && c.hoursRemaining <= 4)
      .sort((a, b) => a.hoursRemaining - b.hoursRemaining);

    return { breached, near };
  }, [allComplaints, currentTime]);

  const handleBellClick = () => {
    const alertsEl = document.getElementById("sla-alerts");
    if (alertsEl) {
      alertsEl.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const activityEl = document.getElementById("department-activity");
    if (activityEl) {
      activityEl.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    toast.info(t("officer.noRecentActivity", "No recent activity"));
  };

  const handleGenerateMyReport = () => {
    const rows = allComplaints.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      priority: c.priority,
      date: c.date,
    }));

    if (rows.length === 0) {
      toast.info(t("officer.toast.noAssignedForReport", "No assigned complaints available to generate report."));
      return;
    }

    const headers = ["Complaint ID", "Title", "Status", "Priority", "Date"];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        [row.id, row.title, row.status, row.priority, row.date]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `officer-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t("officer.toast.reportGenerated", "Officer report generated"));
  };

  const handleTeamPerformanceClick = () => {
    const el = document.getElementById("department-activity");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    toast.info(t("officer.toast.teamSectionUnavailable", "Team performance section not available."));
  };

  const handleViewAllActivity = () => {
    setIsActivityModalOpen(true);
  };

  const handleOpenActivityComplaint = (publicComplaintId?: string) => {
    if (!publicComplaintId) return;
    const merged = [
      ...allComplaints,
      ...highPriorityComplaints,
      ...departmentQueueComplaints,
    ];
    const matched = merged.find(
      (item: any) =>
        item.id === publicComplaintId || item.complaintId === publicComplaintId,
    );

    if (matched?._id) {
      navigate(`/officer/update-status?complaintId=${matched._id}`);
      return;
    }

    navigate(`/track-complaint?complaintId=${publicComplaintId}`);
  };

  const handleRefreshDashboard = async () => {
    try {
      setIsRefreshing(true);
      await fetchDashboardData();
      toast.success(t("officer.toast.activityRefreshed", "Activity refreshed"));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewAllAlerts = () => {
    setIsAlertsModalOpen(true);
  };

  const handleOpenProfile = () => {
    navigate("/profile");
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      navigate("/login");
    }
  };

  const handleOpenAlertComplaint = (complaint: any) => {
    if (!complaint?._id) return;
    navigate(`/officer/update-status?complaintId=${complaint._id}`);
    setIsAlertsModalOpen(false);
  };

  const handleClaimComplaint = async (complaintId: string) => {
    try {
      setClaimingComplaintId(complaintId);
      await officerService.claimComplaint(complaintId);
      toast.success(t("officer.claim.success", "Complaint claimed successfully"));
      await fetchDashboardData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          t("officer.claim.error", "Failed to claim complaint"),
      );
    } finally {
      setClaimingComplaintId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div id="main-content" className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-lg overflow-hidden border border-slate-300">
          <GovernmentTopStrip
            rightLabel={t("officer.officialWorkspace", "Official Officer Workspace")}
          />
        </div>

        <div className="rounded-lg border border-slate-300 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">
            {t("officer.officialWorkspace", "Official Officer Workspace")}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {t(
              "officer.officialWorkspaceNote",
              "All actions are recorded for audit and departmental review. Use factual and complete remarks in every update.",
            )}
          </p>
        </div>
        <ComplianceInfoBlock
          source={t("compliance.officer.source", "Department complaint queue and officer activity records")}
          lastSync={new Date().toLocaleString("en-IN")}
          auditReference={t("compliance.officer.auditRef", "OFF-DASHBOARD")}
          retentionNotice={t("compliance.officer.retention", "All officer actions and status updates are retained for departmental audit review.")}
        />

        {/* Welcome Header */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {t("officer.dashboardTitle", "Officer Grievance Dashboard")}
                </h1>
                <p className="mt-1 text-sm text-slate-600">{officerData.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
                    <Building2 className="w-3 h-3 mr-1" />{officerData.department}
                  </Badge>
                  <Badge variant="outline" className="border-border text-foreground">
                    {officerData.departmentCode}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 md:max-w-[58%]">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "hi" | "ur")}
                className="h-9 rounded border border-input bg-background px-2 text-sm text-foreground"
                aria-label={t("nav.language")}
              >
                <option value="en">{getLanguageLabel("en")}</option>
                <option value="hi">{getLanguageLabel("hi")}</option>
                <option value="ur">{getLanguageLabel("ur")}</option>
              </select>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleOpenProfile}
              >
                <User className="w-4 h-4" />
                {t("nav.profile", "Profile")}
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-red-700 border-red-200 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                {t("nav.logout", "Logout")}
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  className="border-border"
                  onClick={handleBellClick}
                  aria-label={t("officer.aria.openAlerts", "Open alerts")}
                >
                  <Bell className="w-5 h-5" />
                </Button>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </div>
              <div className="order-last w-full text-right sm:w-auto sm:ml-auto">
                <p className="text-slate-600 text-sm">{formatDate(currentTime)}</p>
                <p className="text-2xl font-mono font-bold text-slate-900">{formatTime(currentTime)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              const el = document.getElementById("department-queue");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <Eye className="w-4 h-4" />{t("officer.queue.title", "Department Queue")}
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleGenerateMyReport}><FileText className="w-4 h-4" />{t("officer.quick.report", "Generate Official Report")}</Button>
          <Button variant="outline" className="gap-2" onClick={handleTeamPerformanceClick}><Users className="w-4 h-4" />{t("officer.quick.team", "Department Performance")}</Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${stat.trendUp ? "text-green-600" : "text-red-600"}`}>
                    {stat.trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {stat.trend}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm font-medium text-foreground mt-1">{stat.title}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Priority Inbox */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <CardTitle className="text-lg">{t("officer.highPriority", "High Priority Complaints")}</CardTitle>
                  <Badge variant="destructive">{highPriorityComplaints.length}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    const el = document.getElementById("assigned-complaints");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {t("common.viewAll", "View All")} <ArrowRight className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {highPriorityComplaints.map(complaint => (
                  <div key={complaint._id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/officer/update-status?complaintId=${complaint._id}`)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-primary">{complaint.id}</span>
                          <Badge variant={complaint.priority === "Critical" ? "destructive" : "default"} className={complaint.priority === "High" ? "bg-orange-500 hover:bg-orange-600" : ""}>
                            {complaint.priority}
                          </Badge>
                          <Badge variant="outline">{complaint.category}</Badge>
                        </div>
                        <p className="font-medium text-foreground truncate">{complaint.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("officer.filed", "Filed")}: {complaint.filedDate}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSLAColor(complaint.slaHoursRemaining)}`}>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {Math.abs(complaint.slaHoursRemaining)}h{" "}
                              {complaint.slaHoursRemaining <= 0
                                ? t("officer.overdue", "overdue")
                                : t("officer.left", "left")}
                            </span>
                          </div>
                          <p className="text-xs text-center">{getSLAUrgency(complaint.slaHoursRemaining)}</p>
                        </div>
                        <Button size="sm" className="gap-1">{t("officer.takeAction", "Take Action")} <ArrowRight className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
                {highPriorityComplaints.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    {t("officer.noHighPriority", "No high priority complaints")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* My Assigned Complaints */}
            <Card id="department-queue">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  {t("officer.queue.title", "Department Queue")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {departmentQueueComplaints.map((complaint) => (
                  <div
                    key={complaint._id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-primary">{complaint.id}</span>
                          <Badge variant="outline">{complaint.category}</Badge>
                          <Badge className={getStatusColor(complaint.status)} variant="secondary">
                            {complaint.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground mt-1">{complaint.title}</p>
                        <p className="text-xs text-muted-foreground">{complaint.date}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleClaimComplaint(complaint._id)}
                        disabled={claimingComplaintId === complaint._id}
                      >
                        {claimingComplaintId === complaint._id ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t("common.loading", "Loading")}
                          </span>
                        ) : (
                          t("officer.queue.claim", "Claim")
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
                {departmentQueueComplaints.length === 0 && (
                  <p className="text-center py-6 text-muted-foreground">
                    {t("officer.queue.empty", "No complaints waiting in your department queue")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* My Assigned Complaints */}
            <Card id="assigned-complaints">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />{t("officer.myAssigned", "My Assigned Complaints")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-md bg-slate-100 p-1 sm:grid-cols-4">
                    <TabsTrigger value="all" className="h-9 gap-1 rounded text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-none">{t("common.all", "All")}<Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[11px]">{allComplaints.length}</Badge></TabsTrigger>
                    <TabsTrigger value="pending" className="h-9 gap-1 rounded text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-none">{t("officer.status.pending", "Pending")}<Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[11px]">{pendingComplaints.length}</Badge></TabsTrigger>
                    <TabsTrigger value="progress" className="h-9 gap-1 rounded text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-none">{t("officer.status.inProgress", "In Progress")}<Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[11px]">{inProgressComplaints.length}</Badge></TabsTrigger>
                    <TabsTrigger value="review" className="h-9 gap-1 rounded text-sm whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-none">{t("officer.review", "Review")}<Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[11px]">{reviewComplaints.length}</Badge></TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-4 space-y-3">{allComplaints.map(c => <ComplaintCard key={c._id} complaint={c} navigate={navigate} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />)}</TabsContent>
                  <TabsContent value="pending" className="mt-4 space-y-3">{pendingComplaints.map(c => <ComplaintCard key={c._id} complaint={c} navigate={navigate} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />)}</TabsContent>
                  <TabsContent value="progress" className="mt-4 space-y-3">{inProgressComplaints.map(c => <ComplaintCard key={c._id} complaint={c} navigate={navigate} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />)}</TabsContent>
                  <TabsContent value="review" className="mt-4 space-y-3">{reviewComplaints.map(c => <ComplaintCard key={c._id} complaint={c} navigate={navigate} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />)}</TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Department Activity */}
          <div className="space-y-6">
            <Card id="department-activity">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5" />{t("officer.departmentActivity", "Department Activity")}</CardTitle>
                <Button variant="ghost" size="icon" onClick={handleRefreshDashboard} disabled={isRefreshing} aria-label={t("officer.aria.refreshActivity", "Refresh department activity")}>
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamActivity.map((activity, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="relative">
                        <div className={`w-3 h-3 rounded-full ${activity.color} mt-1.5`} />
                        {index < teamActivity.length - 1 && <div className="absolute left-1.5 top-4 bottom-0 w-px bg-border -translate-x-1/2 h-full" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm"><span className="font-medium">{activity.officer}</span> <span className="text-muted-foreground">{activity.action}</span> <button type="button" className="text-primary hover:underline font-mono text-xs" onClick={() => handleOpenActivityComplaint(activity.complaintId)} aria-label={t("officer.aria.openComplaint", "Open complaint details")}>#{activity.complaintId?.split("-").pop()}</button></p>
                        <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                  {teamActivity.length === 0 && <p className="text-center py-4 text-muted-foreground">{t("officer.noRecentActivity", "No recent activity")}</p>}
                </div>
                <Button variant="outline" className="w-full mt-4" size="sm" onClick={handleViewAllActivity}>{t("officer.viewAllActivity", "View All Activity")}</Button>
              </CardContent>
            </Card>

            {/* SLA Alerts */}
            <Card id="sla-alerts" className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700"><AlertCircle className="w-5 h-5" />{t("officer.slaAlerts", "SLA Alerts")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-red-100 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">
                      {t("officer.sla.breachedCount", "{count} complaints breaching SLA").replace("{count}", String(slaAlerts.breached.length))}
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    {slaAlerts.breached.length > 0
                      ? t("officer.sla.oldestOverdue", "Immediate action required. Oldest overdue: {hours}h.").replace("{hours}", String(Math.abs(Math.round(slaAlerts.breached[0].hoursRemaining))))
                      : t("officer.sla.noneBreached", "No breached complaints right now.")}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">
                      {t("officer.sla.nearCount", "{count} complaints near SLA").replace("{count}", String(slaAlerts.near.length))}
                    </span>
                  </div>
                  <p className="text-xs text-orange-600 mt-1">
                    {slaAlerts.near.length > 0
                      ? t("officer.sla.nextDue", "Next due in {hours}h.").replace("{hours}", String(Math.max(1, Math.ceil(slaAlerts.near[0].hoursRemaining))))
                      : t("officer.sla.noneNear", "No near-SLA complaints right now.")}
                  </p>
                </div>
                <Button variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-100" size="sm" onClick={handleViewAllAlerts}>{t("officer.viewAllAlerts", "View All Alerts")}</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isActivityModalOpen} onOpenChange={setIsActivityModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("officer.departmentActivity", "Department Activity")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {teamActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("officer.noRecentActivity", "No recent activity")}</p>
            ) : (
              teamActivity.map((activity, index) => (
                <div key={`${activity.complaintId}-${index}`} className="rounded border p-3">
                  <p className="text-sm">
                    <span className="font-medium">{activity.officer}</span>{" "}
                    <span className="text-muted-foreground">{activity.action}</span>{" "}
                    <span className="font-mono text-xs text-primary">#{activity.complaintId?.split("-").pop()}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{activity.time}</p>
                </div>
              ))
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="outline" onClick={handleRefreshDashboard} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {t("common.refresh", "Refresh")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAlertsModalOpen} onOpenChange={setIsAlertsModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("officer.slaAlerts", "SLA Alerts")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left">
                  <th className="px-2 py-2">{t("officer.alert.table.id", "Complaint ID")}</th>
                  <th className="px-2 py-2">{t("officer.alert.table.title", "Title")}</th>
                  <th className="px-2 py-2">{t("officer.alert.table.priority", "Priority")}</th>
                  <th className="px-2 py-2">{t("officer.alert.table.status", "Status")}</th>
                  <th className="px-2 py-2">{t("officer.alert.table.sla", "SLA")}</th>
                  <th className="px-2 py-2">{t("officer.alert.table.action", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {[...slaAlerts.breached, ...slaAlerts.near].map((c: any) => (
                  <tr key={`${c._id}-${c.id}`} className="border-b">
                    <td className="px-2 py-2 font-mono text-xs text-primary">{c.id}</td>
                    <td className="px-2 py-2">{c.title}</td>
                    <td className="px-2 py-2">{c.priority}</td>
                    <td className="px-2 py-2">{c.status}</td>
                    <td className="px-2 py-2">
                      {c.hoursRemaining <= 0
                        ? t("officer.alert.overdueHours", "{hours}h overdue").replace("{hours}", String(Math.abs(Math.round(c.hoursRemaining))))
                        : t("officer.alert.leftHours", "{hours}h left").replace("{hours}", String(Math.ceil(c.hoursRemaining)))}
                    </td>
                    <td className="px-2 py-2">
                      <Button size="sm" variant="outline" onClick={() => handleOpenAlertComplaint(c)}>
                        {t("officer.takeAction", "Take Action")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {slaAlerts.breached.length + slaAlerts.near.length === 0 && (
              <p className="py-6 text-center text-muted-foreground">
                {t("officer.alert.none", "No active SLA alerts at the moment.")}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="mx-auto mt-4 max-w-7xl text-xs text-slate-600">
        {t(
          "officer.auditNotice",
          "Official use only. Unauthorized disclosure of complaint data is prohibited under departmental policy.",
        )}
      </div>
    </div>
  );
};

// Complaint Card Component
const ComplaintCard = ({ complaint, navigate, getStatusColor, getPriorityColor }: any) => {
  const { t } = useLanguage();
  const openComplaint = () => {
    navigate(`/officer/update-status?complaintId=${complaint._id}`);
  };
  const refreshComplaint = () => {
    toast.info(t("officer.toast.refreshingComplaint", "Refreshing complaint details..."));
    openComplaint();
  };
  const openComplaintNotes = () => {
    openComplaint();
  };

  return (
    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={openComplaint}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${getPriorityColor(complaint.priority)}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-primary">{complaint.id}</span>
              <Badge className={getStatusColor(complaint.status)} variant="secondary">{complaint.status}</Badge>
            </div>
            <p className="text-sm text-foreground mt-0.5">{complaint.title}</p>
            <p className="text-xs text-muted-foreground">{complaint.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("officer.aria.openComplaint", "Open complaint details")} onClick={e => { e.stopPropagation(); openComplaint(); }}><Eye className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("officer.aria.refreshComplaint", "Refresh complaint")} onClick={e => { e.stopPropagation(); refreshComplaint(); }}><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("officer.aria.openNotes", "Open complaint notes")} onClick={e => { e.stopPropagation(); openComplaintNotes(); }}><MessageSquare className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboard;

