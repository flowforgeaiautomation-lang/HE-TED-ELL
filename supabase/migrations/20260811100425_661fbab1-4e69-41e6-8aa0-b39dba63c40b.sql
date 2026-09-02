CREATE TABLE IF NOT EXISTS public.article_regen_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS article_regen_queue_due_idx
  ON public.article_regen_queue (status, next_attempt_at);

GRANT ALL ON public.article_regen_queue TO service_role;

ALTER TABLE public.article_regen_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "regen_queue_service_only" ON public.article_regen_queue;
CREATE POLICY "regen_queue_service_only" ON public.article_regen_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS article_regen_queue_touch ON public.article_regen_queue;
CREATE TRIGGER article_regen_queue_touch
  BEFORE UPDATE ON public.article_regen_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();