import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { saveWord, unsaveWord, checkSavedWord } from "@/lib/quiz.functions";
import { supabase } from "@/integrations/supabase/client";
import { Bookmark, Volume2, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import type { VocabEntry } from "@/lib/types";

export function EnhancedVocabCard({ entry, articleId, index }: { entry: VocabEntry; articleId: string; index: number }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const saveFn = useServerFn(saveWord);
  const unsaveFn = useServerFn(unsaveWord);
  const checkFn = useServerFn(checkSavedWord);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const { data: savedState } = useQuery({
    queryKey: ["saved-word", entry.word],
    queryFn: () => checkFn({ data: { word: entry.word! } }),
    enabled: !!signedIn && !!entry.word,
  });

  const saveMutation = useMutation({
    mutationFn: async (save: boolean) =>
      save ? saveFn({ data: { word: entry.word!, meaning: entry.meaning, pronunciation: entry.pronunciation, partOfSpeech: entry.partOfSpeech, example: entry.example, synonyms: entry.synonyms, antonyms: entry.antonyms, simpleExplanation: entry.simpleExplanation, contextInArticle: entry.contextInArticle, wordOrigin: entry.wordOrigin, articleId } }) : unsaveFn({ data: { word: entry.word! } }),
    onSuccess: (_, save) => {
      toast.success(save ? "Saved to your vocabulary library" : "Removed from library");
      qc.invalidateQueries({ queryKey: ["saved-word", entry.word] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function speak() {
    if (!entry.word) return;
    const utterance = new SpeechSynthesisUtterance(entry.word);
    utterance.rate = 0.85;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="border-l-2 border-foreground/20 pl-5 transition-colors hover:border-foreground/40">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-serif text-2xl">{entry.word}</h3>
        {entry.pronunciation && (
          <span className="text-sm text-muted-foreground italic">{entry.pronunciation}</span>
        )}
        {entry.partOfSpeech && (
          <span className="text-xs uppercase tracking-widest text-muted-foreground border rule px-2 py-0.5">
            {entry.partOfSpeech}
          </span>
        )}
        <button onClick={speak} className="text-muted-foreground hover:text-foreground transition" aria-label="Pronounce word">
          <Volume2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            if (!signedIn) {
              const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
              navigate({ to: "/auth", search: { redirect: here } });
              return;
            }
            saveMutation.mutate(!savedState?.saved);
          }}
          className="text-muted-foreground hover:text-foreground transition"
          aria-label={savedState?.saved ? "Remove from library" : "Save to library"}
        >
          {savedState?.saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
      </div>
      {entry.meaning ? (
        <p className="mt-2 text-base text-foreground/90 leading-relaxed">
          <span className="font-semibold">Meaning:</span> {entry.meaning}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground italic leading-relaxed">
          Tap the speaker icon to hear this word. Look it up using the search below.
        </p>
      )}
      {entry.simpleExplanation && (
        <p className="mt-1 text-sm text-foreground/70 leading-relaxed">
          <span className="font-semibold text-foreground/80">Easy meaning:</span> {entry.simpleExplanation}
        </p>
      )}
      {entry.contextInArticle && (
        <p className="mt-2 text-sm text-foreground/80 leading-relaxed border-l-2 border-foreground/15 pl-3">
          <span className="font-semibold text-foreground/80">In this article:</span> {entry.contextInArticle}
        </p>
      )}
      {entry.example && (
        <p className="mt-2 text-sm text-muted-foreground italic leading-relaxed border-l-2 border-foreground/10 pl-3">
          <span className="font-semibold not-italic text-foreground/80">Example:</span> {entry.example}
        </p>
      )}
      {(entry.synonyms?.length || entry.antonyms?.length || entry.wordOrigin) && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {entry.synonyms?.length ? (
            <div>
              <span className="font-semibold text-foreground/80">Synonyms:</span>{" "}
              <span className="text-muted-foreground">{entry.synonyms.join(", ")}</span>
            </div>
          ) : null}
          {entry.antonyms?.length ? (
            <div>
              <span className="font-semibold text-foreground/80">Antonyms:</span>{" "}
              <span className="text-muted-foreground">{entry.antonyms.join(", ")}</span>
            </div>
          ) : null}
          {entry.wordOrigin && (
            <div className="basis-full">
              <span className="font-semibold text-foreground/80">Origin:</span>{" "}
              <span className="text-muted-foreground italic">{entry.wordOrigin}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
