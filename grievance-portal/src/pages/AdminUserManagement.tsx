import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { Ban, Download, Eye, FileSpreadsheet, Plus, RefreshCcw, Search, ShieldAlert, UserPlus } from "lucide-react";
import Navbar from "@/components/Navbar";
import adminService from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

type UserRole = "user" | "officer" | "admin";
type UserStatus = "active" | "inactive" | "banned";
type BulkAction = "none" | "activate" | "deactivate" | "export";
type ConfirmType = "ban" | "unban" | "reset" | "bulk";

interface DepartmentOption { id: string; name: string }
interface UserRow {
  _id: string; avatarUrl: string; name: string; email: string; phone: string; role: UserRole;
  status: UserStatus; department: { id: string; name: string; code: string } | null;
  complaintsFiled: number; joinedDate: string; lastActive: string;
  verification: { email: boolean; phone: boolean; aadhaar: boolean };
}
interface UserDetails extends UserRow {
  activity: {
    totalComplaints: number;
    resolvedComplaints: number;
    avgRating: string;
    recentTimeline: Array<{ id: string; label: string; description: string; at: string }>;
  };
}
interface ConfirmAction { type: ConfirmType; userId?: string; userName?: string; bulkAction?: "activate" | "deactivate" }

const roleLabel = (r: UserRole) => (r === "user" ? "Citizen" : r === "officer" ? "Officer" : "Admin");
const initials = (name: string) => name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
const parseErr = (err: unknown, fallback: string) => {
  if (typeof err === "object" && err !== null) {
    const maybe = err as { response?: { data?: { message?: string } } };
    if (maybe.response?.data?.message) return maybe.response.data.message;
  }
  return fallback;
};

const AdminUserManagement = () => {
  const { t } = useLanguage();
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction>("none");
  const [filterDraft, setFilterDraft] = useState({ search: "", role: "all", status: "all", department: "all" });
  const [filters, setFilters] = useState({ search: "", role: "all", status: "all", department: "all" });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detail, setDetail] = useState<UserDetails | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("user");
  const [editDept, setEditDept] = useState("none");
  const [resetPwd, setResetPwd] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "", email: "", phone: "", role: "user" as UserRole, departmentId: "none",
    autoGeneratePassword: true, password: "", sendWelcome: true,
  });

  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [reason, setReason] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<EventSource | null>(null);
  const detailRef = useRef<UserDetails | null>(null);
  const detailsOpenRef = useRef(false);
  const sseConnectedRef = useRef(false);
  const sseErrorToastRef = useRef(false);
  const sseDisconnectedAtRef = useRef<number | null>(null);
  const selectedRows = useMemo(() => users.filter((u) => selectedIds.includes(u._id)), [users, selectedIds]);

  useEffect(() => {
    detailRef.current = detail;
    detailsOpenRef.current = detailsOpen;
  }, [detail, detailsOpen]);

  const loadDepartments = async () => {
    try {
      const res = await adminService.getDepartments();
      const raw = res?.data?.departments || [];
      setDepartments(raw.map((d: { _id: string; name: string }) => ({ id: d._id, name: d.name })));
    } catch { setDepartments([]); }
  };

  const loadUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await adminService.getAllUsers({ ...filters, page, limit });
      setUsers(res?.data?.users || []);
      setTotal(res?.data?.pagination?.total || 0);
    } catch (err: unknown) {
      toast.error(parseErr(err, t("adminUsers.error.loadUsers", "Failed to load users")));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const openDetails = async (id: string) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const res = await adminService.getUserDetails(id);
      const u = res?.data?.user as UserDetails;
      setDetail(u);
      setEditRole(u.role);
      setEditDept(u.department?.id || "none");
    } catch (err: unknown) {
      toast.error(parseErr(err, t("adminUsers.error.loadDetails", "Failed to load details")));
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => { loadDepartments(); }, []);
  useEffect(() => { loadUsers(); }, [page, filters]);
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.close();
    }
    const source = new EventSource(adminService.getUsersStreamUrl());
    streamRef.current = source;

    source.onopen = () => {
      const wasDisconnected = sseDisconnectedAtRef.current !== null;
      sseConnectedRef.current = true;
      sseErrorToastRef.current = false;
      sseDisconnectedAtRef.current = null;
      if (wasDisconnected) {
        toast.success(t("adminUsers.realtime.restored", "Realtime connection restored"));
      } else {
        toast.success(t("adminUsers.realtime.connected", "Realtime updates connected"));
      }
    };

    source.addEventListener("user-update", () => {
      loadUsers(true);
      if (detailsOpenRef.current && detailRef.current) {
        openDetails(detailRef.current._id);
      }
    });

    source.onerror = () => {
      if (!sseErrorToastRef.current) {
        toast.error(t("adminUsers.realtime.lost", "Realtime connection lost. Reconnecting..."));
        sseErrorToastRef.current = true;
      }
      if (!sseDisconnectedAtRef.current) {
        sseDisconnectedAtRef.current = Date.now();
      }
    };

    return () => {
      source.close();
      streamRef.current = null;
      if (sseConnectedRef.current) {
        toast.info(t("adminUsers.realtime.disconnected", "Realtime updates disconnected"));
      }
      sseConnectedRef.current = false;
    };
  }, [page, filters]);

  const downloadTemplate = () => {
    const template = [
      "name,email,phone,role,departmentId,password",
      "Rahul Sharma,rahul.sharma@example.com,9876543210,user,,",
    ].join("\n");
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const doBulk = async () => {
    if (!selectedIds.length) return toast.error(t("adminUsers.error.selectUsers", "Select users first"));
    if (bulkAction === "none") return toast.error(t("adminUsers.error.chooseAction", "Choose bulk action"));
    if (bulkAction === "export") {
      const headers = ["name", "email", "phone", "role", "status", "department"];
      const csv = [headers.join(","), ...selectedRows.map((u) => [u.name, u.email, u.phone, u.role, u.status, u.department?.name || ""].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      return;
    }
    setConfirm({ type: "bulk", bulkAction });
  };

  const importCsv = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const res = await adminService.importUsersFile(file, true);
      const ok = res?.data?.created?.length || 0;
      const bad = res?.data?.failed?.length || 0;
      toast.success(t("adminUsers.import.result", `Imported ${ok}, failed ${bad}`));
      await loadUsers(true);
    } catch (err: unknown) {
      toast.error(parseErr(err, t("adminUsers.error.import", "Import failed")));
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  const confirmAction = async () => {
    if (!confirm) return;
    setSaving(true);
    try {
      if (confirm.type === "ban" && confirm.userId) {
        if (!reason.trim()) return toast.error(t("adminUsers.error.banReason", "Ban reason required"));
        await adminService.updateUserStatus(confirm.userId, "banned", reason.trim());
      } else if (confirm.type === "unban" && confirm.userId) {
        await adminService.updateUserStatus(confirm.userId, "active");
      } else if (confirm.type === "reset" && confirm.userId) {
        const res = await adminService.resetUserPassword(confirm.userId, resetPwd.trim() || undefined);
        const temp = res?.data?.tempPassword;
        toast.success(temp ? t("adminUsers.password.temp", `Temp password: ${temp}`) : t("adminUsers.password.reset", "Password reset"));
      } else if (confirm.type === "bulk" && confirm.bulkAction) {
        await adminService.bulkUserAction(selectedIds, confirm.bulkAction);
        setSelectedIds([]);
      }
      setConfirm(null); setReason(""); setResetPwd("");
      await loadUsers(true);
      if (detail) await openDetails(detail._id);
    } catch (err: unknown) {
      toast.error(parseErr(err, t("adminUsers.error.action", "Action failed")));
    } finally {
      setSaving(false);
    }
  };

  const pageStart = total ? (page - 1) * limit + 1 : 0;
  const pageEnd = Math.min(page * limit, total);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><h1 className="text-3xl font-bold">{t("adminUsers.title", "User Management")}</h1></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate} className="gap-2"><Download className="h-4 w-4" />{t("adminUsers.downloadTemplate", "Download Template")}</Button>
            <Button variant="outline" onClick={() => importRef.current?.click()} className="gap-2"><FileSpreadsheet className="h-4 w-4" />{t("adminUsers.importUsers", "Import Users")}</Button>
            <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" />{t("adminUsers.addUser", "Add New User")}</Button>
            <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={importCsv} />
          </div>
        </div>

        <Card className="mb-4"><CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <Label className="mb-2 block">{t("adminUsers.search", "Search")}</Label>
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" value={filterDraft.search} onChange={(e) => setFilterDraft((p) => ({ ...p, search: e.target.value }))} placeholder={t("adminUsers.searchPlaceholder", "name/email/phone")} /></div>
            </div>
            <div><Label className="mb-2 block">{t("adminUsers.role", "Role")}</Label><Select value={filterDraft.role} onValueChange={(v) => setFilterDraft((p) => ({ ...p, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("common.all", "All")}</SelectItem><SelectItem value="user">{t("adminUsers.citizen", "Citizen")}</SelectItem><SelectItem value="officer">{t("adminUsers.officer", "Officer")}</SelectItem><SelectItem value="admin">{t("adminUsers.admin", "Admin")}</SelectItem></SelectContent></Select></div>
            <div><Label className="mb-2 block">{t("adminUsers.status", "Status")}</Label><Select value={filterDraft.status} onValueChange={(v) => setFilterDraft((p) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("common.all", "All")}</SelectItem><SelectItem value="active">{t("adminUsers.active", "Active")}</SelectItem><SelectItem value="inactive">{t("adminUsers.inactive", "Inactive")}</SelectItem><SelectItem value="banned">{t("adminUsers.banned", "Banned")}</SelectItem></SelectContent></Select></div>
            <div><Label className="mb-2 block">{t("adminUsers.department", "Department")}</Label><Select value={filterDraft.department} onValueChange={(v) => setFilterDraft((p) => ({ ...p, department: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("common.all", "All")}</SelectItem>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-end"><Button className="w-full" onClick={() => { setPage(1); setFilters(filterDraft); }}>{t("adminUsers.apply", "Apply")}</Button></div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
            <span className="text-sm text-muted-foreground">{t("adminUsers.showing", "Showing")} {pageStart}-{pageEnd} {t("adminUsers.of", "of")} {total}</span>
            <div className="flex gap-2">
              <Select value={bulkAction} onValueChange={(v: BulkAction) => setBulkAction(v)}><SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{t("adminUsers.bulkAction", "Bulk Action")}</SelectItem><SelectItem value="activate">{t("adminUsers.activate", "Activate")}</SelectItem><SelectItem value="deactivate">{t("adminUsers.deactivate", "Deactivate")}</SelectItem><SelectItem value="export">{t("adminUsers.export", "Export")}</SelectItem></SelectContent></Select>
              <Button variant="outline" onClick={doBulk}>{t("adminUsers.apply", "Apply")}</Button>
              <Button variant="ghost" size="icon" onClick={() => loadUsers()}><RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
            </div>
          </div>

          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead><Checkbox checked={users.length > 0 && selectedIds.length === users.length} onCheckedChange={(c) => setSelectedIds(c ? users.map((u) => u._id) : [])} /></TableHead>
            <TableHead>{t("adminUsers.avatar", "Avatar")}</TableHead><TableHead>{t("adminUsers.name", "Name")}</TableHead><TableHead>{t("adminUsers.email", "Email")}</TableHead><TableHead>{t("adminUsers.phone", "Phone")}</TableHead><TableHead>{t("adminUsers.role", "Role")}</TableHead><TableHead>{t("adminUsers.department", "Department")}</TableHead><TableHead>{t("adminUsers.status", "Status")}</TableHead><TableHead>{t("adminUsers.complaintsFiled", "Complaints Filed")}</TableHead><TableHead>{t("adminUsers.joined", "Joined")}</TableHead><TableHead>{t("adminUsers.lastActive", "Last Active")}</TableHead><TableHead>{t("adminUsers.actions", "Actions")}</TableHead>
          </TableRow></TableHeader><TableBody>
            {loading ? <TableRow><TableCell colSpan={12} className="py-8 text-center">{t("common.loading", "Loading...")}</TableCell></TableRow> :
              users.length === 0 ? <TableRow><TableCell colSpan={12} className="py-8 text-center">{t("adminUsers.noUsers", "No users found")}</TableCell></TableRow> :
                users.map((u) => <TableRow key={u._id}>
                  <TableCell><Checkbox checked={selectedIds.includes(u._id)} onCheckedChange={(c) => setSelectedIds((p) => c ? [...p, u._id] : p.filter((id) => id !== u._id))} /></TableCell>
                  <TableCell>{u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="h-8 w-8 rounded-full object-cover" /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold">{initials(u.name)}</div>}</TableCell>
                  <TableCell><Button variant="link" className="h-auto p-0" onClick={() => openDetails(u._id)}>{u.name}</Button></TableCell>
                  <TableCell>{u.email}</TableCell><TableCell>{u.phone}</TableCell>
                  <TableCell><Badge variant="secondary">{roleLabel(u.role)}</Badge></TableCell>
                  <TableCell>{u.role === "officer" ? u.department?.name || "-" : "-"}</TableCell>
                  <TableCell>{u.status === "banned" ? <Badge className="bg-red-100 text-red-700">{t("adminUsers.banned", "Banned")}</Badge> : <Button variant="outline" size="sm" onClick={async () => { setSaving(true); try { await adminService.updateUserStatus(u._id, u.status === "active" ? "inactive" : "active"); await loadUsers(true); } catch (err: unknown) { toast.error(parseErr(err, t("adminUsers.error.statusUpdate", "Failed status update"))); } finally { setSaving(false); } }}>{u.status === "active" ? t("adminUsers.active", "Active") : t("adminUsers.inactive", "Inactive")}</Button>}</TableCell>
                  <TableCell>{u.role === "user" ? u.complaintsFiled : "-"}</TableCell>
                  <TableCell>{new Date(u.joinedDate).toLocaleDateString()}</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(u.lastActive), { addSuffix: true })}</TableCell>
                  <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openDetails(u._id)}><Eye className="h-4 w-4" /></Button>{u.status === "banned" ? <Button variant="ghost" size="icon" onClick={() => setConfirm({ type: "unban", userId: u._id, userName: u.name })}>{t("adminUsers.unban", "Unban")}</Button> : <Button variant="ghost" size="icon" onClick={() => setConfirm({ type: "ban", userId: u._id, userName: u.name })}><Ban className="h-4 w-4 text-red-600" /></Button>}</div></TableCell>
                </TableRow>)}
          </TableBody></Table></div>
          <div className="flex justify-end gap-2 border-t p-4"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("common.previous", "Previous")}</Button><span className="self-center text-sm">{t("common.page", "Page")} {page}</span><Button variant="outline" disabled={pageEnd >= total} onClick={() => setPage((p) => p + 1)}>{t("common.next", "Next")}</Button></div>
        </CardContent></Card>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{t("adminUsers.userDetails", "User Details")}</DialogTitle><DialogDescription>{t("adminUsers.userDetailsSub", "Profile, activity and admin controls")}</DialogDescription></DialogHeader>
        {detailsLoading || !detail ? <div className="py-8 text-center text-muted-foreground">{t("common.loading", "Loading...")}</div> : <div className="space-y-4">
          <div className="rounded-lg border p-4"><p className="text-lg font-semibold">{detail.name}</p><p className="text-sm text-muted-foreground">{detail.email} • {detail.phone}</p><div className="mt-2 flex gap-2"><Badge>{roleLabel(detail.role)}</Badge><Badge variant="outline">Joined {new Date(detail.joinedDate).toLocaleDateString()}</Badge></div><p className="mt-2 text-sm">Verification: Email {detail.verification.email ? "✓" : "✗"} | Phone {detail.verification.phone ? "✓" : "✗"} | Aadhaar {detail.verification.aadhaar ? "✓" : "✗"}</p></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3"><Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total complaints</p><p className="text-xl font-semibold">{detail.activity.totalComplaints}</p></CardContent></Card><Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Resolved</p><p className="text-xl font-semibold">{detail.activity.resolvedComplaints}</p></CardContent></Card><Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Avg rating</p><p className="text-xl font-semibold">{detail.activity.avgRating}</p></CardContent></Card></div>
          <div className="rounded-lg border p-4"><p className="mb-2 font-medium">Recent activity</p><div className="space-y-2">{detail.activity.recentTimeline.length ? detail.activity.recentTimeline.map((t) => <div key={t.id} className="rounded-md bg-muted/40 p-2"><p className="text-sm font-medium">{t.label}</p><p className="text-xs text-muted-foreground">{t.description}</p></div>) : <p className="text-sm text-muted-foreground">No activity</p>}</div></div>
          <div className="rounded-lg border p-4"><p className="mb-2 font-medium">Edit options</p><div className="grid grid-cols-1 gap-3 md:grid-cols-2"><div><Label className="mb-2 block">Change role</Label><Select value={editRole} onValueChange={(v: UserRole) => setEditRole(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Citizen</SelectItem><SelectItem value="officer">Officer</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>{editRole === "officer" && <div><Label className="mb-2 block">Assign department</Label><Select value={editDept} onValueChange={setEditDept}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select department</SelectItem>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>}</div><div className="mt-3 flex flex-wrap gap-2"><Button onClick={async () => { if (!detail) return; if (editRole === "officer" && editDept === "none") return toast.error("Department required for officer"); setSaving(true); try { await adminService.updateUser(detail._id, { role: editRole, departmentId: editRole === "officer" ? editDept : undefined }); await openDetails(detail._id); await loadUsers(true); } catch (err: unknown) { toast.error(parseErr(err, "Failed to update user")); } finally { setSaving(false); } }}>Save role/department</Button>{detail.status === "banned" ? <Button variant="outline" onClick={() => setConfirm({ type: "unban", userId: detail._id, userName: detail.name })}>Unban user</Button> : <Button variant="destructive" onClick={() => setConfirm({ type: "ban", userId: detail._id, userName: detail.name })}>Ban user</Button>}</div><div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]"><Input placeholder="Custom password (optional)" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} /><Button variant="outline" onClick={() => setConfirm({ type: "reset", userId: detail._id, userName: detail.name })}>Reset Password</Button></div></div>
        </div>}
      </DialogContent></Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Add User</DialogTitle></DialogHeader>
        <div className="space-y-3"><div className="grid grid-cols-1 gap-3 md:grid-cols-2"><div><Label className="mb-2 block">Name</Label><Input value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} /></div><div><Label className="mb-2 block">Email</Label><Input type="email" value={addForm.email} onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))} /></div></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2"><div><Label className="mb-2 block">Phone</Label><Input value={addForm.phone} onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))} /></div><div><Label className="mb-2 block">Role</Label><Select value={addForm.role} onValueChange={(v: UserRole) => setAddForm((p) => ({ ...p, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Citizen</SelectItem><SelectItem value="officer">Officer</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div></div>
          {addForm.role === "officer" && <div><Label className="mb-2 block">Department</Label><Select value={addForm.departmentId} onValueChange={(v) => setAddForm((p) => ({ ...p, departmentId: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select department</SelectItem>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>}
          <div className="rounded-md border p-3"><div className="mb-2 flex items-center gap-2"><Checkbox checked={addForm.autoGeneratePassword} onCheckedChange={(c) => setAddForm((p) => ({ ...p, autoGeneratePassword: Boolean(c) }))} /><span className="text-sm">Auto-generate password</span></div>{!addForm.autoGeneratePassword && <Input type="password" placeholder="Custom password" value={addForm.password} onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))} />}<div className="mt-2 flex items-center gap-2"><Checkbox checked={addForm.sendWelcome} onCheckedChange={(c) => setAddForm((p) => ({ ...p, sendWelcome: Boolean(c) }))} /><span className="text-sm">Send welcome email</span></div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button disabled={saving} onClick={async () => { if (!addForm.name || !addForm.email || !addForm.phone) return toast.error("Name, email, phone are required"); if (addForm.role === "officer" && addForm.departmentId === "none") return toast.error("Department required for officers"); if (!addForm.autoGeneratePassword && addForm.password.length < 8) return toast.error("Password must be at least 8 chars"); setSaving(true); try { const res = await adminService.createUser({ name: addForm.name, email: addForm.email, phone: addForm.phone, role: addForm.role, departmentId: addForm.role === "officer" ? addForm.departmentId : undefined, autoGeneratePassword: addForm.autoGeneratePassword, password: addForm.autoGeneratePassword ? undefined : addForm.password, sendWelcome: addForm.sendWelcome }); const temp = res?.data?.tempPassword; toast.success(temp ? `User created. Temp password: ${temp}` : "User created"); setAddOpen(false); setAddForm({ name: "", email: "", phone: "", role: "user", departmentId: "none", autoGeneratePassword: true, password: "", sendWelcome: true }); await loadUsers(true); } catch (err: unknown) { toast.error(parseErr(err, "Failed to create user")); } finally { setSaving(false); } }}>Create User</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={!!confirm} onOpenChange={() => setConfirm(null)}><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" />Confirm Action</DialogTitle><DialogDescription>{confirm?.type === "ban" && `Ban ${confirm.userName}?`} {confirm?.type === "unban" && `Unban ${confirm.userName}?`} {confirm?.type === "reset" && `Reset password for ${confirm.userName}?`} {confirm?.type === "bulk" && `Apply ${confirm.bulkAction} on ${selectedIds.length} users?`}</DialogDescription></DialogHeader>{confirm?.type === "ban" && <div><Label className="mb-2 block">Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></div>}<DialogFooter><Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button><Button variant={confirm?.type === "ban" ? "destructive" : "default"} onClick={confirmAction} disabled={saving}>Confirm</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
};

export default AdminUserManagement;

