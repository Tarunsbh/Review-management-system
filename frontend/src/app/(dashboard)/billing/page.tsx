"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CreditCard,
  Check,
  Zap,
  Building2,
  Star,
  ExternalLink,
  Receipt,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  interval: string;
  features: string | string[];
  reviewLimit: number;
  locationLimit: number;
  userLimit: number;
}

interface Subscription {
  id: string;
  status: string;
  planId: string;
  currentPeriodEnd?: string;
  plan: Plan;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: string;
  createdAt: string;
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Star,
  pro: Zap,
  enterprise: Building2,
};

const PLAN_GRADIENTS: Record<string, string> = {
  free:       "from-slate-500 to-slate-600",
  pro:        "from-blue-500 to-violet-600",
  enterprise: "from-amber-500 to-orange-600",
};

const PLAN_BORDERS: Record<string, string> = {
  free:       "border-slate-200 dark:border-slate-700",
  pro:        "border-blue-300 dark:border-blue-600",
  enterprise: "border-amber-300 dark:border-amber-600",
};

const DEFAULT_BIZ_ID = "biz_default_001";

export default function BillingPage() {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get("/billing/plans").then(r => r.data.data as Plan[]),
  });

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription", DEFAULT_BIZ_ID],
    queryFn: () =>
      api.get(`/billing/subscription?businessId=${DEFAULT_BIZ_ID}`).then(r => r.data.data as Subscription | null),
  });

  const checkout = useMutation({
    mutationFn: (planId: string) =>
      api.post("/billing/checkout", { planId, businessId: DEFAULT_BIZ_ID }).then(r => r.data),
    onSuccess: (data) => {
      if (data.data?.url) window.location.href = data.data.url;
      else toast.info("Stripe not configured — add STRIPE_SECRET_KEY to enable payments");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || "Failed to create checkout session";
      if (msg.includes("not configured")) toast.info("Add STRIPE_SECRET_KEY to .env to enable payments");
      else toast.error(msg);
    },
  });

  const portal = useMutation({
    mutationFn: () =>
      api.post("/billing/portal", { businessId: DEFAULT_BIZ_ID }).then(r => r.data),
    onSuccess: (data) => {
      if (data.data?.url) window.location.href = data.data.url;
    },
    onError: () => toast.error("Customer portal unavailable — configure Stripe first"),
  });

  const parseFeatures = (f: string | string[]): string[] => {
    if (Array.isArray(f)) return f;
    try { return JSON.parse(f); } catch { return []; }
  };

  const currentPlanSlug = subscription?.plan?.slug || "free";

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-500" />
            Billing & Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your subscription and billing information
          </p>
        </div>
        {subscription?.plan?.slug !== "free" && (
          <button
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition"
          >
            <ExternalLink className="w-4 h-4" />
            {portal.isPending ? "Redirecting…" : "Manage Subscription"}
          </button>
        )}
      </div>

      {/* Current Plan Banner */}
      {!subLoading && subscription && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border-2 ${PLAN_BORDERS[currentPlanSlug]} bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${PLAN_GRADIENTS[currentPlanSlug]} flex items-center justify-center text-white`}>
              {(() => { const Icon = PLAN_ICONS[currentPlanSlug] || Star; return <Icon className="w-5 h-5" />; })()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-foreground text-lg">{subscription.plan.name} Plan</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  subscription.status === "active"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </span>
              </div>
              {subscription.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">
              ${subscription.plan.price}<span className="text-sm font-normal text-muted-foreground">/{subscription.plan.interval}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 bg-muted rounded-xl p-1">
          {(["month", "year"] as const).map(interval => (
            <button
              key={interval}
              onClick={() => setBillingInterval(interval)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                billingInterval === interval
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {interval === "month" ? "Monthly" : "Yearly"}
              {interval === "year" && (
                <span className="ml-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
                  SAVE 20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      {plansLoading ? (
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-96 rounded-2xl bg-muted/30 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => {
            const Icon = PLAN_ICONS[plan.slug] || Star;
            const isCurrentPlan = plan.slug === currentPlanSlug;
            const isPro = plan.slug === "pro";
            const displayPrice = billingInterval === "year" ? Math.round(plan.price * 0.8) : plan.price;
            const features = parseFeatures(plan.features);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative rounded-2xl border-2 ${
                  isPro ? "border-blue-500 shadow-blue-100 dark:shadow-blue-900/20 shadow-lg" : PLAN_BORDERS[plan.slug]
                } bg-card p-6 flex flex-col`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${PLAN_GRADIENTS[plan.slug]} flex items-center justify-center text-white mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <div className="mt-2 mb-6">
                  <span className="text-3xl font-bold text-foreground">${displayPrice}</span>
                  <span className="text-sm text-muted-foreground">/{billingInterval}</span>
                  {billingInterval === "year" && plan.price > 0 && (
                    <span className="ml-2 text-xs text-emerald-600 font-medium">
                      Save ${Math.round(plan.price * 0.2 * 12)}/yr
                    </span>
                  )}
                </div>

                {/* Limits */}
                <div className="grid grid-cols-3 gap-2 mb-6 p-3 bg-muted/40 rounded-xl">
                  {[
                    { label: "Reviews", value: plan.reviewLimit >= 99999 ? "∞" : plan.reviewLimit },
                    { label: "Locations", value: plan.locationLimit >= 50 ? "50+" : plan.locationLimit },
                    { label: "Users", value: plan.userLimit >= 100 ? "100+" : plan.userLimit },
                  ].map(limit => (
                    <div key={limit.label} className="text-center">
                      <div className="text-sm font-bold text-foreground">{limit.value}</div>
                      <div className="text-[10px] text-muted-foreground">{limit.label}</div>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1 mb-6">
                  {features.map((feature, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  disabled={isCurrentPlan || checkout.isPending}
                  onClick={() => !isCurrentPlan && checkout.mutate(plan.id)}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    isCurrentPlan
                      ? "bg-muted text-muted-foreground cursor-default"
                      : isPro
                      ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:opacity-90 shadow-md"
                      : "border border-border hover:bg-muted text-foreground"
                  }`}
                >
                  {isCurrentPlan ? (
                    <>
                      <Check className="w-4 h-4" />
                      Current Plan
                    </>
                  ) : plan.price === 0 ? (
                    "Downgrade to Free"
                  ) : (
                    <>
                      Upgrade to {plan.name}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Stripe Notice */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-400">Stripe configuration required</p>
          <p className="text-amber-700 dark:text-amber-500 mt-0.5">
            Add <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">STRIPE_SECRET_KEY</code> and{" "}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">STRIPE_WEBHOOK_SECRET</code> to your{" "}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">.env</code> file to enable payment processing.
          </p>
        </div>
      </div>
    </div>
  );
}
