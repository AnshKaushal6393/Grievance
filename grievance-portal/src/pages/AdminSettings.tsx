import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  Database,
  Gauge,
  GripVertical,
  KeyRound,
  Mail,
  Megaphone,
  Pencil,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Trash2,
  Webhook,
  Send,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import adminService from "@/services/adminService";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

type SettingsSection =
  | "general"
  | "notifications"
  | "sla"
  | "categories"
  | "templates"
  | "system"
  | "api"
  | "backup";

const navItems: Array<{ id: SettingsSection; label: string; icon: React.ElementType }> = [
  { id: "general", label: "General Settings", icon: Settings2 },
  { id: "notifications", label: "Notification Settings", icon: Bell },
  { id: "sla", label: "SLA Configuration", icon: Gauge },
  { id: "categories", label: "Category Management", icon: Tag },
  { id: "templates", label: "Email Templates", icon: Mail },
  { id: "system", label: "System Preferences", icon: SlidersHorizontal },
  { id: "api", label: "API Settings", icon: Webhook },
  { id: "backup", label: "Backup & Security", icon: ShieldCheck },
];

const templateNames = ["Welcome", "Complaint Filed", "Status Updated", "SLA Breach", "Password Reset"];
const departmentOptions = ["Public Works", "Water Supply", "Electricity", "Sanitation", "Traffic", "Health"];

type CategoryIconKey = "tag" | "gauge" | "mail" | "shield" | "bell" | "settings";
type CategoryItem = {
  id: string;
  name: string;
  icon: CategoryIconKey;
  departments: string[];
  active: boolean;
};

const CATEGORY_ICON_LIBRARY: Record<CategoryIconKey, React.ElementType> = {
  tag: Tag,
  gauge: Gauge,
  mail: Mail,
  shield: ShieldCheck,
  bell: Bell,
  settings: Settings2,
};

type SettingsState = {
  general: {
    siteName: string;
    logoDataUrl: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    workingHours: string;
    holidays: string[];
  };
  notifications: {
    email: {
      newComplaint: boolean;
      statusUpdated: boolean;
      complaintResolved: boolean;
      slaBreach: boolean;
      dailySummary: boolean;
    };
    sms: {
      criticalComplaints: boolean;
      resolutionUpdates: boolean;
    };
    push: {
      realTimeUpdates: boolean;
      departmentMentions: boolean;
    };
  };
  sla: {
    critical: { targetHours: number; escalationHours: number; alertBeforeHours: number };
    high: { targetHours: number; escalationHours: number; alertBeforeHours: number };
    medium: { targetHours: number; escalationHours: number; alertBeforeHours: number };
    low: { targetHours: number; escalationHours: number; alertBeforeHours: number };
  };
  categories: CategoryItem[];
  templates: {
    selected: string;
    subject: string;
    body: string;
  };
  system: {
    maintenanceMode: boolean;
    defaultLanguage: string;
    auditLogs: boolean;
    autoArchiveDays: number;
  };
  api: {
    apiBaseUrl: string;
    rateLimitPerMin: number;
    allowedOrigins: string;
    webhookUrl: string;
  };
  backup: {
    autoBackup: boolean;
    backupFrequency: string;
    retentionDays: number;
    force2FA: boolean;
    sessionTimeoutMin: number;
  };
};

type AdminAudienceUser = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

type AdminAudienceDepartment = {
  id: string;
  name: string;
};

type BroadcastHistoryItem = {
  batchId: string;
  createdAt: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  actionUrl?: string;
  channels?: { inApp?: boolean; email?: boolean; sms?: boolean; push?: boolean };
  sentByName?: string;
  recipientCount: number;
  sendToAllUsers?: boolean;
  roleFilters?: string[];
};

const defaultSettings: SettingsState = {
  general: {
    siteName: "Grievance Management System",
    logoDataUrl: "",
    contactEmail: "support@grievance.gov",
    contactPhone: "+91 9876543210",
    address: "Municipal Corporation Office, Civil Lines, City Center",
    workingHours: "Mon-Fri: 09:00 AM - 06:00 PM",
    holidays: ["2026-01-26", "2026-08-15", "2026-10-02"],
  },
  notifications: {
    email: {
      newComplaint: true,
      statusUpdated: true,
      complaintResolved: true,
      slaBreach: true,
      dailySummary: true,
    },
    sms: {
      criticalComplaints: true,
      resolutionUpdates: true,
    },
    push: {
      realTimeUpdates: false,
      departmentMentions: true,
    },
  },
  sla: {
    critical: { targetHours: 4, escalationHours: 2, alertBeforeHours: 1 },
    high: { targetHours: 24, escalationHours: 12, alertBeforeHours: 4 },
    medium: { targetHours: 72, escalationHours: 36, alertBeforeHours: 8 },
    low: { targetHours: 168, escalationHours: 96, alertBeforeHours: 24 },
  },
  categories: [
    { id: "cat-1", name: "Roads & Infrastructure", icon: "gauge", departments: ["Public Works"], active: true },
    { id: "cat-2", name: "Water Supply", icon: "tag", departments: ["Water Supply"], active: true },
    { id: "cat-3", name: "Electricity", icon: "bell", departments: ["Electricity"], active: true },
    { id: "cat-4", name: "Sanitation & Garbage", icon: "settings", departments: ["Sanitation"], active: true },
  ],
  templates: {
    selected: "Complaint Filed",
    subject: "Complaint {{complaintId}} has been filed",
    body: "Hello {{name}}, your complaint {{complaintId}} is received and under review.",
  },
  system: {
    maintenanceMode: false,
    defaultLanguage: "en",
    auditLogs: true,
    autoArchiveDays: 180,
  },
  api: {
    apiBaseUrl: "https://api.grievance.gov/v1",
    rateLimitPerMin: 120,
    allowedOrigins: "http://localhost:5173,https://portal.grievance.gov",
    webhookUrl: "",
  },
  backup: {
    autoBackup: true,
    backupFrequency: "daily",
    retentionDays: 30,
    force2FA: true,
    sessionTimeoutMin: 30,
  },
};

const normalizeSettings = (parsed: any): SettingsState => {
  try {
    if (!parsed || typeof parsed !== "object") return defaultSettings;
    return {
      ...defaultSettings,
      ...parsed,
      general: {
        ...defaultSettings.general,
        ...parsed.general,
        // Support older key from previous version if present
        siteName: parsed?.general?.siteName || parsed?.general?.portalName || defaultSettings.general.siteName,
      },
      notifications: {
        ...defaultSettings.notifications,
        ...(parsed.notifications?.emailEnabled !== undefined
          ? {
              email: {
                newComplaint: !!parsed.notifications.emailEnabled,
                statusUpdated: true,
                complaintResolved: true,
                slaBreach: !!parsed.notifications.escalationAlerts,
                dailySummary: !!parsed.notifications.dailyDigest,
              },
              sms: {
                criticalComplaints: !!parsed.notifications.smsEnabled,
                resolutionUpdates: !!parsed.notifications.smsEnabled,
              },
              push: {
                realTimeUpdates: !!parsed.notifications.pushEnabled,
                departmentMentions: !!parsed.notifications.pushEnabled,
              },
            }
          : parsed.notifications),
      },
      sla: {
        ...defaultSettings.sla,
        ...(parsed.sla?.lowHours !== undefined
          ? {
              low: { targetHours: parsed.sla.lowHours, escalationHours: Math.max(1, Math.floor(parsed.sla.lowHours / 2)), alertBeforeHours: 24 },
              medium: { targetHours: parsed.sla.mediumHours, escalationHours: Math.max(1, Math.floor(parsed.sla.mediumHours / 2)), alertBeforeHours: 8 },
              high: { targetHours: parsed.sla.highHours, escalationHours: Math.max(1, Math.floor(parsed.sla.highHours / 2)), alertBeforeHours: 4 },
              critical: { targetHours: parsed.sla.criticalHours, escalationHours: Math.max(1, Math.floor(parsed.sla.criticalHours / 2)), alertBeforeHours: 1 },
            }
          : parsed.sla),
      },
      templates: { ...defaultSettings.templates, ...parsed.templates },
      system: { ...defaultSettings.system, ...parsed.system },
      api: { ...defaultSettings.api, ...parsed.api },
      backup: { ...defaultSettings.backup, ...parsed.backup },
      categories: Array.isArray(parsed.categories)
        ? parsed.categories.map((item: string | CategoryItem, idx: number) =>
            typeof item === "string"
              ? { id: `cat-legacy-${idx}`, name: item, icon: "tag", departments: [], active: true }
              : { ...item, id: item.id || `cat-${idx}` },
          )
        : defaultSettings.categories,
    };
  } catch {
    return defaultSettings;
  }
};

const AdminSettings = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [section, setSection] = useState<SettingsSection>("general");
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<CategoryIconKey>("tag");
  const [newCategoryDepartments, setNewCategoryDepartments] = useState<string[]>([]);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newHoliday, setNewHoliday] = useState("");
  const [audienceUsers, setAudienceUsers] = useState<AdminAudienceUser[]>([]);
  const [audienceDepartments, setAudienceDepartments] = useState<AdminAudienceDepartment[]>([]);
  const [isLoadingAudience, setIsLoadingAudience] = useState(false);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [audienceSearch, setAudienceSearch] = useState("");
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    actionUrl: "",
    sendToAllUsers: false,
    selectedUserIds: [] as string[],
    selectedDepartmentIds: [] as string[],
    channels: {
      inApp: true,
      email: true,
      sms: false,
      push: false,
    },
    roles: {
      user: true,
      officer: true,
      admin: false,
    },
  });

  const sectionTitle = useMemo(() => navItems.find((item) => item.id === section)?.label || t("settings.title"), [section, t]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await adminService.getSettings();
        const remote = response?.data?.settings;
        if (!mounted) return;
        setSettings(remote ? normalizeSettings(remote) : defaultSettings);
      } catch (error: any) {
        if (!mounted) return;
        toast.error(error?.response?.data?.message || "Failed to load settings");
        setSettings(defaultSettings);
      } finally {
        if (mounted) setIsLoadingSettings(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (section !== "notifications") return;
    let mounted = true;
    const loadAudience = async () => {
      try {
        setIsLoadingAudience(true);
        const [usersRes, departmentsRes] = await Promise.all([
          adminService.getAllUsers({ limit: 300, status: "active" }),
          adminService.getDepartments(),
        ]);
        if (!mounted) return;
        const users = (usersRes?.data?.users || []).map((u: any) => ({
          id: String(u.id || u._id),
          name: u.name || "User",
          email: u.email || "",
          role: u.role || "",
        }));
        const departments = (departmentsRes?.data?.departments || []).map(
          (d: any) => ({
            id: String(d._id || d.id),
            name: d.name || "Department",
          }),
        );
        setAudienceUsers(users);
        setAudienceDepartments(departments);
      } catch (error: any) {
        if (!mounted) return;
        toast.error(error?.response?.data?.message || "Failed to load audience data");
      } finally {
        if (mounted) setIsLoadingAudience(false);
      }
    };
    void loadAudience();
    return () => {
      mounted = false;
    };
  }, [section]);

  const loadBroadcastHistory = async (page = 1) => {
    try {
      setIsLoadingHistory(true);
      const response = await adminService.getBroadcastAnnouncementHistory(page, 10);
      const history = response?.data?.history || [];
      const pagination = response?.data?.pagination || {};
      setBroadcastHistory(history);
      setHistoryPage(pagination.page || 1);
      setHistoryPages(pagination.pages || 1);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load broadcast history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (section !== "notifications") return;
    void loadBroadcastHistory(1);
  }, [section]);

  const saveAll = async () => {
    try {
      setIsSaving(true);
      await adminService.updateSettings(settings as unknown as Record<string, any>);
      toast.success(t("settings.saveChanges"));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const resetDefaults = () => {
    setSettings(defaultSettings);
    toast.success("Settings reset to default values");
  };

  const addCategory = () => {
    const next = newCategory.trim();
    if (!next) return;
    if (settings.categories.some((item) => item.name.toLowerCase() === next.toLowerCase())) {
      toast.error("Category already exists");
      return;
    }
    const category: CategoryItem = {
      id: `cat-${Date.now()}`,
      name: next,
      icon: newCategoryIcon,
      departments: [...newCategoryDepartments],
      active: true,
    };
    setSettings((prev) => ({ ...prev, categories: [...prev.categories, category] }));
    setNewCategory("");
    setNewCategoryDepartments([]);
    setNewCategoryIcon("tag");
  };

  const removeCategory = (categoryId: string) => {
    setSettings((prev) => ({ ...prev, categories: prev.categories.filter((item) => item.id !== categoryId) }));
  };

  const updateCategory = (categoryId: string, patch: Partial<CategoryItem>) => {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.map((item) => (item.id === categoryId ? { ...item, ...patch } : item)),
    }));
  };

  const onDropCategory = (targetId: string) => {
    if (!draggingCategoryId || draggingCategoryId === targetId) return;
    setSettings((prev) => {
      const list = [...prev.categories];
      const fromIndex = list.findIndex((item) => item.id === draggingCategoryId);
      const toIndex = list.findIndex((item) => item.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...prev, categories: list };
    });
    setDraggingCategoryId(null);
  };

  const onLogoChange = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      setSettings((prev) => ({ ...prev, general: { ...prev.general, logoDataUrl: dataUrl } }));
    };
    reader.readAsDataURL(file);
  };

  const addHoliday = () => {
    if (!newHoliday) return;
    if (settings.general.holidays.includes(newHoliday)) {
      toast.error("Holiday already added");
      return;
    }
    setSettings((prev) => ({
      ...prev,
      general: { ...prev.general, holidays: [...prev.general.holidays, newHoliday].sort() },
    }));
    setNewHoliday("");
  };

  const removeHoliday = (holiday: string) => {
    setSettings((prev) => ({
      ...prev,
      general: { ...prev.general, holidays: prev.general.holidays.filter((item) => item !== holiday) },
    }));
  };

  const toggleSelection = (list: string[], id: string) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

  const handleSendBroadcast = async () => {
    const title = broadcastForm.title.trim();
    const message = broadcastForm.message.trim();
    if (!title || !message) {
      toast.error("Announcement title and message are required");
      return;
    }
    if (
      !broadcastForm.sendToAllUsers &&
      broadcastForm.selectedUserIds.length === 0 &&
      broadcastForm.selectedDepartmentIds.length === 0
    ) {
      toast.error("Select users or departments, or enable send to all users");
      return;
    }

    const roles = Object.entries(broadcastForm.roles)
      .filter(([, enabled]) => enabled)
      .map(([role]) => role) as Array<"user" | "officer" | "admin">;

    try {
      setIsSendingBroadcast(true);
      const response = await adminService.broadcastAnnouncement({
        title,
        message,
        priority: broadcastForm.priority,
        actionUrl: broadcastForm.actionUrl.trim(),
        channels: broadcastForm.channels,
        recipientUserIds: broadcastForm.sendToAllUsers ? [] : broadcastForm.selectedUserIds,
        recipientDepartmentIds: broadcastForm.sendToAllUsers ? [] : broadcastForm.selectedDepartmentIds,
        sendToAllUsers: broadcastForm.sendToAllUsers,
        roles: roles.length ? roles : ["user", "officer"],
      });
      const recipients = response?.data?.recipients ?? 0;
      toast.success(`Announcement sent to ${recipients} recipients`);
      await loadBroadcastHistory(1);
      setBroadcastForm((prev) => ({
        ...prev,
        title: "",
        message: "",
        actionUrl: "",
      }));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send announcement");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar branding={{ siteName: settings.general.siteName, logoDataUrl: settings.general.logoDataUrl }} />
      <main id="main-content" className="container mx-auto px-4 py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t("settings.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetDefaults}>{t("settings.resetDefaults")}</Button>
            <Button className="gap-2" onClick={saveAll} disabled={isLoadingSettings || isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? t("settings.saving") : t("settings.saveChanges")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>{t("settings.configuration")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                      active ? "border-primary bg-primary/10 text-primary" : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{sectionTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSettings ? (
                <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">{t("settings.loading")}</div>
              ) : (
                <>
              {section === "general" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-1 block">Site Name</Label>
                    <Input value={settings.general.siteName} onChange={(e) => setSettings((prev) => ({ ...prev, general: { ...prev.general, siteName: e.target.value } }))} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Site Logo</Label>
                    <Input type="file" accept="image/*" onChange={(e) => onLogoChange(e.target.files?.[0])} />
                    {settings.general.logoDataUrl ? (
                      <img src={settings.general.logoDataUrl} alt="Site logo" className="mt-2 h-12 w-12 rounded border object-cover" />
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">No logo uploaded</p>
                    )}
                  </div>
                  <div>
                    <Label className="mb-1 block">Contact Email</Label>
                    <Input type="email" value={settings.general.contactEmail} onChange={(e) => setSettings((prev) => ({ ...prev, general: { ...prev.general, contactEmail: e.target.value } }))} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Contact Phone</Label>
                    <Input value={settings.general.contactPhone} onChange={(e) => setSettings((prev) => ({ ...prev, general: { ...prev.general, contactPhone: e.target.value } }))} />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1 block">Address</Label>
                    <Textarea rows={3} value={settings.general.address} onChange={(e) => setSettings((prev) => ({ ...prev, general: { ...prev.general, address: e.target.value } }))} />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1 block">Working Hours</Label>
                    <Input value={settings.general.workingHours} onChange={(e) => setSettings((prev) => ({ ...prev, general: { ...prev.general, workingHours: e.target.value } }))} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="mb-1 block">Holidays List</Label>
                    <div className="flex gap-2">
                      <Input type="date" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} />
                      <Button type="button" variant="outline" onClick={addHoliday}>Add Holiday</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {settings.general.holidays.length === 0 ? (
                        <span className="text-xs text-slate-500">No holidays configured</span>
                      ) : (
                        settings.general.holidays.map((holiday) => (
                          <Badge key={holiday} className="cursor-pointer" onClick={() => removeHoliday(holiday)}>
                            {holiday} ×
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2 pt-2">
                    <Button className="gap-2" onClick={saveAll}>
                      <Save className="h-4 w-4" />
                      {t("settings.saveChanges")}
                    </Button>
                  </div>
                </div>
              )}

              {section === "notifications" && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-3 font-semibold text-slate-900">Email Notifications</h3>
                    <div className="space-y-2">
                      {[
                        { key: "newComplaint", label: "New complaint received" },
                        { key: "statusUpdated", label: "Status updated" },
                        { key: "complaintResolved", label: "Complaint resolved" },
                        { key: "slaBreach", label: "SLA breach alert" },
                        { key: "dailySummary", label: "Daily summary" },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center gap-2 rounded border p-3">
                          <Checkbox
                            checked={settings.notifications.email[item.key as keyof SettingsState["notifications"]["email"]]}
                            onCheckedChange={(v) =>
                              setSettings((prev) => ({
                                ...prev,
                                notifications: {
                                  ...prev.notifications,
                                  email: { ...prev.notifications.email, [item.key]: Boolean(v) },
                                },
                              }))
                            }
                          />
                          <span className="text-sm">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="mb-3 font-semibold text-slate-900">SMS Notifications</h3>
                    <div className="space-y-2">
                      {[
                        { key: "criticalComplaints", label: "Critical complaints" },
                        { key: "resolutionUpdates", label: "Resolution updates" },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center gap-2 rounded border p-3">
                          <Checkbox
                            checked={settings.notifications.sms[item.key as keyof SettingsState["notifications"]["sms"]]}
                            onCheckedChange={(v) =>
                              setSettings((prev) => ({
                                ...prev,
                                notifications: {
                                  ...prev.notifications,
                                  sms: { ...prev.notifications.sms, [item.key]: Boolean(v) },
                                },
                              }))
                            }
                          />
                          <span className="text-sm">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="mb-3 font-semibold text-slate-900">Push Notifications</h3>
                    <div className="space-y-2">
                      {[
                        { key: "realTimeUpdates", label: "Real-time updates" },
                        { key: "departmentMentions", label: "Department mentions" },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center gap-2 rounded border p-3">
                          <Checkbox
                            checked={settings.notifications.push[item.key as keyof SettingsState["notifications"]["push"]]}
                            onCheckedChange={(v) =>
                              setSettings((prev) => ({
                                ...prev,
                                notifications: {
                                  ...prev.notifications,
                                  push: { ...prev.notifications.push, [item.key]: Boolean(v) },
                                },
                              }))
                            }
                          />
                          <span className="text-sm">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-slate-900">Broadcast Announcement</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <Label className="mb-1 block">Announcement Title</Label>
                        <Input
                          value={broadcastForm.title}
                          onChange={(e) =>
                            setBroadcastForm((prev) => ({ ...prev, title: e.target.value }))
                          }
                          placeholder="Service disruption update"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="mb-1 block">Message</Label>
                        <Textarea
                          rows={4}
                          value={broadcastForm.message}
                          onChange={(e) =>
                            setBroadcastForm((prev) => ({ ...prev, message: e.target.value }))
                          }
                          placeholder="Share your announcement details..."
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block">Priority</Label>
                        <Select
                          value={broadcastForm.priority}
                          onValueChange={(value) =>
                            setBroadcastForm((prev) => ({
                              ...prev,
                              priority: value as "low" | "medium" | "high" | "critical",
                            }))
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-1 block">Action URL (optional)</Label>
                        <Input
                          value={broadcastForm.actionUrl}
                          onChange={(e) =>
                            setBroadcastForm((prev) => ({ ...prev, actionUrl: e.target.value }))
                          }
                          placeholder="/admin/reports"
                        />
                      </div>
                    </div>

                    <div className="rounded-md border p-3 space-y-3">
                      <Label className="text-sm font-semibold">Delivery Channels</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { key: "inApp", label: "In-App" },
                          { key: "email", label: "Email" },
                          { key: "sms", label: "SMS" },
                          { key: "push", label: "Push" },
                        ].map((item) => (
                          <label key={item.key} className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm">
                            <Checkbox
                              checked={broadcastForm.channels[item.key as keyof typeof broadcastForm.channels]}
                              onCheckedChange={(checked) =>
                                setBroadcastForm((prev) => ({
                                  ...prev,
                                  channels: {
                                    ...prev.channels,
                                    [item.key]: Boolean(checked),
                                  },
                                }))
                              }
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-md border p-3 space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          checked={broadcastForm.sendToAllUsers}
                          onCheckedChange={(checked) =>
                            setBroadcastForm((prev) => ({
                              ...prev,
                              sendToAllUsers: Boolean(checked),
                            }))
                          }
                        />
                        Send to all users (by selected roles)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["user", "officer", "admin"] as const).map((role) => (
                          <label key={role} className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm capitalize">
                            <Checkbox
                              checked={broadcastForm.roles[role]}
                              onCheckedChange={(checked) =>
                                setBroadcastForm((prev) => ({
                                  ...prev,
                                  roles: { ...prev.roles, [role]: Boolean(checked) },
                                }))
                              }
                            />
                            {role}
                          </label>
                        ))}
                      </div>
                    </div>

                    {!broadcastForm.sendToAllUsers && (
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <div className="rounded-md border p-3">
                          <Label className="mb-2 block text-sm font-semibold">Target Departments</Label>
                          {isLoadingAudience ? (
                            <p className="text-xs text-slate-500">Loading departments...</p>
                          ) : (
                            <div className="max-h-48 overflow-y-auto space-y-2">
                              {audienceDepartments.map((dept) => (
                                <label key={dept.id} className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm">
                                  <Checkbox
                                    checked={broadcastForm.selectedDepartmentIds.includes(dept.id)}
                                    onCheckedChange={() =>
                                      setBroadcastForm((prev) => ({
                                        ...prev,
                                        selectedDepartmentIds: toggleSelection(
                                          prev.selectedDepartmentIds,
                                          dept.id,
                                        ),
                                      }))
                                    }
                                  />
                                  {dept.name}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="rounded-md border p-3">
                          <Label className="mb-2 block text-sm font-semibold">Target Users</Label>
                          <Input
                            className="mb-2"
                            placeholder="Search users..."
                            value={audienceSearch}
                            onChange={(e) => setAudienceSearch(e.target.value)}
                          />
                          {isLoadingAudience ? (
                            <p className="text-xs text-slate-500">Loading users...</p>
                          ) : (
                            <div className="max-h-48 overflow-y-auto space-y-2">
                              {audienceUsers
                                .filter((u) =>
                                  `${u.name} ${u.email || ""}`
                                    .toLowerCase()
                                    .includes(audienceSearch.toLowerCase()),
                                )
                                .map((user) => (
                                  <label key={user.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-sm">
                                    <span className="min-w-0">
                                      <span className="block truncate">{user.name}</span>
                                      <span className="block text-xs text-slate-500 truncate">
                                        {user.email || "No email"} • {user.role || "user"}
                                      </span>
                                    </span>
                                    <Checkbox
                                      checked={broadcastForm.selectedUserIds.includes(user.id)}
                                      onCheckedChange={() =>
                                        setBroadcastForm((prev) => ({
                                          ...prev,
                                          selectedUserIds: toggleSelection(
                                            prev.selectedUserIds,
                                            user.id,
                                          ),
                                        }))
                                      }
                                    />
                                  </label>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Button
                      className="gap-2"
                      onClick={handleSendBroadcast}
                      disabled={isSendingBroadcast}
                    >
                      <Send className="h-4 w-4" />
                      {isSendingBroadcast ? "Sending..." : "Send Announcement"}
                    </Button>

                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-slate-900">Broadcast History</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => loadBroadcastHistory(historyPage)}
                          disabled={isLoadingHistory}
                        >
                          {isLoadingHistory ? "Refreshing..." : "Refresh"}
                        </Button>
                      </div>
                      <div className="overflow-x-auto rounded border">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-slate-700">When</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-700">Title</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-700">Priority</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-700">Recipients</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-700">Channels</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-700">Sent By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {broadcastHistory.map((row) => (
                              <tr key={row.batchId} className="border-t align-top">
                                <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                                  {new Date(row.createdAt).toLocaleString()}
                                </td>
                                <td className="px-3 py-2">
                                  <p className="font-medium text-slate-900">{row.title}</p>
                                  <p className="text-xs text-slate-600 line-clamp-2">{row.message}</p>
                                </td>
                                <td className="px-3 py-2">
                                  <Badge variant="outline" className="capitalize">{row.priority}</Badge>
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {row.recipientCount}
                                  <p className="text-xs text-slate-500">
                                    {row.sendToAllUsers ? "All users" : "Targeted"}
                                  </p>
                                </td>
                                <td className="px-3 py-2 text-xs text-slate-700">
                                  {[
                                    row.channels?.inApp ? "In-App" : null,
                                    row.channels?.email ? "Email" : null,
                                    row.channels?.sms ? "SMS" : null,
                                    row.channels?.push ? "Push" : null,
                                  ]
                                    .filter(Boolean)
                                    .join(", ") || "None"}
                                </td>
                                <td className="px-3 py-2 text-xs text-slate-700">
                                  {row.sentByName || "Admin"}
                                </td>
                              </tr>
                            ))}
                            {!isLoadingHistory && broadcastHistory.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                                  No broadcast announcements sent yet.
                                </td>
                              </tr>
                            )}
                            {isLoadingHistory && (
                              <tr>
                                <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                                  Loading history...
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={historyPage <= 1 || isLoadingHistory}
                          onClick={() => loadBroadcastHistory(historyPage - 1)}
                        >
                          Previous
                        </Button>
                        <span className="text-xs text-slate-600">
                          Page {historyPage} of {historyPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={historyPage >= historyPages || isLoadingHistory}
                          onClick={() => loadBroadcastHistory(historyPage + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {section === "sla" && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left">
                        <tr>
                          <th className="px-3 py-2 font-medium text-slate-700">Priority</th>
                          <th className="px-3 py-2 font-medium text-slate-700">Target Time (hours)</th>
                          <th className="px-3 py-2 font-medium text-slate-700">Escalation Time (hours)</th>
                          <th className="px-3 py-2 font-medium text-slate-700">Alert Before (hours)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(["critical", "high", "medium", "low"] as const).map((priority) => (
                          <tr key={priority} className="border-t">
                            <td className="px-3 py-2 font-medium capitalize">{priority}</td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min={0}
                                value={settings.sla[priority].targetHours}
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    sla: {
                                      ...prev.sla,
                                      [priority]: { ...prev.sla[priority], targetHours: Number(e.target.value) || 0 },
                                    },
                                  }))
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min={0}
                                value={settings.sla[priority].escalationHours}
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    sla: {
                                      ...prev.sla,
                                      [priority]: { ...prev.sla[priority], escalationHours: Number(e.target.value) || 0 },
                                    },
                                  }))
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min={0}
                                value={settings.sla[priority].alertBeforeHours}
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    sla: {
                                      ...prev.sla,
                                      [priority]: { ...prev.sla[priority], alertBeforeHours: Number(e.target.value) || 0 },
                                    },
                                  }))
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button className="gap-2" onClick={saveAll} disabled={isSaving}>
                    <Save className="h-4 w-4" />
                    {isSaving ? t("settings.saving") : "Update SLA Targets"}
                  </Button>
                </div>
              )}

              {section === "categories" && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-3 font-semibold text-slate-900">Add Category</h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="md:col-span-2">
                        <Label className="mb-1 block">Name</Label>
                        <Input placeholder="Enter category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                      </div>
                      <div>
                        <Label className="mb-1 block">Icon</Label>
                        <Select value={newCategoryIcon} onValueChange={(value) => setNewCategoryIcon(value as CategoryIconKey)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(CATEGORY_ICON_LIBRARY) as CategoryIconKey[]).map((iconKey) => (
                              <SelectItem key={iconKey} value={iconKey}>{iconKey}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Label className="mb-2 block">Associated Departments</Label>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {departmentOptions.map((department) => (
                          <label key={department} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                            <Checkbox
                              checked={newCategoryDepartments.includes(department)}
                              onCheckedChange={(checked) =>
                                setNewCategoryDepartments((prev) =>
                                  Boolean(checked) ? [...prev, department] : prev.filter((item) => item !== department),
                                )
                              }
                            />
                            {department}
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button className="mt-3 gap-2" onClick={addCategory}>
                      <Plus className="h-4 w-4" />
                      Add Category
                    </Button>
                  </div>

                  <div className="rounded-lg border">
                    <div className="border-b bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">Drag to reorder categories</div>
                    <div className="divide-y">
                      {settings.categories.map((category) => {
                        const Icon = CATEGORY_ICON_LIBRARY[category.icon];
                        const isEditing = editingCategoryId === category.id;
                        return (
                          <div
                            key={category.id}
                            draggable
                            onDragStart={() => setDraggingCategoryId(category.id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => onDropCategory(category.id)}
                            className="grid grid-cols-1 gap-3 p-3 md:grid-cols-[28px_1fr_auto_auto]"
                          >
                            <div className="flex items-center justify-center text-slate-400">
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <div className="space-y-2">
                              {isEditing ? (
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                  <Input value={category.name} onChange={(e) => updateCategory(category.id, { name: e.target.value })} />
                                  <Select value={category.icon} onValueChange={(value) => updateCategory(category.id, { icon: value as CategoryIconKey })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {(Object.keys(CATEGORY_ICON_LIBRARY) as CategoryIconKey[]).map((iconKey) => (
                                        <SelectItem key={iconKey} value={iconKey}>{iconKey}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <Icon className="h-4 w-4 text-slate-600" />
                                  {category.name}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {departmentOptions.map((department) => (
                                  <label key={`${category.id}-${department}`} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
                                    <Checkbox
                                      checked={category.departments.includes(department)}
                                      onCheckedChange={(checked) =>
                                        updateCategory(category.id, {
                                          departments: Boolean(checked)
                                            ? [...category.departments, department]
                                            : category.departments.filter((item) => item !== department),
                                        })
                                      }
                                    />
                                    {department}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox checked={category.active} onCheckedChange={(v) => updateCategory(category.id, { active: Boolean(v) })} />
                              <span className="text-xs text-slate-600">{category.active ? "Active" : "Inactive"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button type="button" variant="outline" size="icon" onClick={() => setEditingCategoryId(isEditing ? null : category.id)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="outline" size="icon" onClick={() => removeCategory(category.id)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {section === "templates" && (
                <div className="space-y-4">
                  <div>
                    <Label className="mb-1 block">Template</Label>
                    <Select value={settings.templates.selected} onValueChange={(value) => setSettings((prev) => ({ ...prev, templates: { ...prev.templates, selected: value } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {templateNames.map((template) => <SelectItem key={template} value={template}>{template}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Subject</Label>
                    <Input value={settings.templates.subject} onChange={(e) => setSettings((prev) => ({ ...prev, templates: { ...prev.templates, subject: e.target.value } }))} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Body</Label>
                    <Textarea rows={7} value={settings.templates.body} onChange={(e) => setSettings((prev) => ({ ...prev, templates: { ...prev.templates, body: e.target.value } }))} />
                  </div>
                </div>
              )}

              {section === "system" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded border p-3">
                    <Checkbox checked={settings.system.maintenanceMode} onCheckedChange={(v) => setSettings((prev) => ({ ...prev, system: { ...prev.system, maintenanceMode: Boolean(v) } }))} />
                    <span className="text-sm">Maintenance Mode</span>
                  </div>
                  <div className="flex items-center gap-2 rounded border p-3">
                    <Checkbox checked={settings.system.auditLogs} onCheckedChange={(v) => setSettings((prev) => ({ ...prev, system: { ...prev.system, auditLogs: Boolean(v) } }))} />
                    <span className="text-sm">Enable Audit Logs</span>
                  </div>
                  <div>
                    <Label className="mb-1 block">Default Language</Label>
                    <Select value={settings.system.defaultLanguage} onValueChange={(value) => setSettings((prev) => ({ ...prev, system: { ...prev.system, defaultLanguage: value } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Auto Archive (days)</Label>
                    <Input type="number" value={settings.system.autoArchiveDays} onChange={(e) => setSettings((prev) => ({ ...prev, system: { ...prev.system, autoArchiveDays: Number(e.target.value) || 0 } }))} />
                  </div>
                </div>
              )}

              {section === "api" && (
                <div className="space-y-4">
                  <div>
                    <Label className="mb-1 block">API Base URL</Label>
                    <Input value={settings.api.apiBaseUrl} onChange={(e) => setSettings((prev) => ({ ...prev, api: { ...prev.api, apiBaseUrl: e.target.value } }))} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Rate Limit (requests/min)</Label>
                    <Input type="number" value={settings.api.rateLimitPerMin} onChange={(e) => setSettings((prev) => ({ ...prev, api: { ...prev.api, rateLimitPerMin: Number(e.target.value) || 0 } }))} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Allowed Origins (comma separated)</Label>
                    <Input value={settings.api.allowedOrigins} onChange={(e) => setSettings((prev) => ({ ...prev, api: { ...prev.api, allowedOrigins: e.target.value } }))} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Webhook URL</Label>
                    <Input value={settings.api.webhookUrl} onChange={(e) => setSettings((prev) => ({ ...prev, api: { ...prev.api, webhookUrl: e.target.value } }))} />
                  </div>
                  <div className="rounded border bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="mb-1 flex items-center gap-2"><KeyRound className="h-4 w-4" />API Key</div>
                    <code className="text-xs">grv_live_xxxxxxxx_xxxxxxxx</code>
                  </div>
                </div>
              )}

              {section === "backup" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded border p-3">
                    <Checkbox checked={settings.backup.autoBackup} onCheckedChange={(v) => setSettings((prev) => ({ ...prev, backup: { ...prev.backup, autoBackup: Boolean(v) } }))} />
                    <span className="text-sm">Enable Automated Backups</span>
                  </div>
                  <div>
                    <Label className="mb-1 block">Backup Frequency</Label>
                    <Select value={settings.backup.backupFrequency} onValueChange={(value) => setSettings((prev) => ({ ...prev, backup: { ...prev.backup, backupFrequency: value } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label className="mb-1 block">Retention (days)</Label>
                      <Input type="number" value={settings.backup.retentionDays} onChange={(e) => setSettings((prev) => ({ ...prev, backup: { ...prev.backup, retentionDays: Number(e.target.value) || 0 } }))} />
                    </div>
                    <div>
                      <Label className="mb-1 block">Session Timeout (min)</Label>
                      <Input type="number" value={settings.backup.sessionTimeoutMin} onChange={(e) => setSettings((prev) => ({ ...prev, backup: { ...prev.backup, sessionTimeoutMin: Number(e.target.value) || 0 } }))} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded border p-3">
                    <Checkbox checked={settings.backup.force2FA} onCheckedChange={(v) => setSettings((prev) => ({ ...prev, backup: { ...prev.backup, force2FA: Boolean(v) } }))} />
                    <span className="text-sm">Enforce 2FA for Admin Accounts</span>
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={async () => {
                      try {
                        const response = await adminService.rotateSystemKeys();
                        toast.success(
                          response?.message || "System keys rotated successfully",
                        );
                      } catch (error: any) {
                        toast.error(
                          error?.response?.data?.message || "Failed to rotate system keys",
                        );
                      }
                    }}
                  >
                    <Database className="h-4 w-4" />
                    Rotate System Keys
                  </Button>
                </div>
              )}

              <div className="pt-2">
                <Button className="gap-2" onClick={saveAll} disabled={isSaving}>
                  <Save className="h-4 w-4" />
                  {isSaving ? t("settings.saving") : t("settings.saveChanges")}
                </Button>
              </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <Button variant="ghost" className="gap-2" onClick={() => navigate("/admin")}>
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Admin Dashboard
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminSettings;

