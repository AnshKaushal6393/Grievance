// src/services/adminService.ts
import api from '@/lib/api';

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
  getAllUsers: async (role?: string, search?: string) => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (search) params.append('search', search);
    const res = await api.get(`/admin/users?${params}`);
    return res.data;
  },
};

export default adminService;
