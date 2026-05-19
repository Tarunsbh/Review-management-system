"use client";

import { cn } from "@/lib/utils";
import { SentimentType } from "@/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SentimentBadgeProps {
  sentiment: SentimentType;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

const sentimentConfig = {
  positive: {
    label: "Positive",
    className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    icon: TrendingUp,
    dot: "bg-green-500",
  },
  negative: {
    label: "Negative",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    icon: TrendingDown,
    dot: "bg-red-500",
  },
  neutral: {
    label: "Neutral",
    className: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
    icon: Minus,
    dot: "bg-gray-400",
  },
};

export function SentimentBadge({
  sentiment,
  size = "md",
  showIcon = true,
  className,
}: SentimentBadgeProps) {
  const config = sentimentConfig[sentiment];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border rounded-full font-medium",
        config.className,
        size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1",
        className
      )}
    >
      {showIcon ? (
        <Icon className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      ) : (
        <span className={cn("rounded-full flex-shrink-0", config.dot, size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
      )}
      {config.label}
    </span>
  );
}
