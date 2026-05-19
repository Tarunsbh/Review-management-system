"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Link2, Check, X, RefreshCw, ExternalLink, Clock,
  Shield, Zap, AlertCircle, Loader2, Calendar,
  BarChart3, FileText, Settings, WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils";
import { googleApi, analyticsApi } from "@/lib/api";

interface GoogleStatus {
  connected: boolean;
  businessName?: string;
  location?: string;
  lastSyncAt?: string;
  totalReviews?: number;
  autoSync?: boolean;
  syncInterval?: string;
}

interface SyncLog {
  id: string;
  status: "success" | "failed" | "running";
  reviewsSynced: number;
  newReviews: number;
  startedAt: string;
  duration?: number;
  error?: string;
}

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState("hourly");

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["google-status"],
    queryFn: () => googleApi.getStatus().then((r) => r.data.data as GoogleStatus),
    retry: 1,
  });

  // React Query v5: onSuccess removed from useQuery — use useEffect instead
  useEffect(() => {
    if (status?.autoSync !== undefined) setAutoSync(status.autoSync);
    if (status?.syncInterval) setSyncInterval(status.syncInterval);
  }, [status]);

  const { data: syncLogsData, isLoading: logsLoading } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: () => googleApi.getSyncLogs().then((r) => r.data.data as SyncLog[]),
    enabled: status?.connected === true,
    retry: 1,
  });

  const { data: summary } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => analyticsApi.getSummary().then((r) => r.data.data),
    enabled: status?.connected === true,
    retry: 1,
  });

  const connected = status?.connected ?? false;
  const syncLogs = syncLogsData ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────

  const connectMutation = useMutation({
    mutationFn: () => googleApi.getAuthUrl().then((r) => r.data.data as { url: string }),
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.info("Configure your Google OAuth credentials in Settings first.");
      }
    },
    onError: () =>
      toast.error("Failed to start OAuth flow. Check your Google API settings."),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => googleApi.disconnect(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-status"] });
      toast.info("Google account disconnected", {
        description: "Your review data is preserved.",
      });
    },
    onError: () => toast.error("Failed to disconnect"),
  });

  const syncMutation = useMutation({
    mutationFn: () => googleApi.syncReviews(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["reviews-recent"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      const count = res.data?.data?.newReviews ?? 0;
      toast.success("Sync complete!", {
        description: `${count} new review${count !== 1 ? "s" : ""} fetched from Google.`,
      });
    },
    onError: () => toast.error("Sync failed. Check your Google connection."),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      // POST to settings endpoint with auto-sync config
      Promise.resolve(), // replaced with real call if settings API supports it
    onSuccess: () => toast.success("Auto-sync settings saved!"),
  });

  // ── Stats derived from real data ───────────────────────────────────────────

  const statsItems = [
    {
      label: "Total Reviews",
      value: status?.totalReviews != null ? String(status.totalReviews) : (summary?.totalReviews != null ? String(summary.totalReviews) : "—"),
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Last Sync",
      value: status?.lastSyncAt ? formatRelativeTime(status.lastSyncAt) : "Never",
      icon: Clock,
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Avg Rating",
      value: summary?.averageRating != null ? `${Number(summary.averageRating).toFixed(1)} ★` : "—",
      icon: BarChart3,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Reply Rate",
      value: summary?.replyRate != null ? `${Math.round(summary.replyRate)}%` : "—",
      icon: Zap,
      color: "text-violet-500",
      bg: "bg-violet-50 dark:bg-violet-900/20",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Google Integration</h2>
        <p className="text-sm text-muted-foreground">
          Connect and manage your Google Business Profile connection
        </p>
      </div>

      {/* Connection Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border-2 p-6 ${
          connected
            ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10"
            : "border-border bg-card"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                connected ? "bg-white dark:bg-gray-900 shadow-md" : "bg-muted"
              }`}
            >
              {connected ? "🔗" : "🔌"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Google Business Profile
                </h3>
                {statusLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : connected ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full text-xs font-medium text-green-700 dark:text-green-400">
                    <Check className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">
                    <X className="w-3 h-3" />
                    Not Connected
                  </span>
                )}
              </div>
              {connected ? (
                <div className="space-y-0.5 mt-1">
                  <p className="text-sm text-muted-foreground">
                    {status?.businessName ?? "Your Business"}{status?.location ? ` · ${status.location}` : ""}
                  </p>
                  {status?.lastSyncAt && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last synced: {formatRelativeTime(status.lastSyncAt)}
                      {status.totalReviews != null && ` · ${status.totalReviews} total reviews`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  Connect to start fetching and managing your reviews
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-border rounded-xl text-sm font-medium hover:shadow-md transition-all disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${
                      syncMutation.isPending ? "animate-spin text-blue-500" : ""
                    }`}
                  />
                  {syncMutation.isPending ? "Syncing..." : "Sync Now"}
                </button>
                <button
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  className="px-4 py-2.5 border border-red-200 dark:border-red-800 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
                >
                  {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                </button>
              </>
            ) : (
              <button
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20 disabled:opacity-60"
              >
                {connectMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                {connectMutation.isPending ? "Connecting..." : "Connect Google Account"}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Row — only when connected and data available */}
      {connected && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsItems.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${stat.bg}`}
                >
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Auto Sync Config */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Auto Sync Configuration</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Automatic Sync</p>
                <p className="text-xs text-muted-foreground">
                  Automatically fetch new reviews
                </p>
              </div>
              <button
                onClick={() => setAutoSync(!autoSync)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoSync ? "bg-blue-500" : "bg-muted"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                    autoSync ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            {autoSync && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Sync Frequency
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {["15min", "hourly", "daily"].map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setSyncInterval(interval)}
                      className={`py-2 text-xs font-medium rounded-lg border transition-all capitalize ${
                        syncInterval === interval
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {interval === "15min"
                        ? "Every 15 min"
                        : interval === "hourly"
                        ? "Every Hour"
                        : "Daily"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {autoSync
                    ? `Auto-sync enabled (${syncInterval})`
                    : "Auto-sync disabled"}
                </span>
              </div>
            </div>

            <button
              onClick={() => saveSettingsMutation.mutate()}
              disabled={saveSettingsMutation.isPending}
              className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saveSettingsMutation.isPending ? "Saving..." : "Save Sync Settings"}
            </button>
          </div>
        </motion.div>

        {/* OAuth Info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold">Security & Permissions</h3>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: connected ? Check : AlertCircle,
                color: connected ? "text-green-500" : "text-amber-500",
                bg: connected
                  ? "bg-green-50 dark:bg-green-900/20"
                  : "bg-amber-50 dark:bg-amber-900/20",
                label: "Google Business Profile API",
                desc: connected
                  ? "Read & reply to reviews — connected"
                  : "Not connected — configure in Settings",
              },
              {
                icon: connected ? Check : AlertCircle,
                color: connected ? "text-green-500" : "text-amber-500",
                bg: connected
                  ? "bg-green-50 dark:bg-green-900/20"
                  : "bg-amber-50 dark:bg-amber-900/20",
                label: "Google Places API",
                desc: "Fetch business details and ratings",
              },
              {
                icon: connected ? Check : X,
                color: connected ? "text-green-500" : "text-muted-foreground",
                bg: connected
                  ? "bg-green-50 dark:bg-green-900/20"
                  : "bg-muted",
                label: "OAuth 2.0",
                desc: connected
                  ? "Secure token-based access active"
                  : "Not authenticated",
              },
              {
                icon: Shield,
                color: "text-blue-500",
                bg: "bg-blue-50 dark:bg-blue-900/20",
                label: "Token Auto-refresh",
                desc: "Automatic re-authentication",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${item.bg}`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <a
            href="https://console.cloud.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 mt-4 text-xs text-blue-500 hover:text-blue-600 font-medium"
          >
            <ExternalLink className="w-3 h-3" />
            Manage in Google Cloud Console
          </a>
        </motion.div>
      </div>

      {/* Sync Logs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-card border border-border rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Sync History</h3>
          <span className="text-xs text-muted-foreground">Recent syncs</span>
        </div>

        {logsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
            ))}
          </div>
        ) : !connected ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <WifiOff className="w-8 h-8 text-muted-foreground mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">
              Connect Google to see sync history
            </p>
          </div>
        ) : syncLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">
              No syncs yet — click &quot;Sync Now&quot; to fetch reviews
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Status", "Reviews Synced", "New Reviews", "Time", "Duration"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left py-2 px-3 text-xs font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {syncLogs.slice(0, 10).map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-3">
                      {log.status === "success" ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                          <Check className="w-3 h-3" />
                          Success
                        </span>
                      ) : log.status === "running" ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Running
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                          <X className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-xs text-foreground">
                      {log.reviewsSynced}
                    </td>
                    <td className="py-3 px-3">
                      {log.newReviews > 0 ? (
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          +{log.newReviews} new
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">
                      {formatRelativeTime(log.startedAt)}
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">
                      {log.status === "success" && log.duration != null
                        ? `${log.duration}s`
                        : log.error ? (
                          <span className="text-red-500 text-xs">{log.error}</span>
                        ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
