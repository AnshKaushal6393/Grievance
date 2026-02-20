import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  MapPin,
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
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type OfficerComplaintRecord = {
  _id: string;
  complaintId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  location?: {
    address?: string;
    coordinates?: {
      latitude?: number | null;
      longitude?: number | null;
    };
  };
  timeline?: Array<{
    status?: string;
    message?: string;
    updatedAt?: string;
    updatedBy?: {
      name?: string;
      role?: string;
    } | null;
  }>;
  user?: {
    name?: string;
    phone?: string;
    email?: string;
  };
};

const mapStatusToUiLabel = (status?: string) => {
  const key = String(status || "").toLowerCase();
  if (key === "filed" || key === "pending") return "Assigned";
  if (key === "assigned") return "Assigned";
  if (key === "in-progress" || key === "in_progress") return "In Progress";
  if (key === "resolved") return "Resolved";
  if (key === "rejected") return "Rejected";
  return "Assigned";
};

const mapPriorityToUiLabel = (priority?: string) => {
  const key = String(priority || "").toLowerCase();
  if (!key) return "Medium";
  return key.charAt(0).toUpperCase() + key.slice(1);
};

const statusOptions = [
  { value: "Assigned", label: "Assigned", color: "bg-primary/100" },
  { value: "In Progress", label: "In Progress", color: "bg-purple-500" },
  {
    value: "Inspection Scheduled",
    label: "Inspection Scheduled",
    color: "bg-primary/100",
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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  const complaintId = searchParams.get("complaintId");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolutionFileInputRef = useRef<HTMLInputElement>(null);
  const [complaint, setComplaint] = useState<OfficerComplaintRecord | null>(null);
  const [isLoadingComplaint, setIsLoadingComplaint] = useState(true);

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
  const [derivedAddress, setDerivedAddress] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadComplaint = async () => {
      if (!complaintId) {
        toast({
          title: t("updateStatus.error.notFound", "Complaint Not Found"),
          description: t("updateStatus.error.invalidComplaint", "Invalid complaint selected"),
          variant: "destructive",
        });
        navigate("/officer");
        return;
      }

      setIsLoadingComplaint(true);
      try {
        const response = await officerService.getComplaintById(complaintId);
        if (!isMounted) return;

        if (!response?.complaint) {
          toast({
            title: t("updateStatus.error.notFound", "Complaint Not Found"),
            description: t("updateStatus.error.loadComplaint", "Unable to load complaint"),
            variant: "destructive",
          });
          navigate("/officer");
          return;
        }

        setComplaint(response.complaint);
      } catch (error: any) {
        if (!isMounted) return;
        toast({
          title: t("updateStatus.error.loadComplaint", "Unable to load complaint"),
          description: error?.response?.data?.message || t("common.tryAgain", "Please try again"),
          variant: "destructive",
        });
        navigate("/officer");
      } finally {
        if (isMounted) setIsLoadingComplaint(false);
      }
    };

    loadComplaint();
    return () => {
      isMounted = false;
    };
  }, [complaintId, navigate, t, toast]);

  useEffect(() => {
    const rawAddress = complaint?.location?.address?.trim() || "";
    const lat = complaint?.location?.coordinates?.latitude;
    const lng = complaint?.location?.coordinates?.longitude;
    const hasCoords = typeof lat === "number" && typeof lng === "number";
    const looksLikeCoordinates = /^[\d\.\-\s,]+$/.test(rawAddress);

    if (!hasCoords || (rawAddress && !looksLikeCoordinates)) {
      setDerivedAddress("");
      return;
    }

    const controller = new AbortController();
    const loadReverseAddress = async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;
        const data = await response.json();
        const label = data?.display_name;
        if (label && typeof label === "string") {
          setDerivedAddress(label);
        }
      } catch {
        // Keep fallback address if reverse geocoding fails.
      }
    };

    void loadReverseAddress();
    return () => controller.abort();
  }, [complaint]);

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
    if (String(complaint?.status || "").toLowerCase() === "resolved") {
      toast({
        title: t("updateStatus.error.resolvedLockedTitle", "Update Not Allowed"),
        description: t(
          "updateStatus.error.resolvedLocked",
          "This complaint is already resolved and cannot be updated.",
        ),
        variant: "destructive",
      });
      return false;
    }

    if (!newStatus) {
      toast({
        title: t("updateStatus.error.statusRequired", "Status Required"),
        description: t("updateStatus.error.selectStatus", "Please select a new status."),
        variant: "destructive",
      });
      return false;
    }

    if (!actionNotes.trim()) {
      toast({
        title: t("updateStatus.error.actionNotesRequired", "Action Notes Required"),
        description: t("updateStatus.error.actionNotes", "Please describe the action taken."),
        variant: "destructive",
      });
      return false;
    }

    if (newStatus === "Inspection Scheduled") {
      if (!inspectionDate || !inspectionTime || !inspectorName.trim()) {
        toast({
          title: t("updateStatus.error.inspectionRequiredTitle", "Inspection Details Required"),
          description: t(
            "updateStatus.error.inspectionRequired",
            "Please fill in all inspection details (date, time, inspector name).",
          ),
          variant: "destructive",
        });
        return false;
      }
    }

    if (newStatus === "Resolved") {
      if (!resolutionSummary.trim()) {
        toast({
          title: t("updateStatus.error.resolutionRequiredTitle", "Resolution Summary Required"),
          description: t("updateStatus.error.resolutionRequired", "Please provide a resolution summary."),
          variant: "destructive",
        });
        return false;
      }
    }

    if (newStatus === "Rejected") {
      if (!rejectionReason || !rejectionExplanation.trim()) {
        toast({
          title: t("updateStatus.error.rejectionRequiredTitle", "Rejection Details Required"),
          description: t("updateStatus.error.rejectionRequired", "Please select a reason and provide an explanation."),
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
    if (!complaint?._id) return;
    if (String(complaint.status || "").toLowerCase() === "resolved") {
      toast({
        title: t("updateStatus.error.resolvedLockedTitle", "Update Not Allowed"),
        description: t(
          "updateStatus.error.resolvedLocked",
          "This complaint is already resolved and cannot be updated.",
        ),
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      await officerService.updateComplaintStatus(complaint._id, {
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
        title: t("updateStatus.success.title", "Status Updated Successfully"),
        description: t(
          "updateStatus.success.description",
          `Complaint ${complaint.complaintId} has been updated to "${newStatus}".`,
        ),
      });

      setShowConfirmModal(false);
      navigate("/officer");
    } catch (error: any) {
      toast({
        title: t("updateStatus.error.updateFailedTitle", "Failed to Update Status"),
        description: error?.response?.data?.message || t("common.tryAgain", "Please try again."),
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

  if (isLoadingComplaint) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t("common.loading", "Loading")}</span>
        </div>
      </div>
    );
  }

  if (!complaint) return null;

  const currentStatus = mapStatusToUiLabel(complaint.status);
  const isResolvedComplaint =
    String(complaint.status || "").toLowerCase() === "resolved";
  const currentPriority = mapPriorityToUiLabel(complaint.priority);
  const filedDate = complaint.createdAt
    ? new Date(complaint.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";
  const locationAddress =
    derivedAddress || complaint.location?.address?.trim() || "-";
  const lat = complaint.location?.coordinates?.latitude;
  const lng = complaint.location?.coordinates?.longitude;
  const hasCoordinates = typeof lat === "number" && typeof lng === "number";
  const mapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : null;
  const timelineEntries = (complaint.timeline || [])
    .map((entry) => ({
      status: entry.status || currentStatus,
      message: entry.message || t("updateStatus.timelineUpdated", "Complaint updated"),
      updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : null,
      actor: entry.updatedBy?.name || t("updateStatus.system", "System"),
    }))
    .sort((a, b) => {
      const aTime = a.updatedAt ? a.updatedAt.getTime() : 0;
      const bTime = b.updatedAt ? b.updatedAt.getTime() : 0;
      return bTime - aTime;
    });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("updateStatus.title", "Update Complaint Status")}
            </h1>
            <p className="text-muted-foreground">
              {t("updateStatus.subtitle", "Official processing form for complaint")} {complaint.complaintId}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-300 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800">
            {t("updateStatus.officialRecord", "Official Action Record")}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {t(
              "updateStatus.officialRecordNote",
              "Status updates, notes, and attachments are part of the official grievance file and may be reviewed in audits.",
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Complaint Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t("updateStatus.complaintSummary", "Complaint Summary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-lg text-primary font-semibold">
                    {complaint.complaintId}
                  </span>
                  <Badge
                    className={cn(
                      "text-white text-sm px-3 py-1",
                      getStatusColor(currentStatus)
                    )}
                  >
                    {currentStatus}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-orange-500 text-orange-600"
                  >
                    {currentPriority} {t("updateStatus.priority", "Priority")}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground text-lg">
                    {complaint.title}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {complaint.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {complaint.user?.name || "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{complaint.user?.phone || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{complaint.user?.email || "-"}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <span>{t("updateStatus.filed", "Filed")}: {filedDate}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="mt-0.5 w-4 h-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {t("updateStatus.location", "Location")}
                        </p>
                        <p className="text-muted-foreground break-words">{locationAddress}</p>
                        {hasCoordinates && (
                          <div className="mt-1">
                            <p className="text-xs text-muted-foreground font-mono">
                              {lat?.toFixed(6)}, {lng?.toFixed(6)}
                            </p>
                            <a
                              href={mapsUrl || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              {t("updateStatus.openInMaps", "Open in maps")}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary">{complaint.category}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Update Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("updateStatus.updateStatus", "Update Status")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Status */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    {t("updateStatus.currentStatus", "Current Status")}
                  </p>
                  <Badge
                    className={cn(
                      "text-white text-sm px-3 py-1",
                      getStatusColor(currentStatus)
                    )}
                  >
                    {currentStatus}
                  </Badge>
                  {isResolvedComplaint && (
                    <p className="mt-2 text-sm text-red-600">
                      {t(
                        "updateStatus.resolvedLocked",
                        "This complaint is resolved. Status can no longer be changed.",
                      )}
                    </p>
                  )}
                </div>

                {/* New Status */}
                <div className="space-y-2">
                  <Label htmlFor="newStatus">{t("updateStatus.newStatus", "New Status")} *</Label>
                  <Select
                    value={newStatus}
                    onValueChange={setNewStatus}
                    disabled={isResolvedComplaint}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("updateStatus.selectNewStatus", "Select new status")} />
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
                    <Label htmlFor="actionNotes">{t("updateStatus.actionNotes", "Action Notes")} *</Label>
                    <span className="text-xs text-muted-foreground">
                      {actionNotes.length}/500
                    </span>
                  </div>
                  <Textarea
                    id="actionNotes"
                    placeholder={t("updateStatus.actionNotesPlaceholder", "Describe the action taken...")}
                    value={actionNotes}
                    onChange={(e) =>
                      setActionNotes(e.target.value.slice(0, 500))
                    }
                    rows={4}
                  />
                </div>

                {/* Evidence Upload */}
                <div className="space-y-2">
                  <Label>{t("updateStatus.uploadEvidence", "Upload Evidence (Optional)")}</Label>
                  <div className="flex flex-wrap gap-3">
                    {evidencePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Evidence ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                        <button type="button"
                          onClick={() => removeImage(index, "evidence")}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {evidenceImages.length < 3 && (
                      <button type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        <Upload className="w-5 h-5" />
                        <span className="text-xs">{t("updateStatus.addPhoto", "Add Photo")}</span>
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
                    {t("updateStatus.imagesHint", "Max 3 images. Supported: JPG, PNG, WEBP")}
                  </p>
                </div>

                {/* Conditional: Inspection Details */}
                {newStatus === "Inspection Scheduled" && (
                  <div className="p-4 bg-slate-50 rounded-lg space-y-4 border border-slate-200">
                    <h4 className="font-medium text-slate-900 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {t("updateStatus.inspectionDetails", "Inspection Details")}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("updateStatus.scheduledDate", "Scheduled Date")} *</Label>
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
                                : t("updateStatus.pickDate", "Pick a date")}
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
                        <Label htmlFor="inspectionTime">{t("updateStatus.scheduledTime", "Scheduled Time")} *</Label>
                        <Input
                          id="inspectionTime"
                          type="time"
                          value={inspectionTime}
                          onChange={(e) => setInspectionTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inspectorName">{t("updateStatus.inspectorName", "Inspector Name")} *</Label>
                      <Input
                        id="inspectorName"
                        placeholder={t("updateStatus.inspectorPlaceholder", "Enter inspector's name")}
                        value={inspectorName}
                        onChange={(e) => setInspectorName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inspectionNotes">{t("updateStatus.additionalNotes", "Additional Notes")}</Label>
                      <Textarea
                        id="inspectionNotes"
                        placeholder={t("updateStatus.additionalNotesPlaceholder", "Any additional inspection notes...")}
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
                      {t("updateStatus.resolutionDetails", "Resolution Details")}
                    </h4>

                    <div className="space-y-2">
                      <Label htmlFor="resolutionSummary">
                        {t("updateStatus.resolutionSummary", "Resolution Summary")} *
                      </Label>
                      <Textarea
                        id="resolutionSummary"
                        placeholder={t("updateStatus.resolutionPlaceholder", "Describe how the issue was resolved...")}
                        value={resolutionSummary}
                        onChange={(e) => setResolutionSummary(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t("updateStatus.resolutionImages", "Resolution Images")}</Label>
                      <div className="flex flex-wrap gap-3">
                        {resolutionPreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Resolution ${index + 1}`}
                              className="w-24 h-24 object-cover rounded-lg border"
                            />
                            <button type="button"
                              onClick={() => removeImage(index, "resolution")}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {resolutionImages.length < 3 && (
                          <button type="button"
                            onClick={() =>
                              resolutionFileInputRef.current?.click()
                            }
                            className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-green-500 hover:text-green-600 transition-colors"
                          >
                            <Image className="w-5 h-5" />
                            <span className="text-xs">{t("updateStatus.addPhoto", "Add Photo")}</span>
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
                      <Label>{t("updateStatus.completionDate", "Completion Date")}</Label>
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
                              : t("updateStatus.selectCompletionDate", "Select completion date")}
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
                        {t("updateStatus.readyForFeedback", "Mark as \"Ready for Citizen Feedback\"")}
                      </Label>
                    </div>
                  </div>
                )}

                {/* Conditional: Rejection Details */}
                {newStatus === "Rejected" && (
                  <div className="p-4 bg-red-50 rounded-lg space-y-4 border border-red-200">
                    <h4 className="font-medium text-red-900 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      {t("updateStatus.rejectionDetails", "Rejection Details")}
                    </h4>

                    <div className="space-y-2">
                      <Label>{t("updateStatus.rejectionReason", "Rejection Reason")} *</Label>
                      <Select
                        value={rejectionReason}
                        onValueChange={setRejectionReason}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("updateStatus.selectReason", "Select reason")} />
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
                        {t("updateStatus.detailedExplanation", "Detailed Explanation")} *
                      </Label>
                      <Textarea
                        id="rejectionExplanation"
                        placeholder={t("updateStatus.rejectionPlaceholder", "Provide a detailed explanation for the rejection...")}
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
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                disabled={isResolvedComplaint}
              >
                <CheckCircle className="w-4 h-4" />
                {t("updateStatus.updateStatus", "Update Status")}
              </Button>
              <Button variant="ghost" onClick={() => navigate(-1)}>
                {t("common.cancel", "Cancel")}
              </Button>
            </div>
          </div>

          {/* Timeline Preview */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  {t("updateStatus.timelinePreview", "Timeline Preview")}
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
                          {t("updateStatus.statusUpdatedTo", "Status updated to")} {newStatus}
                        </p>
                        {actionNotes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {actionNotes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {t("updateStatus.pendingConfirmation", "Pending confirmation")}
                        </p>
                      </div>
                    </div>
                  )}

                  {timelineEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("updateStatus.noTimeline", "No timeline entries available.")}
                    </p>
                  ) : (
                    timelineEntries.slice(0, 8).map((entry, index) => (
                      <div key={`${entry.status}-${index}`} className="relative pl-6 pb-4 border-l-2 border-muted">
                        <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-primary/100 -translate-x-1/2" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{entry.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.updatedAt ? entry.updatedAt.toLocaleString() : "-"}{" - "}{entry.actor}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
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
              {t("updateStatus.confirmTitle", "Confirm Status Update")}
            </DialogTitle>
            <DialogDescription>
              {t("updateStatus.confirmDesc", "You are about to update the status of complaint")}{" "}
              <span className="font-mono font-medium">{complaint.complaintId}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">{t("updateStatus.from", "From")}:</div>
              <Badge
                className={cn(
                  "text-white",
                  getStatusColor(currentStatus)
                )}
              >
                {currentStatus}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">{t("updateStatus.to", "To")}:</div>
              <Badge className={cn("text-white", getStatusColor(newStatus))}>
                {newStatus}
              </Badge>
            </div>

            {actionNotes && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("updateStatus.actionNotes", "Action Notes")}:
                </p>
                <p className="text-sm">{actionNotes}</p>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {t("updateStatus.confirmWarning", "This action will notify the citizen about the status change. Are you sure you want to proceed?")}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={confirmSubmit}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("updateStatus.updating", "Updating...")}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {t("updateStatus.confirmUpdate", "Confirm Update")}
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

