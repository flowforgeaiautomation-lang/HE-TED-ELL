export interface VocabularyWord {
  word: string; meaning: string; part_of_speech: string;
  phonetic: string | null; synonyms: string[]; antonyms: string[]; example: string;
}
export interface TimelineEvent { date: string; event: string; }
export interface KeyNumber { value: string; context: string; }
export interface Person { name: string; role: string; }
export interface Organization { name: string; relevance: string; }
export interface Country { name: string; relevance: string; }

export interface ArticleStory {
  summary: string; main_story: string; background: string; why_it_matters: string;
  expert_analysis: string; did_you_know: string; historical_context: string;
  future_outlook: string; what_happens_next: string;
  key_developments: string[]; quick_insights: string[]; reader_takeaways: string[];
  people: Person[]; organizations: Organization[]; countries: Country[];
  timeline: TimelineEvent[]; key_numbers: KeyNumber[]; vocabulary: VocabularyWord[];
}

export interface Article {
  id: string; slug: string; title: string; dek: string; category: string;
  subcategory: string | null; cover_image_url: string | null; cover_image_prompt: string | null;
  read_time_minutes: number; trust_score: number; source_count: number; sources: any;
  story: ArticleStory; body: string | null; country_code: string | null;
  featured_slot: string | null; is_published: boolean; published_at: string;
  view_count: number; like_count: number; bookmark_count: number; comment_count: number;
  created_at: string; updated_at: string; trending_score: number;
}

export const CATEGORIES = [
  { id: "world", label: "World" }, { id: "india", label: "India" },
  { id: "science", label: "Science" }, { id: "technology", label: "Technology" },
  { id: "sports", label: "Sports" }, { id: "business", label: "Business" },
  { id: "health", label: "Health" }, { id: "environment", label: "Environment" },
];
