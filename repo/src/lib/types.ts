// Client-safe types shared by server functions and components.
export type ArticleSource = { name: string; url: string };

export type VocabEntry = {
  word?: string;
  partOfSpeech?: string;
  meaning?: string;
  simpleExplanation?: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
  pronunciation?: string;
};

export type ArticleStory = {
  summary?: string;
  main_story?: string;
  background?: string;
  key_developments?: string[];
  quick_insights?: string[];
  expert_analysis?: string;
  timeline?: string[];
  what_happens_next?: string;
  vocabulary?: VocabEntry[];
  sources?: string[];
  // Legacy fields for backward compatibility
  qa?: { question?: string; answer?: string }[];
  what?: string;
  who?: string;
  where?: string;
  when?: string;
  why?: string;
  how?: string;
  before?: string;
  next?: string;
  key_facts?: string[];
  insights?: string[];
  future_impact?: string;
  why_should_i_care?: string;
  how_affects_world?: string;
  what_can_we_learn?: string;
  why_interesting?: string;
  key_takeaways?: string[];
  quick_facts?: string[];
  did_you_know?: string;
  people_mentioned?: string[];
  organizations_mentioned?: string[];
  countries_mentioned?: string[];
};

export type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  category: string;
  subcategory: string | null;
  cover_image_url: string | null;
  read_time_minutes: number;
  source_count: number;
  country_code: string | null;
  featured_slot: string | null;
  published_at: string;
  view_count: number;
  like_count: number;
  bookmark_count: number;
  comment_count: number;
};

export type Article = ArticleSummary & {
  sources: ArticleSource[];
  story: ArticleStory;
  body: string | null;
};

export type BriefingSections = {
  top_stories?: { slug: string; title: string; category?: string }[];
  discoveries?: { slug: string; title: string }[];
  science?: { slug: string; title: string }[];
  success?: { slug: string; title: string }[];
  tech?: { slug: string; title: string }[];
  facts?: string[];
};

export type Briefing = {
  id: string;
  briefing_date: string;
  intro: string | null;
  sections: BriefingSections;
};

export type CommentRow = {
  id: string;
  article_id: string;
  user_id: string;
  parent_id: string | null;
  prompt_type: string | null;
  body: string;
  like_count: number;
  created_at: string;
  author?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
};
