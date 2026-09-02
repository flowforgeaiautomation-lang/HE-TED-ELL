import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

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
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

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
        navigate({ to: "/" });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (r.error) throw r.error instanceof Error ? r.error : new Error(String(r.error));
      if (!r.redirected) navigate({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-read py-16">
      <div className="text-center border-b rule pb-8 mb-10">
        <div className="kicker">{mode === "forgot" ? "Reset access" : mode === "sign-in" ? "Welcome back" : "Begin reading"}</div>
        <h1 className="display-1 mt-3">
          {mode === "forgot" ? "Reset password." : mode === "sign-in" ? "Sign in." : "Create an account."}
        </h1>
        <p className="dek mt-3 max-w-md mx-auto">
          {mode === "forgot" ? "Enter your email and choose a new password from the secure link." : "Save stories, follow your interests, and join the discussion."}
        </p>
      </div>

      <button
        onClick={onGoogle}
        disabled={busy}
        className="w-full border border-foreground py-3 mb-6 text-sm uppercase tracking-widest hover:bg-foreground hover:text-background transition disabled:opacity-40"
      >
        Continue with Google
      </button>

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
