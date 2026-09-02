import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile, saveInterests } from "@/lib/interactions.functions";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — The United Hell" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const getMe = useServerFn(getMyProfile);
  const update = useServerFn(updateMyProfile);
  const saveI = useServerFn(saveInterests);
  const q = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const [display, setDisplay] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (q.data) {
      setDisplay(q.data.display_name ?? "");
      setUsername(q.data.username ?? "");
      setBio(q.data.bio ?? "");
      setInterests(q.data.interests ?? []);
    }
  }, [q.data]);

  function toggle(slug: string) {
    setInterests((xs) => (xs.includes(slug) ? xs.filter((x) => x !== slug) : [...xs, slug]));
  }

  async function onSave() {
    try {
      await update({ data: { display_name: display, username: username || undefined, bio } });
      await saveI({ data: { interests } });
      toast.success("Saved");
      q.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="container-read py-10 md:py-16">
      <header className="text-center border-b rule pb-8 mb-10">
        <div className="kicker">Your account</div>
        <h1 className="display-1 mt-3">Profile.</h1>
      </header>

      <section className="space-y-6">
        <Field label="Display name">
          <input value={display} onChange={(e) => setDisplay(e.target.value)} className="line-input" />
        </Field>
        <Field label="Username">
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="line-input" placeholder="@yourname" />
        </Field>
        <Field label="Bio">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="line-input" />
        </Field>

        <div>
          <div className="kicker mb-4">Your interests</div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.slug}
                onClick={() => toggle(c.slug)}
                className={`px-3 py-1.5 text-xs uppercase tracking-widest border rule transition ${interests.includes(c.slug) ? "bg-foreground text-background" : "hover:bg-foreground hover:text-background"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            We use your interests to personalise your Discover and Library pages.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-6 border-t rule">
          <button onClick={onSave} className="border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition">
            Save changes
          </button>
          <Link to="/bookmarks" className="border border-foreground/40 px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition">
            My Library
          </Link>
          <button onClick={onSignOut} className="ml-auto border border-foreground/40 px-4 py-2 text-xs uppercase tracking-widest hover:bg-destructive hover:text-destructive-foreground transition">
            Sign out
          </button>
        </div>
      </section>

      <style>{`.line-input{display:block;width:100%;background:transparent;border:0;border-bottom:2px solid var(--color-border);padding:.5rem 0;font-family:var(--font-serif);font-size:1.125rem;outline:none}.line-input:focus{border-color:var(--color-foreground)}`}</style>
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
