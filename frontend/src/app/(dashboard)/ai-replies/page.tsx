"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Star, Copy, RotateCcw, Loader2, Check,
  Wand2, Languages, ArrowRight, Zap, Brain, AlertCircle,
} from "lucide-react";
import { StarRating } from "@/components/ui/StarRating";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";

const TONES = [
  { value: "professional", label: "Professional", emoji: "💼", desc: "Formal and business-appropriate" },
  { value: "friendly", label: "Friendly", emoji: "😊", desc: "Warm and conversational" },
  { value: "formal", label: "Formal", emoji: "📋", desc: "Highly formal and respectful" },
  { value: "luxury", label: "Luxury Hotel", emoji: "👑", desc: "Premium, elegant hospitality tone" },
  { value: "hospitality", label: "Hospitality", emoji: "🏨", desc: "Industry-specific warm service tone" },
  { value: "empathetic", label: "Empathetic", emoji: "🤝", desc: "Understanding and compassionate" },
];

const SAMPLE_REVIEWS = [
  { rating: 5, text: "Absolutely incredible stay! Best hotel I've ever visited. The staff was exceptional, the rooms were immaculate, and the food was divine. Will definitely return!", name: "Sarah Johnson" },
  { rating: 2, text: "Very disappointing experience. The room was not clean, the AC barely worked, and the service was slow. Expected much better for this price.", name: "Michael Chen" },
  { rating: 4, text: "Great hotel overall. The location is perfect and the breakfast was outstanding. Minor issues with the WiFi speed but staff resolved it quickly.", name: "Emma Williams" },
  { rating: 1, text: "Terrible experience from start to finish. Noisy room, rude staff, and the checkout took over an hour. Never coming back.", name: "David Martinez" },
];


export default function AIRepliesPage() {
  const [selectedTone, setSelectedTone] = useState("professional");
  const [reviewText, setReviewText] = useState(SAMPLE_REVIEWS[0].text);
  const [reviewerName, setReviewerName] = useState(SAMPLE_REVIEWS[0].name);
  const [rating, setRating] = useState(5);
  const [instructions, setInstructions] = useState("");
  const [generatedReply, setGeneratedReply] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<Array<{ tone: string; reply: string; timestamp: string }>>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: () =>
      aiApi.generateReply({
        reviewText,
        rating,
        reviewerName,
        tone: selectedTone,
        instructions: instructions || undefined,
      }).then((r) => r.data.data as { reply: string }),
    onSuccess: (data) => {
      const reply = data?.reply ?? "";
      setGeneratedReply(reply);
      setApiError(null);
      setHistory((prev) => [
        { tone: selectedTone, reply, timestamp: new Date().toISOString() },
        ...prev.slice(0, 4),
      ]);
      toast.success("AI reply generated!", { description: `Using ${selectedTone} tone` });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to generate reply. Check your OpenAI API key in Settings.";
      setApiError(msg);
      toast.error("Generation failed", { description: msg });
    },
  });

  const isGenerating = generateMutation.isPending;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedReply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const loadSample = (sample: typeof SAMPLE_REVIEWS[0]) => {
    setReviewText(sample.text);
    setReviewerName(sample.name);
    setRating(sample.rating);
    setGeneratedReply("");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Reply Generator</h2>
          <p className="text-sm text-muted-foreground">Generate intelligent, context-aware replies powered by GPT-4o</p>
        </div>
      </div>

      {/* Feature badges */}
      <div className="flex flex-wrap gap-2">
        {[
          { icon: Wand2, label: "Smart Tone Detection" },
          { icon: Languages, label: "Multi-language Support" },
          { icon: Brain, label: "Sentiment-aware" },
          { icon: Zap, label: "Instant Generation" },
        ].map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
            <Icon className="w-3 h-3" />{label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input Panel */}
        <div className="space-y-4">
          {/* Sample reviews */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Sample Reviews (click to load)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLE_REVIEWS.map((sample, i) => (
                <button key={i} onClick={() => loadSample(sample)}
                  className="text-left p-2.5 bg-muted/50 hover:bg-muted border border-border rounded-lg transition-all group">
                  <div className="flex items-center gap-1.5 mb-1">
                    <StarRating rating={sample.rating} size="sm" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">{sample.text}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Review Input */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold">Review Details</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Reviewer Name</label>
                <input value={reviewerName} onChange={e => setReviewerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Rating</label>
                <select value={rating} onChange={e => setRating(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring">
                  {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} ★</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Review Text</label>
              <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} rows={5}
                className="w-full px-3 py-2.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Special Instructions (optional)</label>
              <input value={instructions} onChange={e => setInstructions(e.target.value)}
                placeholder="e.g. Mention the new spa, offer a discount..."
                className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40" />
            </div>
          </div>

          {/* Tone Selection */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Select Reply Tone</h3>
            <div className="grid grid-cols-2 gap-2">
              {TONES.map((tone) => (
                <button key={tone.value} onClick={() => setSelectedTone(tone.value)}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${selectedTone === tone.value ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 border-border hover:border-primary/50"}`}>
                  <span className="text-lg">{tone.emoji}</span>
                  <div>
                    <p className={`text-xs font-semibold ${selectedTone === tone.value ? "" : "text-foreground"}`}>{tone.label}</p>
                    <p className={`text-[10px] ${selectedTone === tone.value ? "opacity-75" : "text-muted-foreground"}`}>{tone.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <motion.button
            onClick={() => generateMutation.mutate()}
            disabled={isGenerating || !reviewText.trim()}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 shadow-lg shadow-blue-500/20"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Generating with AI...</>
            ) : (
              <><Sparkles className="w-4 h-4" />Generate AI Reply</>
            )}
          </motion.button>
        </div>

        {/* Output Panel */}
        <div className="space-y-4">
          {/* Generated Reply */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Generated Reply
              </h3>
              {generatedReply && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">
                    {selectedTone} tone
                  </span>
                  <button onClick={handleCopy} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setGeneratedReply("")} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Crafting your perfect reply...</p>
                  <p className="text-xs text-muted-foreground">Analyzing sentiment and context</p>
                </motion.div>
              ) : generatedReply ? (
                <motion.div key="reply" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <textarea
                    value={generatedReply}
                    onChange={e => setGeneratedReply(e.target.value)}
                    rows={14}
                    className="w-full px-3 py-3 text-sm bg-muted/30 border border-border rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed text-foreground"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">{generatedReply.length} characters</span>
                    <div className="flex gap-2">
                      <button onClick={() => generateMutation.mutate()} disabled={isGenerating} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium disabled:opacity-50">
                        <Wand2 className="w-3 h-3" />Regenerate
                      </button>
                      <button onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90 transition-opacity">
                        {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy Reply</>}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : apiError ? (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Generation failed</p>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{apiError}</p>
                  <a href="/settings" className="text-xs text-blue-500 hover:text-blue-600 font-medium underline">
                    Configure OpenAI API key in Settings →
                  </a>
                </motion.div>
              ) : (
                <motion.div key="empty" className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Ready to generate</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Select a tone and click &quot;Generate AI Reply&quot; to create a professional response
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reply History */}
          {history.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">Recent Generations</h3>
              <div className="space-y-2">
                {history.map((item, i) => (
                  <button key={i} onClick={() => setGeneratedReply(item.reply)}
                    className="w-full flex gap-3 p-2.5 hover:bg-muted rounded-lg transition-colors text-left group">
                    <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground capitalize">{item.tone} tone</p>
                      <p className="text-xs text-muted-foreground truncate">{item.reply.substring(0, 60)}...</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
