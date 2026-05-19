/**
 * GoogleService.ts
 * ─────────────────────────────────────────────────────────────
 * Handles all Google API communication:
 *  • Google Places API  — fetch reviews via API key + Place ID (no OAuth)
 *  • Google Business Profile API — full OAuth, all reviews + reply posting
 *  • Token refresh logic
 *  • Review upsert to SQL Server via Prisma
 */

import axios from "axios";
import { prisma } from "../lib/prisma";
import { logger } from "../utils/logger";

// ─── Google API endpoints ─────────────────────────────────────────────────────
const PLACES_DETAILS_URL   = "https://maps.googleapis.com/maps/api/place/details/json";
const BUSINESS_API_BASE    = "https://mybusiness.googleapis.com/v4";
const GOOGLE_TOKEN_URL     = "https://oauth2.googleapis.com/token";
const OAUTH_AUTH_BASE      = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_SCOPES         = "https://www.googleapis.com/auth/business.manage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoogleCredentials {
  apiKey:       string;
  clientId:     string;
  clientSecret: string;
  placeId:      string;
  accountId:    string;  // e.g. "accounts/123456789"
  locationId:   string;  // e.g. "locations/987654321"
}

interface BusinessReview {
  name:        string;  // e.g. "accounts/.../locations/.../reviews/abc"
  reviewId:    string;
  reviewer:    { displayName: string; profilePhotoUrl?: string };
  starRating:  "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment:     string;
  createTime:  string;
  updateTime:  string;
  reviewReply?: { comment: string; updateTime: string };
}

interface PlacesReview {
  author_name:       string;
  profile_photo_url?: string;
  rating:            number;
  text:              string;
  time:              number; // Unix timestamp
}

interface SyncResult {
  newReviews:     number;
  updatedReviews: number;
  totalSynced:    number;
  source:         "business_profile" | "places_api" | "none";
  error?:         string;
}

const STAR_TO_INT: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ratingToSentiment(rating: number): "POSITIVE" | "NEGATIVE" | "NEUTRAL" {
  if (rating >= 4) return "POSITIVE";
  if (rating <= 2) return "NEGATIVE";
  return "NEUTRAL";
}

// ─── GoogleService ────────────────────────────────────────────────────────────

export class GoogleService {

  // ── Credentials ─────────────────────────────────────────────────────────────

  /** Read Google credentials from the settings table, falling back to env vars */
  static async getCredentials(): Promise<GoogleCredentials> {
    const row  = await prisma.settings.findUnique({ where: { section: "google" } });
    const data = row ? (JSON.parse(row.data) as Record<string, string>) : {};

    return {
      apiKey:       data.apiKey       || process.env.GOOGLE_API_KEY                || "",
      clientId:     data.clientId     || process.env.GOOGLE_CLIENT_ID              || "",
      clientSecret: data.clientSecret || process.env.GOOGLE_CLIENT_SECRET          || "",
      placeId:      data.placeId      || process.env.GOOGLE_PLACE_ID               || "",
      accountId:    data.accountId    || process.env.GOOGLE_BUSINESS_ACCOUNT_ID    || "",
      locationId:   data.locationId   || process.env.GOOGLE_LOCATION_ID            || "",
    };
  }

  // ── OAuth ────────────────────────────────────────────────────────────────────

  /** Generate the Google OAuth consent screen URL */
  static async buildAuthUrl(redirectUri: string): Promise<string | null> {
    const creds = await this.getCredentials();
    if (!creds.clientId) return null;

    const params = new URLSearchParams({
      client_id:     creds.clientId,
      redirect_uri:  redirectUri,
      response_type: "code",
      scope:         OAUTH_SCOPES,
      access_type:   "offline",
      prompt:        "consent",
    });

    return `${OAUTH_AUTH_BASE}?${params.toString()}`;
  }

  /** Exchange an authorization code for access + refresh tokens */
  static async exchangeCode(code: string, redirectUri: string) {
    const creds = await this.getCredentials();
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error("Google OAuth credentials not configured. Add Client ID and Client Secret in Settings.");
    }

    const response = await axios.post(GOOGLE_TOKEN_URL, new URLSearchParams({
      code,
      client_id:     creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }).toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return response.data as {
      access_token:  string;
      refresh_token: string;
      expires_in:    number;
      token_type:    string;
    };
  }

  /** Refresh an expired access token */
  static async refreshToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
    const creds = await this.getCredentials();
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error("Google OAuth credentials not configured.");
    }

    const response = await axios.post(GOOGLE_TOKEN_URL, new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
      client_id:     creds.clientId,
      client_secret: creds.clientSecret,
    }).toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return response.data;
  }

  /** Get a valid access token, refreshing if expired */
  static async getValidAccessToken(): Promise<string | null> {
    const auth = await prisma.googleAuth.findFirst();
    if (!auth?.refreshToken) return null;

    const FIVE_MINUTES = 5 * 60 * 1000;
    const isExpired = !auth.expiresAt || auth.expiresAt.getTime() < Date.now() + FIVE_MINUTES;

    if (!isExpired && auth.accessToken) return auth.accessToken;

    try {
      const tokens    = await this.refreshToken(auth.refreshToken);
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await prisma.googleAuth.update({
        where: { id: auth.id },
        data:  { accessToken: tokens.access_token, expiresAt },
      });

      return tokens.access_token;
    } catch (err) {
      logger.error("Token refresh failed:", err);
      return null;
    }
  }

  // ── Business Profile API ──────────────────────────────────────────────────────

  /** Fetch ALL reviews from Google Business Profile API (paginated) */
  static async fetchBusinessReviews(
    accountId:   string,
    locationId:  string,
    accessToken: string,
  ): Promise<BusinessReview[]> {
    // Normalise: strip leading slash, ensure correct format
    const normAccount  = accountId.replace(/^\//, "");
    const normLocation = locationId.replace(/^\//, "");
    const name         = `${normAccount}/${normLocation}`;

    const allReviews: BusinessReview[] = [];
    let pageToken: string | undefined;

    do {
      const params: Record<string, string> = { pageSize: "50" };
      if (pageToken) params.pageToken = pageToken;

      const { data } = await axios.get(`${BUSINESS_API_BASE}/${name}/reviews`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      });

      allReviews.push(...(data.reviews || []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    return allReviews;
  }

  /** Post a reply to Google Business Profile */
  static async postReplyToGoogle(reviewName: string, replyText: string): Promise<void> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) throw new Error("Not authenticated with Google. Reconnect in Integrations.");

    await axios.put(
      `${BUSINESS_API_BASE}/${reviewName}/reply`,
      { comment: replyText },
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } },
    );
  }

  // ── Places API (fallback) ─────────────────────────────────────────────────────

  /**
   * Fetch reviews from Google Places API.
   * Returns up to 5 most-relevant reviews — no OAuth required.
   */
  static async fetchPlacesReviews(placeId: string, apiKey: string): Promise<PlacesReview[]> {
    const { data } = await axios.get(PLACES_DETAILS_URL, {
      params: {
        place_id: placeId,
        fields:   "name,rating,user_ratings_total,reviews",
        key:      apiKey,
        reviews_sort: "newest",
      },
    });

    if (data.status !== "OK") {
      throw new Error(
        `Google Places API error: ${data.status}${data.error_message ? " — " + data.error_message : ""}`,
      );
    }

    return (data.result?.reviews ?? []) as PlacesReview[];
  }

  // ── Upsert helpers ────────────────────────────────────────────────────────────

  private static async upsertBusinessReview(review: BusinessReview): Promise<"new" | "updated" | "unchanged"> {
    const rating        = STAR_TO_INT[review.starRating] ?? 3;
    const googleReviewId = review.name?.split("/").pop() || review.reviewId;
    const publishedAt   = new Date(review.createTime);
    const updatedAt     = new Date(review.updateTime);

    const existing = await prisma.review.findUnique({ where: { googleReviewId } });

    if (!existing) {
      await prisma.review.create({
        data: {
          googleReviewId,
          reviewerName:     review.reviewer.displayName,
          reviewerPhotoUrl: review.reviewer.profilePhotoUrl ?? null,
          rating,
          text:             review.comment ?? "",
          sentiment:        ratingToSentiment(rating),
          sentimentScore:   rating / 5,
          publishedAt,
          isNew:            true,
          isSynced:         true,
          googleReviewUrl:  `https://search.google.com/local/reviews?placeid=${googleReviewId}`,
        },
      });

      // Notification for negative reviews
      if (rating <= 2) {
        await prisma.notification.create({
          data: {
            type:    "NEGATIVE_REVIEW",
            title:   `⚠️ New ${rating}-star review`,
            message: `${review.reviewer.displayName} left a ${rating}-star review that needs attention.`,
          },
        });
      }

      return "new";
    }

    // Update only if review text changed or was updated
    if (existing.text !== (review.comment ?? "") || existing.updatedAt < updatedAt) {
      await prisma.review.update({
        where: { id: existing.id },
        data:  { text: review.comment ?? "", updatedAt: new Date() },
      });
      return "updated";
    }

    return "unchanged";
  }

  private static async upsertPlacesReview(review: PlacesReview, placeId: string): Promise<"new" | "unchanged"> {
    // Build a stable ID from place + author + time
    const googleReviewId = `places_${placeId}_${review.time}_${review.author_name.replace(/\W/g, "_").substring(0, 30)}`;
    const publishedAt    = new Date(review.time * 1000);

    const existing = await prisma.review.findUnique({ where: { googleReviewId } });
    if (existing) return "unchanged";

    await prisma.review.create({
      data: {
        googleReviewId,
        reviewerName:     review.author_name,
        reviewerPhotoUrl: review.profile_photo_url ?? null,
        rating:           review.rating,
        text:             review.text ?? "",
        sentiment:        ratingToSentiment(review.rating),
        sentimentScore:   review.rating / 5,
        publishedAt,
        isNew:            true,
        isSynced:         true,
      },
    });

    if (review.rating <= 2) {
      await prisma.notification.create({
        data: {
          type:    "NEGATIVE_REVIEW",
          title:   `⚠️ New ${review.rating}-star review`,
          message: `${review.author_name} left a ${review.rating}-star review that needs attention.`,
        },
      });
    }

    return "new";
  }

  // ── Main sync ──────────────────────────────────────────────────────────────────

  /**
   * Primary sync entry point.
   * 1. Try Business Profile API (OAuth) — all reviews + reply data
   * 2. Fall back to Places API (API key) — up to 5 reviews
   */
  static async syncReviews(): Promise<SyncResult> {
    const creds = await this.getCredentials();

    // Validate we have at minimum an API key and Place ID
    if (!creds.apiKey && !creds.placeId) {
      return {
        newReviews: 0, updatedReviews: 0, totalSynced: 0,
        source: "none",
        error: "Google API Key and Place ID are required. Configure them in Settings first.",
      };
    }

    let newReviews     = 0;
    let updatedReviews = 0;
    let totalSynced    = 0;

    // ── Try Business Profile API ────────────────────────────────────────────────
    const accessToken = await this.getValidAccessToken();

    if (accessToken && creds.accountId && creds.locationId) {
      try {
        logger.info("Syncing via Google Business Profile API...");
        const reviews = await this.fetchBusinessReviews(creds.accountId, creds.locationId, accessToken);

        for (const review of reviews) {
          const result = await this.upsertBusinessReview(review);
          if (result === "new")      newReviews++;
          if (result === "updated")  updatedReviews++;
          totalSynced++;
        }

        logger.info(`Business Profile sync done: ${newReviews} new, ${updatedReviews} updated, ${totalSynced} total`);

        return { newReviews, updatedReviews, totalSynced, source: "business_profile" };
      } catch (err: unknown) {
        logger.warn("Business Profile API failed, falling back to Places API:", err);
      }
    }

    // ── Fallback: Google Places API ─────────────────────────────────────────────
    if (creds.placeId && creds.apiKey) {
      try {
        logger.info("Syncing via Google Places API (fallback)...");
        const reviews = await this.fetchPlacesReviews(creds.placeId, creds.apiKey);

        for (const review of reviews) {
          const result = await this.upsertPlacesReview(review, creds.placeId);
          if (result === "new") newReviews++;
          totalSynced++;
        }

        logger.info(`Places API sync done: ${newReviews} new, ${totalSynced} total`);

        return {
          newReviews, updatedReviews, totalSynced, source: "places_api",
          error: totalSynced > 0
            ? "Note: Places API returns up to 5 reviews. Connect via OAuth in Integrations for all reviews."
            : undefined,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("Places API sync failed:", msg);
        return { newReviews: 0, updatedReviews: 0, totalSynced: 0, source: "none", error: msg };
      }
    }

    return {
      newReviews: 0, updatedReviews: 0, totalSynced: 0, source: "none",
      error: "No valid Google credentials found. Add your API Key and Place ID in Settings.",
    };
  }
}
