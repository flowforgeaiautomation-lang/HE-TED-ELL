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
          is_hidden: boolean
          like_count: number
          parent_id: string | null
          prompt_type: string | null
          user_id: string
        }
        Insert: {
          article_id: string
          body: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          like_count?: number
          parent_id?: string | null
          prompt_type?: string | null
          user_id: string
        }
        Update: {
          article_id?: string
          body?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          like_count?: number
          parent_id?: string | null
          prompt_type?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          interests: string[] | null
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
      vocabulary_cache: {
        Row: {
          word: string
          part_of_speech: string | null
          meaning: string | null
          simple_explanation: string | null
          example: string | null
          synonyms: string[] | null
          antonyms: string[] | null
          pronunciation: string | null
          source: string | null
          search_count: number
          last_searched_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          word: string
          part_of_speech?: string | null
          meaning?: string | null
          simple_explanation?: string | null
          example?: string | null
          synonyms?: string[] | null
          antonyms?: string[] | null
          pronunciation?: string | null
          source?: string | null
          search_count?: number
          last_searched_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          word?: string
          part_of_speech?: string | null
          meaning?: string | null
          simple_explanation?: string | null
          example?: string | null
          synonyms?: string[] | null
          antonyms?: string[] | null
          pronunciation?: string | null
          source?: string | null
          search_count?: number
          last_searched_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_vocab_search: {
        Args: { w: string }
        Returns: void
      }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
