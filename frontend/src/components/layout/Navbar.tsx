"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  Search,
  Sun,
  Moon,
  RefreshCw,
  Menu,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import { reviewsApi } from "@/lib/api";

const routeLabels: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "Overview of your review performance" },
  "/reviews": { title: "Reviews", description: "Manage and respond to all reviews" },
  "/analytics": { title: "Analytics", description: "Deep insights into your review data" },
  "/ai-replies": { title: "AI Reply Generator", description: "Generate intelligent responses with AI" },
  "/integrations": { title: "Google Integration", description: "Connect and sync your Google Business Profile" },
  "/notifications": { title: "Notifications", description: "Stay updated on review activity" },
  "/settings": { title: "Settings", description: "Configure your account and integrations" },
};

interface NavbarProps {
  onMobileMenuOpen: () => void;
}

export function Navbar({ onMobileMenuOpen }: NavbarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const routeInfo = routeLabels[pathname] || {
    title: "eGlobe Reviews",
    description: "",
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await reviewsApi.sync();
      toast.success("Reviews synced!", { description: "All reviews are up to date" });
    } catch {
      toast.error("Sync failed", { description: "Could not sync reviews. Check your Google connection." });
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left: Mobile menu + Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuOpen}
            className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base font-semibold text-foreground leading-none">
              {routeInfo.title}
            </h1>
            {routeInfo.description && (
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                {routeInfo.description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className={`relative hidden md:flex items-center transition-all duration-200 ${searchFocused ? "w-64" : "w-48"}`}>
            <Search className="absolute left-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search reviews..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring focus:bg-background transition-all placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Sync button */}
          <motion.button
            onClick={handleSync}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Sync reviews"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          </motion.button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-background" />
          </button>
        </div>
      </div>
    </header>
  );
}
