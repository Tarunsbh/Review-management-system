"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Users,
  Building2,
  Star,
  TrendingUp,
  Activity,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  ChevronRight,
  Database,
  Layers,
} from "lucide-react";
import api from "@/lib/api";
import { useState } from "react";

interface AdminStats {
  totalUsers: number;
  totalBusinesses: number;
  totalReviews: number;
  mrr: number;
  activeSubscriptions: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface AdminBusiness {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  subscriptions: Array<{ status: string; plan: { name: string; price: number } }>;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

type Tab = "overview" | "users" | "businesses" | "logs";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [userSearch, setUserSearch] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/stats").then(r => r.data.data as AdminStats),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", userSearch],
    queryFn: () =>
      api.get(`/admin/users?limit=20${userSearch ? `&search=${encodeURIComponent(userSearch)}` : ""}`).then(r => r.data),
    enabled: activeTab === "users",
  });

  const { data: bizData, isLoading: bizLoading } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: () => api.get("/admin/businesses?limit=20").then(r => r.data),
    enabled: activeTab === "businesses",
  });

  const { data: auditData, isLoading: logsLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => api.get("/admin/audit-logs?limit=30").then(r => r.data),
    enabled: activeTab === "logs",
  });

  const users: AdminUser[] = usersData?.data || [];
  const businesses: AdminBusiness[] = bizData?.data || [];
  const auditLogs: any[] = auditData?.data || [];

  const statCards = [
    { label: "Total Users",        value: stats?.totalUsers ?? "—",        icon: Users,       color: "from-blue-500 to-cyan-500",    bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Total Businesses",   value: stats?.totalBusinesses ?? "—",   icon: Building2,   color: "from-violet-500 to-purple-500", bg: "bg-violet-50 dark:bg-violet-900/20" },
    { label: "Total Reviews",      value: stats?.totalReviews ?? "—",      icon: Star,        color: "from-amber-500 to-orange-500",  bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Monthly Revenue",    value: stats ? `$${stats.mrr}` : "—",   icon: DollarSign,  color: "from-emerald-500 to-teal-500",  bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "Active Subscriptions",value: stats?.activeSubscriptions ?? "—", icon: TrendingUp, color: "from-pink-500 to-rose-500",   bg: "bg-pink-50 dark:bg-pink-900/20" },
  ];

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview",    label: "Overview",   icon: Activity },
    { id: "users",       label: "Users",      icon: Users },
    { id: "businesses",  label: "Businesses", icon: Building2 },
    { id: "logs",        label: "Audit Logs", icon: Layers },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-violet-500" />
          Admin Panel
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          System administration and management
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? "border-violet-500 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
          {/* Stats */}
          <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {statCards.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 bg-gradient-to-r ${s.color} bg-clip-text`} style={{ color: "transparent", filter: "drop-shadow(0 0 0 #6366f1)" }} />
                  </div>
                  {statsLoading ? (
                    <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <div className={`text-2xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
                      {s.value}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              );
            })}
          </motion.div>

          {/* System Health */}
          <motion.div variants={item}>
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-500" />
              System Health
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "API Server",   status: "operational", detail: "Responding in ~50ms" },
                { label: "Database",     status: "operational", detail: "SQL Server 2022" },
                { label: "Redis Cache",  status: "degraded",    detail: "Redis offline — queues paused" },
                { label: "BullMQ Workers", status: "degraded", detail: "Waiting for Redis" },
                { label: "Socket.io",    status: "operational", detail: "WebSocket gateway up" },
                { label: "Sync Job",     status: "operational", detail: "Runs every 60 min" },
              ].map(srv => (
                <div key={srv.label} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                  {srv.status === "operational" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  ) : srv.status === "degraded" ? (
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{srv.label}</p>
                    <p className="text-xs text-muted-foreground">{srv.detail}</p>
                  </div>
                  <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    srv.status === "operational"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30"
                  }`}>
                    {srv.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={item}>
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-violet-500" />
              Quick Links
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: "View API Documentation", sub: "Swagger UI — /api/docs", href: "http://localhost:4000/api/docs", external: true },
                { label: "API Health Check",       sub: "GET /api/health",        href: "http://localhost:4000/api/health", external: true },
                { label: "Users Management",       sub: "View all users",         tab: "users" as Tab },
                { label: "Business Management",    sub: "View all businesses",    tab: "businesses" as Tab },
              ].map(action => (
                <button
                  key={action.label}
                  onClick={() => action.tab ? setActiveTab(action.tab) : action.href && window.open(action.href, "_blank")}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center flex-shrink-0">
                    {action.external ? <ExternalLink className="w-4 h-4 text-violet-500" /> : <ChevronRight className="w-4 h-4 text-violet-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search users…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Joined</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                        No users found
                      </td>
                    </tr>
                  ) : users.map(user => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          user.isActive ? "text-emerald-600" : "text-red-500"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {usersData?.meta && (
              <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground">
                Showing {users.length} of {usersData.meta.total} users
              </div>
            )}
          </div>
        </div>
      )}

      {/* Businesses Tab */}
      {activeTab === "businesses" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Business</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bizLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-muted animate-pulse rounded w-3/4" /></td>
                    ))}</tr>
                  ))
                ) : businesses.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">No businesses found</td></tr>
                ) : businesses.map(biz => {
                  const activeSub = biz.subscriptions?.[0];
                  return (
                    <tr key={biz.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                            {biz.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{biz.name}</p>
                            <p className="text-xs text-muted-foreground">/{biz.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {activeSub ? (
                          <span className="text-xs font-medium text-foreground">{activeSub.plan.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          biz.isActive ? "text-emerald-600" : "text-red-500"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${biz.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                          {biz.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">
                        {new Date(biz.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entity</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">IP</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-muted animate-pulse rounded w-3/4" /></td>
                      ))}</tr>
                    ))
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                        No audit logs yet — activity will appear here once users take actions
                      </td>
                    </tr>
                  ) : auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-foreground">{log.entityType}</span>
                        {log.entityId && <span className="text-xs text-muted-foreground ml-1">#{log.entityId.slice(0, 8)}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{log.userId?.slice(0, 8) || "system"}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">{log.ipAddress || "—"}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Re-export the ExternalLink icon used inside admin panel
function ExternalLink({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
