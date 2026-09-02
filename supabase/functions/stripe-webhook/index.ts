import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.108.2";
import Stripe from "npm:stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature",
};

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(stripeKey, {
  apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion,
});

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function activateSubscription(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  if (!userId) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const planCode = subscription.metadata?.planCode || "monthly";
  const couponCode = subscription.metadata?.couponCode || null;

  const { data: existing } = await supabase
    .from("user_subscriptions")
    .select("id, stripe_subscription_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  const subData = {
    user_id: userId,
    plan_code: planCode,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    status: "active",
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase.from("user_subscriptions").update(subData).eq("id", existing.id);
  } else {
    await supabase.from("user_subscriptions").insert(subData);
  }

  const amountCents = session.amount_total ?? 0;
  await supabase
    .from("transactions")
    .update({ status: "succeeded", updated_at: new Date().toISOString() })
    .eq("stripe_checkout_session_id", session.id);

  if (couponCode) {
    await supabase
      .from("user_coupons")
      .update({ status: "used", used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("code", couponCode)
      .eq("status", "available");

    await supabase.rpc("increment_coupon_usage", { p_code: couponCode });
  }

  const invoiceNum = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  await supabase.from("invoices").insert({
    user_id: userId,
    invoice_number: invoiceNum,
    stripe_invoice_id: session.invoice as string,
    amount_cents: amountCents,
    currency: "inr",
    plan_code: planCode,
    period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig || !webhookSecret) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature or webhook secret" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await activateSubscription(session);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await supabase
            .from("user_subscriptions")
            .update({
              status: sub.status,
              current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", sub.id);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("user_subscriptions")
          .update({
            status: "expired",
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);
        break;
      }
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true, type: event.type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
