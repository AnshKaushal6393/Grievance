import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FileText,
  CheckCircle2,
  Clock,
  User,
  Loader2,
  Phone,
  Lock,
  LogIn,
  AlertCircle,
  Calendar,
  ArrowRight,
  HelpCircle,
  Shield,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import complaintService from "@/services/complaintService";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface ComplaintResult {
  id: string;
  title: string;
  category: string;
  status: "filed" | "assigned" | "in-progress" | "resolved";
  filedDate: string;
  assignedDate?: string;
  lastUpdate: string;
  estimatedResolution: string;
  department: string;
}

const TrackComplaint = () => {
  const { t } = useLanguage();
  const [complaintId, setComplaintId] = useState("");
  const [searchParams] = useSearchParams();
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<ComplaintResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  //   // Sample data for demo
  //   const sampleComplaints: Record<string, ComplaintResult> = {
  //     'GR2024001234': {
  //       id: 'GR2024001234',
  //       title: 'Road repair needed on Main Street',
  //       category: 'Roads',
  //       status: 'in-progress',
  //       filedDate: '2024-01-15',
  //       assignedDate: '2024-01-16',
  //       lastUpdate: '2024-01-18',
  //       estimatedResolution: '2024-01-25',
  //       department: 'Public Works Department'
  //     },
  //     'GR2024001235': {
  //       id: 'GR2024001235',
  //       title: 'Street light not working',
  //       category: 'Electricity',
  //       status: 'assigned',
  //       filedDate: '2024-01-14',
  //       assignedDate: '2024-01-15',
  //       lastUpdate: '2024-01-15',
  //       estimatedResolution: '2024-01-22',
  //       department: 'Electricity Board'
  //     },
  //     'GR2024001236': {
  //       id: 'GR2024001236',
  //       title: 'Water supply disruption',
  //       category: 'Water',
  //       status: 'resolved',
  //       filedDate: '2024-01-10',
  //       assignedDate: '2024-01-11',
  //       lastUpdate: '2024-01-16',
  //       estimatedResolution: '2024-01-16',
  //       department: 'Water Supply Department'
  //     }
  //   };

  const handleSearch = async (presetId?: string) => {
    const lookup = (presetId ?? complaintId).trim();
    if (!lookup) return;

    setIsSearching(true);
    setNotFound(false);
    setResult(null);
    try {
      const response = await complaintService.trackComplaint(lookup);
      setResult(response.data.complaint);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error(t("track.errorGeneric"));
      }
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const preset = searchParams.get("complaintId");
    if (preset) {
      setComplaintId(preset);
      handleSearch(preset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const stages = [
    { key: "filed", label: t("track.filed"), icon: FileText },
    { key: "assigned", label: t("track.assigned"), icon: User },
    { key: "in-progress", label: t("track.inProgress"), icon: Loader2 },
    { key: "resolved", label: t("track.resolved"), icon: CheckCircle2 },
  ];

  const getStageIndex = (status: string) => {
    const index = stages.findIndex((s) => s.key === status);
    return index >= 0 ? index : 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Roads: "bg-orange-100 text-orange-800",
      Water: "bg-cyan-100 text-cyan-800",
      Electricity: "bg-amber-100 text-amber-800",
      Sanitation: "bg-emerald-100 text-emerald-800",
      Other: "bg-accent/20 text-purple-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      filed: "bg-gray-100 text-gray-800",
      assigned: "bg-primary/15 text-primary",
      "in-progress": "bg-yellow-100 text-yellow-800",
      resolved: "bg-primary/15 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Public Tracking Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-6"
        >
          <div className="flex items-center gap-2 bg-card px-4 py-2 rounded border border-border">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">{t("track.publicTracking")}</span>
            <span className="text-gray-300">|</span>
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("track.noLoginRequired")}</span>
          </div>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="rounded border border-border overflow-hidden bg-card">
            <div className="bg-primary text-primary-foreground p-6 text-center">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-16 h-16 bg-white/20 rounded flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-semibold mb-2">
                  {t("track.title")}
                </h1>
                <p className="text-primary-foreground/80">
                  {t("track.subtitle")}
                </p>
              </motion.div>
            </div>

            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
                <div className="relative flex-1">
                  <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    type="text"
                    placeholder={t("track.placeholder")}
                    value={complaintId}
                    onChange={(e) => setComplaintId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-12 pr-4 py-3 text-base rounded border border-input focus:border-primary"
                  />
                </div>
                  <Button
                    onClick={() => handleSearch()}
                    disabled={isSearching || !complaintId.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 text-base rounded disabled:opacity-50"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t("track.searchingBtn")}
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      {t("track.trackBtn")}
                    </>
                  )}
                </Button>
              </div>
              <p className="text-center text-muted-foreground text-sm mt-4">
                {t("track.example", "Reference: GR2024001234")}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {isSearching && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 flex flex-col items-center justify-center py-12"
            >
              <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-foreground">{t("track.searchingMsg")}</p>
            </motion.div>
          )}

          {!isSearching && notFound && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8"
            >
              <Card className="rounded border border-red-200 bg-red-50">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {t("track.notFoundTitle")}
                  </h3>
                  <p className="text-foreground mb-4">
                    {t("track.notFoundFor", "No grievance record found for ID")}:{" "}
                    <span className="font-mono font-semibold">
                      {complaintId}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("track.notFoundHelp")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {!isSearching && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 space-y-6"
            >
              {/* Complaint Details */}
              <Card className="rounded border border-border overflow-hidden">
                <CardHeader className="bg-muted border-b">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t("track.complaintId")}</p>
                      <CardTitle className="text-xl font-mono text-primary">
                        {result.id}
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getCategoryColor(result.category)}>
                        {result.category}
                      </Badge>
                      <Badge className={getStatusColor(result.status)}>
                        {result.status
                          .replace("-", " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {result.title}
                  </h3>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{t("track.assignedTo")}</span>{" "}
                    {result.department}
                  </p>
                </CardContent>
              </Card>

              {/* Progress Bar */}
              <Card className="rounded border border-border">
                <CardHeader>
                  <CardTitle className="text-lg">{t("track.progress")}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 rounded-full">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(getStageIndex(result.status) / (stages.length - 1)) * 100}%`,
                        }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>

                    {/* Stages */}
                    <div className="relative flex justify-between">
                      {stages.map((stage, index) => {
                        const isCompleted =
                          index <= getStageIndex(result.status);
                        const isCurrent =
                          index === getStageIndex(result.status);
                        const StageIcon = stage.icon;

                        return (
                          <motion.div
                            key={stage.key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + index * 0.1 }}
                            className="flex flex-col items-center"
                          >
                            <div
                              className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center transition-all z-10",
                                isCompleted
                                  ? "bg-primary text-white"
                                  : "bg-muted text-muted-foreground",
                                isCurrent && "ring-4 ring-ring/30 scale-105",
                              )}
                            >
                              <StageIcon
                                className={cn(
                                  "w-5 h-5",
                                  isCurrent &&
                                    stage.key === "in-progress" &&
                                    "animate-spin",
                                )}
                              />
                            </div>
                            <span
                              className={cn(
                                "mt-3 text-sm font-medium",
                                isCompleted ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {stage.label}
                            </span>
                            {isCurrent && (
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-xs text-primary mt-1"
                              >
                                {t("track.current")}
                              </motion.span>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card className="rounded border border-border">
                <CardHeader>
                  <CardTitle className="text-lg">{t("track.timeline")}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {t("track.complaintFiled")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(result.filedDate)}
                        </p>
                      </div>
                    </div>

                    {result.assignedDate && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {t("track.assignedDept")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(result.assignedDate)}
                          </p>
                          <p className="text-sm text-foreground mt-1">
                            {result.department}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {t("track.lastUpdated")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(result.lastUpdate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {t("track.estimatedResolution")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(result.estimatedResolution)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Login for More Details */}
              <Card className="rounded border border-border bg-muted/40">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <Lock className="w-6 h-6 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">
                          {t("track.moreDetails")}
                        </p>
                        <p className="text-sm text-foreground">
                          {t("track.moreDetailsSub")}
                        </p>
                      </div>
                    </div>
                    <Link to="/login">
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded">
                        <LogIn className="w-4 h-4 mr-2" />
                        {t("track.loginDetails")}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Need Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
            <Card className="rounded border border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-14 h-14 bg-amber-500 rounded flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    {t("track.needHelp")}
                  </h3>
                  <p className="text-foreground">
                    {t("track.needHelpSub")}
                  </p>
                </div>
                <div className="flex flex-col items-center sm:items-end gap-2">
                  <div className="flex items-center gap-2 text-2xl font-bold text-orange-600">
                    <Phone className="w-6 h-6" />
                    <span>1800-000-0000</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {t("track.tollFree")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default TrackComplaint;


