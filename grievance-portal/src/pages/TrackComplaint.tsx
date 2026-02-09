import { useState } from "react";
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
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import complaintService from "@/services/complaintService";
import { toast } from "sonner";

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
  const [complaintId, setComplaintId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<ComplaintResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

  const handleSearch = async () => {
    if (!complaintId.trim()) return;

    setIsSearching(true);
    setNotFound(false);
    setResult(null);
    try {
      const response = await complaintService.trackComplaint(complaintId);
      setResult(response.data.complaint);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error("Failed to track complaint");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const stages = [
    { key: "filed", label: "Filed", icon: FileText },
    { key: "assigned", label: "Assigned", icon: User },
    { key: "in-progress", label: "In Progress", icon: Loader2 },
    { key: "resolved", label: "Resolved", icon: CheckCircle2 },
  ];

  const getStageIndex = (status: string) => {
    const index = stages.findIndex((s) => s.key === status);
    return index >= 0 ? index : 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
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
      Other: "bg-purple-100 text-purple-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      filed: "bg-gray-100 text-gray-800",
      assigned: "bg-blue-100 text-blue-800",
      "in-progress": "bg-yellow-100 text-yellow-800",
      resolved: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Public Tracking Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-6"
        >
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-200">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">Public Tracking</span>
            <span className="text-gray-300">|</span>
            <Lock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">No login required</span>
          </div>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="rounded-3xl shadow-2xl border-0 overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white text-center">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-2">
                  Track Your Complaint
                </h1>
                <p className="text-blue-100">
                  Enter your complaint ID to check the current status
                </p>
              </motion.div>
            </div>

            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
                <div className="relative flex-1">
                  <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Enter Complaint ID"
                    value={complaintId}
                    onChange={(e) => setComplaintId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-12 pr-4 py-6 text-lg rounded-xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || !complaintId.trim()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Track
                    </>
                  )}
                </Button>
              </div>
              <p className="text-center text-gray-500 text-sm mt-4">
                e.g., GR2024001234, GR2024001235, GR2024001236
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
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-600">Searching for your complaint...</p>
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
              <Card className="rounded-2xl shadow-lg border-0 bg-red-50">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Complaint Not Found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    No complaint found with ID:{" "}
                    <span className="font-mono font-semibold">
                      {complaintId}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Please check the complaint ID and try again. If you believe
                    this is an error, please contact our helpline.
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
              <Card className="rounded-2xl shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Complaint ID</p>
                      <CardTitle className="text-xl font-mono text-blue-600">
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {result.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Assigned to:</span>{" "}
                    {result.department}
                  </p>
                </CardContent>
              </Card>

              {/* Progress Bar */}
              <Card className="rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Complaint Progress</CardTitle>
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
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
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
                                  ? "bg-gradient-to-br from-blue-500 to-green-500 text-white shadow-lg"
                                  : "bg-gray-100 text-gray-400",
                                isCurrent && "ring-4 ring-blue-200 scale-110",
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
                                isCompleted ? "text-gray-900" : "text-gray-400",
                              )}
                            >
                              {stage.label}
                            </span>
                            {isCurrent && (
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-xs text-blue-600 mt-1"
                              >
                                Current
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
              <Card className="rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          Complaint Filed
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(result.filedDate)}
                        </p>
                      </div>
                    </div>

                    {result.assignedDate && (
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            Assigned to Department
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(result.assignedDate)}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {result.department}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          Last Updated
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(result.lastUpdate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          Estimated Resolution
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(result.estimatedResolution)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Login for More Details */}
              <Card className="rounded-2xl shadow-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <Lock className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">
                          Want more details?
                        </p>
                        <p className="text-sm text-gray-600">
                          Login to view complete information and updates
                        </p>
                      </div>
                    </div>
                    <Link to="/login">
                      <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl">
                        <LogIn className="w-4 h-4 mr-2" />
                        Login for Details
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
          <Card className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <HelpCircle className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    Need Help?
                  </h3>
                  <p className="text-gray-600">
                    Our support team is available 24/7 to assist you
                  </p>
                </div>
                <div className="flex flex-col items-center sm:items-end gap-2">
                  <div className="flex items-center gap-2 text-2xl font-bold text-orange-600">
                    <Phone className="w-6 h-6" />
                    <span>1800-XXX-XXXX</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Toll Free | Available 24/7
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
