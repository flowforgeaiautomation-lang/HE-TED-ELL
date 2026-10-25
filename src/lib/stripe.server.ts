import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return key;
}

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(getStripeKey(), {
      apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return _stripe;
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

export const PLAN_CONFIG = {
  monthly: {
    code: "monthly",
    name: "Monthly Premium",
    priceCents: 19900,
    interval: "month" as const,
  },
  yearly: {
    code: "yearly",
    name: "Yearly Premium",
    priceCents: 199900,
    interval: "year" as const,
  },
} as const;

export type PlanCode = keyof typeof PLAN_CONFIG;

export function formatINR(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN")}`;
}
