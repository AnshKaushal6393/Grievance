import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import adminService from "@/services/adminService";
import {
  Plus,
  Building2,
  Users,
  Clock,
  Star,
  Eye,
  Edit,
  BarChart3,
  Search,
  Trash2,
  Mail,
  Phone,
  Target,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Droplets,
  Zap,
  Trash,
  Car,
  Leaf,
  TreePine,
  Landmark,
  Stethoscope,
  GraduationCap,
  Shield,
  UserPlus,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface Officer {
  id: string;
  _id?: string;
  name: string;
  email: string;
  designation: string;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface Department {
  _id?: string; // backend id
  id: string;
  name: string;
  code: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  officers: Officer[];
  currentWorkload: number;
  maxCapacity: number;
  totalHandled: number;
  pending: number;
  resolvedThisMonth: number;
  avgResolutionTime: string;
  slaCompliance: number;
  rating: number;
  categories: string[];
  contactEmail: string;
  contactPhone: string;
  slaTargets: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

const allCategories = [
  "Roads & Infrastructure",
  "Bridges",
  "Public Buildings",
  "Water Supply",
  "Pipelines",
  "Water Quality",
  "Electricity",
  "Streetlights",
  "Power Outages",
  "Sanitation",
  "Waste Collection",
  "Sewage",
  "Traffic",
  "Road Safety",
  "Signals",
  "Environment",
  "Pollution",
  "Green Initiatives",
  "Parks & Recreation",
  "Municipal",
  "Health",
  "Education",
];

const departmentIcons = [
  {
    icon: Building2,
    name: "Building",
    color: "text-primary",
    bg: "bg-primary/15",
  },
  { icon: Droplets, name: "Water", color: "text-cyan-600", bg: "bg-cyan-100" },
  {
    icon: Zap,
    name: "Electricity",
    color: "text-yellow-600",
    bg: "bg-yellow-100",
  },
  {
    icon: Trash,
    name: "Sanitation",
    color: "text-emerald-600",
    bg: "bg-emerald-100",
  },
  { icon: Car, name: "Traffic", color: "text-rose-600", bg: "bg-rose-100" },
  {
    icon: Leaf,
    name: "Environment",
    color: "text-green-600",
    bg: "bg-green-100",
  },
  { icon: TreePine, name: "Parks", color: "text-lime-600", bg: "bg-lime-100" },
  {
    icon: Landmark,
    name: "Municipal",
    color: "text-primary",
    bg: "bg-primary/15",
  },
  {
    icon: Stethoscope,
    name: "Health",
    color: "text-pink-600",
    bg: "bg-pink-100",
  },
  {
    icon: GraduationCap,
    name: "Education",
    color: "text-purple-600",
    bg: "bg-purple-100",
  },
  {
    icon: Shield,
    name: "Security",
    color: "text-slate-600",
    bg: "bg-slate-100",
  },
];

const initialDepartments: Department[] = [];

const generateDepartmentCodePreview = (name: string) => {
  const words = String(name)
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const initials = words.map((word) => word[0]).join("");
  if (initials.length >= 3) return initials.slice(0, 6);
  const compact = words.join("");
  if (compact.length >= 3) return compact.slice(0, 6);
  return "DEPT";
};

const generateDepartmentDescriptionPreview = (name: string, categories: string[]) => {
  const cleanName = String(name || "").trim() || "Department";
  const list = Array.isArray(categories) ? categories.filter(Boolean) : [];
  if (list.length === 0) {
    return `${cleanName} handles citizen grievances and ensures timely resolution as per government service standards.`;
  }
  const shortList = list.slice(0, 3).join(", ");
  const more = list.length > 3 ? ` and ${list.length - 3} more categories` : "";
  return `${cleanName} handles grievances related to ${shortList}${more} and ensures timely redressal as per defined SLA timelines.`;
};

const DepartmentManagement = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [departments, setDepartments] =
    useState<Department[]>(initialDepartments);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isOfficersModalOpen, setIsOfficersModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    categories: [] as string[],
    contactEmail: "",
    contactPhone: "",
    maxCapacity: 50,
    slaLow: 168,
    slaMedium: 72,
    slaHigh: 24,
    slaCritical: 4,
    selectedIcon: 0,
  });

  const [newOfficer, setNewOfficer] = useState({
    userId: "",
    designation: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [officerMode, setOfficerMode] = useState<"existing" | "create">("existing");

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []);

  const decorateDepartment = (dept: any, idx: number): Department => {
    const iconData = departmentIcons[idx % departmentIcons.length];
    return {
      id: dept._id || dept.id || dept.code || `${idx}`,
      _id: dept._id ?? dept.id ?? `${idx}`,
      name: dept.name,
      code: dept.code,
      description: dept.description ?? "",
      icon: iconData.icon,
      iconColor: iconData.color,
      bgColor: iconData.bg,
      officers: (dept.officers ?? []).map((o: any) => ({
        id: o._id ?? o.id,
        _id: o._id ?? o.id,
        name: o.name ?? o.email ?? "Unknown",
        email: o.email ?? "",
        designation: o.designation ?? "",
      })),
      currentWorkload: dept.stats?.pending ?? dept.currentWorkload ?? 0,
      maxCapacity: dept.maxCapacity ?? 50,
      totalHandled: dept.stats?.total ?? dept.totalHandled ?? 0,
      pending: dept.stats?.pending ?? dept.pending ?? 0,
      resolvedThisMonth:
        dept.stats?.resolvedThisMonth ?? dept.resolvedThisMonth ?? 0,
      avgResolutionTime: dept.avgResolutionTime ?? "0 days",
      slaCompliance: dept.slaCompliance ?? 100,
      rating: dept.rating ?? 0,
      categories: dept.categories ?? [],
      contactEmail: dept.contactInfo?.email ?? dept.contactEmail ?? "",
      contactPhone: dept.contactInfo?.phone ?? dept.contactPhone ?? "",
      slaTargets: dept.slaTargets ?? {
        low: 168,
        medium: 72,
        high: 24,
        critical: 4,
      },
    };
  };

  const fetchDepartments = async (): Promise<Department[]> => {
    try {
      const res = await adminService.getDepartments();
      const data = res?.data?.departments ?? [];
      const mapped = data.map((d: any, idx: number) => decorateDepartment(d, idx));
      setDepartments(mapped);
      return mapped;
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("departments.error.loadDepartments", "Failed to load departments"));
      return [];
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await adminService.getAllUsers();
      const users = res?.data?.users ?? [];
      setAvailableUsers(
        users
          .filter((u: any) => u.role !== "admin")
          .map((u: any) => ({
            id: u._id ?? u.id,
            name: u.name ?? "Unknown",
            email: u.email ?? "",
            role: u.role,
          })),
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("departments.error.loadUsers", "Failed to load users"));
    }
  };

  const handleSaveDepartment = async () => {
    if (!formData.name) {
      toast.error(t("departments.error.nameRequired", "Department name is required"));
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: generateDepartmentDescriptionPreview(formData.name, formData.categories),
        categories: formData.categories,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        maxCapacity: formData.maxCapacity,
        slaTargets: {
          low: formData.slaLow,
          medium: formData.slaMedium,
          high: formData.slaHigh,
          critical: formData.slaCritical,
        },
      };

      if (editingDepartment?._id) {
        await adminService.updateDepartment(editingDepartment._id, payload);
        toast.success(t("departments.updated", "Department updated!"));
      } else {
        await adminService.createDepartment(payload);
        toast.success(t("departments.created", "Department created!"));
      }

      await fetchDepartments();
      setIsAddEditModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("departments.error.save", "Failed to save"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOfficer = async () => {
    if (!selectedDepartment?._id) return;
    try {
      if (officerMode === "existing") {
        if (!newOfficer.userId || !newOfficer.designation) return;
        await adminService.addOfficer(selectedDepartment._id, {
          userId: newOfficer.userId,
          designation: newOfficer.designation,
        });
      } else {
        const required = [
          newOfficer.name,
          newOfficer.email,
          newOfficer.phone,
          newOfficer.password,
          newOfficer.street,
          newOfficer.city,
          newOfficer.state,
          newOfficer.pincode,
          newOfficer.designation,
        ];
        if (required.some((v) => !v)) {
          toast.error(t("departments.error.officerDetailsRequired", "Please fill all new officer details"));
          return;
        }
        await adminService.addOfficer(selectedDepartment._id, {
          designation: newOfficer.designation,
          createUser: {
            name: newOfficer.name,
            email: newOfficer.email,
            phone: newOfficer.phone,
            password: newOfficer.password,
            street: newOfficer.street,
            city: newOfficer.city,
            state: newOfficer.state,
            pincode: newOfficer.pincode,
          },
        });
      }
      toast.success(t("departments.officerAdded", "Officer added!"));
      setNewOfficer({
        userId: "",
        designation: "",
        name: "",
        email: "",
        phone: "",
        password: "",
        street: "",
        city: "",
        state: "",
        pincode: "",
      });
      const updatedDepartments = await fetchDepartments();
      const updated = updatedDepartments.find((d) => d._id === selectedDepartment._id);
      if (updated) setSelectedDepartment(updated);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("departments.error.addOfficer", "Failed to add officer"));
    }
  };

  const handleRemoveOfficer = async (officerId: string) => {
    if (!selectedDepartment?._id) return;
    try{
    await adminService.removeOfficer(selectedDepartment._id, officerId);
    toast.success(t("departments.officerRemoved", "Officer removed!"));
    const updatedDepartments = await fetchDepartments();
    const updated = updatedDepartments.find((d) => d._id === selectedDepartment._id);
    if (updated) setSelectedDepartment(updated);
    } catch(err:any){
      toast.error(err.response?.data?.message || t("departments.error.removeOfficer", "Failed to remove officer"));
    }
  };

  const getWorkloadColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage < 70) return "bg-green-500";
    if (percentage < 90) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getWorkloadStatus = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage < 70)
      return { label: "Normal", icon: CheckCircle, color: "text-green-600" };
    if (percentage < 90)
      return {
        label: "Moderate",
        icon: AlertTriangle,
        color: "text-yellow-600",
      };
    return { label: "Overloaded", icon: AlertTriangle, color: "text-red-600" };
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? "text-yellow-400 fill-yellow-400"
            : i < rating
              ? "text-yellow-400 fill-yellow-400 opacity-50"
              : "text-gray-300"
        }`}
      />
    ));
  };

  const openAddModal = () => {
    setEditingDepartment(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      categories: [],
      contactEmail: "",
      contactPhone: "",
      maxCapacity: 50,
      slaLow: 168,
      slaMedium: 72,
      slaHigh: 24,
      slaCritical: 4,
      selectedIcon: 0,
    });
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDepartment(dept);
    const iconIndex = departmentIcons.findIndex((di) => di.icon === dept.icon);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description,
      categories: dept.categories,
      contactEmail: dept.contactEmail,
      contactPhone: dept.contactPhone,
      maxCapacity: dept.maxCapacity,
      slaLow: dept.slaTargets.low,
      slaMedium: dept.slaTargets.medium,
      slaHigh: dept.slaTargets.high,
      slaCritical: dept.slaTargets.critical,
      selectedIcon: iconIndex >= 0 ? iconIndex : 0,
    });
    setIsAddEditModalOpen(true);
  };

  const openOfficersModal = (dept: Department) => {
    setSelectedDepartment(dept);
    setIsOfficersModalOpen(true);
  };


  const toggleCategory = (category: string) => {
      setFormData(prev=>({
        ...prev,
        categories: prev.categories.includes(category) ? prev.categories.filter(c=>c!==category):[...prev.categories,category],
      }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main id="main-content" className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t("departments.title", "Manage Departments")}
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure departments, assign officers, and set SLA targets
            </p>
          </div>
          <Button
            onClick={openAddModal}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            <Plus className="h-5 w-5" />
            {t("departments.addNew", "Add New Department")}
          </Button>
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {departments.map((dept, index) => {
            const Icon = dept.icon;
            const workloadPercentage =
              (dept.currentWorkload / dept.maxCapacity) * 100;
            const workloadStatus = getWorkloadStatus(
              dept.currentWorkload,
              dept.maxCapacity,
            );
            const WorkloadIcon = workloadStatus.icon;

            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="transition-colors border border-border group hover:border-slate-300">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded ${dept.bgColor}`}>
                          <Icon className={`h-6 w-6 ${dept.iconColor}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                            {dept.name}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="font-mono text-xs"
                          >
                            {dept.code}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Officers */}
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{dept.officers.length} Officers</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 text-xs"
                        onClick={() => openOfficersModal(dept)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </div>

                    {/* Workload */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Complaint Workload
                        </span>
                        <div className="flex items-center gap-2">
                          <WorkloadIcon
                            className={`h-4 w-4 ${workloadStatus.color}`}
                          />
                          <span className="font-medium">
                            {dept.currentWorkload}/{dept.maxCapacity} complaints
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={workloadPercentage}
                        className={`h-2 ${getWorkloadColor(
                          dept.currentWorkload,
                          dept.maxCapacity,
                        )}`}
                      />
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <p className="text-lg font-semibold">
                          {dept.totalHandled.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Handled
                        </p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <p className="text-lg font-semibold">{dept.pending}</p>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <p className="text-lg font-semibold">
                          {dept.resolvedThisMonth}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Resolved (Month)
                        </p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <p className="text-lg font-semibold">
                          {dept.slaCompliance}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SLA Compliance
                        </p>
                      </div>
                    </div>

                    {/* Avg Resolution Time & Rating */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{dept.avgResolutionTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {renderStars(dept.rating)}
                        <span className="text-sm font-medium ml-1">
                          {dept.rating}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => openOfficersModal(dept)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => openEditModal(dept)}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => navigate(`/admin/complaints?department=${encodeURIComponent(dept._id || dept.id)}`)}
                      >
                        <BarChart3 className="h-4 w-4" />
                        Analytics
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>
      <Footer />

      {/* Add/Edit Department Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingDepartment ? (
                <>
                  <Edit className="h-5 w-5" />
                  {t("departments.edit", "Edit Department")}
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  {t("departments.addNew", "Add New Department")}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Fill in department details, SLA targets, and contacts. Fields marked * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Icon Selection */}
            <div>
              <Label className="mb-3 block">{t("departments.icon", "Department Icon")}</Label>
              <div className="flex flex-wrap gap-2">
                {departmentIcons.map((iconData, idx) => {
                  const IconComp = iconData.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, selectedIcon: idx })
                      }
                      className={`p-3 rounded ${iconData.bg} ${
                        formData.selectedIcon === idx
                          ? "ring-2 ring-primary ring-offset-2"
                          : "hover:border-slate-300"
                      } border`}
                    >
                      <IconComp className={`h-5 w-5 ${iconData.color}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("departments.name", "Department Name")} *</Label>
                <Input
                  id="name"
                  placeholder={t("departments.namePlaceholder", "e.g., Public Works Department")}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code-preview">{t("departments.code", "Department Code")}</Label>
                <Input
                  id="code-preview"
                  value={editingDepartment ? formData.code : generateDepartmentCodePreview(formData.name)}
                  readOnly
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  {editingDepartment
                    ? t("departments.codeLocked", "Department code cannot be edited.")
                    : t("departments.codeAuto", "Code will be generated automatically from department name.")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={generateDepartmentDescriptionPreview(formData.name, formData.categories)}
                readOnly
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {editingDepartment
                  ? t("departments.descriptionLocked", "Description is managed automatically for consistency.")
                  : t("departments.descriptionAuto", "Description is generated automatically from department details.")}
              </p>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label>Categories Handled</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-32 overflow-y-auto">
                {allCategories.map((category) => (
                  <Badge
                    key={category}
                    variant={
                      formData.categories.includes(category)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer transition-colors hover:border-slate-300"
                    onClick={() => toggleCategory(category)}
                  >
                    {formData.categories.includes(category) && (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    {category}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="department@gov.in"
                    className="pl-10"
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, contactEmail: e.target.value })
                    }
                    maxLength={255}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 1234567890"
                    className="pl-10"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPhone: e.target.value })
                    }
                    maxLength={20}
                  />
                </div>
              </div>
            </div>

            {/* Capacity */}
            <div className="space-y-2">
              <Label htmlFor="capacity">Maximum Workload Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={1000}
                value={formData.maxCapacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxCapacity: parseInt(e.target.value) || 50,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of complaints the department can handle at once
              </p>
            </div>

            {/* SLA Targets */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                SLA Targets (Hours)
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Low Priority
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.slaLow}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slaLow: parseInt(e.target.value) || 168,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Medium Priority
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.slaMedium}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slaMedium: parseInt(e.target.value) || 72,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    High Priority
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.slaHigh}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slaHigh: parseInt(e.target.value) || 24,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Critical Priority
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.slaCritical}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slaCritical: parseInt(e.target.value) || 4,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSaveDepartment}
              disabled={!formData.name || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {editingDepartment ? t("departments.update", "Update Department") : t("departments.add", "Add Department")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Officers Modal */}
      <Dialog open={isOfficersModalOpen} onOpenChange={setIsOfficersModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("departments.manageOfficers", "Manage Officers")} - {selectedDepartment?.name}
            </DialogTitle>
            <DialogDescription>
              {t("departments.manageOfficersSub", "Add or remove officers assigned to this department.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Officers */}
            <div>
              <Label className="mb-3 block">
                {t("departments.currentOfficers", "Current Officers")} ({selectedDepartment?.officers.length || 0})
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedDepartment?.officers.map((officer) => (
                  <div
                    key={officer.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {officer.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{officer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {officer.designation}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveOfficer(officer.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {selectedDepartment?.officers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No officers assigned yet
                  </p>
                )}
              </div>
            </div>

            {/* Add New Officer */}
            <div className="pt-4 border-t space-y-3">
              <Label className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                {t("departments.addOfficer", "Add New Officer")}
              </Label>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={officerMode === "existing" ? "default" : "outline"}
                  onClick={() => setOfficerMode("existing")}
                >
                  Existing User
                </Button>
                <Button
                  type="button"
                  variant={officerMode === "create" ? "default" : "outline"}
                  onClick={() => setOfficerMode("create")}
                >
                  Create Officer
                </Button>
              </div>

              {officerMode === "existing" ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Select
                    value={newOfficer.userId}
                    onValueChange={(v) =>
                      setNewOfficer({ ...newOfficer, userId: v })
                    }
                  >
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Search and select user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers
                        .filter(
                          (u) =>
                            !selectedDepartment?.officers.some(
                              (o) => (o._id ?? o.id) === u.id,
                            ),
                        )
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <Input
                    placeholder="Full Name"
                    value={newOfficer.name}
                    onChange={(e) =>
                      setNewOfficer({ ...newOfficer, name: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newOfficer.email}
                    onChange={(e) =>
                      setNewOfficer({ ...newOfficer, email: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Phone (10 digits)"
                    value={newOfficer.phone}
                    onChange={(e) =>
                      setNewOfficer({ ...newOfficer, phone: e.target.value })
                    }
                    maxLength={10}
                  />
                  <Input
                    placeholder="Temporary Password"
                    type="password"
                    value={newOfficer.password}
                    onChange={(e) =>
                      setNewOfficer({ ...newOfficer, password: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Street"
                    value={newOfficer.street}
                    onChange={(e) =>
                      setNewOfficer({ ...newOfficer, street: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="City"
                      value={newOfficer.city}
                      onChange={(e) =>
                        setNewOfficer({ ...newOfficer, city: e.target.value })
                      }
                    />
                    <Input
                      placeholder="State"
                      value={newOfficer.state}
                      onChange={(e) =>
                        setNewOfficer({ ...newOfficer, state: e.target.value })
                      }
                    />
                  </div>
                  <Input
                    placeholder="Pincode (6 digits)"
                    value={newOfficer.pincode}
                    onChange={(e) =>
                      setNewOfficer({ ...newOfficer, pincode: e.target.value })
                    }
                    maxLength={6}
                  />
                </div>
              )}

              <Input
                placeholder="Designation (e.g., Chief Engineer)"
                value={newOfficer.designation}
                onChange={(e) =>
                  setNewOfficer({ ...newOfficer, designation: e.target.value })
                }
                maxLength={100}
              />

              <Button
                onClick={handleAddOfficer}
                disabled={
                  officerMode === "existing"
                    ? !newOfficer.userId || !newOfficer.designation
                    : !newOfficer.name ||
                      !newOfficer.email ||
                      !newOfficer.phone ||
                      !newOfficer.password ||
                      !newOfficer.street ||
                      !newOfficer.city ||
                      !newOfficer.state ||
                      !newOfficer.pincode ||
                      !newOfficer.designation
                }
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                {officerMode === "existing" ? "Add Officer" : "Create & Add Officer"}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOfficersModalOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentManagement;

