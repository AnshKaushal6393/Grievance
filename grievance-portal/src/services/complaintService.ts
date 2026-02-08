import api from "@/lib/api";

export const complaintService = {
  fileComplaint: async (formData: FormData) => {
    const response = await api.post("/complaints/creaate", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getMyComplaints: async (filters?: any) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/complaints/my-complaints?${params}`);
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
  getDrafts: async () => {
    const response = await api.get('/complaints/drafts');
    return response.data;
  }

};

export default complaintService;
