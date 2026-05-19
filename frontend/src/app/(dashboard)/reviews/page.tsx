"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, RefreshCw, Download, Star, ExternalLink,
  MessageSquare, Sparkles, ChevronLeft, ChevronRight, X,
  Send, Loader2, Check, Copy, WifiOff, Settings,
} from "lucide-react";
import { StarRating } from "@/components/ui/StarRating";
import { SentimentBadge } from "@/components/ui/SentimentBadge";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { reviewsApi, aiApi } from "@/lib/api";
import { useDebounce } from "@/lib/useDebounce";

const TONES = ["professional", "friendly", "formal", "luxury", "hospitality", "empathetic"] as const;
type Tone = typeof TONES[number];

const RATINGS = ["all", "5", "4", "3", "2", "1"] as const;
const SENTIMENTS = ["all", "positive", "negative", "neutral"] as const;
const SORT_OPTIONS = [
  { value: "publishedAt", label: "Date" },
  { value: "rating", label: "Rating" },
] as const;

export default function ReviewsPage() {
  const qc = useQueryClient();

  // ── Filters ──────────────────────────────────────────────
  const [search, setSearch]         = useState("");
  const [rating, setRating]         = useState("all");
  const [sentiment, setSentiment]   = useState("all");
  const [hasReply, setHasReply]     = useState("");
  const [sortBy, setSortBy]         = useState("publishedAt");
  const [sortOrder, setSortOrder]   = useState<"desc" | "asc">("desc");
  const [page, setPage]             = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  // ── Selected review / reply modal ─────────────────────────
  const [selected, setSelected]       = useState<any | null>(null);
  const [replyText, setReplyText]     = useState("");
  const [aiTone, setAiTone]           = useState<Tone>("professional");
  const [generatingAI, setGeneratingAI] = useState(false);

  // ── Fetch reviews ─────────────────────────────────────────
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["reviews", debouncedSearch, rating, sentiment, hasReply, sortBy, sortOrder, page],
    queryFn: () =>
      reviewsApi.getAll({
        page,
        limit: 12,
        search: debouncedSearch || undefined,
        rating: rating !== "all" ? rating : undefined,
        sentiment: sentiment !== "all" ? sentiment : undefined,
        hasReply: hasReply !== "" ? hasReply : undefined,
        sortBy,
        sortOrder,
      }).then(r => r.data.data),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const reviews: any[]  = data?.reviews ?? [];
  const total: number   = data?.total ?? 0;
  const totalPages      = data?.totalPages ?? 1;
  const hasAnyReviews   = total > 0 || debouncedSearch || rating !== "all" || sentiment !== "all";

  // ── Sync mutation ─────────────────────────────────────────
  const syncMutation = useMutation({
    mutationFn: () => reviewsApi.sync(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["analytics-summary"] });
      const msg = res.data?.message ?? "Sync complete";
      toast.success(msg);
    },
    onError: () => toast.error("Sync failed — check your Google credentials in Settings"),
  });

  // ── Reply mutation ─────────────────────────────────────────
  const replyMutation = useMutation({
    mutationFn: ({ id, text, isAiGenerated }: { id: string; text: string; isAiGenerated?: boolean }) =>
      reviewsApi.reply(id, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Reply saved successfully");
      setSelected(null);
      setReplyText("");
    },
    onError: () => toast.error("Failed to save reply"),
  });

  // ── AI generate ────────────────────────────────────────────
  const handleGenerateAI = useCallback(async () => {
    if (!selected) return;
    setGeneratingAI(true);
    try {
      const res = await aiApi.generateReply({
        reviewText:   selected.text,
        rating:       selected.rating,
        reviewerName: selected.reviewerName,
        tone:         aiTone,
        reviewId:     selected.id,
      });
      setReplyText(res.data.data.reply);
      toast.success(`AI reply generated (${res.data.data.source === "openai" ? "OpenAI" : "template"})`);
    } catch {
      toast.error("AI generation failed");
    } finally {
      setGeneratingAI(false);
    }
  }, [selected, aiTone]);

  // ── Export ─────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    try {
      const res = await reviewsApi.export("csv");
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = `reviews-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Reviews exported");
    } catch {
      toast.error("Export failed");
    }
  }, []);

  // ── Open review detail ─────────────────────────────────────
  const openReview = (review: any) => {
    setSelected(review);
    setReplyText(review.reply?.text ?? "");
  };

  const ratingColor = (r: number) =>
    r >= 4 ? "text-emerald-600" : r === 3 ? "text-amber-500" : "text-red-500";

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500" />
            Reviews
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total > 0 ? `${total} review${total !== 1 ? "s" : ""} in database` : "No reviews yet — sync from Google to get started"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={total === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted disabled:opacity-40 transition"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 transition shadow-md"
          >
            {syncMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing…</>
              : <><RefreshCw className="w-4 h-4" /> Sync Reviews</>
            }
          </button>
        </div>
      </div>

      {/* Search + Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reviewer name or review text…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition ${showFilters ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "border-border hover:bg-muted"}`}
        >
          <Filter className="w-4 h-4" /> Filters
          {(rating !== "all" || sentiment !== "all" || hasReply !== "") && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          )}
        </button>
      </div>

      {/* Expanded filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-muted/30 border border-border">
              {/* Rating */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Rating</label>
                <select
                  value={rating}
                  onChange={e => { setRating(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {RATINGS.map(r => <option key={r} value={r}>{r === "all" ? "All ratings" : `${r} Stars`}</option>)}
                </select>
              </div>
              {/* Sentiment */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Sentiment</label>
                <select
                  value={sentiment}
                  onChange={e => { setSentiment(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {SENTIMENTS.map(s => <option key={s} value={s}>{s === "all" ? "All sentiments" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              {/* Reply status */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Reply Status</label>
                <select
                  value={hasReply}
                  onChange={e => { setHasReply(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">All</option>
                  <option value="true">Has Reply</option>
                  <option value="false">No Reply</option>
                </select>
              </div>
              {/* Sort */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Sort By</label>
                <div className="flex gap-1.5">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button
                    onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")}
                    className="px-3 py-2 rounded-xl border border-border hover:bg-muted text-xs font-medium transition"
                  >
                    {sortOrder === "desc" ? "↓" : "↑"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 rounded-2xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          {total === 0 && !debouncedSearch ? (
            <>
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
                <WifiOff className="w-9 h-9 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-lg">No reviews in database</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Configure your Google API credentials in Settings, then sync your reviews.
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/settings" className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Settings
                </Link>
                <button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Sync Now
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Search className="w-7 h-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">No reviews match your filters</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filter criteria</p>
              </div>
              <button
                onClick={() => { setSearch(""); setRating("all"); setSentiment("all"); setHasReply(""); setPage(1); }}
                className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition"
              >
                Clear all filters
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Fading overlay while re-fetching */}
          <div className={`transition-opacity ${isFetching ? "opacity-70" : "opacity-100"}`}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((review: any) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => openReview(review)}
                  className="group rounded-2xl border border-border bg-card p-4 cursor-pointer hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all"
                >
                  {/* Reviewer */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {review.reviewerName?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{review.reviewerName}</p>
                      <p className="text-[11px] text-muted-foreground">{formatRelativeTime(review.publishedAt)}</p>
                    </div>
                    <SentimentBadge sentiment={review.sentiment?.toLowerCase()} />
                  </div>

                  {/* Stars */}
                  <StarRating rating={review.rating} size="sm" className="mb-2" />

                  {/* Text */}
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {review.text || <span className="italic">No review text</span>}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
                    {review.reply ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Replied
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                        <MessageSquare className="w-3 h-3" /> Needs reply
                      </span>
                    )}
                    {review.googleReviewUrl && (
                      <a
                        href={review.googleReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="ml-auto text-muted-foreground hover:text-foreground transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {total} reviews
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${page === p ? "bg-blue-600 text-white" : "border border-border hover:bg-muted"}`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Review Detail Modal ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setSelected(null); setReplyText(""); }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modal header */}
                <div className="flex items-start gap-3 p-5 border-b border-border">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {selected.reviewerName?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{selected.reviewerName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating rating={selected.rating} size="sm" />
                      <SentimentBadge sentiment={selected.sentiment?.toLowerCase()} />
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(selected.publishedAt)}</span>
                    </div>
                  </div>
                  <button onClick={() => { setSelected(null); setReplyText(""); }} className="p-1.5 rounded-lg hover:bg-muted transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Review text */}
                <div className="p-5 overflow-y-auto flex-1">
                  <p className="text-sm text-foreground/90 leading-relaxed mb-5">{selected.text || "No review text."}</p>

                  {/* Existing reply */}
                  {selected.reply && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Your Reply
                      </p>
                      <p className="text-sm text-emerald-800 dark:text-emerald-300">{selected.reply.text}</p>
                    </div>
                  )}

                  {/* AI tone selector */}
                  <div className="mb-3">
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">AI Reply Tone</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TONES.map(t => (
                        <button
                          key={t}
                          onClick={() => setAiTone(t)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${aiTone === t ? "bg-blue-600 text-white" : "border border-border hover:bg-muted"}`}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reply textarea */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Reply</label>
                      <button
                        onClick={handleGenerateAI}
                        disabled={generatingAI}
                        className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50 transition"
                      >
                        {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {generatingAI ? "Generating…" : "Generate AI Reply"}
                      </button>
                    </div>
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      rows={5}
                      placeholder="Write your reply here, or click Generate AI Reply…"
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>

                {/* Modal footer */}
                <div className="flex gap-2 p-4 border-t border-border">
                  {replyText && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(replyText); toast.success("Copied!"); }}
                      className="p-2 rounded-xl border border-border hover:bg-muted transition"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => { setSelected(null); setReplyText(""); }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!replyText.trim() || replyMutation.isPending}
                    onClick={() => replyMutation.mutate({ id: selected.id, text: replyText.trim() })}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {replyMutation.isPending ? "Saving…" : "Save Reply"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
