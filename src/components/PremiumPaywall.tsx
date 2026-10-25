import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Newspaper, BookOpen, Sparkles, Globe, Video, Camera, TrendingUp,
  BarChart3, Coins, DollarSign, Gamepad2, Puzzle, BookMarked, History,
  Headphones, Moon, Smartphone, Check, Crown, Tag, Loader2, ArrowRight,
  BookText, Brain, Grid3x3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { useServerFn } from "@tanstack/react-start";
import {
  getPremiumStatus,
  getSubscriptionPlans,
  getMyCoupons,
  validateCoupon,
  createCheckoutSession,
  type PlanInfo,
  type PremiumStatus,
} from "@/lib/subscription.functions";

const PREMIUM_BENEFITS = [
  { icon: Newspaper, label: "Complete Daily Discovery Edition" },
  { icon: BookOpen, label: "Complete Archive" },
  { icon: Sparkles, label: "AI Discovery Briefings" },
  { icon: Globe, label: "Interactive Newspaper" },
  { icon: Video, label: "Premium Videos" },
  { icon: Camera, label: "High Resolution Images" },
  { icon: TrendingUp, label: "Live Markets" },
  { icon: BarChart3, label: "Interactive Charts" },
  { icon: Coins, label: "Commodities" },
  { icon: DollarSign, label: "Currency Rates" },
  { icon: Globe, label: "Global Data" },
  { icon: Gamepad2, label: "Games & Puzzles" },
  { icon: Puzzle, label: "Crossword" },
  { icon: Gamepad2, label: "Chess" },
  { icon: Grid3x3, label: "Sudoku" },
  { icon: BookText, label: "Word of the Day" },
  { icon: Headphones, label: "Text to Speech" },
  { icon: BookMarked, label: "Save Articles" },
  { icon: History, label: "Reading History" },
  { icon: Newspaper, label: "Personalized Newspaper" },
  { icon: Moon, label: "Dark Mode" },
  { icon: Smartphone, label: "Read Anywhere" },
];

export function PremiumPaywall({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [authMode, setAuthMode] = useState<"choices" | "email-signin" | "email-signup">("choices");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"benefits" | "plans" | "checkout">("benefits");
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [coupons, setCoupons] = useState<{ id: string; code: string; status: string }[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("yearly");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number; description: string | null } | null>(null);
  const [autoWelcomeApplied, setAutoWelcomeApplied] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const getPremium = useServerFn(getPremiumStatus);
  const getPlans = useServerFn(getSubscriptionPlans);
  const getCoupons = useServerFn(getMyCoupons);
  const validateC = useServerFn(validateCoupon);
  const createCheckout = useServerFn(createCheckoutSession);

  useEffect(() => {
    if (!open) return;
    checkAuthAndLoad();
  }, [open]);

  async function checkAuthAndLoad() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setView("benefits");
      return;
    }
    setAuthMode("choices");
    await loadPremiumData();
  }

  async function loadPremiumData() {
    try {
      const [status, planData, couponData] = await Promise.all([
        getPremium(),
        getPlans(),
        getCoupons(),
      ]);
      setPremiumStatus(status);
      setPlans(planData);
      setCoupons(couponData);

      if (status.isPremium) {
        onClose();
        toast.success("You already have Premium access!");
        return;
      }

      const welcomeAvailable = couponData.some((c) => c.code === "WELCOME50" && c.status === "available");
      if (welcomeAvailable) {
        setAutoWelcomeApplied(true);
        setCouponCode("WELCOME50");
      }
      setView("plans");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleGoogleSignIn() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/epaper",
        },
      });
      if (error) throw error;
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  async function handleEmailAuth() {
    setBusy(true);
    try {
      if (authMode === "email-signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Account created! Welcome to The United Hell.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
      }
      await new Promise((r) => setTimeout(r, 500));
      await loadPremiumData();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setBusy(true);
    try {
      const result = await validateC({ data: { code: couponCode } });
      setAppliedCoupon(result);
      setAutoWelcomeApplied(false);
      toast.success(`Coupon ${result.code} applied!`);
    } catch (e) {
      toast.error((e as Error).message);
      setAppliedCoupon(null);
    } finally {
      setBusy(false);
    }
  }

  function getDiscountedPrice(plan: PlanInfo): number {
    if (!appliedCoupon && !autoWelcomeApplied) return plan.priceCents;
    const coupon = appliedCoupon || { discountType: "percentage", discountValue: 50 };
    if (coupon.discountType === "percentage") {
      return Math.round(plan.priceCents * (1 - coupon.discountValue / 100));
    }
    return Math.max(0, plan.priceCents - coupon.discountValue);
  }

  async function handleCheckout() {
    setCheckoutLoading(true);
    try {
      const couponToUse = appliedCoupon?.code || (autoWelcomeApplied ? "WELCOME50" : undefined);
      const result = await createCheckout({
        data: { planCode: selectedPlan as "monthly" | "yearly", couponCode: couponToUse },
      });
      if (!result.url) throw new Error("Checkout session created but no URL returned");
      window.location.href = result.url;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-background border border-foreground/20 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition z-10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* HEADER */}
            <div className="text-center pt-10 pb-6 border-b border-foreground/10 px-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-foreground text-background rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                <Crown className="h-3.5 w-3.5" />
                The United Hell Premium
              </div>
              {view === "benefits" && (
                <>
                  <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">
                    Read Today's Complete Daily Discovery Edition
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    The first page is free. Unlock every page, every edition, every feature.
                  </p>
                </>
              )}
              {view === "plans" && (
                <h2 className="font-serif text-2xl md:text-3xl font-bold mb-2">Choose Your Plan</h2>
              )}
              {view === "checkout" && (
                <h2 className="font-serif text-2xl md:text-3xl font-bold mb-2">Complete Your Purchase</h2>
              )}
            </div>

            <div className="p-6">
              {/* BENEFITS VIEW */}
              {view === "benefits" && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {PREMIUM_BENEFITS.slice(0, 12).map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <b.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="leading-tight">{b.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-center text-xs text-muted-foreground mb-6">
                    + Archive, AI Briefings, Live Markets, Games, and 20+ more features
                  </div>

                  {/* Auth section */}
                  <div className="border-t border-foreground/10 pt-6">
                    {!premiumStatus && authMode === "choices" && (
                      <div className="space-y-3">
                        <GoogleSignInButton redirectTo="/epaper" />
                        <button
                          onClick={() => setAuthMode("email-signin")}
                          disabled={busy}
                          className="w-full border border-foreground/30 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-muted transition disabled:opacity-40 rounded-sm"
                        >
                          Continue with Email
                        </button>
                        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
                          <button onClick={() => setAuthMode("email-signup")} className="hover:text-foreground transition">
                            Create account
                          </button>
                        </div>
                      </div>
                    )}

                    {authMode === "email-signin" && (
                      <EmailAuthForm
                        mode="signin"
                        email={email} setEmail={setEmail}
                        password={password} setPassword={setPassword}
                        onSubmit={handleEmailAuth}
                        busy={busy}
                        onBack={() => setAuthMode("choices")}
                      />
                    )}

                    {authMode === "email-signup" && (
                      <EmailAuthForm
                        mode="signup"
                        email={email} setEmail={setEmail}
                        password={password} setPassword={setPassword}
                        name={name} setName={setName}
                        onSubmit={handleEmailAuth}
                        busy={busy}
                        onBack={() => setAuthMode("choices")}
                      />
                    )}
                  </div>
                </>
              )}

              {/* PLANS VIEW */}
              {view === "plans" && (
                <>
                  {autoWelcomeApplied && (
                    <div className="mb-5 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400 mb-1">
                        <span>🎉 Welcome to The United Hell!</span>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        Your Welcome Coupon <strong>WELCOME50</strong> (50% OFF) has been applied automatically. Valid for your first purchase.
                      </p>
                    </div>
                  )}

                  <div className="grid gap-4 mb-6">
                    {plans.map((plan) => {
                      const isPopular = plan.isPopular;
                      const discounted = getDiscountedPrice(plan);
                      const hasDiscount = discounted < plan.priceCents;
                      return (
                        <button
                          key={plan.code}
                          onClick={() => { setSelectedPlan(plan.code); setView("checkout"); }}
                          className={`relative text-left p-5 border-2 rounded-lg transition hover:border-foreground ${
                            isPopular ? "border-foreground bg-foreground/5" : "border-foreground/15"
                          }`}
                        >
                          {isPopular && (
                            <span className="absolute -top-3 left-5 px-3 py-0.5 bg-foreground text-background text-xs font-bold uppercase tracking-wider rounded-full">
                              Most Popular
                            </span>
                          )}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-serif text-xl font-bold">{plan.name}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                            </div>
                          </div>
                          <div className="flex items-baseline gap-2 mb-3">
                            {hasDiscount ? (
                              <>
                                <span className="font-serif text-3xl font-bold">
                                  ₹{(discounted / 100).toLocaleString("en-IN")}
                                </span>
                                <span className="text-lg text-muted-foreground line-through">
                                  {plan.displayPrice}
                                </span>
                                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                  You Save ₹{((plan.priceCents - discounted) / 100).toLocaleString("en-IN")}
                                </span>
                              </>
                            ) : (
                              <span className="font-serif text-3xl font-bold">{plan.displayPrice}</span>
                            )}
                            <span className="text-sm text-muted-foreground">/{plan.interval}</span>
                          </div>
                          <div className="space-y-1.5">
                            {plan.features.slice(0, 6).map((f, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                                {f}
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-foreground">
                            Continue <ArrowRight className="h-4 w-4" />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Coupon section */}
                  <div className="border-t border-foreground/10 pt-4">
                    {showCouponInput ? (
                      <div className="flex gap-2">
                        <input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Enter coupon code"
                          className="flex-1 border border-foreground/20 rounded-sm px-3 py-2 text-sm uppercase tracking-wider outline-none focus:border-foreground"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={busy}
                          className="border border-foreground px-4 py-2 text-xs uppercase tracking-wider hover:bg-foreground hover:text-background transition rounded-sm disabled:opacity-40"
                        >
                          Apply
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCouponInput(true)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
                      >
                        <Tag className="h-4 w-4" />
                        Have another coupon? Enter code
                      </button>
                    )}
                    {appliedCoupon && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" />
                        Coupon {appliedCoupon.code} applied — {appliedCoupon.discountType === "percentage" ? `${appliedCoupon.discountValue}% off` : `₹${appliedCoupon.discountValue / 100} off`}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* CHECKOUT VIEW */}
              {view === "checkout" && (
                <div>
                  {(() => {
                    const plan = plans.find((p) => p.code === selectedPlan);
                    if (!plan) return null;
                    const discounted = getDiscountedPrice(plan);
                    const hasDiscount = discounted < plan.priceCents;
                    return (
                      <div className="space-y-5">
                        <div className="border border-foreground/15 rounded-lg p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-serif text-xl font-bold">{plan.name}</h3>
                              <p className="text-xs text-muted-foreground">{plan.interval === "year" ? "Billed annually" : "Billed monthly"}</p>
                            </div>
                            {plan.isPopular && (
                              <span className="px-2 py-0.5 bg-foreground text-background text-xs font-bold uppercase rounded-full">Best Value</span>
                            )}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span>{plan.displayPrice}</span>
                            </div>
                            {hasDiscount && (
                              <div className="flex justify-between text-green-600 dark:text-green-400">
                                <span>Discount {(appliedCoupon?.code || (autoWelcomeApplied ? "WELCOME50" : ""))}</span>
                                <span>-₹{((plan.priceCents - discounted) / 100).toLocaleString("en-IN")}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-lg border-t border-foreground/10 pt-2">
                              <span>Total</span>
                              <span>₹{(discounted / 100).toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </div>

                        {plan.interval === "year" && hasDiscount && (
                          <p className="text-center text-xs text-muted-foreground italic">
                            Limited welcome offer for first-time subscribers only. Renews at full price unless another promotion applies.
                          </p>
                        )}

                        <button
                          onClick={handleCheckout}
                          disabled={checkoutLoading}
                          className="w-full bg-foreground text-background py-4 text-sm font-bold uppercase tracking-wider hover:opacity-90 transition disabled:opacity-40 rounded-sm flex items-center justify-center gap-2"
                        >
                          {checkoutLoading ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to secure checkout...</>
                          ) : (
                            <><Crown className="h-4 w-4" /> Subscribe Now — ₹{(discounted / 100).toLocaleString("en-IN")}</>
                          )}
                        </button>

                        <div className="text-center text-xs text-muted-foreground">
                          Secure payment via Stripe. Supports UPI, Google Pay, PhonePe, Paytm, Cards, Net Banking & more.
                        </div>

                        <button
                          onClick={() => setView("plans")}
                          className="w-full text-sm text-muted-foreground hover:text-foreground transition"
                        >
                          ← Back to plans
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function EmailAuthForm({
  mode, email, setEmail, password, setPassword, name, setName,
  onSubmit, busy, onBack,
}: {
  mode: "signin" | "signup";
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  name?: string; setName?: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  onBack: () => void;
}) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      className="space-y-4"
    >
      {mode === "signup" && setName && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm outline-none focus:border-foreground"
          />
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm outline-none focus:border-foreground"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Password</label>
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm outline-none focus:border-foreground"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-foreground text-background py-3 text-sm font-semibold uppercase tracking-wider hover:opacity-90 transition disabled:opacity-40 rounded-sm flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign In" : "Create Account"}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition"
      >
        ← Back
      </button>
    </form>
  );
}
