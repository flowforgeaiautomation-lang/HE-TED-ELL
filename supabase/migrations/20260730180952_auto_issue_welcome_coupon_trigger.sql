/*
# Auto-issue WELCOME50 coupon to new users

## Overview
Creates a database trigger that automatically issues a WELCOME50 coupon
to the user_coupons table whenever a new user registers (row inserted into auth.users).

## Changes
1. Creates function `issue_welcome_coupon()` that inserts a row into user_coupons
   for the new user with the WELCOME50 coupon.
2. Creates trigger `on_auth_user_created_issue_welcome` that fires AFTER INSERT on auth.users.

## Security
- The trigger function runs with SECURITY DEFINER (elevated privileges) to bypass RLS,
  since the insert happens during auth.users creation, not via an authenticated session.
- The function is owned by postgres and only callable by the trigger.
*/

CREATE OR REPLACE FUNCTION public.issue_welcome_coupon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon_id uuid;
BEGIN
  SELECT id INTO v_coupon_id FROM coupons WHERE code = 'WELCOME50' AND is_active = true LIMIT 1;
  IF v_coupon_id IS NOT NULL THEN
    INSERT INTO user_coupons (user_id, coupon_id, code, status)
    VALUES (NEW.id, v_coupon_id, 'WELCOME50', 'available')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_issue_welcome ON auth.users;
CREATE TRIGGER on_auth_user_created_issue_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.issue_welcome_coupon();