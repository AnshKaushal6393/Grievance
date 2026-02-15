import api from "@/lib/api";

export interface ComplaintFilters{
  status?:string;
  category?:string;
  search?:string;
  sortBy?:string;
  fromDate?:Date;
  toDate?:Date;
  page?:number;
  limit?:number;
}

export const complaintService = {
  fileComplaint: async (formData: FormData) => {
    const response = await api.post("/complaints/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getMyComplaints: async (filters?: any) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (value === "undefined") return;
        if (value instanceof Date) {
          params.append(key, value.toISOString());
        } else {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get(`/complaints/my-complaints?${params.toString()}`);
    return response.data;
  },

  getComplaint: async (id: string) => {
    const response = await api.get(`/complaints/${id}`);
    return response.data;
  },
  trackComplaint: async (complaintId: string) => {
    const response = await api.get(`/complaints/track/${complaintId}`);
    return response.data;
  },
  getDashboardStats: async () => {
    const response = await api.get('/complaints/dashboard/stats');
    return response.data;
  },
  getCitizenAnalytics: async () => {
    const response = await api.get('/complaints/dashboard/analytics');
    return response.data;
  },
  getNotifications: async (limit: number = 20) => {
    const response = await api.get(`/complaints/notifications?limit=${limit}`);
    return response.data;
  },
  markNotificationRead: async (notificationId: string) => {
    const response = await api.post(`/complaints/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllNotificationsRead: async () => {
    const response = await api.post("/complaints/notifications/mark-all-read");
    return response.data;
  },
  getComplaintHistory: async (id: string) => {
    const response = await api.get(`/complaints/${id}/history`);
    return response.data;
  },
  submitFeedback: async (id: string, rating: number, comment: string) => {
    const response = await api.post(`/complaints/${id}/feedback`, { rating, comment });
    return response.data;
  },
  getDrafts: async () => {
    const response = await api.get('/complaints/drafts');
    return response.data;
  }

};

export default complaintService;
