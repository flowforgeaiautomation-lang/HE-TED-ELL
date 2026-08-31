import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getStripe, PLAN_CONFIG, formatINR, type PlanCode } from "@/lib/stripe.server";

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */

export type PremiumStatus = {
  isPremium: boolean;
  planCode: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  daysRemaining: number | null;
};

export type PlanInfo = {
  code: string;
  name: string;
  description: string;
  priceCents: number;
  displayPrice: string;
  interval: string;
  features: string[];
  isPopular?: boolean;
};

export type CouponInfo = {
  code: string;
  discountType: string;
  discountValue: number;
  description: string | null;
};

export type CheckoutResult = {
  url: string | null;
  sessionId: string;
};

/* ──────────────────────────────────────────────────────────────
   Get Premium Status
   ────────────────────────────────────────────────────────────── */

export const getPremiumStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("plan_code, status, current_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data || data.status !== "active") {
      return {
        isPremium: false,
        planCode: null,
        status: data?.status ?? null,
        currentPeriodEnd: null,
        daysRemaining: null,
      } satisfies PremiumStatus;
    }

    const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
    const now = new Date();
    const daysRemaining = periodEnd
      ? Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      isPremium: true,
      planCode: data.plan_code,
      status: data.status,
      currentPeriodEnd: data.current_period_end,
      daysRemaining,
    } satisfies PremiumStatus;
  });

/* ──────────────────────────────────────────────────────────────
   Get Plans
   ────────────────────────────────────────────────────────────── */

export const getSubscriptionPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("subscription_plans")
    .select("code, name, description, price_cents, currency, interval, stripe_price_id")
    .eq("is_active", true)
    .order("price_cents", { ascending: true });

  if (error) throw new Error(error.message);

  const features: Record<string, string[]> = {
    monthly: [
      "Daily Discovery Edition",
      "Premium Articles",
      "Videos",
      "Archive",
      "Games & Puzzles",
      "Word of the Day",
      "Bookmarks",
      "Reading History",
    ],
    yearly: [
      "Everything in Monthly",
      "Save ₹1,000 with welcome offer",
      "Complete Daily Discovery Edition",
      "Complete Archive",
      "AI Discovery Briefings",
      "Interactive Newspaper",
      "Premium Videos",
      "Live Markets & Charts",
      "Games & Puzzles",
      "Text to Speech",
      "Personalized Newspaper",
      "Dark Mode",
      "Read Anywhere",
    ],
  };

  return (data ?? []).map((p: { code: string; name: string; description: string | null; price_cents: number; currency: string; interval: string }) => ({
    code: p.code,
    name: p.name,
    description: p.description ?? "",
    priceCents: p.price_cents,
    displayPrice: formatINR(p.price_cents),
    interval: p.interval,
    features: features[p.code] ?? [],
    isPopular: p.code === "yearly",
  })) satisfies PlanInfo[];
});

/* ──────────────────────────────────────────────────────────────
   Get Available Coupons for User
   ────────────────────────────────────────────────────────────── */

export const getMyCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_coupons")
      .select("id, code, status, used_at, created_at, coupon_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ──────────────────────────────────────────────────────────────
   Validate a Coupon Code
   ────────────────────────────────────────────────────────────── */

export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ code: z.string().trim().min(1).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { supabase, userId } = context;
    const code = data.code.toUpperCase().trim();

    const { data: coupon, error } = await supabaseAdmin
      .from("coupons")
      .select("id, code, description, discount_type, discount_value, max_uses, used_count, valid_until, is_active, max_uses_per_user")
      .eq("code", code)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!coupon || !coupon.is_active) throw new Error("Invalid or expired coupon code");

    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      throw new Error("This coupon has expired");
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      throw new Error("This coupon has reached its usage limit");
    }

    const { data: userUsage } = await supabase
      .from("user_coupons")
      .select("id")
      .eq("user_id", userId)
      .eq("code", code)
      .eq("status", "used");

    if (userUsage && userUsage.length >= coupon.max_uses_per_user) {
      throw new Error("You have already used this coupon");
    }

    return {
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      description: coupon.description,
    } satisfies CouponInfo;
  });

/* ──────────────────────────────────────────────────────────────
   Create Checkout Session
   ────────────────────────────────────────────────────────────── */

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      planCode: z.enum(["monthly", "yearly"]),
      couponCode: z.string().trim().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const stripe = getStripe();
    const plan = PLAN_CONFIG[data.planCode as PlanCode];
    if (!plan) throw new Error("Invalid plan");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: planRow } = await supabaseAdmin
      .from("subscription_plans")
      .select("stripe_price_id")
      .eq("code", data.planCode)
      .maybeSingle();

    if (!planRow?.stripe_price_id) throw new Error("Plan not configured with Stripe");

    const { data: existing } = await supabase
      .from("user_subscriptions")
      .select("id, status, stripe_subscription_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (existing) throw new Error("You already have an active premium subscription");

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    const userEmail = (context.claims as Record<string, unknown>)?.email as string || "";
    const appUrl = process.env.APP_URL || (typeof window !== "undefined" ? window.location.origin : "https://theunitedhell.com");

    let stripeCouponId: string | undefined;
    let couponCodeUpper: string | undefined;

    if (data.couponCode) {
      couponCodeUpper = data.couponCode.toUpperCase().trim();
      const { data: couponRow } = await supabaseAdmin
        .from("coupons")
        .select("id, is_active, valid_until, max_uses, used_count")
        .eq("code", couponCodeUpper)
        .maybeSingle();

      if (couponRow && couponRow.is_active) {
        const expired = couponRow.valid_until && new Date(couponRow.valid_until) < new Date();
        const exhausted = couponRow.max_uses !== null && couponRow.used_count >= couponRow.max_uses;
        if (!expired && !exhausted) {
          const existingStripeCoupon = await stripe.coupons.list({ limit: 100 });
          const found = existingStripeCoupon.data.find((c) => c.name?.includes(couponCodeUpper!));
          stripeCouponId = found?.id;
        }
      }
    } else {
      const { data: welcomeCoupon } = await supabase
        .from("user_coupons")
        .select("code, status")
        .eq("user_id", userId)
        .eq("code", "WELCOME50")
        .eq("status", "available")
        .maybeSingle();

      if (welcomeCoupon) {
        couponCodeUpper = "WELCOME50";
        const existingStripeCoupon = await stripe.coupons.list({ limit: 100 });
        const found = existingStripeCoupon.data.find((c) => c.name?.includes("WELCOME50"));
        stripeCouponId = found?.id;
      }
    }

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "subscription",
      line_items: [{ price: planRow.stripe_price_id, quantity: 1 }],
      client_reference_id: userId,
      metadata: {
        userId,
        planCode: data.planCode,
        couponCode: couponCodeUpper ?? "",
      },
      subscription_data: {
        metadata: { userId, planCode: data.planCode, couponCode: couponCodeUpper ?? "" },
      },
      success_url: `${appUrl}/epaper?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/epaper?checkout=cancelled`,
      allow_promotion_codes: true,
    };

    if (userEmail) {
      sessionParams.customer_email = userEmail;
    }

    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    await supabaseAdmin.from("transactions").insert({
      user_id: userId,
      stripe_checkout_session_id: session.id,
      amount_cents: plan.priceCents,
      currency: "inr",
      plan_code: data.planCode,
      coupon_code: couponCodeUpper ?? null,
      status: "pending",
    });

    return { url: session.url ?? null, sessionId: session.id } satisfies CheckoutResult;
  });

/* ──────────────────────────────────────────────────────────────
   Get Billing History (invoices + transactions)
   ────────────────────────────────────────────────────────────── */

export const getBillingHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [invoices, transactions] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, invoice_number, amount_cents, currency, plan_code, period_start, period_end, pdf_url, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("transactions")
        .select("id, amount_cents, currency, plan_code, coupon_code, discount_cents, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (invoices.error) throw new Error(invoices.error.message);
    if (transactions.error) throw new Error(transactions.error.message);

    return {
      invoices: invoices.data ?? [],
      transactions: transactions.data ?? [],
    };
  });

/* ──────────────────────────────────────────────────────────────
   Cancel Subscription
   ────────────────────────────────────────────────────────────── */

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const stripe = getStripe();

    const { data: sub, error } = await supabase
      .from("user_subscriptions")
      .select("id, stripe_subscription_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!sub?.stripe_subscription_id) throw new Error("No active subscription found");

    await stripe.subscriptions.cancel(sub.stripe_subscription_id);

    await supabase
      .from("user_subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", sub.id);

    return { canceled: true };
  });

/* ──────────────────────────────────────────────────────────────
   Admin: Get all subscriptions
   ────────────────────────────────────────────────────────────── */

export const adminGetSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.is_admin) throw new Error("Admin access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_subscriptions")
      .select("id, user_id, plan_code, status, current_period_start, current_period_end, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ──────────────────────────────────────────────────────────────
   Admin: Get revenue analytics
   ────────────────────────────────────────────────────────────── */

export const adminGetRevenue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.is_admin) throw new Error("Admin access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("amount_cents, status, plan_code, created_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const succeeded = rows.filter((r: { status: string }) => r.status === "succeeded");
    const totalRevenue = succeeded.reduce((s: number, r: { amount_cents: number }) => s + r.amount_cents, 0);
    const monthlyRevenue = succeeded
      .filter((r: { created_at: string }) => new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((s: number, r: { amount_cents: number }) => s + r.amount_cents, 0);
    const activeSubs = succeeded.filter((r: { plan_code: string }) => r.plan_code === "monthly").length;
    const yearlySubs = succeeded.filter((r: { plan_code: string }) => r.plan_code === "yearly").length;

    return {
      totalRevenueCents: totalRevenue,
      monthlyRevenueCents: monthlyRevenue,
      totalTransactions: succeeded.length,
      monthlySubscribers: activeSubs,
      yearlySubscribers: yearlySubs,
      displayTotal: formatINR(totalRevenue),
      displayMonthly: formatINR(monthlyRevenue),
    };
  });

/* ──────────────────────────────────────────────────────────────
   Admin: Get all coupons + usage
   ────────────────────────────────────────────────────────────── */

export const adminGetCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.is_admin) throw new Error("Admin access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ──────────────────────────────────────────────────────────────
   Admin: Create a coupon
   ────────────────────────────────────────────────────────────── */

export const adminCreateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      code: z.string().trim().min(3).max(50).transform((s) => s.toUpperCase()),
      description: z.string().trim().max(200).optional(),
      discountType: z.enum(["percentage", "fixed"]),
      discountValue: z.number().int().min(1),
      maxUses: z.number().int().nullable().optional(),
      maxUsesPerUser: z.number().int().min(1).default(1),
      validUntil: z.string().nullable().optional(),
      autoApply: z.boolean().default(false),
      eligibleOnlyNewUsers: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.is_admin) throw new Error("Admin access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("coupons").insert({
      code: data.code,
      description: data.description ?? null,
      discount_type: data.discountType,
      discount_value: data.discountValue,
      max_uses: data.maxUses ?? null,
      max_uses_per_user: data.maxUsesPerUser,
      valid_until: data.validUntil ?? null,
      auto_apply: data.autoApply,
      eligible_only_new_users: data.eligibleOnlyNewUsers,
    });

    if (error) throw new Error(error.message);
    return { created: true, code: data.code };
  });
