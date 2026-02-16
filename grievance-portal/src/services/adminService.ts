// src/services/adminService.ts
import api from '@/lib/api';

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

// ─── Dashboard ────────────────────────────────────────────
export const adminService = {

  // GET /api/admin/dashboard/stats
  getDashboardStats: async () => {
    const res = await api.get('/admin/dashboard/stats');
    return res.data;
  },

  // GET /api/admin/analytics?range=30days
  getAnalytics: async (range = '30days', fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams({ range });
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    const res = await api.get(`/admin/analytics?${params}`);
    return res.data;
  },

  // ─── Complaints ──────────────────────────────────────────

  // GET /api/admin/complaints
  getAllComplaints: async (filters?: Record<string, any>) => {
    const params = new URLSearchParams(
      Object.entries(filters || {})
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)])
    );
    const res = await api.get(`/admin/complaints?${params}`);
    return res.data;
  },

  // PUT /api/admin/complaints/:id/assign
  assignComplaint: async (id: string, data: {
    departmentId?: string;
    officerId?: string;
    priority?: string;
    estimatedDays?: number;
  }) => {
    const res = await api.put(`/admin/complaints/${id}/assign`, data);
    return res.data;
  },

  // PUT /api/admin/complaints/:id/status
  updateComplaintStatus: async (id: string, status: string, message?: string, rejectionReason?: string) => {
    const res = await api.put(`/admin/complaints/${id}/status`, { status, message, rejectionReason });
    return res.data;
  },

  // PUT /api/admin/complaints/bulk-assign
  bulkAssign: async (complaintIds: string[], departmentId?: string, officerId?: string) => {
    const res = await api.put('/admin/complaints/bulk-assign', { complaintIds, departmentId, officerId });
    return res.data;
  },

  // ─── Departments ─────────────────────────────────────────

  // GET /api/admin/departments
  getDepartments: async () => {
    const res = await api.get('/admin/departments');
    return res.data;
  },

  // GET /api/admin/departments/:id
  getDepartment: async (id: string) => {
    const res = await api.get(`/admin/departments/${id}`);
    return res.data;
  },

  // POST /api/admin/departments
  createDepartment: async (data: {
    name: string;
    code: string;
    description?: string;
    categories?: string[];
    contactEmail?: string;
    contactPhone?: string;
    maxCapacity?: number;
    slaTargets?: { low: number; medium: number; high: number; critical: number };
  }) => {
    const res = await api.post('/admin/departments', data);
    return res.data;
  },

  // PUT /api/admin/departments/:id
  updateDepartment: async (id: string, data: any) => {
    const res = await api.put(`/admin/departments/${id}`, data);
    return res.data;
  },

  // DELETE /api/admin/departments/:id
  deleteDepartment: async (id: string) => {
    const res = await api.delete(`/admin/departments/${id}`);
    return res.data;
  },

  // POST /api/admin/departments/:id/officers
  addOfficer: async (
    departmentId: string,
    data: {
      userId?: string;
      designation?: string;
      createUser?: {
        name: string;
        email: string;
        phone: string;
        password: string;
        street: string;
        city: string;
        state: string;
        pincode: string;
      };
    },
  ) => {
    const res = await api.post(`/admin/departments/${departmentId}/officers`, data);
    return res.data;
  },

  // DELETE /api/admin/departments/:id/officers/:officerId
  removeOfficer: async (departmentId: string, officerId: string) => {
    const res = await api.delete(`/admin/departments/${departmentId}/officers/${officerId}`);
    return res.data;
  },

  // ─── Users ───────────────────────────────────────────────

  // GET /api/admin/users
  getAllUsers: async (filters?: {
    role?: string;
    search?: string;
    status?: string;
    department?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams(
      Object.entries(filters || {})
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([key, value]) => [key, String(value)]),
    );
    const res = await api.get(`/admin/users?${params}`);
    return res.data;
  },

  // GET /api/admin/users/:id
  getUserDetails: async (id: string) => {
    const res = await api.get(`/admin/users/${id}`);
    return res.data;
  },

  // POST /api/admin/users
  createUser: async (data: {
    name: string;
    email: string;
    phone: string;
    role: string;
    departmentId?: string;
    password?: string;
    autoGeneratePassword?: boolean;
    sendWelcome?: boolean;
  }) => {
    const res = await api.post('/admin/users', data);
    return res.data;
  },

  // PUT /api/admin/users/:id
  updateUser: async (id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    departmentId?: string;
  }) => {
    const res = await api.put(`/admin/users/${id}`, data);
    return res.data;
  },

  // PUT /api/admin/users/:id/status
  updateUserStatus: async (id: string, status: "active" | "inactive" | "banned", reason?: string) => {
    const res = await api.put(`/admin/users/${id}/status`, { status, reason });
    return res.data;
  },

  // POST /api/admin/users/:id/reset-password
  resetUserPassword: async (id: string, password?: string) => {
    const res = await api.post(`/admin/users/${id}/reset-password`, { password });
    return res.data;
  },

  // POST /api/admin/users/bulk-action
  bulkUserAction: async (userIds: string[], action: "activate" | "deactivate") => {
    const res = await api.post("/admin/users/bulk-action", { userIds, action });
    return res.data;
  },

  // POST /api/admin/users/import
  importUsers: async (users: Array<Record<string, any>>, sendWelcome = false) => {
    const res = await api.post("/admin/users/import", { users, sendWelcome });
    return res.data;
  },

  // POST /api/admin/users/import-file
  importUsersFile: async (file: File, sendWelcome = false) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("sendWelcome", String(sendWelcome));
    const res = await api.post("/admin/users/import-file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // GET /api/admin/stream/users (SSE URL)
  getUsersStreamUrl: () => {
    const token = localStorage.getItem("token") || "";
    const params = new URLSearchParams();
    if (token) params.set("token", token);
    return `${API_BASE}/admin/stream/users?${params.toString()}`;
  },
};

export default adminService;
