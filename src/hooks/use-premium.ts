import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getPremiumStatus, type PremiumStatus } from "@/lib/subscription.functions";

export function usePremium() {
  const [status, setStatus] = useState<PremiumStatus>({
    isPremium: false,
    planCode: null,
    status: null,
    currentPeriodEnd: null,
    daysRemaining: null,
  });
  const [loading, setLoading] = useState(true);
  const getPremium = useServerFn(getPremiumStatus);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setStatus({
        isPremium: false,
        planCode: null,
        status: null,
        currentPeriodEnd: null,
        daysRemaining: null,
      });
      setLoading(false);
      return;
    }
    try {
      const s = await getPremium();
      setStatus(s);
    } catch {
      setStatus({
        isPremium: false,
        planCode: null,
        status: null,
        currentPeriodEnd: null,
        daysRemaining: null,
      });
    }
    setLoading(false);
  }, [getPremium]);

  useEffect(() => {
    refresh();
    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      (async () => { await refresh(); })();
    });
    return () => { authSub.subscription.unsubscribe(); };
  }, [refresh]);

  return { ...status, loading, refresh };
}
