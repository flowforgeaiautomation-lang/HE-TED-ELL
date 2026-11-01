import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — The United Hell" },
      { name: "description", content: "Sign in to save stories, follow interests, and discuss." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [oauthProcessing, setOauthProcessing] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const redirectTarget = search.redirect || "/";

  useEffect(() => {
    const url = new URL(window.location.href);
    const hasCode = url.searchParams.has("code");
    const hasError = url.searchParams.get("error");
    const errorDesc = url.searchParams.get("error_description");

    if (hasError) {
      setOauthError(errorDesc || "Google sign-in failed. Please try again.");
      setOauthProcessing(false);
      url.searchParams.delete("error");
      url.searchParams.delete("error_description");
      window.history.replaceState({}, "", url.toString());
      return;
    }

    if (hasCode) {
      setOauthProcessing(true);
      const code = url.searchParams.get("code");
      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.toString());

      (async () => {
        try {
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              setOauthError(exchangeError.message || "Google sign-in failed. Please try again.");
              setOauthProcessing(false);
              return;
            }
          }
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            setOauthError(sessionError.message || "Could not retrieve session after sign-in.");
            setOauthProcessing(false);
            return;
          }
          if (session) {
            navigate({ to: redirectTarget as any, search: { category: undefined } });
          } else {
            // Session may arrive via onAuthStateChange — wait briefly then check again
            setTimeout(async () => {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                navigate({ to: redirectTarget as any, search: { category: undefined } });
              } else {
                setOauthProcessing(false);
                setOauthError("Sign-in took too long. Please try again.");
              }
            }, 2000);
          }
        } catch {
          setOauthProcessing(false);
          setOauthError("Could not complete sign-in. Please try again.");
        }
      })();
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: redirectTarget as any, search: { category: undefined } });
      }
    });
  }, [navigate, redirectTarget]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset email sent.");
        setMode("sign-in");
        return;
      }
      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created. If verification is required, check your email before signing in.");
        setMode("sign-in");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
        navigate({ to: redirectTarget as any, search: { category: undefined } });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-read py-16">
      <div className="text-center border-b rule pb-8 mb-10">
        <div className="kicker">{oauthProcessing ? "Connecting" : oauthError ? "Sign-in error" : mode === "forgot" ? "Reset access" : mode === "sign-in" ? "Welcome back" : "Begin reading"}</div>
        <h1 className="display-1 mt-3">
          {oauthProcessing ? "Connecting your account…" : oauthError ? "Try again." : mode === "forgot" ? "Reset password." : mode === "sign-in" ? "Sign in." : "Create an account."}
        </h1>
        <p className="dek mt-3 max-w-md mx-auto">
          {oauthProcessing ? "Completing your Google sign-in. You'll be redirected automatically." : mode === "forgot" ? "Enter your email and choose a new password from the secure link." : "Save stories, follow your interests, and join the discussion."}
        </p>
      </div>

      {oauthProcessing && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="h-10 w-10 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Completing sign-in…</p>
        </div>
      )}

      {oauthError && !oauthProcessing && (
        <div className="mb-6 p-4 border border-red-500/30 bg-red-500/5 rounded-sm text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{oauthError}</p>
          <button onClick={() => setOauthError(null)} className="mt-2 text-xs underline text-muted-foreground hover:text-foreground">Dismiss</button>
        </div>
      )}

      {!oauthProcessing && (
        <>
      <GoogleSignInButton redirectTo={redirectTarget} className="mb-6" />

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 border-t rule" />
        <span className="kicker text-[0.65rem]">Or with email</span>
        <div className="flex-1 border-t rule" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "sign-up" && (
          <Field label="Name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-b-2 border-foreground/30 focus:border-foreground py-2 outline-none font-serif text-lg"
            />
          </Field>
        )}
        <Field label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border-b-2 border-foreground/30 focus:border-foreground py-2 outline-none font-serif text-lg"
          />
        </Field>
        {mode !== "forgot" && (
          <Field label="Password">
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-b-2 border-foreground/30 focus:border-foreground py-2 pr-10 outline-none font-serif text-lg"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:opacity-70"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full border border-foreground py-3 text-sm uppercase tracking-widest hover:bg-foreground hover:text-background transition disabled:opacity-40"
        >
          {busy ? "…" : mode === "forgot" ? "Send reset link" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="text-center mt-6 text-sm">
        {mode === "sign-in" ? (
          <div className="grid gap-3">
            <button onClick={() => setMode("forgot")} className="kicker hover:opacity-60">
              Forgot password?
            </button>
            <button onClick={() => setMode("sign-up")} className="kicker hover:opacity-60">
              New here? Create an account →
            </button>
          </div>
        ) : mode === "forgot" ? (
          <button onClick={() => setMode("sign-in")} className="kicker hover:opacity-60">
            Back to sign in →
          </button>
        ) : (
          <button onClick={() => setMode("sign-in")} className="kicker hover:opacity-60">
            Already a reader? Sign in →
          </button>
        )}
      </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="kicker">{label}</span>
      {children}
    </label>
  );
}
