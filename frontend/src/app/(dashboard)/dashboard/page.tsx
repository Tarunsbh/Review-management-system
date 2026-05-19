"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Star, MessageSquare, ThumbsUp, RefreshCw,
  ArrowRight, BarChart3, Settings, Wifi, WifiOff,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { StatsCard } from "@/components/ui/StatsCard";
import { SentimentBadge } from "@/components/ui/SentimentBadge";
import { StarRating } from "@/components/ui/StarRating";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { analyticsApi, reviewsApi } from "@/lib/api";

const RATING_COLORS = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };

function EmptyWidget({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px]">{sub}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => analyticsApi.getSummary().then(r => r.data.data),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: trendsRaw, isLoading: trendsLoading } = useQuery({
    queryKey: ["analytics-trends", "1y"],
    queryFn: () => analyticsApi.getTrends("1y").then(r => r.data.data as any[]),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: ratingDist, isLoading: ratingLoading } = useQuery({
    queryKey: ["analytics-rating-distribution"],
    queryFn: () => analyticsApi.getRatingDistribution().then(r => r.data.data as any[]),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["reviews-recent"],
    queryFn: () => reviewsApi.getAll({ limit: 5, sortBy: "publishedAt", sortOrder: "desc" }).then(r => r.data.data),
    staleTime: 30_000,
    retry: 1,
  });

  const hasData = (summary?.totalReviews ?? 0) > 0;
  const recentReviews: any[] = reviewsData?.reviews ?? [];

  const ratingChartData = (ratingDist ?? []).map((r: any, i: number) => ({
    rating: `${r.rating}★`,
    count: r.count,
    fill: RATING_COLORS[5 - r.rating] ?? RATING_COLORS[4],
  }));

  const sentimentData = summary
    ? [
        { name: "Positive", value: summary.positiveCount, fill: "#22c55e" },
        { name: "Neutral",  value: summary.neutralCount,  fill: "#94a3b8" },
        { name: "Negative", value: summary.negativeCount, fill: "#ef4444" },
      ]
    : [];

  const trendChartData = (trendsRaw ?? []).map((t: any) => ({
    ...t,
    date: (() => { try { return new Date(t.date + "-01").toLocaleDateString("en-US", { month: "short" }); } catch { return t.date; } })(),
  }));

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasData ? "Your review performance at a glance" : "Connect Google Business Profile to see live data"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasData ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live data from SQL Server
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
              <WifiOff className="w-3 h-3" />
              No data yet
            </span>
          )}
        </div>
      </div>

      {/* Setup banner — shown only when no data */}
      {!summaryLoading && !hasData && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <WifiOff className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-400">No reviews in the database yet</p>
              <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">
                Add your Google API credentials in <strong>Settings</strong>, then sync via <strong>Integrations</strong>.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href="/settings" className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 dark:text-amber-400 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition">
              Settings
            </Link>
            <Link href="/integrations" className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition">
              Connect Google
            </Link>
          </div>
        </motion.div>
      )}

      {/* Stats cards — always visible, zero when empty */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted/30 animate-pulse" />
          ))
        ) : (
          <>
            {[
              { title: "Total Reviews",    value: summary?.totalReviews ?? 0,    icon: MessageSquare, color: "blue"   as const },
              { title: "Average Rating",   value: summary?.averageRating ? Number(summary.averageRating).toFixed(1) : "—", icon: Star, color: "amber"  as const },
              { title: "Positive Reviews", value: summary?.positiveCount ?? 0,   icon: ThumbsUp,      color: "green"  as const },
              { title: "Needs Reply",      value: summary?.unrepliedCount ?? 0,  icon: MessageSquare, color: "violet" as const },
            ].map((card, i) => (
              <motion.div key={card.title} variants={item}>
                <StatsCard {...card} />
              </motion.div>
            ))}
          </>
        )}
      </motion.div>

      {/* Charts — only rendered when there is real data */}
      {hasData && (
        <>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Trend chart */}
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-semibold text-foreground mb-4 text-sm">Review Trend (12 months)</h2>
              {trendsLoading ? (
                <div className="h-52 bg-muted/30 animate-pulse rounded-xl" />
              ) : trendChartData.length === 0 ? (
                <EmptyWidget icon={BarChart3} title="No trend data" sub="More reviews needed to build the chart" />
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={trendChartData}>
                    <defs>
                      <linearGradient id="reviewGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Area type="monotone" dataKey="reviews" stroke="#6366f1" strokeWidth={2} fill="url(#reviewGrad)" name="Reviews" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Sentiment pie */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-semibold text-foreground mb-4 text-sm">Sentiment Split</h2>
              {ratingLoading ? (
                <div className="h-52 bg-muted/30 animate-pulse rounded-xl" />
              ) : sentimentData.every(s => s.value === 0) ? (
                <EmptyWidget icon={BarChart3} title="No sentiment data" sub="Data appears after reviews are synced" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                        {sentimentData.map((e, i) => <Cell key={i} fill={e.fill} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-2">
                    {sentimentData.map(s => (
                      <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ background: s.fill }} />
                        {s.name}: <span className="font-medium text-foreground">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Rating distribution */}
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-semibold text-foreground mb-4 text-sm">Rating Distribution</h2>
              {ratingLoading ? (
                <div className="h-44 bg-muted/30 animate-pulse rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={ratingChartData} layout="vertical" barCategoryGap={6}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="rating" type="category" tick={{ fontSize: 11 }} width={28} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} cursor={{ fill: "transparent" }} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Reviews">
                      {ratingChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Recent reviews */}
            <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground text-sm">Recent Reviews</h2>
                <Link href="/reviews" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {reviewsLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted/30 animate-pulse rounded-xl" />)}</div>
              ) : recentReviews.length === 0 ? (
                <EmptyWidget icon={MessageSquare} title="No reviews yet" sub="Reviews will appear here after your first sync" />
              ) : (
                <div className="space-y-3">
                  {recentReviews.map((review: any) => (
                    <div key={review.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/40 transition">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {review.reviewerName?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-foreground truncate">{review.reviewerName}</span>
                          <StarRating rating={review.rating} size="sm" />
                          <SentimentBadge sentiment={review.sentiment?.toLowerCase()} className="ml-auto" />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{review.text || "No review text"}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{formatRelativeTime(review.publishedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Step cards — shown when no data */}
      {!summaryLoading && !hasData && (
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Settings,  title: "1. Add API Keys",   sub: "Go to Settings and enter your Google API credentials and optional OpenAI key.", href: "/settings" },
            { icon: Wifi,      title: "2. Connect Google", sub: "Go to Integrations and connect your Google Business Profile via OAuth.",       href: "/integrations" },
            { icon: RefreshCw, title: "3. Sync Reviews",   sub: "Trigger a manual sync — all your Google reviews will be imported.",             href: "/integrations" },
          ].map(step => {
            const Icon = step.icon;
            return (
              <Link key={step.title} href={step.href}
                className="group rounded-2xl border border-border bg-card p-5 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition">
                  <Icon className="w-5 h-5 text-blue-500" />
                </div>
                <p className="font-semibold text-foreground text-sm">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{step.sub}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
