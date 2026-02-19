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

export interface NotificationFilters {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: string;
  priority?: "low" | "medium" | "high" | "critical";
  source?: "system" | "admin" | "officer";
  search?: string;
  includeArchived?: boolean;
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
  saveDraft: async (formData: FormData) => {
    formData.set("isDraft", "true");
    const response = await api.post("/complaints/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  updateDraft: async (id: string, formData: FormData) => {
    const response = await api.put(`/complaints/drafts/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  deleteDraft: async (id: string) => {
    const response = await api.delete(`/complaints/drafts/${id}`);
    return response.data;
  },
  submitDraft: async (id: string) => {
    const response = await api.post(`/complaints/drafts/${id}/submit`);
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
  getNotifications: async (filters?: number | NotificationFilters) => {
    const params = new URLSearchParams();
    if (typeof filters === "number") {
      params.append("limit", String(filters));
    } else {
      const payload = filters || {};
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        params.append(key, String(value));
      });
    }
    const query = params.toString();
    const response = await api.get(
      `/complaints/notifications${query ? `?${query}` : ""}`,
    );
    return response.data;
  },
  markNotificationRead: async (notificationId: string, isRead: boolean = true) => {
    const response = await api.post(`/complaints/notifications/${notificationId}/read`, { isRead });
    return response.data;
  },
  markAllNotificationsRead: async (payload?: { type?: string; includeArchived?: boolean; onlyUnread?: boolean }) => {
    const response = await api.post("/complaints/notifications/mark-all-read", payload || {});
    return response.data;
  },
  archiveNotification: async (notificationId: string) => {
    const response = await api.post(`/complaints/notifications/${notificationId}/archive`);
    return response.data;
  },
  archiveAllNotifications: async () => {
    const response = await api.post("/complaints/notifications/archive-all");
    return response.data;
  },
  seedDemoNotifications: async (count: number = 10) => {
    const response = await api.post("/complaints/notifications/seed-demo", {
      count,
    });
    return response.data;
  },
  getNotificationPreferences: async () => {
    const response = await api.get("/complaints/notifications/preferences");
    return response.data;
  },
  updateNotificationPreferences: async (preferences: Record<string, any>) => {
    const response = await api.put("/complaints/notifications/preferences", { preferences });
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
  updateVoiceMetadata: async (
    id: string,
    payload: {
      source?: "voice" | "mixed" | "text";
      language?: "hi" | "en" | "ur" | "other";
      locale?: string;
      confidence?: number | null;
      transcript?: string;
    },
  ) => {
    const response = await api.post(`/complaints/${id}/voice-metadata`, payload);
    return response.data;
  },
  getDrafts: async () => {
    const response = await api.get('/complaints/drafts');
    return response.data;
  },

};

export default complaintService;
