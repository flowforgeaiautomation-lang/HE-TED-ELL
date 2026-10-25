/*
# Add Knowledge Check quiz and Saved Vocabulary tables

1. New Tables
- `article_quizzes` — auto-generated quiz questions for each article (multiple choice, true/false, reflection)
- `saved_words` — user's personal vocabulary library (words saved from articles)

2. article_quizzes columns
- id (uuid, pk)
- article_id (uuid, fk to articles, cascade delete)
- question_type (text: 'multiple_choice' | 'true_false' | 'reflection')
- question (text, the question text)
- options (text[]: for multiple choice; null for true_false/reflection)
- correct_answer (text: index into options for MC, 'true'/'false' for TF, null for reflection)
- explanation (text: why the answer is correct)
- created_at (timestamptz)

3. saved_words columns
- id (uuid, pk)
- user_id (uuid, fk to auth.users, cascade delete)
- word (text)
- meaning (text)
- pronunciation (text)
- part_of_speech (text)
- example (text)
- synonyms (text[])
- antonyms (text[])
- article_id (uuid, fk to articles, nullable)
- difficulty (text: 'beginner' | 'intermediate' | 'advanced')
- created_at (timestamptz)

4. Security
- article_quizzes: public read (anon + authenticated), no write from client (server-side only)
- saved_words: owner-scoped CRUD (authenticated only, auth.uid() = user_id)

5. Indexes
- article_quizzes: article_id
- saved_words: user_id, (user_id, word) unique
*/

CREATE TABLE IF NOT EXISTS article_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  question text NOT NULL,
  options text[],
  correct_answer text,
  explanation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE article_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_quizzes" ON article_quizzes;
CREATE POLICY "anon_read_quizzes" ON article_quizzes FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_article_quizzes_article_id ON article_quizzes(article_id);

CREATE TABLE IF NOT EXISTS saved_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  word text NOT NULL,
  meaning text,
  pronunciation text,
  part_of_speech text,
  example text,
  synonyms text[],
  antonyms text[],
  article_id uuid REFERENCES articles(id) ON DELETE SET NULL,
  difficulty text DEFAULT 'intermediate',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word)
);

ALTER TABLE saved_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_saved_words" ON saved_words;
CREATE POLICY "select_own_saved_words" ON saved_words FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_saved_words" ON saved_words;
CREATE POLICY "insert_own_saved_words" ON saved_words FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_saved_words" ON saved_words;
CREATE POLICY "delete_own_saved_words" ON saved_words FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_words_user_id ON saved_words(user_id);
