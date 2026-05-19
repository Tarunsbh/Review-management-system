// ============================================================
// Core Types - eGlobe Review Management System
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "viewer";
  avatar?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================================
// Review Types
// ============================================================

export type SentimentType = "positive" | "negative" | "neutral";
export type RatingValue = 1 | 2 | 3 | 4 | 5;

export interface Review {
  id: string;
  googleReviewId: string;
  reviewerName: string;
  reviewerPhotoUrl?: string;
  rating: RatingValue;
  text: string;
  publishedAt: string;
  updatedAt: string;
  sentiment: SentimentType;
  sentimentScore: number;
  keywords: string[];
  reply?: ReviewReply;
  googleReviewUrl?: string;
  isNew?: boolean;
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  isAiGenerated: boolean;
  postedToGoogle: boolean;
  postedAt?: string;
}

export interface ReviewFilters {
  search?: string;
  rating?: RatingValue | "all";
  sentiment?: SentimentType | "all";
  hasReply?: boolean | "all";
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "date" | "rating" | "sentiment";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================
// Analytics Types
// ============================================================

export interface AnalyticsSummary {
  totalReviews: number;
  averageRating: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  repliedCount: number;
  unrepliedCount: number;
  replyRate: number;
  ratingTrend: number; // percentage change vs last period
  reviewGrowth: number;
}

export interface RatingDistribution {
  rating: RatingValue;
  count: number;
  percentage: number;
}

export interface ReviewTrendPoint {
  date: string;
  count: number;
  averageRating: number;
  positive: number;
  negative: number;
  neutral: number;
}

export interface SentimentTrend {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

export interface KeywordFrequency {
  keyword: string;
  count: number;
  sentiment: SentimentType;
}

export interface MonthlyComparison {
  month: string;
  reviews: number;
  avgRating: number;
  positive: number;
  negative: number;
}

// ============================================================
// Settings Types
// ============================================================

export interface Settings {
  google: GoogleSettings;
  openai: OpenAISettings;
  email: EmailSettings;
  business: BusinessSettings;
  notifications: NotificationSettings;
  autoReply: AutoReplySettings;
}

export interface GoogleSettings {
  apiKey: string;
  oauthClientId: string;
  oauthClientSecret: string;
  placeId: string;
  businessAccountId: string;
  locationId: string;
  isConnected: boolean;
  lastSync?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface OpenAISettings {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  defaultTone: AiTone;
  autoSuggest: boolean;
}

export type AiTone =
  | "professional"
  | "friendly"
  | "formal"
  | "luxury"
  | "hospitality"
  | "empathetic";

export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  isVerified: boolean;
}

export interface BusinessSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string;
  description?: string;
  industry: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  newReviewAlert: boolean;
  negativeReviewAlert: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  slackWebhook?: string;
  whatsappNumber?: string;
}

export interface AutoReplySettings {
  enabled: boolean;
  positiveAutoReply: boolean;
  negativeAutoReply: boolean;
  minRatingForAuto: RatingValue;
  defaultTone: AiTone;
  delayMinutes: number;
}

// ============================================================
// Notification Types
// ============================================================

export interface Notification {
  id: string;
  type: "new_review" | "negative_review" | "reply_posted" | "sync_complete" | "system";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  reviewId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Sync & Integration Types
// ============================================================

export interface SyncLog {
  id: string;
  status: "success" | "failed" | "in_progress";
  reviewsSynced: number;
  newReviews: number;
  updatedReviews: number;
  errors?: string[];
  startedAt: string;
  completedAt?: string;
  duration?: number;
}

export interface ApiLog {
  id: string;
  method: string;
  endpoint: string;
  statusCode: number;
  duration: number;
  error?: string;
  createdAt: string;
}

// ============================================================
// AI Types
// ============================================================

export interface AiReplyRequest {
  reviewText: string;
  reviewRating: RatingValue;
  reviewerName: string;
  tone: AiTone;
  businessName: string;
  instructions?: string;
}

export interface AiReplyResponse {
  reply: string;
  alternatives: string[];
  tone: AiTone;
  confidence: number;
  processingTime: number;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
