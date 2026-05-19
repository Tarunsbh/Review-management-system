"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  TrendingUp, TrendingDown, Star, MessageSquare, Sparkles,
  Activity, BarChart2, WifiOff, Settings,
} from "lucide-react";
import { StatsCard } from "@/components/ui/StatsCard";
import { analyticsApi } from "@/lib/api";
import Link from "next/link";

const periods = ["7d", "30d", "90d", "1y"] as const;
type Period = typeof periods[number];

// ─── Types ──────────────────────────────────────────────────────────────────

interface Summary {
  totalReviews: number;
  averageRating: number;
  replyRate: number;
  reviewGrowth: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}

interface TrendPoint {
  date: string;
  reviews: number;
  avgRating: number;
  positive: number;
  negative: number;
  neutral: number;
}

interface RatingDist {
  rating: string;
  count: number;
}

interface Keyword {
  word: string;
  count: number;
  sentiment: "positive" | "negative" | "neutral";
}

interface MonthlyComp {
  month: string;
  thisYear: number;
  lastYear: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RATING_COLORS = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];

// ─── Sub-components ──────────────────────────────────────────────────────────

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground capitalize">{entry.name}:</span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-muted/40 rounded-lg w-full"
      style={{ height }}
    />
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground" style={{ height: 200 }}>
      <BarChart2 className="w-8 h-8 opacity-30" />
      <p className="text-xs">{label}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("1y");

  const { data: summaryRaw, isLoading: summaryLoading } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => analyticsApi.getSummary().then((r) => r.data.data as Summary),
    retry: 1,
  });

  const { data: trendsRaw, isLoading: trendsLoading } = useQuery({
    queryKey: ["analytics-trends", period],
    queryFn: () => analyticsApi.getTrends(period).then((r) => r.data.data as TrendPoint[]),
    enabled: (summaryRaw?.totalReviews ?? 0) > 0,
    retry: 1,
  });

  const { data: ratingDistRaw, isLoading: ratingLoading } = useQuery({
    queryKey: ["analytics-rating-distribution"],
    queryFn: () => analyticsApi.getRatingDistribution().then((r) => r.data.data as RatingDist[]),
    enabled: (summaryRaw?.totalReviews ?? 0) > 0,
    retry: 1,
  });

  const { data: keywordsRaw, isLoading: keywordsLoading } = useQuery({
    queryKey: ["analytics-keywords"],
    queryFn: () => analyticsApi.getKeywords().then((r) => r.data.data as Keyword[]),
    enabled: (summaryRaw?.totalReviews ?? 0) > 0,
    retry: 1,
  });

  const { data: monthlyRaw, isLoading: monthlyLoading } = useQuery({
    queryKey: ["analytics-monthly-comparison"],
    queryFn: () => analyticsApi.getMonthlyComparison().then((r) => r.data.data as MonthlyComp[]),
    enabled: (summaryRaw?.totalReviews ?? 0) > 0,
    retry: 1,
  });

  const summary = summaryRaw ?? null;
  const hasData = (summary?.totalReviews ?? 0) > 0;
  const trends = trendsRaw ?? [];
  const ratingDist = (ratingDistRaw ?? []).map((r, i) => ({ ...r, fill: RATING_COLORS[i] ?? "#94a3b8" }));
  const keywords = keywordsRaw ?? [];
  const monthlyComp = monthlyRaw ?? [];

  // Build radar data from summary when available
  const radarData = summary
    ? [
        { subject: "Response Rate", value: Math.min(100, Math.round(summary.replyRate)), fullMark: 100 },
        { subject: "Avg Rating", value: Math.round((summary.averageRating / 5) * 100), fullMark: 100 },
        {
          subject: "Sentiment",
          value: summary.totalReviews > 0
            ? Math.round((summary.positiveCount / summary.totalReviews) * 100)
            : 0,
          fullMark: 100,
        },
        { subject: "Growth", value: Math.min(100, Math.max(0, Math.round(50 + summary.reviewGrowth))), fullMark: 100 },
        {
          subject: "Engagement",
          value: Math.min(100, Math.round(summary.replyRate * 0.9)),
          fullMark: 100,
        },
        {
          subject: "Visibility",
          value: Math.min(100, Math.round((summary.totalReviews / 10) + 50)),
          fullMark: 100,
        },
      ]
    : [];

  // ── Stat cards ──────────────────────────────────────────────────────────────
  const stats = [
    {
      title: "Total Reviews",
      value: summaryLoading ? "—" : String(summary?.totalReviews ?? 0),
      change: summary?.reviewGrowth ?? 0,
      icon: Star,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      title: "Avg Rating",
      value: summaryLoading ? "—" : (summary?.averageRating ?? 0).toFixed(1),
      change: 0,
      icon: TrendingUp,
      iconColor: "text-green-500",
      iconBg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "Reply Rate",
      value: summaryLoading ? "—" : `${Math.round(summary?.replyRate ?? 0)}%`,
      change: 0,
      icon: MessageSquare,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Review Growth",
      value: summaryLoading ? "—" : `${(summary?.reviewGrowth ?? 0) >= 0 ? "+" : ""}${Math.round(summary?.reviewGrowth ?? 0)}%`,
      change: summary?.reviewGrowth ?? 0,
      icon: Activity,
      iconColor: "text-violet-500",
      iconBg: "bg-violet-50 dark:bg-violet-900/20",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
          <p className="text-sm text-muted-foreground">Deep insights into your review performance</p>
        </div>
        <div className="flex bg-muted rounded-lg p-0.5 border border-border">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <StatsCard key={s.title} {...s} index={i} />
        ))}
      </div>

      {/* No-data empty state */}
      {!summaryLoading && !hasData && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <WifiOff className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No data yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            Analytics will populate once you configure your Google Business Profile and sync reviews.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
            >
              <Settings className="w-4 h-4" />
              Configure Settings
            </Link>
            <Link
              href="/integrations"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
            >
              Connect Google
            </Link>
          </div>
        </motion.div>
      )}

      {/* Charts — only rendered when data exists */}
      {(hasData || summaryLoading) && (
        <>
          {/* Row 1: Volume Trend + Rating Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-2 bg-card border border-border rounded-xl p-5"
            >
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Review Volume & Rating Trend</h3>
                <p className="text-xs text-muted-foreground">Monthly review activity</p>
              </div>
              {trendsLoading ? (
                <ChartSkeleton height={240} />
              ) : trends.length === 0 ? (
                <EmptyChart label="No trend data for this period" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="reviewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="reviews"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#reviewsGrad)"
                      name="Reviews"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-5"
            >
              <h3 className="text-sm font-semibold mb-1">Rating Distribution</h3>
              <p className="text-xs text-muted-foreground mb-4">Reviews by star count</p>
              {ratingLoading ? (
                <ChartSkeleton height={200} />
              ) : ratingDist.length === 0 ? (
                <EmptyChart label="No rating data" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ratingDist} layout="vertical">
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="rating"
                      type="category"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {ratingDist.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {/* Row 2: Sentiment Trend + Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="lg:col-span-2 bg-card border border-border rounded-xl p-5"
            >
              <h3 className="text-sm font-semibold mb-1">Sentiment Trends</h3>
              <p className="text-xs text-muted-foreground mb-4">Monthly positive vs negative breakdown</p>
              {trendsLoading ? (
                <ChartSkeleton height={220} />
              ) : trends.length === 0 ? (
                <EmptyChart label="No sentiment data for this period" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trends} stackOffset="sign">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="positive" fill="#22c55e" name="Positive" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="neutral" fill="#94a3b8" name="Neutral" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="negative" fill="#ef4444" name="Negative" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-xl p-5"
            >
              <h3 className="text-sm font-semibold mb-1">Reputation Score</h3>
              <p className="text-xs text-muted-foreground mb-2">Performance across key metrics</p>
              {summaryLoading ? (
                <ChartSkeleton height={240} />
              ) : radarData.length === 0 ? (
                <EmptyChart label="No reputation data" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {/* Row 3: YoY + Keywords */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-card border border-border rounded-xl p-5"
            >
              <h3 className="text-sm font-semibold mb-1">Year-over-Year Comparison</h3>
              <p className="text-xs text-muted-foreground mb-4">This year vs last year (monthly)</p>
              {monthlyLoading ? (
                <ChartSkeleton height={220} />
              ) : monthlyComp.length === 0 ? (
                <EmptyChart label="Not enough data for year-over-year comparison" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyComp}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="thisYear" fill="#6366f1" name="This Year" radius={[3, 3, 0, 0]} />
                    <Bar
                      dataKey="lastYear"
                      fill="#6366f1"
                      fillOpacity={0.3}
                      name="Last Year"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card border border-border rounded-xl p-5"
            >
              <h3 className="text-sm font-semibold mb-1">Top Keywords</h3>
              <p className="text-xs text-muted-foreground mb-4">Most mentioned terms in reviews</p>
              {keywordsLoading ? (
                <div className="space-y-2.5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-20 h-3 bg-muted/50 rounded animate-pulse" />
                      <div className="flex-1 h-2 bg-muted/40 rounded-full animate-pulse" />
                      <div className="w-6 h-3 bg-muted/50 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : keywords.length === 0 ? (
                <EmptyChart label="No keyword data yet" />
              ) : (
                <div className="space-y-2.5">
                  {keywords.slice(0, 8).map((kw, i) => {
                    const max = keywords[0]?.count || 1;
                    const pct = Math.round((kw.count / max) * 100);
                    const color =
                      kw.sentiment === "positive"
                        ? "#22c55e"
                        : kw.sentiment === "negative"
                        ? "#ef4444"
                        : "#94a3b8";
                    return (
                      <div key={kw.word} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 truncate capitalize">
                          {kw.word}
                        </span>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.5 + i * 0.05, duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{ background: color }}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground w-6 text-right">
                          {kw.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* AI Insights — shown only when there's real data */}
          {summary && summary.totalReviews > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="text-sm font-semibold">AI Analytics Insights</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    icon: TrendingUp,
                    color: "text-green-500",
                    bg: "bg-green-100 dark:bg-green-900/30",
                    title: "Review Growth",
                    text:
                      summary.reviewGrowth >= 0
                        ? `Review volume is up ${Math.round(summary.reviewGrowth)}% compared to the previous period. Keep engaging with guests to maintain momentum.`
                        : `Review volume is down ${Math.abs(Math.round(summary.reviewGrowth))}% compared to the previous period. Consider launching a review collection campaign.`,
                  },
                  {
                    icon: MessageSquare,
                    color: "text-blue-500",
                    bg: "bg-blue-100 dark:bg-blue-900/30",
                    title: "Reply Rate",
                    text:
                      summary.replyRate >= 80
                        ? `Your reply rate of ${Math.round(summary.replyRate)}% is excellent. Properties with 80%+ reply rates typically see higher trust scores.`
                        : `Your reply rate is ${Math.round(summary.replyRate)}%. Aim for 80%+ by using AI-generated replies to respond faster.`,
                  },
                  {
                    icon: Star,
                    color: "text-amber-500",
                    bg: "bg-amber-100 dark:bg-amber-900/30",
                    title: "Rating Health",
                    text:
                      summary.averageRating >= 4.5
                        ? `Excellent average rating of ${summary.averageRating.toFixed(1)}. You're in the top tier — focus on maintaining consistency.`
                        : `Your average rating is ${summary.averageRating.toFixed(1)}. Focus on addressing negative feedback patterns to push above 4.5.`,
                  },
                  {
                    icon: summary.negativeCount > summary.positiveCount * 0.2 ? TrendingDown : TrendingUp,
                    color:
                      summary.negativeCount > summary.positiveCount * 0.2
                        ? "text-red-500"
                        : "text-green-500",
                    bg:
                      summary.negativeCount > summary.positiveCount * 0.2
                        ? "bg-red-100 dark:bg-red-900/30"
                        : "bg-green-100 dark:bg-green-900/30",
                    title: "Sentiment Overview",
                    text: `${summary.positiveCount} positive, ${summary.neutralCount} neutral, ${summary.negativeCount} negative reviews. ${
                      summary.negativeCount > 0
                        ? "Reply to negative reviews within 24 hours to demonstrate responsiveness."
                        : "Great sentiment balance — keep responding to positive reviews too!"
                    }`,
                  },
                ].map((insight, i) => {
                  const Icon = insight.icon;
                  return (
                    <div
                      key={i}
                      className="flex gap-3 p-3 bg-white/60 dark:bg-gray-900/40 rounded-lg"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${insight.bg}`}
                      >
                        <Icon className={`w-4 h-4 ${insight.color}`} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-0.5">
                          {insight.title}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {insight.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
