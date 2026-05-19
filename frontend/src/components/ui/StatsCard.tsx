"use client";

import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  description?: string;
  loading?: boolean;
  index?: number;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = "text-blue-500",
  iconBg = "bg-blue-50 dark:bg-blue-900/20",
  description,
  loading = false,
  index = 0,
}: StatsCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="skeleton w-9 h-9 rounded-lg" />
          <div className="skeleton w-16 h-5 rounded-full" />
        </div>
        <div className="skeleton w-24 h-8 rounded mb-2" />
        <div className="skeleton w-32 h-4 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-card border border-border rounded-xl p-5 card-hover"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-4.5 h-4.5", iconColor)} />
        </div>
        {change !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
              isPositive && "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
              isNegative && "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
              !isPositive && !isNegative && "bg-muted text-muted-foreground"
            )}
          >
            {isPositive && <TrendingUp className="w-3 h-3" />}
            {isNegative && <TrendingDown className="w-3 h-3" />}
            {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
            {isPositive ? "+" : ""}{change}%
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-foreground tracking-tight">
          {value}
        </p>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {(description || changeLabel) && (
          <p className="text-xs text-muted-foreground/70">
            {description || changeLabel}
          </p>
        )}
      </div>
    </motion.div>
  );
}
