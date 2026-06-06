import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';

const API_URL = API_BASE_URL;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const officerService = {
  // ========== DASHBOARD ==========
  
  /**
   * Get officer dashboard stats
   * @returns Dashboard stats, high priority complaints, recent activity
   */
  async getDashboardStats() {
    const response = await api.get('/officer/dashboard/stats');
    return response.data;
  },

  // ========== MY COMPLAINTS ==========
  
  /**
   * Get all complaints assigned to the logged-in officer
   * @param filters - Optional filters (status, priority, search, sortBy, sortDir, page, limit)
   * @returns Paginated list of complaints + summary stats
   */
  async getMyComplaints(filters?: {
    status?: string;
    priority?: string;
    search?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortDir) params.append('sortDir', filters.sortDir);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await api.get(`/officer/my-complaints?${params.toString()}`);
    return response.data;
  },

  /**
   * Get complaints waiting in officer's department queue (unassigned).
   */
  async getDepartmentQueue(filters?: {
    search?: string;
    priority?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();

    if (filters?.search) params.append("search", filters.search);
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const response = await api.get(`/officer/queue?${params.toString()}`);
    return response.data;
  },

  /**
   * Claim a complaint from department queue.
   */
  async claimComplaint(complaintId: string) {
    const response = await api.post(`/officer/complaints/${complaintId}/claim`);
    return response.data;
  },

  /**
   * Get single complaint details by ID
   * @param complaintId - Complaint _id
   * @returns Full complaint details with timeline
   */
  async getComplaintById(complaintId: string) {
    const response = await api.get(`/officer/complaints/${complaintId}`);
    return response.data;
  },

  // ========== UPDATE STATUS ==========
  
  /**
   * Update complaint status (officer workflow)
   * @param complaintId - Complaint _id
   * @param data - Status update data
   */
  async updateComplaintStatus(
    complaintId: string,
    data: {
      status: string;
      actionNotes: string;
      evidenceImages?: string[];
      // Inspection fields (if status = "Inspection Scheduled")
      inspectionDate?: string;
      inspectionTime?: string;
      inspectorName?: string;
      inspectionNotes?: string;
      // Resolution fields (if status = "Resolved")
      resolutionSummary?: string;
      resolutionImages?: string[];
      completionDate?: string;
      readyForFeedback?: boolean;
      // Rejection fields (if status = "Rejected")
      rejectionReason?: string;
      rejectionExplanation?: string;
    }
  ) {
    const response = await api.put(`/officer/complaints/${complaintId}/status`, data);
    return response.data;
  },

  /**
   * Add a note/comment to complaint without changing status
   * @param complaintId - Complaint _id
   * @param data - Note data (message, attachments)
   */
  async addNote(
    complaintId: string,
    data: {
      message: string;
      attachments?: string[];
    }
  ) {
    const response = await api.post(`/officer/complaints/${complaintId}/note`, data);
    return response.data;
  },

  // ========== FILE UPLOAD HELPERS ==========
  
  /**
   * Upload image file to Cloudinary (use existing complaint image upload)
   * @param file - File object
   * @returns Cloudinary URL
   */
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    
    // Reuse existing complaint image upload endpoint
    const response = await api.post('/complaints/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.imageUrl;
  },

  /**
   * Upload multiple images
   * @param files - Array of File objects
   * @returns Array of Cloudinary URLs
   */
  async uploadImages(files: File[]): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadImage(file));
    return Promise.all(uploadPromises);
  },
};

export default officerService;
