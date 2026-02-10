import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Building2,
  Users,
  Clock,
  Star,
  TrendingUp,
  Eye,
  Edit,
  BarChart3,
  X,
  Search,
  Trash2,
  Mail,
  Phone,
  FileText,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navbar from "@/components/Navbar";

interface Officer {
  id: string;
  name: string;
  email: string;
  designation: string;
  avatar?: string;
}

interface Department {
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

const initialDepartments: Department[] = [
  {
    id: "1",
    name: "Public Works Department",
    code: "PWD",
    description: "Handles roads, bridges, and public infrastructure maintenance",
    icon: Building2,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    officers: [
      { id: "o1", name: "Rajesh Kumar", email: "rajesh@gov.in", designation: "Chief Engineer" },
      { id: "o2", name: "Anita Singh", email: "anita@gov.in", designation: "Assistant Engineer" },
      { id: "o3", name: "Vikram Reddy", email: "vikram@gov.in", designation: "Junior Engineer" },
    ],
    currentWorkload: 45,
    maxCapacity: 50,
    totalHandled: 1234,
    pending: 45,
    resolvedThisMonth: 156,
    avgResolutionTime: "3.5 days",
    slaCompliance: 87,
    rating: 4.2,
    categories: ["Roads & Infrastructure", "Bridges", "Public Buildings"],
    contactEmail: "pwd@gov.in",
    contactPhone: "+91 1234567890",
    slaTargets: { low: 168, medium: 72, high: 24, critical: 4 },
  },
  {
    id: "2",
    name: "Water Department",
    code: "WD",
    description: "Manages water supply, pipelines, and water quality",
    icon: Droplets,
    iconColor: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    officers: [
      { id: "o4", name: "Priya Sharma", email: "priya@gov.in", designation: "Chief Water Officer" },
      { id: "o5", name: "Suresh Patel", email: "suresh@gov.in", designation: "Water Engineer" },
    ],
    currentWorkload: 38,
    maxCapacity: 40,
    totalHandled: 987,
    pending: 38,
    resolvedThisMonth: 124,
    avgResolutionTime: "2.8 days",
    slaCompliance: 92,
    rating: 4.5,
    categories: ["Water Supply", "Pipelines", "Water Quality"],
    contactEmail: "water@gov.in",
    contactPhone: "+91 1234567891",
    slaTargets: { low: 120, medium: 48, high: 12, critical: 2 },
  },
  {
    id: "3",
    name: "Electricity Board",
    code: "EB",
    description: "Handles power supply, streetlights, and electrical infrastructure",
    icon: Zap,
    iconColor: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    officers: [
      { id: "o6", name: "Amit Verma", email: "amit@gov.in", designation: "Chief Electrical Engineer" },
      { id: "o7", name: "Deepika Rao", email: "deepika@gov.in", designation: "Line Inspector" },
      { id: "o8", name: "Karthik N", email: "karthik@gov.in", designation: "Technician" },
      { id: "o9", name: "Neha Gupta", email: "neha@gov.in", designation: "Assistant Engineer" },
    ],
    currentWorkload: 28,
    maxCapacity: 45,
    totalHandled: 2156,
    pending: 28,
    resolvedThisMonth: 234,
    avgResolutionTime: "1.5 days",
    slaCompliance: 95,
    rating: 4.7,
    categories: ["Electricity", "Streetlights", "Power Outages"],
    contactEmail: "electricity@gov.in",
    contactPhone: "+91 1234567892",
    slaTargets: { low: 96, medium: 24, high: 8, critical: 2 },
  },
  {
    id: "4",
    name: "Sanitation Department",
    code: "SD",
    description: "Manages waste collection, sewage, and public hygiene",
    icon: Trash,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    officers: [
      { id: "o10", name: "Ramesh Babu", email: "ramesh@gov.in", designation: "Sanitation Officer" },
      { id: "o11", name: "Lakshmi Devi", email: "lakshmi@gov.in", designation: "Inspector" },
    ],
    currentWorkload: 52,
    maxCapacity: 55,
    totalHandled: 1567,
    pending: 52,
    resolvedThisMonth: 189,
    avgResolutionTime: "2.2 days",
    slaCompliance: 88,
    rating: 4.0,
    categories: ["Sanitation", "Waste Collection", "Sewage"],
    contactEmail: "sanitation@gov.in",
    contactPhone: "+91 1234567893",
    slaTargets: { low: 72, medium: 36, high: 12, critical: 4 },
  },
  {
    id: "5",
    name: "Traffic Police",
    code: "TP",
    description: "Handles traffic management, signals, and road safety",
    icon: Car,
    iconColor: "text-rose-600",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    officers: [
      { id: "o12", name: "Inspector Sharma", email: "isharma@gov.in", designation: "Traffic Inspector" },
      { id: "o13", name: "SI Patel", email: "sipatel@gov.in", designation: "Sub-Inspector" },
      { id: "o14", name: "Constable Kumar", email: "ckumar@gov.in", designation: "Constable" },
    ],
    currentWorkload: 22,
    maxCapacity: 35,
    totalHandled: 876,
    pending: 22,
    resolvedThisMonth: 98,
    avgResolutionTime: "4.1 days",
    slaCompliance: 78,
    rating: 3.8,
    categories: ["Traffic", "Road Safety", "Signals"],
    contactEmail: "traffic@gov.in",
    contactPhone: "+91 1234567894",
    slaTargets: { low: 168, medium: 72, high: 24, critical: 8 },
  },
  {
    id: "6",
    name: "Environment Agency",
    code: "EA",
    description: "Handles pollution control, green initiatives, and environmental protection",
    icon: Leaf,
    iconColor: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    officers: [
      { id: "o15", name: "Dr. Green", email: "green@gov.in", designation: "Environment Officer" },
    ],
    currentWorkload: 12,
    maxCapacity: 25,
    totalHandled: 345,
    pending: 12,
    resolvedThisMonth: 45,
    avgResolutionTime: "5.2 days",
    slaCompliance: 82,
    rating: 4.1,
    categories: ["Environment", "Pollution", "Green Initiatives"],
    contactEmail: "environment@gov.in",
    contactPhone: "+91 1234567895",
    slaTargets: { low: 240, medium: 120, high: 48, critical: 12 },
  },
];

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

const availableUsers = [
  { id: "u1", name: "Arun Kumar", email: "arun@gov.in" },
  { id: "u2", name: "Meera Reddy", email: "meera@gov.in" },
  { id: "u3", name: "Sanjay Gupta", email: "sanjay@gov.in" },
  { id: "u4", name: "Kavitha N", email: "kavitha@gov.in" },
  { id: "u5", name: "Rahul Singh", email: "rahul@gov.in" },
];

const departmentIcons = [
  { icon: Building2, name: "Building", color: "text-blue-600", bg: "bg-blue-100" },
  { icon: Droplets, name: "Water", color: "text-cyan-600", bg: "bg-cyan-100" },
  { icon: Zap, name: "Electricity", color: "text-yellow-600", bg: "bg-yellow-100" },
  { icon: Trash, name: "Sanitation", color: "text-emerald-600", bg: "bg-emerald-100" },
  { icon: Car, name: "Traffic", color: "text-rose-600", bg: "bg-rose-100" },
  { icon: Leaf, name: "Environment", color: "text-green-600", bg: "bg-green-100" },
  { icon: TreePine, name: "Parks", color: "text-lime-600", bg: "bg-lime-100" },
  { icon: Landmark, name: "Municipal", color: "text-indigo-600", bg: "bg-indigo-100" },
  { icon: Stethoscope, name: "Health", color: "text-pink-600", bg: "bg-pink-100" },
  { icon: GraduationCap, name: "Education", color: "text-purple-600", bg: "bg-purple-100" },
  { icon: Shield, name: "Security", color: "text-slate-600", bg: "bg-slate-100" },
];

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isOfficersModalOpen, setIsOfficersModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [searchOfficer, setSearchOfficer] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Form state
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
  });

  const getWorkloadColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage < 70) return "bg-green-500";
    if (percentage < 90) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getWorkloadStatus = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage < 70) return { label: "Normal", icon: CheckCircle, color: "text-green-600" };
    if (percentage < 90) return { label: "Moderate", icon: AlertTriangle, color: "text-yellow-600" };
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
    const iconIndex = departmentIcons.findIndex(
      (di) => di.icon === dept.icon
    );
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

  const handleSaveDepartment = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const iconData = departmentIcons[formData.selectedIcon];
    const newDept: Department = {
      id: editingDepartment?.id || Date.now().toString(),
      name: formData.name,
      code: formData.code,
      description: formData.description,
      icon: iconData.icon,
      iconColor: iconData.color,
      bgColor: iconData.bg,
      officers: editingDepartment?.officers || [],
      currentWorkload: editingDepartment?.currentWorkload || 0,
      maxCapacity: formData.maxCapacity,
      totalHandled: editingDepartment?.totalHandled || 0,
      pending: editingDepartment?.pending || 0,
      resolvedThisMonth: editingDepartment?.resolvedThisMonth || 0,
      avgResolutionTime: editingDepartment?.avgResolutionTime || "0 days",
      slaCompliance: editingDepartment?.slaCompliance || 100,
      rating: editingDepartment?.rating || 0,
      categories: formData.categories,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone,
      slaTargets: {
        low: formData.slaLow,
        medium: formData.slaMedium,
        high: formData.slaHigh,
        critical: formData.slaCritical,
      },
    };

    if (editingDepartment) {
      setDepartments(departments.map((d) => (d.id === editingDepartment.id ? newDept : d)));
    } else {
      setDepartments([...departments, newDept]);
    }

    setIsSaving(false);
    setIsAddEditModalOpen(false);
  };

  const handleAddOfficer = () => {
    if (!selectedDepartment || !newOfficer.userId || !newOfficer.designation) return;

    const user = availableUsers.find((u) => u.id === newOfficer.userId);
    if (!user) return;

    const officer: Officer = {
      id: Date.now().toString(),
      name: user.name,
      email: user.email,
      designation: newOfficer.designation,
    };

    setDepartments(
      departments.map((d) =>
        d.id === selectedDepartment.id
          ? { ...d, officers: [...d.officers, officer] }
          : d
      )
    );

    setSelectedDepartment({
      ...selectedDepartment,
      officers: [...selectedDepartment.officers, officer],
    });

    setNewOfficer({ userId: "", designation: "" });
  };

  const handleRemoveOfficer = (officerId: string) => {
    if (!selectedDepartment) return;

    setDepartments(
      departments.map((d) =>
        d.id === selectedDepartment.id
          ? { ...d, officers: d.officers.filter((o) => o.id !== officerId) }
          : d
      )
    );

    setSelectedDepartment({
      ...selectedDepartment,
      officers: selectedDepartment.officers.filter((o) => o.id !== officerId),
    });
  };

  const toggleCategory = (category: string) => {
    if (formData.categories.includes(category)) {
      setFormData({
        ...formData,
        categories: formData.categories.filter((c) => c !== category),
      });
    } else {
      setFormData({
        ...formData,
        categories: [...formData.categories, category],
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Departments</h1>
            <p className="text-muted-foreground mt-1">
              Configure departments, assign officers, and set SLA targets
            </p>
          </div>
          <Button
            onClick={openAddModal}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2"
          >
            <Plus className="h-5 w-5" />
            Add New Department
          </Button>
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {departments.map((dept, index) => {
            const Icon = dept.icon;
            const workloadPercentage = (dept.currentWorkload / dept.maxCapacity) * 100;
            const workloadStatus = getWorkloadStatus(dept.currentWorkload, dept.maxCapacity);
            const WorkloadIcon = workloadStatus.icon;

            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-all duration-300 group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${dept.bgColor}`}>
                          <Icon className={`h-6 w-6 ${dept.iconColor}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                            {dept.name}
                          </h3>
                          <Badge variant="secondary" className="font-mono text-xs">
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
                        <span className="text-muted-foreground">Current Workload</span>
                        <div className="flex items-center gap-2">
                          <WorkloadIcon className={`h-4 w-4 ${workloadStatus.color}`} />
                          <span className="font-medium">
                            {dept.currentWorkload}/{dept.maxCapacity}
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={workloadPercentage}
                        className="h-2"
                        indicatorClassName={getWorkloadColor(dept.currentWorkload, dept.maxCapacity)}
                      />
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <p className="text-lg font-semibold">{dept.totalHandled.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total Handled</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <p className="text-lg font-semibold">{dept.pending}</p>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <p className="text-lg font-semibold">{dept.resolvedThisMonth}</p>
                        <p className="text-xs text-muted-foreground">Resolved (Month)</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <p className="text-lg font-semibold">{dept.slaCompliance}%</p>
                        <p className="text-xs text-muted-foreground">SLA Compliance</p>
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
                        <span className="text-sm font-medium ml-1">{dept.rating}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
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
      </div>

      {/* Add/Edit Department Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingDepartment ? (
                <>
                  <Edit className="h-5 w-5" />
                  Edit Department
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Add New Department
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Icon Selection */}
            <div>
              <Label className="mb-3 block">Department Icon</Label>
              <div className="flex flex-wrap gap-2">
                {departmentIcons.map((iconData, idx) => {
                  const IconComp = iconData.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, selectedIcon: idx })}
                      className={`p-3 rounded-xl transition-all ${iconData.bg} ${
                        formData.selectedIcon === idx
                          ? "ring-2 ring-primary ring-offset-2"
                          : "hover:scale-105"
                      }`}
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
                <Label htmlFor="name">Department Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Public Works Department"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Department Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., PWD"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  maxLength={10}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the department's responsibilities..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                maxLength={500}
              />
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label>Categories Handled</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-32 overflow-y-auto">
                {allCategories.map((category) => (
                  <Badge
                    key={category}
                    variant={formData.categories.includes(category) ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:scale-105"
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
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) || 50 })}
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
                  <Label className="text-xs text-muted-foreground">Low Priority</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.slaLow}
                    onChange={(e) => setFormData({ ...formData, slaLow: parseInt(e.target.value) || 168 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Medium Priority</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.slaMedium}
                    onChange={(e) => setFormData({ ...formData, slaMedium: parseInt(e.target.value) || 72 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">High Priority</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.slaHigh}
                    onChange={(e) => setFormData({ ...formData, slaHigh: parseInt(e.target.value) || 24 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Critical Priority</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.slaCritical}
                    onChange={(e) => setFormData({ ...formData, slaCritical: parseInt(e.target.value) || 4 })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveDepartment}
              disabled={!formData.name || !formData.code || isSaving}
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
                  {editingDepartment ? "Update Department" : "Add Department"}
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
              Manage Officers - {selectedDepartment?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Officers */}
            <div>
              <Label className="mb-3 block">Current Officers ({selectedDepartment?.officers.length || 0})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedDepartment?.officers.map((officer) => (
                  <div
                    key={officer.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {officer.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{officer.name}</p>
                        <p className="text-xs text-muted-foreground">{officer.designation}</p>
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
                Add New Officer
              </Label>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Select value={newOfficer.userId} onValueChange={(v) => setNewOfficer({ ...newOfficer, userId: v })}>
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Search and select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers
                      .filter(
                        (u) =>
                          !selectedDepartment?.officers.some((o) => o.email === u.email)
                      )
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <Input
                placeholder="Designation (e.g., Chief Engineer)"
                value={newOfficer.designation}
                onChange={(e) => setNewOfficer({ ...newOfficer, designation: e.target.value })}
                maxLength={100}
              />

              <Button
                onClick={handleAddOfficer}
                disabled={!newOfficer.userId || !newOfficer.designation}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Officer
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOfficersModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentManagement;
