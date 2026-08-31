import { useState, useRef, useCallback, useEffect } from "react";
import type { Article } from "../types";

interface UseInfiniteScrollOptions {
  fetcher: (limit: number, offset: number) => Promise<Article[]>;
  pageSize: number;
}

export function useInfiniteScroll({ fetcher, pageSize }: UseInfiniteScrollOptions) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return;
    isFetchingRef.current = true; setLoadingMore(true);
    const offset = offsetRef.current;
    try {
      const newArticles = await fetcher(pageSize, offset);
      if (newArticles.length < pageSize) setHasMore(false);
      if (newArticles.length > 0) {
        setArticles((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const unique = newArticles.filter((a) => !existingIds.has(a.id));
          // Preload all cover images immediately so they appear instantly
          for (const a of unique) {
            if (a.cover_image_url) {
              const img = new Image();
              img.decoding = "sync";
              img.src = a.cover_image_url;
            }
          }
          return [...prev, ...unique];
        });
        offsetRef.current = offset + newArticles.length;
      } else { setHasMore(false); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load articles");
      setHasMore(false);
    } finally { setLoadingMore(false); isFetchingRef.current = false; }
  }, [fetcher, pageSize, hasMore]);

  const reset = useCallback(async () => {
    setLoading(true); setError(null); setArticles([]); setHasMore(true);
    offsetRef.current = 0; isFetchingRef.current = true;
    try {
      const data = await fetcher(pageSize, 0);
      setArticles(data); offsetRef.current = data.length;
      if (data.length < pageSize) setHasMore(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load articles");
    } finally { setLoading(false); isFetchingRef.current = false; }
  }, [fetcher, pageSize]);

  useEffect(() => { reset(); }, [reset]);

  useEffect(() => {
    const sentinel = sentinelRef.current; if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && !loadingMore && hasMore) loadMore();
    }, { rootMargin: "2000px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, loading, loadingMore, hasMore]);

  return { articles, loading, loadingMore, hasMore, error, sentinelRef };
}
