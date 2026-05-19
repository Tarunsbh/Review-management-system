import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, pattern = "MMM d, yyyy") {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern);
}

export function formatRelativeTime(date: string | Date) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return "text-green-500";
  if (rating >= 3.5) return "text-yellow-500";
  if (rating >= 2.5) return "text-orange-500";
  return "text-red-500";
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case "positive":
      return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800";
    case "negative":
      return "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-800/50 dark:border-gray-700";
  }
}

export function getSentimentEmoji(sentiment: string): string {
  switch (sentiment) {
    case "positive":
      return "😊";
    case "negative":
      return "😔";
    default:
      return "😐";
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export function generateAvatarUrl(name: string): string {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=64&bold=true`;
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
