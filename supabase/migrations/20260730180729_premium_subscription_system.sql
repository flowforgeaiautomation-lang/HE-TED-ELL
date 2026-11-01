/*
# Premium Subscription System — Database Schema

## Overview
Creates the complete database backend for The United Hell's premium subscription system,
including subscription plans, user subscriptions, coupon management, transactions, and invoices.

## New Tables

### 1. subscription_plans
Stores the available subscription plans (Monthly, Yearly).
- id (uuid PK)
- code (text, unique) — e.g. "monthly", "yearly"
- name (text) — display name
- description (text)
- price_cents (integer) — price in paise (₹1 = 100 paise)
- currency (text, default 'inr')
- interval (text) — 'month' or 'year'
- stripe_price_id (text) — Stripe Price ID for this plan
- is_active (boolean, default true)
- created_at, updated_at (timestamptz)

### 2. user_subscriptions
Tracks each user's premium subscription status.
- id (uuid PK)
- user_id (uuid, FK auth.users, NOT NULL DEFAULT auth.uid())
- plan_code (text) — which plan they subscribed to
- stripe_customer_id (text)
- stripe_subscription_id (text)
- status (text) — 'active', 'canceled', 'past_due', 'expired', 'trialing'
- current_period_start (timestamptz)
- current_period_end (timestamptz) — renewal/expiry date
- canceled_at (timestamptz, nullable)
- created_at, updated_at (timestamptz)

### 3. coupons
Admin-managed coupon definitions with full flexibility.
- id (uuid PK)
- code (text, unique, uppercase) — e.g. "WELCOME50"
- description (text)
- discount_type (text) — 'percentage' or 'fixed'
- discount_value (integer) — percentage (1-100) or amount in paise
- max_uses (integer, nullable) — null = unlimited
- max_uses_per_user (integer, default 1)
- used_count (integer, default 0)
- valid_from (timestamptz)
- valid_until (timestamptz, nullable)
- is_active (boolean, default true)
- auto_apply (boolean, default false) — auto-apply to eligible new users
- eligible_only_new_users (boolean, default false)
- created_at, updated_at (timestamptz)

### 4. user_coupons
Tracks which coupons have been issued/used by each user.
- id (uuid PK)
- user_id (uuid, FK auth.users, NOT NULL DEFAULT auth.uid())
- coupon_id (uuid, FK coupons)
- code (text) — denormalized for quick display
- status (text) — 'available', 'used', 'expired'
- used_at (timestamptz, nullable)
- stripe_coupon_id (text, nullable) — Stripe coupon ID after creation
- created_at (timestamptz)

### 5. transactions
Records every payment transaction.
- id (uuid PK)
- user_id (uuid, FK auth.users, NOT NULL DEFAULT auth.uid())
- stripe_payment_intent_id (text, nullable)
- stripe_checkout_session_id (text, nullable)
- amount_cents (integer) — amount paid in paise
- currency (text, default 'inr')
- plan_code (text)
- coupon_code (text, nullable)
- discount_cents (integer, default 0)
- status (text) — 'pending', 'succeeded', 'failed', 'refunded'
- created_at, updated_at (timestamptz)

### 6. invoices
Generated invoices for each successful payment.
- id (uuid PK)
- user_id (uuid, FK auth.users, NOT NULL DEFAULT auth.uid())
- transaction_id (uuid, FK transactions)
- invoice_number (text, unique) — generated sequential number
- stripe_invoice_id (text, nullable)
- amount_cents (integer)
- currency (text, default 'inr')
- plan_code (text)
- period_start (timestamptz)
- period_end (timestamptz)
- pdf_url (text, nullable)
- created_at (timestamptz)

## Security (RLS)
All tables have RLS enabled. Since this app has sign-in:
- subscription_plans: readable by anon + authenticated (public catalog)
- coupons: readable by authenticated (users see available coupons)
- user_subscriptions, user_coupons, transactions, invoices: owner-scoped (authenticated, auth.uid() = user_id)
- All writes are owner-scoped except coupon admin operations which use service role (server functions)

## Notes
1. Stripe price IDs will be set when products are created in Stripe.
2. The WELCOME50 coupon is inserted as a seed row with auto_apply=true.
3. Invoice numbers use format INV-YYYYMMDD-XXXXX (sequential per day).
*/

-- ──────────────────────────────────────────────────────────────
-- subscription_plans
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'inr',
  interval text NOT NULL CHECK (interval IN ('month', 'year')),
  stripe_price_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_plans_public" ON subscription_plans;
CREATE POLICY "read_plans_public"
  ON subscription_plans FOR SELECT
  TO anon, authenticated USING (true);

-- ──────────────────────────────────────────────────────────────
-- user_subscriptions
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sub" ON user_subscriptions;
CREATE POLICY "select_own_sub"
  ON user_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sub" ON user_subscriptions;
CREATE POLICY "insert_own_sub"
  ON user_subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sub" ON user_subscriptions;
CREATE POLICY "update_own_sub"
  ON user_subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- coupons
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value integer NOT NULL,
  max_uses integer,
  max_uses_per_user integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  auto_apply boolean NOT NULL DEFAULT false,
  eligible_only_new_users boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_coupons_auth" ON coupons;
CREATE POLICY "read_coupons_auth"
  ON coupons FOR SELECT
  TO authenticated USING (is_active = true);

-- ──────────────────────────────────────────────────────────────
-- user_coupons
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  used_at timestamptz,
  stripe_coupon_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_coupons" ON user_coupons;
CREATE POLICY "select_own_coupons"
  ON user_coupons FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_coupons" ON user_coupons;
CREATE POLICY "insert_own_coupons"
  ON user_coupons FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_coupons" ON user_coupons;
CREATE POLICY "update_own_coupons"
  ON user_coupons FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- transactions
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'inr',
  plan_code text NOT NULL,
  coupon_code text,
  discount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tx" ON transactions;
CREATE POLICY "select_own_tx"
  ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tx" ON transactions;
CREATE POLICY "insert_own_tx"
  ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tx" ON transactions;
CREATE POLICY "update_own_tx"
  ON transactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- invoices
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  invoice_number text UNIQUE NOT NULL,
  stripe_invoice_id text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'inr',
  plan_code text NOT NULL,
  period_start timestamptz,
  period_end timestamptz,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices"
  ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_invoices" ON invoices;
CREATE POLICY "insert_own_invoices"
  ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- Indexes
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_subs_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subs_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- ──────────────────────────────────────────────────────────────
-- Seed: WELCOME50 coupon + plans (Stripe price IDs set later)
-- ──────────────────────────────────────────────────────────────
INSERT INTO coupons (code, description, discount_type, discount_value, max_uses, max_uses_per_user, valid_from, is_active, auto_apply, eligible_only_new_users)
VALUES ('WELCOME50', 'Welcome offer — 50% off first purchase', 'percentage', 50, NULL, 1, now(), true, true, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO subscription_plans (code, name, description, price_cents, currency, interval)
VALUES ('monthly', 'Monthly Premium', 'Daily Discovery Edition + all premium features, billed monthly', 19900, 'inr', 'month')
ON CONFLICT (code) DO NOTHING;

INSERT INTO subscription_plans (code, name, description, price_cents, currency, interval)
VALUES ('yearly', 'Yearly Premium', 'Daily Discovery Edition + all premium features, billed annually — best value', 199900, 'inr', 'year')
ON CONFLICT (code) DO NOTHING;