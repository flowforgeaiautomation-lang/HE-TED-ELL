import { useEffect, useState } from "react";
import { Bookmark, Heart, Share2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toggleBookmark, toggleLike, getMyInteractions } from "@/lib/interactions.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ArticleActions({ articleId, title }: { articleId: string; title: string }) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const like = useServerFn(toggleLike);
  const bm = useServerFn(toggleBookmark);
  const fetchInter = useServerFn(getMyInteractions);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const sIn = !!data.session;
      setSignedIn(sIn);
      if (sIn) {
        try {
          const r = await fetchInter({ data: { articleIds: [articleId] } });
          if (!mounted) return;
          setLiked(r.liked.includes(articleId));
          setBookmarked(r.bookmarked.includes(articleId));
        } catch {
          // ignore
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, [articleId, fetchInter]);

  async function needSignIn() {
    toast.message("Sign in to save and react", {
      action: { label: "Sign in", onClick: () => navigate({ to: "/auth" }) },
    });
  }

  async function onLike() {
    if (!signedIn) return needSignIn();
    const prev = liked;
    setLiked(!prev);
    try {
      const r = await like({ data: { articleId } });
      setLiked(r.liked);
    } catch {
      setLiked(prev);
      toast.error("Could not save your reaction.");
    }
  }
  async function onBookmark() {
    if (!signedIn) return needSignIn();
    const prev = bookmarked;
    setBookmarked(!prev);
    try {
      const r = await bm({ data: { articleId } });
      setBookmarked(r.bookmarked);
    } catch {
      setBookmarked(prev);
      toast.error("Could not save bookmark.");
    }
  }
  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch { /* user cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onLike}
        aria-label="like"
        className={`group flex items-center gap-1.5 px-3 py-1.5 border rule text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition ${liked ? "bg-foreground text-background" : ""}`}
      >
        <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
        <span>Like</span>
      </button>
      <button
        onClick={onBookmark}
        aria-label="bookmark"
        className={`group flex items-center gap-1.5 px-3 py-1.5 border rule text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition ${bookmarked ? "bg-foreground text-background" : ""}`}
      >
        <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-current" : ""}`} />
        <span>Save</span>
      </button>
      <button
        onClick={onShare}
        aria-label="share"
        className="group flex items-center gap-1.5 px-3 py-1.5 border rule text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition"
      >
        <Share2 className="h-3.5 w-3.5" />
        <span>Share</span>
      </button>
    </div>
  );
}
