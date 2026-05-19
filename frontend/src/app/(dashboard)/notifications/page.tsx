"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bell, Star, MessageSquare, RefreshCw, AlertCircle,
  Check, CheckCheck, Trash2, Loader2,
} from "lucide-react";
import { SentimentBadge } from "@/components/ui/SentimentBadge";
import { StarRating } from "@/components/ui/StarRating";
import { formatRelativeTime } from "@/lib/utils";
import { notificationsApi } from "@/lib/api";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  rating?: number;
  sentiment?: "positive" | "negative" | "neutral";
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  new_review:      { icon: Star,         color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-900/20" },
  negative_review: { icon: AlertCircle,  color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/20" },
  reply_posted:    { icon: MessageSquare,color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-900/20" },
  sync_complete:   { icon: RefreshCw,    color: "text-green-500",  bg: "bg-green-50 dark:bg-green-900/20" },
  system:          { icon: Bell,         color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20" },
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () =>
      notificationsApi
        .getAll({ limit: 50, unreadOnly: filter === "unread" })
        .then((r) => r.data.data as { notifications: Notification[]; unreadCount: number }),
    retry: 1,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification deleted");
    },
  });

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading…"
              : unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5 border border-border">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                  filter === f
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {f} {f === "unread" && unreadCount > 0 && `(${unreadCount})`}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-60"
            >
              {markAllMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Notification list */}
      {!isLoading && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification, i) => {
            const config =
              typeConfig[notification.type] ?? typeConfig.system;
            const Icon = config.icon;
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() =>
                  !notification.isRead &&
                  markReadMutation.mutate(notification.id)
                }
                className={`group relative flex gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  !notification.isRead
                    ? "bg-blue-50/50 dark:bg-blue-900/5 border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                    : "bg-card border-border hover:bg-muted/30"
                }`}
              >
                {/* Unread dot */}
                {!notification.isRead && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full" />
                )}

                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}
                >
                  <Icon className={`w-4.5 h-4.5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p
                      className={`text-sm font-semibold ${
                        !notification.isRead
                          ? "text-foreground"
                          : "text-foreground/80"
                      }`}
                    >
                      {notification.title}
                    </p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {notification.message}
                  </p>
                  {notification.rating && (
                    <div className="flex items-center gap-2 mt-2">
                      <StarRating rating={notification.rating} size="sm" />
                      {notification.sentiment && (
                        <SentimentBadge
                          sentiment={notification.sentiment}
                          size="sm"
                          showIcon={false}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notification.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate(notification.id);
                      }}
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(notification.id);
                    }}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {filter === "unread"
              ? "You're all caught up! All notifications have been read."
              : "New review alerts and system updates will appear here."}
          </p>
          {filter === "unread" && (
            <button
              onClick={() => setFilter("all")}
              className="mt-4 text-sm text-blue-500 hover:text-blue-600 font-medium"
            >
              View all notifications
            </button>
          )}
        </div>
      )}
    </div>
  );
}
