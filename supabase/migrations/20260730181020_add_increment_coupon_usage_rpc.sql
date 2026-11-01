/*
# Add increment_coupon_usage RPC function

Creates an RPC function to atomically increment the used_count column
on the coupons table when a coupon is redeemed.

## Security
- SECURITY DEFINER so it can run from the webhook edge function context.
- Only increments, never reads sensitive data.
*/

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE coupons SET used_count = used_count + 1, updated_at = now() WHERE code = p_code;
END;
$$;