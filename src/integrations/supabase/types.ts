export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      article_likes: {
        Row: {
          article_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_likes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_quizzes: {
        Row: {
          article_id: string
          correct_answer: string | null
          created_at: string
          explanation: string | null
          id: string
          options: Json | null
          question: string
          question_type: string
        }
        Insert: {
          article_id: string
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          question: string
          question_type: string
        }
        Update: {
          article_id?: string
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          question?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_quizzes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_regen_queue: {
        Row: {
          article_id: string
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          next_attempt_at: string
          status: string
          updated_at: string
        }
        Insert: {
          article_id: string
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          article_id?: string
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_translations: {
        Row: {
          article_slug: string
          created_at: string
          id: string
          language: string
          status: string
          translated_body: string | null
          translated_dek: string | null
          translated_story: Json | null
          translated_title: string | null
          updated_at: string
        }
        Insert: {
          article_slug: string
          created_at?: string
          id?: string
          language: string
          status?: string
          translated_body?: string | null
          translated_dek?: string | null
          translated_story?: Json | null
          translated_title?: string | null
          updated_at?: string
        }
        Update: {
          article_slug?: string
          created_at?: string
          id?: string
          language?: string
          status?: string
          translated_body?: string | null
          translated_dek?: string | null
          translated_story?: Json | null
          translated_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          body: string | null
          bookmark_count: number
          category: string
          comment_count: number
          content_hash: string | null
          country_code: string | null
          cover_image_prompt: string | null
          cover_image_url: string | null
          cover_video_url: string | null
          created_at: string
          created_by: string | null
          dek: string | null
          featured_slot: string | null
          id: string
          is_published: boolean
          like_count: number
          published_at: string
          read_time_minutes: number
          reprocessed_at: string | null
          slug: string
          source_count: number
          sources: Json
          story: Json
          subcategory: string | null
          title: string
          trending_score: number
          trust_score: number
          updated_at: string
          view_count: number
        }
        Insert: {
          body?: string | null
          bookmark_count?: number
          category: string
          comment_count?: number
          content_hash?: string | null
          country_code?: string | null
          cover_image_prompt?: string | null
          cover_image_url?: string | null
          cover_video_url?: string | null
          created_at?: string
          created_by?: string | null
          dek?: string | null
          featured_slot?: string | null
          id?: string
          is_published?: boolean
          like_count?: number
          published_at?: string
          read_time_minutes?: number
          reprocessed_at?: string | null
          slug: string
          source_count?: number
          sources?: Json
          story?: Json
          subcategory?: string | null
          title: string
          trending_score?: number
          trust_score?: number
          updated_at?: string
          view_count?: number
        }
        Update: {
          body?: string | null
          bookmark_count?: number
          category?: string
          comment_count?: number
          content_hash?: string | null
          country_code?: string | null
          cover_image_prompt?: string | null
          cover_image_url?: string | null
          cover_video_url?: string | null
          created_at?: string
          created_by?: string | null
          dek?: string | null
          featured_slot?: string | null
          id?: string
          is_published?: boolean
          like_count?: number
          published_at?: string
          read_time_minutes?: number
          reprocessed_at?: string | null
          slug?: string
          source_count?: number
          sources?: Json
          story?: Json
          subcategory?: string | null
          title?: string
          trending_score?: number
          trust_score?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          article_id: string
          collection_id: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          collection_id?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          collection_id?: string | null
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      briefings: {
        Row: {
          briefing_date: string
          created_at: string
          id: string
          intro: string | null
          sections: Json
        }
        Insert: {
          briefing_date: string
          created_at?: string
          id?: string
          intro?: string | null
          sections?: Json
        }
        Update: {
          briefing_date?: string
          created_at?: string
          id?: string
          intro?: string | null
          sections?: Json
        }
        Relationships: []
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          article_id: string
          body: string
          created_at: string
          id: string
          is_edited: boolean
          is_hidden: boolean
          like_count: number
          parent_id: string | null
          prompt_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          body: string
          created_at?: string
          id?: string
          is_edited?: boolean
          is_hidden?: boolean
          like_count?: number
          parent_id?: string | null
          prompt_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          body?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          is_hidden?: boolean
          like_count?: number
          parent_id?: string | null
          prompt_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          auto_apply: boolean
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          eligible_only_new_users: boolean
          id: string
          is_active: boolean
          max_uses: number | null
          max_uses_per_user: number
          stripe_coupon_id: string | null
          used_count: number
          valid_until: string | null
        }
        Insert: {
          auto_apply?: boolean
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          eligible_only_new_users?: boolean
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number
          stripe_coupon_id?: string | null
          used_count?: number
          valid_until?: string | null
        }
        Update: {
          auto_apply?: boolean
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          eligible_only_new_users?: boolean
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number
          stripe_coupon_id?: string | null
          used_count?: number
          valid_until?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          invoice_number: string | null
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          plan_code: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_code?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          available: boolean
          category: string | null
          change: number | null
          change_percent: number | null
          name: string
          price: number | null
          region: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          available?: boolean
          category?: string | null
          change?: number | null
          change_percent?: number | null
          name: string
          price?: number | null
          region?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          available?: boolean
          category?: string | null
          change?: number | null
          change_percent?: number | null
          name?: string
          price?: number | null
          region?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          interests: string[] | null
          is_admin: boolean
          onboarded: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          interests?: string[] | null
          is_admin?: boolean
          onboarded?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          interests?: string[] | null
          is_admin?: boolean
          onboarded?: boolean
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      reading_history: {
        Row: {
          article_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_history_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_notes: {
        Row: {
          article_slug: string
          color: string | null
          created_at: string
          id: string
          note: string | null
          selected_text: string
          user_id: string
        }
        Insert: {
          article_slug: string
          color?: string | null
          created_at?: string
          id?: string
          note?: string | null
          selected_text: string
          user_id?: string
        }
        Update: {
          article_slug?: string
          color?: string | null
          created_at?: string
          id?: string
          note?: string | null
          selected_text?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_preferences: {
        Row: {
          prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          prefs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          article_slug: string
          read_seconds: number
          scroll_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          article_slug: string
          read_seconds?: number
          scroll_percent?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          article_slug?: string
          read_seconds?: number
          scroll_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      regeneration_queue: {
        Row: {
          article_id: string
          attempts: number
          category: string | null
          cover_image_url: string | null
          created_at: string
          error_reason: string | null
          id: string
          last_attempted_at: string | null
          max_attempts: number
          next_retry_at: string | null
          source_name: string
          source_title: string
          source_url: string
          status: string
        }
        Insert: {
          article_id: string
          attempts?: number
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          error_reason?: string | null
          id?: string
          last_attempted_at?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          source_name?: string
          source_title?: string
          source_url?: string
          status?: string
        }
        Update: {
          article_id?: string
          attempts?: number
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          error_reason?: string | null
          id?: string
          last_attempted_at?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          source_name?: string
          source_title?: string
          source_url?: string
          status?: string
        }
        Relationships: []
      }
      saved_words: {
        Row: {
          antonyms: string[] | null
          article_id: string | null
          context_in_article: string | null
          created_at: string
          difficulty: string
          example: string | null
          id: string
          meaning: string | null
          part_of_speech: string | null
          pronunciation: string | null
          simple_explanation: string | null
          synonyms: string[] | null
          user_id: string
          word: string
          word_origin: string | null
        }
        Insert: {
          antonyms?: string[] | null
          article_id?: string | null
          context_in_article?: string | null
          created_at?: string
          difficulty?: string
          example?: string | null
          id?: string
          meaning?: string | null
          part_of_speech?: string | null
          pronunciation?: string | null
          simple_explanation?: string | null
          synonyms?: string[] | null
          user_id: string
          word: string
          word_origin?: string | null
        }
        Update: {
          antonyms?: string[] | null
          article_id?: string | null
          context_in_article?: string | null
          created_at?: string
          difficulty?: string
          example?: string | null
          id?: string
          meaning?: string | null
          part_of_speech?: string | null
          pronunciation?: string | null
          simple_explanation?: string | null
          synonyms?: string[] | null
          user_id?: string
          word?: string
          word_origin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_words_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          currency: string
          description: string | null
          interval: string
          is_active: boolean
          name: string
          price_cents: number
          stripe_price_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          interval?: string
          is_active?: boolean
          name: string
          price_cents?: number
          stripe_price_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          interval?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_cents: number
          coupon_code: string | null
          created_at: string
          currency: string
          discount_cents: number
          id: string
          plan_code: string | null
          status: string
          stripe_checkout_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          plan_code?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          plan_code?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      translation_queue: {
        Row: {
          article_slug: string
          attempts: number
          created_at: string
          id: string
          language: string
          last_error: string | null
          status: string
          updated_at: string
        }
        Insert: {
          article_slug: string
          attempts?: number
          created_at?: string
          id?: string
          language: string
          last_error?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          article_slug?: string
          attempts?: number
          created_at?: string
          id?: string
          language?: string
          last_error?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_coupons: {
        Row: {
          code: string
          coupon_id: string | null
          created_at: string
          id: string
          status: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          coupon_id?: string | null
          created_at?: string
          id?: string
          status?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          coupon_id?: string | null
          created_at?: string
          id?: string
          status?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coupons_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_code: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vocabulary_cache: {
        Row: {
          antonyms: string[] | null
          created_at: string
          example: string | null
          last_searched_at: string | null
          meaning: string | null
          part_of_speech: string | null
          pronunciation: string | null
          search_count: number
          simple_explanation: string | null
          source: string | null
          synonyms: string[] | null
          updated_at: string
          word: string
        }
        Insert: {
          antonyms?: string[] | null
          created_at?: string
          example?: string | null
          last_searched_at?: string | null
          meaning?: string | null
          part_of_speech?: string | null
          pronunciation?: string | null
          search_count?: number
          simple_explanation?: string | null
          source?: string | null
          synonyms?: string[] | null
          updated_at?: string
          word: string
        }
        Update: {
          antonyms?: string[] | null
          created_at?: string
          example?: string | null
          last_searched_at?: string | null
          meaning?: string | null
          part_of_speech?: string | null
          pronunciation?: string | null
          search_count?: number
          simple_explanation?: string | null
          source?: string | null
          synonyms?: string[] | null
          updated_at?: string
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_articles_missing_video: { Args: never; Returns: number }
      delete_comment_by_id: {
        Args: { p_comment_id: string }
        Returns: undefined
      }
      edit_comment_by_id: {
        Args: { p_body: string; p_comment_id: string }
        Returns: undefined
      }
      get_articles_missing_video: {
        Args: { p_limit: number }
        Returns: {
          category: string
          cover_image_url: string
          cover_video_url: string
          id: string
          title: string
        }[]
      }
      get_comment_likes_for_user: {
        Args: { p_article_id: string; p_user_id: string }
        Returns: string[]
      }
      increment_vocab_search: { Args: { w: string }; Returns: undefined }
      insert_comment: {
        Args: {
          p_article_id: string
          p_body: string
          p_parent_id: string
          p_prompt_type: string
          p_user_id: string
        }
        Returns: string
      }
      list_comments_by_article: {
        Args: { p_article_id: string; p_sort: string }
        Returns: {
          article_id: string
          avatar_url: string
          body: string
          created_at: string
          display_name: string
          id: string
          is_edited: boolean
          like_count: number
          parent_id: string
          prompt_type: string
          reply_count: number
          status: string
          updated_at: string
          user_id: string
          username: string
        }[]
      }
      toggle_comment_like: {
        Args: { p_comment_id: string; p_user_id: string }
        Returns: Json
      }
      update_cover_video_url: {
        Args: { p_article_id: string; p_video_url: string }
        Returns: undefined
      }
      update_trending_scores: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
