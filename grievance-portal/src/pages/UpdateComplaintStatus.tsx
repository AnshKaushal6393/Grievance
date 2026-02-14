import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import officerService from "@/services/officerService";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  CalendarIcon,
  Upload,
  X,
  Image,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  ClipboardList,
  Eye,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Mock complaint data
const complaintData = {
  id: "GR-2024-001234",
  title: "Water main burst on MG Road causing flooding",
  description:
    "There is a major water main burst near the intersection of MG Road and Park Street. Water has been flooding the area for the past 3 hours, causing traffic disruption and potential damage to nearby shops.",
  currentStatus: "Assigned",
  priority: "High",
  category: "Water Supply",
  citizen: {
    name: "Ramesh Sharma",
    phone: "+91 98765 43210",
    email: "ramesh.sharma@email.com",
  },
  filedDate: "January 18, 2024",
  location: "MG Road, Near Park Street Intersection",
};

const statusOptions = [
  { value: "Assigned", label: "Assigned", color: "bg-blue-500" },
  { value: "In Progress", label: "In Progress", color: "bg-purple-500" },
  {
    value: "Inspection Scheduled",
    label: "Inspection Scheduled",
    color: "bg-indigo-500",
  },
  { value: "Work in Progress", label: "Work in Progress", color: "bg-orange-500" },
  { value: "Resolved", label: "Resolved", color: "bg-green-500" },
  { value: "Rejected", label: "Rejected", color: "bg-red-500" },
];

const rejectionReasons = [
  { value: "duplicate", label: "Duplicate complaint" },
  { value: "outside_jurisdiction", label: "Outside jurisdiction" },
  { value: "insufficient_info", label: "Insufficient information" },
  { value: "not_valid", label: "Not a valid issue" },
  { value: "other", label: "Other" },
];

const UpdateComplaintStatus = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolutionFileInputRef = useRef<HTMLInputElement>(null);

  const [newStatus, setNewStatus] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [evidenceImages, setEvidenceImages] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);

  // Inspection fields
  const [inspectionDate, setInspectionDate] = useState<Date>();
  const [inspectionTime, setInspectionTime] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");

  // Resolution fields
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [resolutionImages, setResolutionImages] = useState<File[]>([]);
  const [resolutionPreviews, setResolutionPreviews] = useState<string[]>([]);
  const [readyForFeedback, setReadyForFeedback] = useState(false);
  const [completionDate, setCompletionDate] = useState<Date>();

  // Rejection fields
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionExplanation, setRejectionExplanation] = useState("");

  // UI state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "evidence" | "resolution"
  ) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 3;

    if (type === "evidence") {
      const remainingSlots = maxFiles - evidenceImages.length;
      const filesToAdd = files.slice(0, remainingSlots);

      filesToAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setEvidencePreviews((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });

      setEvidenceImages((prev) => [...prev, ...filesToAdd]);
    } else {
      const remainingSlots = maxFiles - resolutionImages.length;
      const filesToAdd = files.slice(0, remainingSlots);

      filesToAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setResolutionPreviews((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });

      setResolutionImages((prev) => [...prev, ...filesToAdd]);
    }
  };

  const removeImage = (index: number, type: "evidence" | "resolution") => {
    if (type === "evidence") {
      setEvidenceImages((prev) => prev.filter((_, i) => i !== index));
      setEvidencePreviews((prev) => prev.filter((_, i) => i !== index));
    } else {
      setResolutionImages((prev) => prev.filter((_, i) => i !== index));
      setResolutionPreviews((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const validateForm = () => {
    if (!newStatus) {
      toast({
        title: "Status Required",
        description: "Please select a new status.",
        variant: "destructive",
      });
      return false;
    }

    if (!actionNotes.trim()) {
      toast({
        title: "Action Notes Required",
        description: "Please describe the action taken.",
        variant: "destructive",
      });
      return false;
    }

    if (newStatus === "Inspection Scheduled") {
      if (!inspectionDate || !inspectionTime || !inspectorName.trim()) {
        toast({
          title: "Inspection Details Required",
          description:
            "Please fill in all inspection details (date, time, inspector name).",
          variant: "destructive",
        });
        return false;
      }
    }

    if (newStatus === "Resolved") {
      if (!resolutionSummary.trim()) {
        toast({
          title: "Resolution Summary Required",
          description: "Please provide a resolution summary.",
          variant: "destructive",
        });
        return false;
      }
    }

    if (newStatus === "Rejected") {
      if (!rejectionReason || !rejectionExplanation.trim()) {
        toast({
          title: "Rejection Details Required",
          description: "Please select a reason and provide an explanation.",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);

    try {
      await officerService.updateComplaintStatus(complaintData.id, {
        status: newStatus,
        actionNotes,
        inspectionDate: inspectionDate?.toISOString(),
        inspectionTime,
        inspectorName,
        inspectionNotes,
        resolutionSummary,
        completionDate: completionDate?.toISOString(),
        readyForFeedback,
        rejectionReason,
        rejectionExplanation,
      });

      toast({
        title: "Status Updated Successfully",
        description: `Complaint ${complaintData.id} has been updated to "${newStatus}".`,
      });

      setShowConfirmModal(false);
      navigate("/officer");
    } catch (error: any) {
      toast({
        title: "Failed to Update Status",
        description: error?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Resolved":
        return <CheckCircle className="w-5 h-5" />;
      case "Rejected":
        return <XCircle className="w-5 h-5" />;
      case "Inspection Scheduled":
        return <CalendarIcon className="w-5 h-5" />;
      default:
        return <ClipboardList className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    const found = statusOptions.find((s) => s.value === status);
    return found?.color || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Update Complaint Status
            </h1>
            <p className="text-muted-foreground">
              Update status and add notes for complaint {complaintData.id}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Complaint Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Complaint Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-lg text-primary font-semibold">
                    {complaintData.id}
                  </span>
                  <Badge
                    className={cn(
                      "text-white text-sm px-3 py-1",
                      getStatusColor(complaintData.currentStatus)
                    )}
                  >
                    {complaintData.currentStatus}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-orange-500 text-orange-600"
                  >
                    {complaintData.priority} Priority
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground text-lg">
                    {complaintData.title}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {complaintData.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {complaintData.citizen.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{complaintData.citizen.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{complaintData.citizen.email}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <span>Filed: {complaintData.filedDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary">{complaintData.category}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Update Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Status */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    Current Status
                  </p>
                  <Badge
                    className={cn(
                      "text-white text-sm px-3 py-1",
                      getStatusColor(complaintData.currentStatus)
                    )}
                  >
                    {complaintData.currentStatus}
                  </Badge>
                </div>

                {/* New Status */}
                <div className="space-y-2">
                  <Label htmlFor="newStatus">New Status *</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn("w-2 h-2 rounded-full", status.color)}
                            />
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="actionNotes">Action Notes *</Label>
                    <span className="text-xs text-muted-foreground">
                      {actionNotes.length}/500
                    </span>
                  </div>
                  <Textarea
                    id="actionNotes"
                    placeholder="Describe the action taken..."
                    value={actionNotes}
                    onChange={(e) =>
                      setActionNotes(e.target.value.slice(0, 500))
                    }
                    rows={4}
                  />
                </div>

                {/* Evidence Upload */}
                <div className="space-y-2">
                  <Label>Upload Evidence (Optional)</Label>
                  <div className="flex flex-wrap gap-3">
                    {evidencePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Evidence ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                        <button
                          onClick={() => removeImage(index, "evidence")}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {evidenceImages.length < 3 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        <Upload className="w-5 h-5" />
                        <span className="text-xs">Add Photo</span>
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "evidence")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Max 3 images. Supported: JPG, PNG, WEBP
                  </p>
                </div>

                {/* Conditional: Inspection Details */}
                {newStatus === "Inspection Scheduled" && (
                  <div className="p-4 bg-indigo-50 rounded-lg space-y-4 border border-indigo-200">
                    <h4 className="font-medium text-indigo-900 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Inspection Details
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Scheduled Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !inspectionDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {inspectionDate
                                ? format(inspectionDate, "PPP")
                                : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={inspectionDate}
                              onSelect={setInspectionDate}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="inspectionTime">Scheduled Time *</Label>
                        <Input
                          id="inspectionTime"
                          type="time"
                          value={inspectionTime}
                          onChange={(e) => setInspectionTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inspectorName">Inspector Name *</Label>
                      <Input
                        id="inspectorName"
                        placeholder="Enter inspector's name"
                        value={inspectorName}
                        onChange={(e) => setInspectorName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inspectionNotes">Additional Notes</Label>
                      <Textarea
                        id="inspectionNotes"
                        placeholder="Any additional inspection notes..."
                        value={inspectionNotes}
                        onChange={(e) => setInspectionNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {/* Conditional: Resolution Details */}
                {newStatus === "Resolved" && (
                  <div className="p-4 bg-green-50 rounded-lg space-y-4 border border-green-200">
                    <h4 className="font-medium text-green-900 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Resolution Details
                    </h4>

                    <div className="space-y-2">
                      <Label htmlFor="resolutionSummary">
                        Resolution Summary *
                      </Label>
                      <Textarea
                        id="resolutionSummary"
                        placeholder="Describe how the issue was resolved..."
                        value={resolutionSummary}
                        onChange={(e) => setResolutionSummary(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Resolution Images</Label>
                      <div className="flex flex-wrap gap-3">
                        {resolutionPreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Resolution ${index + 1}`}
                              className="w-24 h-24 object-cover rounded-lg border"
                            />
                            <button
                              onClick={() => removeImage(index, "resolution")}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {resolutionImages.length < 3 && (
                          <button
                            onClick={() =>
                              resolutionFileInputRef.current?.click()
                            }
                            className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-green-500 hover:text-green-600 transition-colors"
                          >
                            <Image className="w-5 h-5" />
                            <span className="text-xs">Add Photo</span>
                          </button>
                        )}
                      </div>
                      <input
                        ref={resolutionFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "resolution")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Completion Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !completionDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {completionDate
                              ? format(completionDate, "PPP")
                              : "Select completion date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={completionDate}
                            onSelect={setCompletionDate}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="readyForFeedback"
                        checked={readyForFeedback}
                        onChange={(e) => setReadyForFeedback(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label
                        htmlFor="readyForFeedback"
                        className="text-sm cursor-pointer"
                      >
                        Mark as "Ready for Citizen Feedback"
                      </Label>
                    </div>
                  </div>
                )}

                {/* Conditional: Rejection Details */}
                {newStatus === "Rejected" && (
                  <div className="p-4 bg-red-50 rounded-lg space-y-4 border border-red-200">
                    <h4 className="font-medium text-red-900 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Rejection Details
                    </h4>

                    <div className="space-y-2">
                      <Label>Rejection Reason *</Label>
                      <Select
                        value={rejectionReason}
                        onValueChange={setRejectionReason}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {rejectionReasons.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rejectionExplanation">
                        Detailed Explanation *
                      </Label>
                      <Textarea
                        id="rejectionExplanation"
                        placeholder="Provide a detailed explanation for the rejection..."
                        value={rejectionExplanation}
                        onChange={(e) => setRejectionExplanation(e.target.value)}
                        rows={4}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Update Status
              </Button>
              <Button variant="outline" className="gap-2">
                <Save className="w-4 h-4" />
                Save as Draft
              </Button>
              <Button variant="ghost" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </div>

          {/* Timeline Preview */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Timeline Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* New entry preview */}
                  {newStatus && (
                    <div className="relative pl-6 pb-4 border-l-2 border-primary">
                      <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-primary -translate-x-1/2 flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                      </div>
                      <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(newStatus)}
                          <Badge
                            className={cn(
                              "text-white text-xs",
                              getStatusColor(newStatus)
                            )}
                          >
                            {newStatus}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          Status updated to {newStatus}
                        </p>
                        {actionNotes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {actionNotes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Just now • Officer Kumar
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Previous entries */}
                  <div className="relative pl-6 pb-4 border-l-2 border-muted">
                    <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-blue-500 -translate-x-1/2" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Assigned to PWD
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Jan 18, 2024 • System
                      </p>
                    </div>
                  </div>

                  <div className="relative pl-6 pb-4 border-l-2 border-muted">
                    <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-green-500 -translate-x-1/2" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Complaint Registered
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Jan 18, 2024 • Citizen
                      </p>
                    </div>
                  </div>

                  <div className="relative pl-6">
                    <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-gray-400 -translate-x-1/2" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Complaint Filed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Jan 18, 2024
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirm Status Update
            </DialogTitle>
            <DialogDescription>
              You are about to update the status of complaint{" "}
              <span className="font-mono font-medium">{complaintData.id}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">From:</div>
              <Badge
                className={cn(
                  "text-white",
                  getStatusColor(complaintData.currentStatus)
                )}
              >
                {complaintData.currentStatus}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">To:</div>
              <Badge className={cn("text-white", getStatusColor(newStatus))}>
                {newStatus}
              </Badge>
            </div>

            {actionNotes && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  Action Notes:
                </p>
                <p className="text-sm">{actionNotes}</p>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              This action will notify the citizen about the status change. Are
              you sure you want to proceed?
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSubmit}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-green-600 to-green-500 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm Update
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UpdateComplaintStatus;
