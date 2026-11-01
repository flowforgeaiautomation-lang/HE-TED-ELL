import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listMyBookmarks } from "@/lib/interactions.functions";
import { listSavedWords, unsaveWord } from "@/lib/quiz.functions";
import { ArticleCard } from "@/components/article-card";
import { Volume2, Bookmark, BookmarkCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({ meta: [{ title: "My Library — The United Hell" }] }),
  component: BookmarksPage,
});

type SavedWord = {
  word: string;
  meaning: string | null;
  pronunciation: string | null;
  part_of_speech: string | null;
  example: string | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  difficulty: string | null;
  simple_explanation: string | null;
  context_in_article: string | null;
  word_origin: string | null;
  created_at: string;
};

function BookmarksPage() {
  const fn = useServerFn(listMyBookmarks);
  const wordsFn = useServerFn(listSavedWords);
  const unsaveFn = useServerFn(unsaveWord);
  const qc = useQueryClient();
  const [tab, setTab] = useState<"articles" | "words">("articles");

  const bookmarksQ = useQuery({ queryKey: ["my-bookmarks"], queryFn: () => fn() });
  const wordsQ = useQuery<SavedWord[]>({ queryKey: ["my-saved-words"], queryFn: () => wordsFn() as Promise<SavedWord[]> });

  async function removeWord(word: string) {
    try {
      await unsaveFn({ data: { word } });
      toast.success("Removed from your vocabulary library");
      qc.invalidateQueries({ queryKey: ["my-saved-words"] });
      qc.invalidateQueries({ queryKey: ["saved-word", word] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function speak(word: string) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.85;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  const wordCount = wordsQ.data?.length ?? 0;
  const articleCount = bookmarksQ.data?.length ?? 0;

  return (
    <div className="container-edit py-10 md:py-14">
      <header className="border-b rule pb-6 mb-10">
        <div className="kicker">Your collection</div>
        <h1 className="display-1 mt-3">My Library.</h1>
        <p className="dek mt-3">Everything you've saved, in one place.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b rule mb-10">
        <button
          onClick={() => setTab("articles")}
          className={`px-6 py-3 text-sm uppercase tracking-widest font-medium border-b-2 transition -mb-px ${
            tab === "articles" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Saved Articles ({articleCount})
        </button>
        <button
          onClick={() => setTab("words")}
          className={`px-6 py-3 text-sm uppercase tracking-widest font-medium border-b-2 transition -mb-px ${
            tab === "words" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Vocabulary Library ({wordCount})
        </button>
      </div>

      {/* Articles tab */}
      {tab === "articles" && (
        <>
          {bookmarksQ.isLoading && <p className="dek">Loading…</p>}
          {bookmarksQ.data && bookmarksQ.data.length === 0 && (
            <p className="dek">Nothing saved yet. Open any story and tap Save.</p>
          )}
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
            {bookmarksQ.data?.map((a) => (
              <ArticleCard key={a.id} article={a} variant="default" />
            ))}
          </div>
        </>
      )}

      {/* Words tab */}
      {tab === "words" && (
        <>
          {wordsQ.isLoading && <p className="dek">Loading…</p>}
          {wordsQ.data && wordsQ.data.length === 0 && (
            <p className="dek">No words saved yet. Open any story and tap the bookmark icon next to a word to save it here.</p>
          )}
          <div className="grid gap-6 max-w-3xl">
            {wordsQ.data?.map((w, i) => (
              <div key={`${w.word}-${i}`} className="border-l-2 border-foreground/20 pl-5 transition-colors hover:border-foreground/40">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-serif text-2xl">{w.word}</h3>
                  {w.pronunciation && (
                    <span className="text-sm text-muted-foreground italic">{w.pronunciation}</span>
                  )}
                  {w.part_of_speech && (
                    <span className="text-xs uppercase tracking-widest text-muted-foreground border rule px-2 py-0.5">
                      {w.part_of_speech}
                    </span>
                  )}
                  <button onClick={() => speak(w.word)} className="text-muted-foreground hover:text-foreground transition" aria-label="Pronounce word">
                    <Volume2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeWord(w.word)}
                    className="text-muted-foreground hover:text-destructive transition"
                    aria-label="Remove from library"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {w.meaning && (
                  <p className="mt-2 text-base text-foreground/90 leading-relaxed">
                    <span className="font-semibold">Meaning:</span> {w.meaning}
                  </p>
                )}
                {w.simple_explanation && (
                  <p className="mt-1.5 text-sm text-foreground/80 leading-relaxed">
                    <span className="font-semibold">Easy meaning:</span> {w.simple_explanation}
                  </p>
                )}
                {w.context_in_article && (
                  <p className="mt-1.5 text-sm text-muted-foreground italic leading-relaxed border-l-2 border-foreground/10 pl-3">
                    <span className="font-semibold not-italic text-foreground/80">In this article:</span> {w.context_in_article}
                  </p>
                )}
                {w.example && (
                  <p className="mt-1.5 text-sm text-muted-foreground italic leading-relaxed border-l-2 border-foreground/10 pl-3">
                    <span className="font-semibold not-italic text-foreground/80">Example:</span> {w.example}
                  </p>
                )}
                {w.word_origin && (
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground/80">Origin:</span> {w.word_origin}
                  </p>
                )}
                {(w.synonyms?.length || w.antonyms?.length) && (
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {w.synonyms?.length ? (
                      <div>
                        <span className="font-semibold text-foreground/80">Synonyms:</span>{" "}
                        <span className="text-muted-foreground">{w.synonyms.join(", ")}</span>
                      </div>
                    ) : null}
                    {w.antonyms?.length ? (
                      <div>
                        <span className="font-semibold text-foreground/80">Antonyms:</span>{" "}
                        <span className="text-muted-foreground">{w.antonyms.join(", ")}</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
