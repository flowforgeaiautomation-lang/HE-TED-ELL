import { useState, useEffect, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
      });
    } catch {
      setState({ session: null, user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    refresh();
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, user: session?.user ?? null, loading: false });
    });
    return () => { authSub.subscription.unsubscribe(); };
  }, [refresh]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ session: null, user: null, loading: false });
  }, []);

  return {
    session: state.session,
    user: state.user,
    loading: state.loading,
    isAuthenticated: !!state.session,
    signOut,
    refresh,
  };
}
