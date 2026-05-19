"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Globe, Brain, Mail, Building2, Bell,
  Eye, EyeOff, Save, Check, AlertCircle, Shield,
  ChevronRight, Loader2, TestTube, RefreshCw,
  WifiOff, Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { settingsApi, googleApi } from "@/lib/api";

type Section = "google" | "openai" | "email" | "business" | "notifications";

const sections: { id: Section; label: string; icon: React.ElementType; description: string }[] = [
  { id: "google",        label: "Google Settings",      icon: Globe,     description: "API keys & OAuth configuration" },
  { id: "openai",        label: "OpenAI / AI Settings", icon: Brain,     description: "AI model & tone configuration" },
  { id: "email",         label: "Email / SMTP",         icon: Mail,      description: "Email notification settings" },
  { id: "business",      label: "Business Info",        icon: Building2, description: "Your business profile" },
  { id: "notifications", label: "Notifications",        icon: Bell,      description: "Alert preferences" },
];

// ─── Shared field components ──────────────────────────────────────────────────

function SecretInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder ?? "••••••••••••••••••••••••"}
        className="w-full pr-10 pl-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40 font-mono disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function FormField({
  label,
  description,
  children,
  required,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-4 border-b border-border last:border-0">
      <div>
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="md:col-span-2">{children}</div>
    </div>
  );
}

function SaveButton({
  saving,
  saved,
  onClick,
  disabled,
}: {
  saving: boolean;
  saved: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving || disabled}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        saved
          ? "bg-green-500 text-white"
          : "bg-primary text-primary-foreground hover:opacity-90"
      } disabled:opacity-60`}
    >
      {saving ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving…
        </>
      ) : saved ? (
        <>
          <Check className="w-4 h-4" />
          Saved!
        </>
      ) : (
        <>
          <Save className="w-4 h-4" />
          Save Changes
        </>
      )}
    </button>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-6 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="grid grid-cols-3 gap-3 py-4 border-b border-border">
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-muted/60 rounded animate-pulse" />
            <div className="h-3 w-44 bg-muted/40 rounded animate-pulse" />
          </div>
          <div className="col-span-2">
            <div className="h-10 bg-muted/40 rounded-lg animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section: Google ──────────────────────────────────────────────────────────

function GoogleSettings({ initialData }: { initialData: Record<string, unknown> }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [form, setForm] = useState({
    apiKey: "",
    clientId: String(initialData.clientId ?? ""),
    clientSecret: "",
    placeId: String(initialData.placeId ?? ""),
    accountId: String(initialData.accountId ?? ""),
    locationId: String(initialData.locationId ?? ""),
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Load Google connection status
  const { data: googleStatus } = useQuery({
    queryKey: ["google-status"],
    queryFn: () => googleApi.getStatus().then((r) => r.data.data as { connected: boolean }),
    retry: 1,
  });

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      settingsApi.update("google", data),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Google settings saved successfully");
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to save";
      toast.error(msg);
    },
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await settingsApi.testConnection("google");
      const result = res.data.data as { success: boolean; message: string };
      setTestResult(result);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch {
      setTestResult({ success: false, message: "Connection test failed" });
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const isConnected = googleStatus?.connected === true;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Google API Configuration
          </h3>
          <p className="text-sm text-muted-foreground">
            Connect your Google Business Profile to fetch and manage reviews
          </p>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
            isConnected
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400"
              : "bg-muted border-border text-muted-foreground"
          }`}
        >
          {isConnected ? (
            <>
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Connected
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              Not Connected
            </>
          )}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2 mb-5">
        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          API keys are encrypted and stored securely. You&apos;ll need a Google Cloud
          project with Business Profile API enabled.
        </p>
      </div>

      <div className="space-y-0">
        <FormField
          label="Google API Key"
          description="Your Google Cloud Platform API key with Business Profile API access"
          required
        >
          <SecretInput
            value={form.apiKey}
            onChange={(v) => set("apiKey", v)}
            placeholder={initialData.apiKey ? "sk-***…(configured)" : "AIzaSy…"}
          />
        </FormField>
        <FormField
          label="OAuth Client ID"
          description="OAuth 2.0 client ID from Google Cloud Console"
        >
          <input
            value={form.clientId}
            onChange={(e) => set("clientId", e.target.value)}
            placeholder="xxxx.apps.googleusercontent.com"
            className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono placeholder:text-muted-foreground/40"
          />
        </FormField>
        <FormField
          label="OAuth Client Secret"
          description="OAuth 2.0 client secret for authenticating your application"
        >
          <SecretInput
            value={form.clientSecret}
            onChange={(v) => set("clientSecret", v)}
            placeholder={
              initialData.clientSecret ? "***masked*** (configured)" : "••••••••"
            }
          />
        </FormField>
        <FormField
          label="Place ID"
          description="Your Google Maps Place ID (find it at developers.google.com/maps/documentation/places)"
          required
        >
          <input
            value={form.placeId}
            onChange={(e) => set("placeId", e.target.value)}
            placeholder="ChIJ…"
            className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono placeholder:text-muted-foreground/40"
          />
        </FormField>
        <FormField
          label="Business Account ID"
          description="Your Google Business Profile account ID"
        >
          <input
            value={form.accountId}
            onChange={(e) => set("accountId", e.target.value)}
            placeholder="accounts/…"
            className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono placeholder:text-muted-foreground/40"
          />
        </FormField>
        <FormField
          label="Location ID"
          description="Your specific business location ID within your account"
        >
          <input
            value={form.locationId}
            onChange={(e) => set("locationId", e.target.value)}
            placeholder="locations/…"
            className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono placeholder:text-muted-foreground/40"
          />
        </FormField>
      </div>

      {testResult && (
        <div
          className={`mt-4 flex items-center gap-2 p-3 rounded-lg text-sm ${
            testResult.success
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
          }`}
        >
          {testResult.success ? (
            <Wifi className="w-4 h-4 flex-shrink-0" />
          ) : (
            <WifiOff className="w-4 h-4 flex-shrink-0" />
          )}
          {testResult.message}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-5 mt-2">
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-60"
        >
          {testing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <TestTube className="w-3.5 h-3.5" />
          )}
          {testing ? "Testing…" : "Test Connection"}
        </button>
        <SaveButton
          saving={saveMutation.isPending}
          saved={saved}
          onClick={() => saveMutation.mutate(form)}
        />
      </div>
    </div>
  );
}

// ─── Section: OpenAI ──────────────────────────────────────────────────────────

function OpenAISettings({ initialData }: { initialData: Record<string, unknown> }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    apiKey: "",
    model: String(initialData.model ?? "gpt-4o"),
    temperature: String(initialData.temperature ?? "0.7"),
    maxTokens: String(initialData.maxTokens ?? "500"),
    defaultTone: String(initialData.defaultTone ?? "professional"),
    autoSuggest: Boolean(initialData.autoSuggest ?? true),
  });
  const set = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      settingsApi.update("openai", data),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("AI settings saved");
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => toast.error("Failed to save AI settings"),
  });

  return (
    <div>
      <h3 className="text-base font-semibold mb-1">OpenAI & AI Configuration</h3>
      <p className="text-sm text-muted-foreground mb-5">
        Configure your OpenAI API for intelligent review reply generation
      </p>

      <FormField
        label="OpenAI API Key"
        description="Your OpenAI API key. Get one at platform.openai.com"
        required
      >
        <SecretInput
          value={form.apiKey}
          onChange={(v) => set("apiKey", v)}
          placeholder={
            initialData.apiKey ? "sk-***masked*** (configured)" : "sk-proj-…"
          }
        />
      </FormField>
      <FormField
        label="AI Model"
        description="Select the GPT model to use for reply generation"
      >
        <select
          value={form.model}
          onChange={(e) => set("model", e.target.value)}
          className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="gpt-4o">GPT-4o (Recommended)</option>
          <option value="gpt-4o-mini">GPT-4o Mini (Faster)</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Economic)</option>
        </select>
      </FormField>
      <FormField
        label="Default AI Tone"
        description="Default tone for AI-generated replies"
      >
        <select
          value={form.defaultTone}
          onChange={(e) => set("defaultTone", e.target.value)}
          className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="professional">Professional</option>
          <option value="friendly">Friendly</option>
          <option value="formal">Formal</option>
          <option value="luxury">Luxury Hotel</option>
          <option value="hospitality">Hospitality</option>
          <option value="empathetic">Empathetic</option>
        </select>
      </FormField>
      <FormField
        label="Temperature"
        description="Controls creativity (0 = focused, 1 = creative). Recommended: 0.7"
      >
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={form.temperature}
            onChange={(e) => set("temperature", e.target.value)}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Focused (0)</span>
            <span className="font-medium text-foreground">{form.temperature}</span>
            <span>Creative (1)</span>
          </div>
        </div>
      </FormField>
      <FormField
        label="Max Tokens"
        description="Maximum reply length in tokens (~750 tokens ≈ 500 words)"
      >
        <input
          type="number"
          value={form.maxTokens}
          onChange={(e) => set("maxTokens", e.target.value)}
          min={100}
          max={2000}
          className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </FormField>
      <FormField
        label="Auto-Suggestions"
        description="Automatically suggest AI replies when viewing new reviews"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => set("autoSuggest", !form.autoSuggest)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              form.autoSuggest ? "bg-blue-500" : "bg-muted"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                form.autoSuggest ? "left-6" : "left-1"
              }`}
            />
          </button>
          <span className="text-sm text-muted-foreground">
            {form.autoSuggest ? "Enabled" : "Disabled"}
          </span>
        </div>
      </FormField>

      <div className="flex justify-end pt-5">
        <SaveButton
          saving={saveMutation.isPending}
          saved={saved}
          onClick={() => saveMutation.mutate(form)}
        />
      </div>
    </div>
  );
}

// ─── Section: Email ───────────────────────────────────────────────────────────

function EmailSettings({ initialData }: { initialData: Record<string, unknown> }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    smtpHost: String(initialData.smtpHost ?? ""),
    smtpPort: String(initialData.smtpPort ?? "587"),
    smtpUsername: String(initialData.smtpUsername ?? ""),
    smtpPassword: "",
    fromEmail: String(initialData.fromEmail ?? ""),
    fromName: String(initialData.fromName ?? ""),
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) => settingsApi.update("email", data),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Email settings saved");
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => toast.error("Failed to save email settings"),
  });

  return (
    <div>
      <h3 className="text-base font-semibold mb-1">Email / SMTP Configuration</h3>
      <p className="text-sm text-muted-foreground mb-5">
        Configure outbound email for review notifications and reports
      </p>

      {[
        { key: "smtpHost",     label: "SMTP Host",     desc: "Your email server hostname",                          placeholder: "smtp.gmail.com" },
        { key: "smtpPort",     label: "SMTP Port",     desc: "Server port (587 for TLS, 465 for SSL)",             placeholder: "587" },
        { key: "smtpUsername", label: "SMTP Username", desc: "Your email address or SMTP username",                 placeholder: "you@domain.com" },
        { key: "fromEmail",    label: "From Email",    desc: "Email address used for sending notifications",        placeholder: "reviews@yourdomain.com" },
        { key: "fromName",     label: "From Name",     desc: "Display name for outgoing emails",                   placeholder: "My Business Reviews" },
      ].map(({ key, label, desc, placeholder }) => (
        <FormField key={key} label={label} description={desc}>
          <input
            value={form[key as keyof typeof form]}
            onChange={(e) => set(key, e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40"
          />
        </FormField>
      ))}
      <FormField
        label="SMTP Password"
        description="Your SMTP password or app-specific password"
      >
        <SecretInput
          value={form.smtpPassword}
          onChange={(v) => set("smtpPassword", v)}
          placeholder={
            initialData.smtpPassword ? "***masked*** (configured)" : "••••••••"
          }
        />
      </FormField>

      <div className="flex justify-end pt-5">
        <SaveButton
          saving={saveMutation.isPending}
          saved={saved}
          onClick={() => saveMutation.mutate(form)}
        />
      </div>
    </div>
  );
}

// ─── Section: Business ────────────────────────────────────────────────────────

function BusinessSettings({ initialData }: { initialData: Record<string, unknown> }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name:        String(initialData.name        ?? ""),
    address:     String(initialData.address     ?? ""),
    phone:       String(initialData.phone       ?? ""),
    email:       String(initialData.email       ?? ""),
    website:     String(initialData.website     ?? ""),
    description: String(initialData.description ?? ""),
    industry:    String(initialData.industry    ?? "hotel"),
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      settingsApi.update("business", data),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Business settings saved");
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => toast.error("Failed to save business settings"),
  });

  return (
    <div>
      <h3 className="text-base font-semibold mb-1">Business Information</h3>
      <p className="text-sm text-muted-foreground mb-5">
        These details appear in AI-generated replies and reports
      </p>

      {[
        { key: "name",    label: "Business Name", desc: "Your official business name",       required: true,  placeholder: "e.g. Grand Palace Hotel" },
        { key: "address", label: "Address",        desc: "Full business address",             required: false, placeholder: "123 Main St, City, State" },
        { key: "phone",   label: "Phone Number",   desc: "Business contact number",           required: false, placeholder: "+1 234 567 8900" },
        { key: "email",   label: "Business Email", desc: "Primary business email",            required: false, placeholder: "info@yourbusiness.com" },
        { key: "website", label: "Website",         desc: "Your business website URL",        required: false, placeholder: "https://yourbusiness.com" },
      ].map(({ key, label, desc, required, placeholder }) => (
        <FormField key={key} label={label} description={desc} required={required}>
          <input
            value={form[key as keyof typeof form]}
            onChange={(e) => set(key, e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40"
          />
        </FormField>
      ))}
      <FormField label="Industry" description="Your business category">
        <select
          value={form.industry}
          onChange={(e) => set("industry", e.target.value)}
          className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="hotel">Hotel & Hospitality</option>
          <option value="restaurant">Restaurant & Dining</option>
          <option value="retail">Retail & Shopping</option>
          <option value="healthcare">Healthcare</option>
          <option value="automotive">Automotive</option>
          <option value="other">Other</option>
        </select>
      </FormField>
      <FormField
        label="Description"
        description="Brief description used in AI-generated replies"
      >
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          placeholder="A brief description of your business, used to personalise AI reply suggestions…"
          className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground/40"
        />
      </FormField>

      <div className="flex justify-end pt-5">
        <SaveButton
          saving={saveMutation.isPending}
          saved={saved}
          onClick={() => saveMutation.mutate(form)}
        />
      </div>
    </div>
  );
}

// ─── Section: Notifications ───────────────────────────────────────────────────

function NotificationSettings({ initialData }: { initialData: Record<string, unknown> }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    emailNotifications: Boolean(initialData.emailNotifications ?? true),
    newReviewAlert:     Boolean(initialData.newReviewAlert     ?? true),
    negativeReviewAlert:Boolean(initialData.negativeReviewAlert?? true),
    weeklyReport:       Boolean(initialData.weeklyReport       ?? false),
    monthlyReport:      Boolean(initialData.monthlyReport      ?? false),
    slackWebhook:       String(initialData.slackWebhook        ?? ""),
    whatsappNumber:     String(initialData.whatsappNumber      ?? ""),
  });

  const toggle = (k: keyof typeof form) =>
    setForm((s) => ({ ...s, [k]: !s[k] }));

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      settingsApi.update("notifications", data),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Notification preferences saved");
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => toast.error("Failed to save notification settings"),
  });

  const toggleItems: { key: keyof typeof form; label: string; desc: string }[] = [
    { key: "emailNotifications",  label: "Email Notifications",  desc: "Receive review notifications via email" },
    { key: "newReviewAlert",      label: "New Review Alert",      desc: "Alert when a new review is posted" },
    { key: "negativeReviewAlert", label: "Negative Review Alert", desc: "Immediate alert for 1-2 star reviews" },
    { key: "weeklyReport",        label: "Weekly Digest",         desc: "Weekly summary of review activity" },
    { key: "monthlyReport",       label: "Monthly Report",        desc: "Comprehensive monthly analytics report" },
  ];

  return (
    <div>
      <h3 className="text-base font-semibold mb-1">Notification Preferences</h3>
      <p className="text-sm text-muted-foreground mb-5">
        Control how and when you receive review alerts
      </p>

      <div className="space-y-0">
        {toggleItems.map(({ key, label, desc }) => (
          <div
            key={key}
            className="flex items-center justify-between py-4 border-b border-border last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                form[key] ? "bg-blue-500" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                  form[key] ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-0">
        <FormField
          label="Slack Webhook URL"
          description="Receive notifications in your Slack workspace"
        >
          <input
            value={form.slackWebhook}
            onChange={(e) =>
              setForm((s) => ({ ...s, slackWebhook: e.target.value }))
            }
            placeholder="https://hooks.slack.com/services/…"
            className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40 font-mono"
          />
        </FormField>
        <FormField
          label="WhatsApp Number"
          description="Receive alerts via WhatsApp Business API"
        >
          <input
            value={form.whatsappNumber}
            onChange={(e) =>
              setForm((s) => ({ ...s, whatsappNumber: e.target.value }))
            }
            placeholder="+1 234 567 8900"
            className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40"
          />
        </FormField>
      </div>

      <div className="flex justify-end pt-5">
        <SaveButton
          saving={saveMutation.isPending}
          saved={saved}
          onClick={() => saveMutation.mutate(form)}
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("google");

  const { data: allSettings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () =>
      settingsApi.get().then(
        (r) => r.data.data as Record<Section, Record<string, unknown>>
      ),
    retry: 1,
    staleTime: 30_000,
  });

  const sectionData = allSettings?.[activeSection] ?? {};

  const renderSection = () => {
    if (isLoading) return <SectionSkeleton />;
    switch (activeSection) {
      case "google":        return <GoogleSettings        initialData={sectionData} />;
      case "openai":        return <OpenAISettings        initialData={sectionData} />;
      case "email":         return <EmailSettings         initialData={sectionData} />;
      case "business":      return <BusinessSettings      initialData={sectionData} />;
      case "notifications": return <NotificationSettings  initialData={sectionData} />;
      default:              return <GoogleSettings        initialData={sectionData} />;
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure your integrations, API keys, and account preferences
        </p>
      </div>

      {/* Security badge */}
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg w-fit">
        <Shield className="w-4 h-4 text-green-500" />
        <span className="text-xs font-medium text-green-700 dark:text-green-400">
          All API keys are encrypted at rest in SQL Server
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar nav */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-border last:border-0 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{section.label}</p>
                    {!isActive && (
                      <p className="text-xs opacity-60 truncate">
                        {section.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 transition-transform ${
                      isActive ? "" : "opacity-40"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            {renderSection()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
