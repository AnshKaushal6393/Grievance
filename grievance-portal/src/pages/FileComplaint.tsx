import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import complaintService from "@/services/complaintService";
import { motion } from "framer-motion";
import {
  FileText,
  MapPin,
  Upload,
  X,
  Image,
  Video,
  ArrowRight,
  Save,
  ChevronDown,
  Search,
  Check,
  Locate,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
}

const FileComplaint = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftIdFromQuery = searchParams.get("draftId");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const geocodeTimeoutRef = useRef<number | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const categories = [
    { value: "Roads & Infrastructure", label: "Roads & Infrastructure" },
    { value: "Water Supply", label: "Water Supply" },
    { value: "Electricity", label: "Electricity" },
    { value: "Sanitation & Garbage", label: "Sanitation & Garbage" },
    { value: "Drainage & Sewage", label: "Drainage & Sewage" },
    { value: "Street Lights", label: "Street Lights" },
    { value: "Parks & Gardens", label: "Parks & Gardens" },
    { value: "Pollution", label: "Pollution" },
    { value: "Encroachment", label: "Encroachment" },
    { value: "Other", label: "Other" },
  ];

  const filteredCategories = categories.filter((cat) =>
    cat.label.toLowerCase().includes(categorySearch.toLowerCase()),
  );

  const selectedCategory = categories.find((cat) => cat.value === category);

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          setAddress(
            `Lat: ${lat}, Long: ${lng}`,
          );
          setLatitude(lat);
          setLongitude(lng);
          setGeocodeError(null);
          setIsLocating(false);
        },
        () => {
          setAddress(t("file.placeholderAddress"));
          setLatitude(null);
          setLongitude(null);
          setGeocodeError(null);
          setIsLocating(false);
        },
      );
    } else {
      setAddress(t("file.placeholderAddress"));
      setLatitude(null);
      setLongitude(null);
      setGeocodeError(null);
      setIsLocating(false);
    }
  };

  const isCoordinateAddress = (value: string) => {
    return /^lat:\s*-?\d+(\.\d+)?\s*,\s*long:\s*-?\d+(\.\d+)?$/i.test(
      value.trim(),
    );
  };

  useEffect(() => {
    const query = address.trim();
    if (!query) {
      setLatitude(null);
      setLongitude(null);
      setGeocodeError(null);
      return;
    }
    if (isCoordinateAddress(query)) return;

    if (geocodeTimeoutRef.current) {
      window.clearTimeout(geocodeTimeoutRef.current);
    }
    if (geocodeAbortRef.current) {
      geocodeAbortRef.current.abort();
    }

    geocodeTimeoutRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      geocodeAbortRef.current = controller;
      setIsGeocoding(true);
      setGeocodeError(null);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Accept-Language": "en",
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Geocoding failed");
        }
        const results = await response.json();
        if (results && results.length > 0) {
          const lat = Number(Number(results[0].lat).toFixed(6));
          const lng = Number(Number(results[0].lon).toFixed(6));
          setLatitude(lat);
          setLongitude(lng);
          setGeocodeError(null);
        } else {
          setLatitude(null);
          setLongitude(null);
          setGeocodeError("No location found for this address.");
        }
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          setLatitude(null);
          setLongitude(null);
          setGeocodeError("Failed to geocode address.");
        }
      } finally {
        setIsGeocoding(false);
      }
    }, 700);

    return () => {
      if (geocodeTimeoutRef.current) {
        window.clearTimeout(geocodeTimeoutRef.current);
      }
      if (geocodeAbortRef.current) {
        geocodeAbortRef.current.abort();
      }
    };
  }, [address]);

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const newFiles: UploadedFile[] = [];
      const maxFiles = 5;
      const maxSize = 10 * 1024 * 1024; // 10MB

      Array.from(files).forEach((file) => {
        if (uploadedFiles.length + newFiles.length >= maxFiles) return;
        if (file.size > maxSize) return;

        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if (isImage || isVideo) {
          newFiles.push({
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file),
            type: isImage ? "image" : "video",
          });
        }
      });

      setUploadedFiles((prev) => [...prev, ...newFiles]);
    },
    [uploadedFiles.length],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const buildFormData = () => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("address", address);
    if (latitude !== null) formData.append("latitude", String(latitude));
    if (longitude !== null) formData.append("longitude", String(longitude));
    uploadedFiles.forEach((file) => {
      formData.append("attachments", file.file);
    });
    return formData;
  };

  useEffect(() => {
    const loadDraft = async () => {
      if (!draftIdFromQuery) return;
      setIsLoadingDraft(true);
      try {
        const response = await complaintService.getComplaint(draftIdFromQuery);
        const complaint = response?.data?.complaint;
        if (!complaint?.isDraft) {
          toast.error(t("file.draftLoadFailed"));
          navigate("/dashboard");
          return;
        }
        setCurrentDraftId(String(complaint._id));
        setTitle(complaint.title || "");
        setCategory(complaint.category || "");
        setDescription(complaint.description || "");
        setAddress(complaint.location?.address || "");
        const lat = complaint.location?.coordinates?.latitude;
        const lng = complaint.location?.coordinates?.longitude;
        setLatitude(typeof lat === "number" ? lat : null);
        setLongitude(typeof lng === "number" ? lng : null);
      } catch {
        toast.error(t("file.draftLoadFailed"));
        navigate("/dashboard");
      } finally {
        setIsLoadingDraft(false);
      }
    };
    void loadDraft();
  }, [draftIdFromQuery, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = buildFormData();
      let response;
      if (currentDraftId) {
        await complaintService.updateDraft(currentDraftId, formData);
        response = await complaintService.submitDraft(currentDraftId);
      } else {
        response = await complaintService.fileComplaint(formData);
      }

      toast.success(`Complaint filed: ${response.data.complaint.complaintId || response.data.complaint._id}`);
      navigate("/my-complaints");
    } catch (error: any) {
      toast.error(t("file.fileFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const formData = buildFormData();
      let response;
      if (currentDraftId) {
        response = await complaintService.updateDraft(currentDraftId, formData);
      } else {
        response = await complaintService.saveDraft(formData);
        const newDraftId = response?.data?.complaint?._id;
        if (newDraftId) {
          setCurrentDraftId(String(newDraftId));
          navigate(`/file-complaint?draftId=${newDraftId}`, { replace: true });
        }
      }
      toast.success(response?.message || t("file.draftSaved"));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("file.fileFailed"));
    } finally {
      setIsSavingDraft(false);
    }
  };

  const mapEmbedUrl =
    latitude !== null && longitude !== null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`
      : null;

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-muted/40 to-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {currentDraftId ? t("file.titleEdit") : t("file.titleNew")}
            </h1>
            <p className="text-gray-500 mt-2">
              {isLoadingDraft
                ? t("file.subtitleLoading")
                : currentDraftId
                  ? t("file.subtitleEdit")
                  : t("file.subtitleNew")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t("file.labelTitle")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("file.placeholderTitle")}
                required
                className="w-full py-3 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Category Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t("file.labelCategory")} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                  className={`w-full py-3 px-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                    isCategoryOpen
                      ? "border-primary ring-2 ring-blue-500 bg-white"
                      : "border-gray-200 bg-gray-50 hover:bg-white"
                  }`}
                >
                  <span
                    className={
                      selectedCategory ? "text-gray-900" : "text-gray-400"
                    }
                  >
                    {selectedCategory?.label || t("file.placeholderCategory")}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isCategoryOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
                  >
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder={t("file.searchCategories")}
                          className="w-full py-2 pl-9 pr-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredCategories.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => {
                            setCategory(cat.value);
                            setIsCategoryOpen(false);
                            setCategorySearch("");
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                            category === cat.value
                              ? "bg-primary/10 text-primary"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span>{cat.label}</span>
                          {category === cat.value && (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t("file.labelDescription")} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("file.placeholderDescription")}
                rows={6}
                required
                className="w-full py-3 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400 resize-none"
              />
            </div>

            {/* Location Section */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("file.labelLocation")}
              </label>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="flex items-center gap-2 py-3 h-auto rounded-xl"
                >
                  {isLocating ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                    >
                      <Locate className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <MapPin className="w-5 h-5" />
                  )}
                  {isLocating ? t("file.gettingLocation") : t("file.useCurrentLocation")}
                </Button>

                <span className="text-gray-400 self-center hidden sm:block">
                  {t("file.or")}
                </span>

                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("file.placeholderAddress")}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* Map Preview Placeholder */}
              {mapEmbedUrl ? (
                <div className="w-full h-48 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                  <iframe
                    title="Interactive map"
                    src={mapEmbedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                  <MapPin className="w-10 h-10 mb-2" />
                  <span className="text-sm">{t("file.mapPlaceholder")}</span>
                </div>
              )}
              {isGeocoding && (
                <p className="text-sm text-gray-500">{t("file.findingLocation")}</p>
              )}
              {geocodeError && (
                <p className="text-sm text-red-500">{geocodeError}</p>
              )}
            </div>

            {/* Media Upload */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("file.labelMedia")}
              </label>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-primary/10/50"
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors ${
                      isDragging ? "bg-primary/15" : "bg-gray-200"
                    }`}
                  >
                    <Upload
                      className={`w-6 h-6 ${isDragging ? "text-primary" : "text-gray-500"}`}
                    />
                  </div>
                  <p className="text-gray-700 font-medium">
                    {t("file.uploadHint")}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {t("file.uploadSubHint")}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Uploaded Files Preview */}
              {uploadedFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {uploadedFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                        {file.type === "image" ? (
                          <img
                            src={file.preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Video className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-1 left-1">
                        {file.type === "image" ? (
                          <Image className="w-4 h-4 text-white drop-shadow" />
                        ) : (
                          <Video className="w-4 h-4 text-white drop-shadow" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {uploadedFiles.length > 0 && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {uploadedFiles.length}/5 {t("file.uploadCount")}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSubmitting || isSavingDraft || isLoadingDraft}
                className="flex-1 py-4 h-auto text-lg font-semibold rounded-xl"
              >
                <Save className="w-5 h-5 mr-2" />
                {isSavingDraft ? t("file.savingDraft") : t("file.saveDraft")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isSavingDraft || isLoadingDraft}
                className="flex-1 py-4 h-auto text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:from-gray-400 disabled:to-gray-500 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                {" "}
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t("file.submitting")}
                  </>
                ) : (
                  <>
                    {" "}
                    {t("file.submitComplaint")}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default FileComplaint;
