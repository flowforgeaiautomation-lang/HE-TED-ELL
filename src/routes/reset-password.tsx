import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — The United Hell" },
      { name: "description", content: "Choose a new password for your account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You can sign in now.");
      navigate({ to: "/auth" });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-read py-16">
      <div className="text-center border-b rule pb-8 mb-10">
        <div className="kicker">Account access</div>
        <h1 className="display-1 mt-3">Reset password.</h1>
        <p className="dek mt-3 max-w-md mx-auto">Enter a new password for your account.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <PasswordField label="New password" value={password} onChange={setPassword} show={show} setShow={setShow} />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} show={show} setShow={setShow} />
        <button
          type="submit"
          disabled={busy || password.length < 8 || confirm.length < 8}
          className="w-full border border-foreground py-3 text-sm uppercase tracking-widest hover:bg-foreground hover:text-background transition disabled:opacity-40"
        >
          {busy ? "…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  setShow,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  setShow: (value: boolean) => void;
}) {
  return (
    <label className="block">
      <span className="kicker">{label}</span>
      <div className="relative">
        <input
          required
          type={show ? "text" : "password"}
          minLength={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent border-b-2 border-foreground/30 focus:border-foreground py-2 pr-10 outline-none font-serif text-lg"
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow(!show)}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:opacity-70"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}