"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Star,
  BarChart3,
  Settings,
  Sparkles,
  Link2,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  CreditCard,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const navItems = [
  {
    group: "Main",
    items: [
      { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
      { label: "Reviews",      href: "/reviews",      icon: Star },
      { label: "Analytics",    href: "/analytics",    icon: BarChart3 },
    ],
  },
  {
    group: "Tools",
    items: [
      { label: "AI Replies",   href: "/ai-replies",   icon: Sparkles },
      { label: "Integrations", href: "/integrations", icon: Link2 },
      { label: "Notifications",href: "/notifications", icon: Bell, badge: true },
    ],
  },
  {
    group: "Enterprise",
    items: [
      { label: "Team",         href: "/team",         icon: Users },
      { label: "Billing",      href: "/billing",      icon: CreditCard },
      { label: "Admin",        href: "/admin",        icon: ShieldCheck },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Settings",     href: "/settings",     icon: Settings },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
        collapsed && "justify-center px-3"
      )}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Star className="w-4 h-4 text-white fill-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <span className="text-sm font-bold text-sidebar-foreground whitespace-nowrap">
                eGlobe Reviews
              </span>
              <div className="text-[10px] text-sidebar-foreground/50 font-medium uppercase tracking-wider whitespace-nowrap">
                Management System
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin space-y-6">
        {navItems.map((group) => (
          <div key={group.group}>
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest px-2 mb-1.5"
                >
                  {group.group}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-nav"
                        className="absolute inset-0 rounded-lg bg-sidebar-accent"
                        style={{ zIndex: -1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon className={cn(
                      "w-4 h-4 flex-shrink-0 transition-transform duration-150",
                      isActive ? "text-sidebar-primary" : "group-hover:scale-110"
                    )} />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="overflow-hidden whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {"badge" in item && item.badge && !collapsed && (
                      <span className="ml-auto bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        3
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className={cn(
        "border-t border-sidebar-border p-3",
      )}>
        <div className={cn(
          "flex items-center gap-3 px-2 py-2 rounded-lg",
          collapsed && "justify-center"
        )}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 overflow-hidden min-w-0"
              >
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.name || "Admin User"}
                </p>
                <p className="text-[11px] text-sidebar-foreground/50 truncate">
                  {user?.email || "admin@admin.com"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!collapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleLogout}
                className="flex-shrink-0 p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-500 text-sidebar-foreground/40 transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border relative flex-shrink-0 h-screen sticky top-0"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed left-0 top-0 h-full w-[240px] bg-sidebar border-r border-sidebar-border z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
