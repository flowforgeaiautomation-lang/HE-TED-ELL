import { useState, useMemo } from "react";
import { CheckCircle2, XCircle, Lightbulb, RotateCcw, Trophy } from "lucide-react";

type QuizQuestion = {
  id: string;
  question_type: "multiple_choice" | "true_false" | "reflection";
  question: string;
  options: string[] | null;
  correct_answer: string | null;
  explanation: string | null;
};

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateQuiz(story: any, title: string, seedKey: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const summary = (story?.summary || "").trim();
  const mainStory = (story?.main_story || "").trim();
  const keyDevs = (story?.key_developments || []) as string[];
  const keyFacts = (story?.key_facts || []) as string[];
  const whyItMatters = (story?.why_it_matters || "").trim();
  const fullText = `${summary} ${mainStory} ${whyItMatters}`.trim();

  const reflectionQ: QuizQuestion = {
    id: "q-4",
    question_type: "reflection",
    question: `Reflect on this article. What perspective or insight did you gain about ${title}?`,
    options: null,
    correct_answer: null,
    explanation: null,
  };

  if (fullText.length < 50) return [reflectionQ];

  const sentences = fullText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(" ").length >= 8);

  if (sentences.length < 3) return [reflectionQ];

  // Extract factual sentences with numbers, names, or specific claims
  const factualSentences = sentences.filter((s) =>
    /\b\d|(?=[A-Z][a-z]+ [A-Z])|[A-Z][a-z]+ (said|stated|announced|reported|confirmed|denied|launched|approved|rejected|signed|agreed|warned)|according to|because|due to|caused by|resulted in|led to/i.test(s)
  );
  const quizSentences = factualSentences.length >= 2 ? factualSentences : sentences;

  // Q1: True/False from a factual sentence — tests real understanding
  let h1 = 0;
  for (let i = 0; i < seedKey.length; i++) h1 = (h1 * 31 + seedKey.charCodeAt(i)) >>> 0;
  const sentenceIdx = h1 % quizSentences.length;
  const correctSentence = quizSentences[sentenceIdx];
  questions.push({
    id: "q-1",
    question_type: "true_false",
    question: `True or False: "${correctSentence}"`,
    options: null,
    correct_answer: "true",
    explanation: "This statement appears directly in the article.",
  });

  // Q2: Multiple choice — which key fact is from this article?
  const allFacts = [...keyFacts, ...keyDevs].filter((f) => f && f.split(" ").length >= 4);
  if (allFacts.length >= 2) {
    let h2 = 0;
    for (let i = 0; i < (seedKey + "-q2").length; i++) h2 = (h2 * 31 + (seedKey + "-q2").charCodeAt(i)) >>> 0;
    const correctIdx = h2 % allFacts.length;
    const correctFact = allFacts[correctIdx];
    const wrongFacts = allFacts.filter((_, i) => i !== correctIdx).slice(0, 3);
    // Build plausible but wrong distractors from other facts if available
    while (wrongFacts.length < 3) {
      wrongFacts.push("None of the above is mentioned in this article");
    }
    questions.push({
      id: "q-2",
      question_type: "multiple_choice",
      question: "Which of the following is stated in this article?",
      options: seededShuffle([correctFact, ...wrongFacts], seedKey + "-q2"),
      correct_answer: correctFact,
      explanation: "This fact is directly supported by the article.",
    });
  }

  // Q3: Multiple choice — why does this matter?
  if (whyItMatters && whyItMatters.split(" ").length >= 10) {
    const whySentence = whyItMatters.split(/(?<=[.!?])\s+/).filter((s) => s.split(" ").length >= 8)[0];
    if (whySentence) {
      questions.push({
        id: "q-3",
        question_type: "multiple_choice",
        question: "According to the article, why does this matter?",
        options: seededShuffle(
          [
            whySentence.slice(0, 120) + (whySentence.length > 120 ? "…" : ""),
            "It has no significant impact",
            "It only affects a small local community",
            "It is unclear why this matters",
          ],
          seedKey + "-q3"
        ),
        correct_answer: whySentence.slice(0, 120) + (whySentence.length > 120 ? "…" : ""),
        explanation: "The article explains the significance of this event.",
      });
    }
  }

  // Q4: Reflection
  questions.push({
    id: "q-4",
    question_type: "reflection",
    question: `Reflect on this article. What perspective or insight did you gain about ${title}?`,
    options: null,
    correct_answer: null,
    explanation: null,
  });

  return questions;
}

export function KnowledgeCheck({ articleId, story, title, onReflection }: { articleId: string; story?: any; title?: string; onReflection?: (reflectionText: string) => void }) {
  const questions = useMemo(() => {
    if (!story) return [];
    return generateQuiz(story, title || "", articleId);
  }, [story, title, articleId]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const reflectionQuestion = questions.find((q) => q.question_type === "reflection");

  // If no story at all, nothing to show.
  if (!story) return null;

  const gradedQuestions = questions.filter((q) => q.question_type !== "reflection");
  const score = gradedQuestions.filter((q) => answers[q.id] === q.correct_answer).length;
  const gradedCount = gradedQuestions.length;

  function reset() {
    setAnswers({});
    setSubmitted(false);
  }

  function handleSubmit() {
    setSubmitted(true);
    const reflectionText = reflectionQuestion ? answers[reflectionQuestion.id]?.trim() : "";
    if (onReflection && reflectionText) onReflection(reflectionText);
  }

  const canSubmit = gradedQuestions.length > 0
    ? Object.keys(answers).length >= gradedCount || !!answers[reflectionQuestion?.id ?? ""]?.trim()
    : !!answers[reflectionQuestion?.id ?? ""]?.trim();

  return (
    <div className="border-t rule pt-8 mt-4">
      <div className="kicker mb-6 flex items-center gap-2">
        <Trophy className="h-4 w-4" /> Knowledge Check
      </div>

      {submitted && gradedCount > 0 && (
        <div className="mb-8 rounded-lg border rule bg-foreground/[0.02] p-6 text-center">
          <div className="font-serif text-4xl mb-2">{score} / {gradedCount}</div>
          <p className="text-sm text-muted-foreground">
            {score === gradedCount ? "Perfect score — you mastered this story." : score >= gradedCount * 0.7 ? "Well done — you understood the key points." : "Review the article and try again."}
          </p>
          <button onClick={reset} className="mt-4 inline-flex items-center gap-2 border border-foreground px-4 py-2 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition">
            <RotateCcw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      )}

      <div className="grid gap-8">
        {questions.map((q, i) => (
          <div key={q.id} className="border rule p-6 rounded-lg">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-muted-foreground tabular-nums text-sm">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="font-serif text-xl leading-snug">{q.question}</h3>
            </div>

            {q.question_type === "reflection" ? (
              <div>
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  rows={3}
                  placeholder="Share your reflection…"
                  className="w-full bg-transparent border rule p-4 font-serif text-base focus:outline-none focus:ring-1 focus:ring-foreground/40"
                />
              </div>
            ) : q.question_type === "true_false" ? (
              <div className="flex gap-3">
                {["true", "false"].map((opt) => {
                  const selected = answers[q.id] === opt;
                  const isCorrect = submitted && opt === q.correct_answer;
                  const isWrong = submitted && selected && opt !== q.correct_answer;
                  return (
                    <button
                      key={opt}
                      onClick={() => !submitted && setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      className={`flex-1 border rule px-4 py-3 font-serif text-lg capitalize transition ${
                        isCorrect ? "bg-foreground text-background border-foreground" :
                        isWrong ? "bg-destructive/10 border-destructive" :
                        selected ? "bg-foreground/[0.05] border-foreground/40" : "hover:bg-foreground/[0.02]"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-2">
                {q.options?.map((opt, j) => {
                  const selected = answers[q.id] === opt;
                  const isCorrect = submitted && opt === q.correct_answer;
                  const isWrong = submitted && selected && opt !== q.correct_answer;
                  return (
                    <button
                      key={j}
                      onClick={() => !submitted && setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      className={`flex items-center gap-3 border rule px-4 py-3 text-left transition ${
                        isCorrect ? "bg-foreground text-background border-foreground" :
                        isWrong ? "bg-destructive/10 border-destructive" :
                        selected ? "bg-foreground/[0.05] border-foreground/40" : "hover:bg-foreground/[0.02]"
                      }`}
                    >
                      <span className="font-serif text-sm text-muted-foreground w-6">{String.fromCharCode(65 + j)}</span>
                      <span className="font-serif text-base">{opt}</span>
                      {isCorrect && <CheckCircle2 className="h-4 w-4 ml-auto" />}
                      {isWrong && <XCircle className="h-4 w-4 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            )}

            {submitted && q.explanation && q.question_type !== "reflection" && (
              <div className="mt-4 flex items-start gap-2 rounded-md bg-foreground/[0.03] p-4">
                <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <p className="text-sm text-foreground/80 leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {!submitted && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="border border-foreground px-6 py-2.5 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition disabled:opacity-40"
          >
            {answers[reflectionQuestion?.id ?? ""]?.trim() ? "Post comment" : "Check answers"}
          </button>
        </div>
      )}
    </div>
  );
}
