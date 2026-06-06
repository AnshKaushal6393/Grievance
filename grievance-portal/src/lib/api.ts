import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 60000);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: Number.isFinite(API_TIMEOUT_MS) ? API_TIMEOUT_MS : 60000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const language = localStorage.getItem("grievance_language");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers["Accept-Language"] =
      language === "hi" || language === "ur" || language === "en" ? language : "en";
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login (avoid loop on auth pages)
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.startsWith("/login")
          ) {
            window.location.href = "/login";
          }
          break;
        case 403:
          // Forbidden
          console.error('Access forbidden:', data.message);
          break;
        case 404:
          // Not found
          console.error('Resource not found:', data.message);
          break;
        case 500:
          // Server error
          console.error('Server error:', data.message);
          break;
        default:
          console.error('API error:', data.message);
      }
    } else if (error.request) {
      // Request made but no response
      const baseUrl = String(error.config?.baseURL || API_BASE_URL);
      const message =
        error.code === "ECONNABORTED"
          ? "The server is taking too long to respond. Please try again in a minute."
          : `Network error: No response from server (${baseUrl})`;
      error.message = message;
      console.error(message);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;

