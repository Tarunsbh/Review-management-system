import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      Cookies.remove("auth_token");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

// Reviews API
export const reviewsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get("/reviews", { params }),
  getById: (id: string) => api.get(`/reviews/${id}`),
  sync: () => api.post("/reviews/sync"),
  reply: (id: string, text: string) =>
    api.post(`/reviews/${id}/reply`, { text }),
  updateReply: (id: string, replyId: string, text: string) =>
    api.put(`/reviews/${id}/reply/${replyId}`, { text }),
  deleteReply: (id: string, replyId: string) =>
    api.delete(`/reviews/${id}/reply/${replyId}`),
  export: (format: "csv" | "pdf") =>
    api.get("/reviews/export", { params: { format }, responseType: "blob" }),
};

// AI API
export const aiApi = {
  generateReply: (data: {
    reviewText: string;
    rating: number;
    reviewerName: string;
    tone: string;
    instructions?: string;
    reviewId?: string;
  }) => api.post("/ai/generate-reply", data),
  improveReply: (text: string, tone: string) =>
    api.post("/ai/improve-reply", { text, tone }),
  analyzeSentiment: (text: string) =>
    api.post("/ai/analyze-sentiment", { text }),
};

// Analytics API
export const analyticsApi = {
  getSummary: () => api.get("/analytics/summary"),
  getTrends: (period: "7d" | "30d" | "90d" | "1y") =>
    api.get("/analytics/trends", { params: { period } }),
  getRatingDistribution: () => api.get("/analytics/rating-distribution"),
  getSentimentTrends: (period: string) =>
    api.get("/analytics/sentiment-trends", { params: { period } }),
  getKeywords: () => api.get("/analytics/keywords"),
  getMonthlyComparison: () => api.get("/analytics/monthly-comparison"),
};

// Settings API
export const settingsApi = {
  get: () => api.get("/settings"),
  update: (section: string, data: Record<string, unknown>) =>
    api.put(`/settings/${section}`, data),
  testConnection: (type: "google" | "openai" | "email") =>
    api.post(`/settings/test/${type}`),
};

// Google Integration API
export const googleApi = {
  getAuthUrl: () => api.get("/google/auth-url"),
  handleCallback: (code: string) =>
    api.post("/google/callback", { code }),
  disconnect: () => api.post("/google/disconnect"),
  getStatus: () => api.get("/google/status"),
  syncReviews: () => api.post("/google/sync"),
  getSyncLogs: () => api.get("/google/sync-logs"),
};

// Notifications API
export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get("/notifications", { params }),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  getCount: () => api.get("/notifications/unread-count"),
};
