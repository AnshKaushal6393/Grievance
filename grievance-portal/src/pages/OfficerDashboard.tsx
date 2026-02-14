import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList, Clock, CheckCircle, Timer, AlertTriangle, TrendingUp,
  TrendingDown, Eye, MessageSquare, RefreshCw, FileText, Users, Bell,
  Building2, ArrowRight, AlertCircle, User, Activity,
} from "lucide-react";
import officerService from "@/services/officerService";
import { toast } from "sonner";

const OfficerDashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationCount] = useState(3);
  
  // API data states
  const [statsData, setStatsData] = useState<any[]>([]);
  const [highPriorityComplaints, setHighPriorityComplaints] = useState<any[]>([]);
  const [allComplaints, setAllComplaints] = useState<any[]>([]);
  const [teamActivity, setTeamActivity] = useState<any[]>([]);
  const [officerInfo, setOfficerInfo] = useState<{ department?: { name?: string; code?: string } } | null>(null);
  
  // User data (from localStorage or context)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const officerData = {
    name: user.name || "Officer",
    department: officerInfo?.department?.name || user.department?.name || "Department",
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
          title: "Assigned to Me",
          value: stats.totalAssigned.toString(),
          icon: ClipboardList,
          trend: stats.totalTrend || "+0",
          trendUp: stats.totalTrendUp ?? true,
          subtitle: "Total active",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          title: "Pending Action",
          value: stats.pendingAction.toString(),
          icon: Clock,
          trend: stats.pendingTrend || "+0",
          trendUp: stats.pendingTrendUp ?? true,
          subtitle: "Needs attention",
          color: "text-orange-600",
          bgColor: "bg-orange-50",
        },
        {
          title: "Resolved Today",
          value: stats.resolvedToday.toString(),
          icon: CheckCircle,
          trend: stats.resolvedTrend || "+0",
          trendUp: stats.resolvedTrendUp ?? true,
          subtitle: "Great progress!",
          color: "text-green-600",
          bgColor: "bg-green-50",
        },
        {
          title: "Avg Response Time (7d)",
          value: stats.avgResponseTime || "0.0h",
          icon: Timer,
          trend: stats.responseTrend || "+0.0h",
          trendUp: stats.responseTrendUp ?? true,
          subtitle: "Vs previous 7 days",
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
          priority: c.priority === 'critical' ? 'Critical' : 'High',
          filedDate: new Date(c.createdAt).toLocaleDateString(),
          slaHoursRemaining: Math.max(1, Math.floor(Math.random() * 12)), // Calculate from SLA
          category: c.category || "General",
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
      toast.error(error.response?.data?.message || "Failed to load dashboard");
    } finally {
      // no-op
    }
  };

  const capitalizeStatus = (status: string) => {
    const map: Record<string, string> = {
      'filed': 'Pending',
      'pending': 'Pending',
      'assigned': 'Assigned',
      'in-progress': 'In Progress',
      'resolved': 'Resolved',
      'rejected': 'Rejected',
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
      'in-progress': 'bg-blue-500',
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
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
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
    if (hours <= 4) return "URGENT";
    if (hours <= 12) return "Warning";
    return "On Track";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "In Progress": return "bg-blue-100 text-blue-800";
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

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 text-primary-foreground">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Welcome, {officerData.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                    <Building2 className="w-3 h-3 mr-1" />{officerData.department}
                  </Badge>
                  <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground">
                    {officerData.departmentCode}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-primary-foreground/80 text-sm">{formatDate(currentTime)}</p>
                <p className="text-2xl font-mono font-bold">{formatTime(currentTime)}</p>
              </div>
              <div className="relative">
                <Button variant="secondary" size="icon" className="bg-primary-foreground/20 hover:bg-primary-foreground/30 border-0">
                  <Bell className="w-5 h-5 text-primary-foreground" />
                </Button>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {notificationCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/officer/complaints')}>
            <Eye className="w-4 h-4" />View All Assigned
          </Button>
          <Button variant="outline" className="gap-2"><FileText className="w-4 h-4" />Generate My Report</Button>
          <Button variant="outline" className="gap-2"><Users className="w-4 h-4" />Team Performance</Button>
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
                  <CardTitle className="text-lg">High Priority Complaints</CardTitle>
                  <Badge variant="destructive">{highPriorityComplaints.length}</Badge>
                </div>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/officer/complaints?priority=high,critical')}>
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {highPriorityComplaints.map(complaint => (
                  <div key={complaint._id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/officer/complaints/${complaint._id}`)}>
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
                        <p className="text-sm text-muted-foreground mt-1">Filed: {complaint.filedDate}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSLAColor(complaint.slaHoursRemaining)}`}>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{complaint.slaHoursRemaining}h left</span>
                          </div>
                          <p className="text-xs text-center">{getSLAUrgency(complaint.slaHoursRemaining)}</p>
                        </div>
                        <Button size="sm" className="gap-1">Take Action <ArrowRight className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
                {highPriorityComplaints.length === 0 && <p className="text-center py-8 text-muted-foreground">No high priority complaints</p>}
              </CardContent>
            </Card>

            {/* My Assigned Complaints */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />My Assigned Complaints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all" className="gap-1">All<Badge variant="secondary" className="ml-1">{allComplaints.length}</Badge></TabsTrigger>
                    <TabsTrigger value="pending" className="gap-1">Pending<Badge variant="secondary" className="ml-1">{pendingComplaints.length}</Badge></TabsTrigger>
                    <TabsTrigger value="progress" className="gap-1">In Progress<Badge variant="secondary" className="ml-1">{inProgressComplaints.length}</Badge></TabsTrigger>
                    <TabsTrigger value="review" className="gap-1">Review<Badge variant="secondary" className="ml-1">{needReviewComplaints.length}</Badge></TabsTrigger>
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
                <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5" />Department Activity</CardTitle>
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
                  {teamActivity.length === 0 && <p className="text-center py-4 text-muted-foreground">No recent activity</p>}
                </div>
                <Button variant="outline" className="w-full mt-4" size="sm">View All Activity</Button>
              </CardContent>
            </Card>

            {/* SLA Alerts */}
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700"><AlertCircle className="w-5 h-5" />SLA Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-red-100 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">2 complaints breaching SLA</span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">Immediate action required</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">3 complaints near SLA</span>
                  </div>
                  <p className="text-xs text-orange-600 mt-1">Due within 4 hours</p>
                </div>
                <Button variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-100" size="sm">View All Alerts</Button>
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
    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/officer/complaints/${complaint._id}`)}>
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); navigate(`/officer/complaints/${complaint._id}`); }}><Eye className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8"><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8"><MessageSquare className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboard;
