import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Link } from "@tanstack/react-router";

export function AuthPromptModal({
  open,
  onClose,
  redirectTo,
}: {
  open: boolean;
  onClose: () => void;
  redirectTo?: string;
}) {
  const [mode, setMode] = useState<"choices" | "signin" | "signup">("choices");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        toast.success("Signed in! E-paper unlocked.");
        onClose();
      }
    });
    return () => { authSub.subscription.unsubscribe(); };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  async function handleEmailAuth() {
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Account created! Welcome to The United Hell.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
      }
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-background border border-foreground/20 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition z-10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center pt-10 pb-6 border-b border-foreground/10 px-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-foreground text-background rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                <Lock className="h-3.5 w-3.5" />
                Create an account to continue
              </div>
              <h2 className="font-serif text-2xl font-bold mb-2">
                Read the Full E-Paper
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Page 1 is free. Create an account or log in to read every page of today's edition — completely free.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {mode === "choices" && (
                <>
                  <GoogleSignInButton redirectTo={redirectTo || "/epaper"} />
                  <div className="flex items-center gap-4">
                    <div className="flex-1 border-t border-foreground/10" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Or with email</span>
                    <div className="flex-1 border-t border-foreground/10" />
                  </div>
                  <button
                    onClick={() => setMode("signin")}
                    className="w-full border border-foreground/30 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-muted transition rounded-sm"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setMode("signup")}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    New here? Create a free account →
                  </button>
                </>
              )}

              {mode === "signin" && (
                <form onSubmit={(e) => { e.preventDefault(); handleEmailAuth(); }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm outline-none focus:border-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Password</label>
                    <input
                      required
                      type="password"
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm outline-none focus:border-foreground"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full bg-foreground text-background py-3 text-sm font-semibold uppercase tracking-wider hover:opacity-90 transition rounded-sm"
                  >
                    {busy ? "Signing in…" : "Sign In"}
                  </button>
                  <button type="button" onClick={() => setMode("choices")} className="w-full text-sm text-muted-foreground hover:text-foreground transition">
                    ← Back
                  </button>
                </form>
              )}

              {mode === "signup" && (
                <form onSubmit={(e) => { e.preventDefault(); handleEmailAuth(); }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Name</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm outline-none focus:border-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm outline-none focus:border-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Password</label>
                    <input
                      required
                      type="password"
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-foreground/20 rounded-sm px-3 py-2.5 text-sm outline-none focus:border-foreground"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full bg-foreground text-background py-3 text-sm font-semibold uppercase tracking-wider hover:opacity-90 transition rounded-sm"
                  >
                    {busy ? "Creating account…" : "Create Free Account"}
                  </button>
                  <button type="button" onClick={() => setMode("choices")} className="w-full text-sm text-muted-foreground hover:text-foreground transition">
                    ← Back
                  </button>
                </form>
              )}

              <div className="text-center pt-2">
                <Link to="/auth" search={{ redirect: redirectTo || "/epaper" }} onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition underline">
                  Go to full sign-in page
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
