
-- Helpers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  interests TEXT[] DEFAULT '{}',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ARTICLES
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  dek TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  cover_image_url TEXT,
  cover_image_prompt TEXT,
  read_time_minutes INT NOT NULL DEFAULT 4,
  trust_score INT NOT NULL DEFAULT 85,
  source_count INT NOT NULL DEFAULT 0,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  story JSONB NOT NULL DEFAULT '{}'::jsonb,
  body TEXT,
  country_code TEXT,
  featured_slot TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  bookmark_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX articles_category_idx ON public.articles(category, published_at DESC);
CREATE INDEX articles_published_idx ON public.articles(published_at DESC);
CREATE INDEX articles_featured_idx ON public.articles(featured_slot) WHERE featured_slot IS NOT NULL;
CREATE INDEX articles_country_idx ON public.articles(country_code);
CREATE INDEX articles_trending_idx ON public.articles((view_count + like_count*3 + bookmark_count*5) DESC);
GRANT SELECT ON public.articles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles_select_published" ON public.articles FOR SELECT USING (is_published = true);
CREATE POLICY "articles_insert_auth" ON public.articles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "articles_update_own" ON public.articles FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE TRIGGER articles_touch BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Append-only: no article may be deleted
CREATE OR REPLACE FUNCTION public.prevent_article_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Articles are append-only and cannot be deleted'; END;
$$;
CREATE TRIGGER prevent_article_delete_trigger BEFORE DELETE ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.prevent_article_delete();

-- Reject duplicate title, source url, or cover image
CREATE OR REPLACE FUNCTION public.prevent_duplicate_article_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE source_url text;
BEGIN
  source_url := lower(nullif(NEW.sources->0->>'url', ''));
  IF EXISTS (
    SELECT 1 FROM public.articles a
    WHERE lower(regexp_replace(a.title, '\s+', ' ', 'g')) = lower(regexp_replace(NEW.title, '\s+', ' ', 'g'))
       OR (source_url IS NOT NULL AND lower(a.sources->0->>'url') = source_url)
       OR (NEW.cover_image_url IS NOT NULL AND a.cover_image_url = NEW.cover_image_url)
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Duplicate article, source URL, or image rejected';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER prevent_duplicate_article_insert_trigger BEFORE INSERT ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_article_insert();

-- BRIEFINGS
CREATE TABLE public.briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_date DATE NOT NULL UNIQUE,
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  intro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.briefings TO anon;
GRANT SELECT ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefings_select_all" ON public.briefings FOR SELECT USING (true);

-- COLLECTIONS
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections_select_visible" ON public.collections FOR SELECT USING (is_public OR auth.uid() = user_id);
CREATE POLICY "collections_own_write" ON public.collections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BOOKMARKS
CREATE TABLE public.bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks_own" ON public.bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- LIKES
CREATE TABLE public.article_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);
GRANT SELECT, INSERT, DELETE ON public.article_likes TO authenticated;
GRANT ALL ON public.article_likes TO service_role;
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_select_all" ON public.article_likes FOR SELECT USING (true);
CREATE POLICY "likes_own_write" ON public.article_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_own_delete" ON public.article_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- COMMENTS
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  prompt_type TEXT,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  like_count INT NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_article_idx ON public.comments(article_id, created_at DESC);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select_visible" ON public.comments FOR SELECT USING (is_hidden = false);
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- COMMENT LIKES
CREATE TABLE public.comment_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);
GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comment_likes_select_all" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "comment_likes_own" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comment_likes_own_del" ON public.comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- READING HISTORY
CREATE TABLE public.reading_history (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_history TO authenticated;
GRANT ALL ON public.reading_history TO service_role;
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history_own" ON public.reading_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- COUNTERS
CREATE OR REPLACE FUNCTION public.bump_article_likes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.articles SET like_count = like_count + 1 WHERE id = NEW.article_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.articles SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.article_id;
  END IF; RETURN NULL; END; $$;
CREATE TRIGGER trg_article_likes AFTER INSERT OR DELETE ON public.article_likes FOR EACH ROW EXECUTE FUNCTION public.bump_article_likes();

CREATE OR REPLACE FUNCTION public.bump_article_bookmarks()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.articles SET bookmark_count = bookmark_count + 1 WHERE id = NEW.article_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.articles SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = OLD.article_id;
  END IF; RETURN NULL; END; $$;
CREATE TRIGGER trg_article_bookmarks AFTER INSERT OR DELETE ON public.bookmarks FOR EACH ROW EXECUTE FUNCTION public.bump_article_bookmarks();

CREATE OR REPLACE FUNCTION public.bump_article_comments()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.articles SET comment_count = comment_count + 1 WHERE id = NEW.article_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.articles SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.article_id;
  END IF; RETURN NULL; END; $$;
CREATE TRIGGER trg_article_comments AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.bump_article_comments();

CREATE OR REPLACE FUNCTION public.bump_comment_likes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
  END IF; RETURN NULL; END; $$;
CREATE TRIGGER trg_comment_likes AFTER INSERT OR DELETE ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.bump_comment_likes();

-- Cron extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
