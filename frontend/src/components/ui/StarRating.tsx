"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
  className?: string;
}

const sizes = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function StarRating({
  rating,
  size = "md",
  showNumber = false,
  className,
}: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizes[size],
            "transition-colors",
            star <= rating
              ? "text-amber-400 fill-amber-400"
              : "text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700"
          )}
        />
      ))}
      {showNumber && (
        <span className="text-sm font-semibold text-foreground ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
