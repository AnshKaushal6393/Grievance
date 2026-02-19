import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList, Clock, CheckCircle, Timer, AlertTriangle, TrendingUp,
  TrendingDown, Eye, MessageSquare, RefreshCw, FileText, Users, Bell, Loader2,
  Building2, ArrowRight, AlertCircle, User, Activity,
} from "lucide-react";
import officerService from "@/services/officerService";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const OfficerDashboard = () => {
  const { t, language, setLanguage, getLanguageLabel } = useLanguage();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationCount] = useState(3);
  
  // API data states
  const [statsData, setStatsData] = useState<any[]>([]);
  const [highPriorityComplaints, setHighPriorityComplaints] = useState<any[]>([]);
  const [allComplaints, setAllComplaints] = useState<any[]>([]);
  const [departmentQueueComplaints, setDepartmentQueueComplaints] = useState<any[]>([]);
  const [teamActivity, setTeamActivity] = useState<any[]>([]);
  const [officerInfo, setOfficerInfo] = useState<{ department?: { name?: string; code?: string } } | null>(null);
  const [claimingComplaintId, setClaimingComplaintId] = useState<string | null>(null);
  
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
          subtitle: t("officer.stats.resolvedSub", "Great progress!"),
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
        (hpComplaints || []).map((c: any) => ({
          id: c.complaintId,
          _id: c._id,
          title: c.title,
          priority: c.priority === 'critical'
            ? t("officer.priority.critical", "Critical")
            : t("officer.priority.high", "High"),
          filedDate: new Date(c.createdAt).toLocaleDateString(),
          slaHoursRemaining: Math.max(1, Math.floor(Math.random() * 12)), // Calculate from SLA
          category: c.category || t("officer.general", "General"),
        }))
      );

      // Fetch full complaint list
      const complaintsRes = await officerService.getMyComplaints({ limit: 20 });
      setAllComplaints(
        (complaintsRes.complaints || []).map((c: any) => ({
          id: c.complaintId,
          _id: c._id,
          title: c.title,
          status: capitalizeStatus(c.status),
          priority: capitalizeFirst(c.priority),
          date: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        }))
      );

      const queueRes = await officerService.getDepartmentQueue({ limit: 20 });
      setDepartmentQueueComplaints(
        (queueRes?.data?.complaints || []).map((c: any) => ({
          id: c.complaintId,
          _id: c._id,
          title: c.title,
          category: c.category,
          priority: capitalizeFirst(c.priority || "medium"),
          status: capitalizeStatus(c.status),
          date: new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        })),
      );

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
    if (hours <= 4) return t("officer.sla.urgent", "URGENT");
    if (hours <= 12) return t("officer.sla.warning", "Warning");
    return t("officer.sla.onTrack", "On Track");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800";
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
  const needReviewComplaints = allComplaints.filter(c => c.status === "Need Review");

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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {t("officer.welcome", "Welcome")}, {officerData.name}
                </h1>
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
            <div className="flex items-center gap-4">
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
              <div className="text-right">
                <p className="text-slate-600 text-sm">{formatDate(currentTime)}</p>
                <p className="text-2xl font-mono font-bold text-slate-900">{formatTime(currentTime)}</p>
              </div>
              <div className="relative">
                <Button variant="outline" size="icon" className="border-border">
                  <Bell className="w-5 h-5" />
                </Button>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
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
          <Button variant="outline" className="gap-2"><FileText className="w-4 h-4" />{t("officer.quick.report", "Generate My Report")}</Button>
          <Button variant="outline" className="gap-2"><Users className="w-4 h-4" />{t("officer.quick.team", "Team Performance")}</Button>
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
                            <span>{complaint.slaHoursRemaining}h {t("officer.left", "left")}</span>
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
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all" className="gap-1">{t("common.all", "All")}<Badge variant="secondary" className="ml-1">{allComplaints.length}</Badge></TabsTrigger>
                    <TabsTrigger value="pending" className="gap-1">{t("officer.status.pending", "Pending")}<Badge variant="secondary" className="ml-1">{pendingComplaints.length}</Badge></TabsTrigger>
                    <TabsTrigger value="progress" className="gap-1">{t("officer.status.inProgress", "In Progress")}<Badge variant="secondary" className="ml-1">{inProgressComplaints.length}</Badge></TabsTrigger>
                    <TabsTrigger value="review" className="gap-1">{t("officer.review", "Review")}<Badge variant="secondary" className="ml-1">{needReviewComplaints.length}</Badge></TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-4 space-y-3">{allComplaints.map(c => <ComplaintCard key={c._id} complaint={c} navigate={navigate} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />)}</TabsContent>
                  <TabsContent value="pending" className="mt-4 space-y-3">{pendingComplaints.map(c => <ComplaintCard key={c._id} complaint={c} navigate={navigate} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />)}</TabsContent>
                  <TabsContent value="progress" className="mt-4 space-y-3">{inProgressComplaints.map(c => <ComplaintCard key={c._id} complaint={c} navigate={navigate} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />)}</TabsContent>
                  <TabsContent value="review" className="mt-4 space-y-3">{needReviewComplaints.map(c => <ComplaintCard key={c._id} complaint={c} navigate={navigate} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />)}</TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Department Activity */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5" />{t("officer.departmentActivity", "Department Activity")}</CardTitle>
                <Button variant="ghost" size="icon" onClick={fetchDashboardData}><RefreshCw className="w-4 h-4" /></Button>
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
                        <p className="text-sm"><span className="font-medium">{activity.officer}</span> <span className="text-muted-foreground">{activity.action}</span> <Link to="#" className="text-primary hover:underline font-mono text-xs">#{activity.complaintId?.split("-").pop()}</Link></p>
                        <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                  {teamActivity.length === 0 && <p className="text-center py-4 text-muted-foreground">{t("officer.noRecentActivity", "No recent activity")}</p>}
                </div>
                <Button variant="outline" className="w-full mt-4" size="sm">{t("officer.viewAllActivity", "View All Activity")}</Button>
              </CardContent>
            </Card>

            {/* SLA Alerts */}
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700"><AlertCircle className="w-5 h-5" />{t("officer.slaAlerts", "SLA Alerts")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-red-100 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">{t("officer.slaBreached", "2 complaints breaching SLA")}</span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">{t("officer.immediateAction", "Immediate action required")}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">{t("officer.slaNear", "3 complaints near SLA")}</span>
                  </div>
                  <p className="text-xs text-orange-600 mt-1">{t("officer.dueSoon", "Due within 4 hours")}</p>
                </div>
                <Button variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-100" size="sm">{t("officer.viewAllAlerts", "View All Alerts")}</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Complaint Card Component
const ComplaintCard = ({ complaint, navigate, getStatusColor, getPriorityColor }: any) => {
  return (
    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/officer/update-status?complaintId=${complaint._id}`)}>
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); navigate(`/officer/update-status?complaintId=${complaint._id}`); }}><Eye className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8"><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8"><MessageSquare className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboard;

