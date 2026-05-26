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
      accommodation_rooms: {
        Row: {
          active: boolean
          capacity: number
          created_at: string
          gender_policy: string
          group_id: string | null
          id: string
          kind: string | null
          notes: string | null
          room_number: number
          status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          capacity?: number
          created_at?: string
          gender_policy?: string
          group_id?: string | null
          id?: string
          kind?: string | null
          notes?: string | null
          room_number: number
          status?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          capacity?: number
          created_at?: string
          gender_policy?: string
          group_id?: string | null
          id?: string
          kind?: string | null
          notes?: string | null
          room_number?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_providers: {
        Row: {
          active: boolean
          capability: string
          config: Json
          created_at: string
          id: string
          is_default: boolean
          name: string
          priority: number
          provider_type: string
          secret_ref: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          capability: string
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          priority?: number
          provider_type: string
          secret_ref?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          capability?: string
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          priority?: number
          provider_type?: string
          secret_ref?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          capability: string
          cost_cents: number | null
          created_at: string
          error: string | null
          id: string
          metadata: Json | null
          prompt: string | null
          provider_id: string | null
          status: string
          tokens_input: number | null
          tokens_output: number | null
          user_id: string | null
        }
        Insert: {
          capability: string
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json | null
          prompt?: string | null
          provider_id?: string | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Update: {
          capability?: string
          cost_cents?: number | null
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json | null
          prompt?: string | null
          provider_id?: string | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_admin_exclusions: {
        Row: {
          created_at: string
          created_by: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          element_class: string | null
          element_id: string | null
          element_selector: string | null
          element_tag: string | null
          element_text: string | null
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          page_title: string | null
          path: string | null
          scroll_depth_pct: number | null
          session_id: string
          user_id: string | null
          visitor_id: string
          x: number | null
          y: number | null
        }
        Insert: {
          element_class?: string | null
          element_id?: string | null
          element_selector?: string | null
          element_tag?: string | null
          element_text?: string | null
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          page_title?: string | null
          path?: string | null
          scroll_depth_pct?: number | null
          session_id: string
          user_id?: string | null
          visitor_id: string
          x?: number | null
          y?: number | null
        }
        Update: {
          element_class?: string | null
          element_id?: string | null
          element_selector?: string | null
          element_tag?: string | null
          element_text?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          page_title?: string | null
          path?: string | null
          scroll_depth_pct?: number | null
          session_id?: string
          user_id?: string | null
          visitor_id?: string
          x?: number | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          browser: string | null
          browser_version: string | null
          created_at: string
          device_type: string | null
          duration_seconds: number
          ended_at: string | null
          events_count: number
          exit_path: string | null
          ip_address: string | null
          ip_city: string | null
          ip_country: string | null
          ip_lat: number | null
          ip_lng: number | null
          ip_region: string | null
          is_admin_excluded: boolean
          is_bot: boolean
          landing_path: string | null
          language: string | null
          last_seen_at: string
          metadata: Json
          os: string | null
          os_version: string | null
          pageviews_count: number
          referrer: string | null
          referrer_domain: string | null
          screen_h: number | null
          screen_w: number | null
          session_id: string
          started_at: string
          timezone: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_h: number | null
          viewport_w: number | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number
          ended_at?: string | null
          events_count?: number
          exit_path?: string | null
          ip_address?: string | null
          ip_city?: string | null
          ip_country?: string | null
          ip_lat?: number | null
          ip_lng?: number | null
          ip_region?: string | null
          is_admin_excluded?: boolean
          is_bot?: boolean
          landing_path?: string | null
          language?: string | null
          last_seen_at?: string
          metadata?: Json
          os?: string | null
          os_version?: string | null
          pageviews_count?: number
          referrer?: string | null
          referrer_domain?: string | null
          screen_h?: number | null
          screen_w?: number | null
          session_id: string
          started_at?: string
          timezone?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_h?: number | null
          viewport_w?: number | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number
          ended_at?: string | null
          events_count?: number
          exit_path?: string | null
          ip_address?: string | null
          ip_city?: string | null
          ip_country?: string | null
          ip_lat?: number | null
          ip_lng?: number | null
          ip_region?: string | null
          is_admin_excluded?: boolean
          is_bot?: boolean
          landing_path?: string | null
          language?: string | null
          last_seen_at?: string
          metadata?: Json
          os?: string | null
          os_version?: string | null
          pageviews_count?: number
          referrer?: string | null
          referrer_domain?: string | null
          screen_h?: number | null
          screen_w?: number | null
          session_id?: string
          started_at?: string
          timezone?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_h?: number | null
          viewport_w?: number | null
          visitor_id?: string
        }
        Relationships: []
      }
      analytics_settings: {
        Row: {
          anonymize_ip: boolean
          enabled: boolean
          exclude_bots: boolean
          id: boolean
          retention_days: number
          updated_at: string
        }
        Insert: {
          anonymize_ip?: boolean
          enabled?: boolean
          exclude_bots?: boolean
          id?: boolean
          retention_days?: number
          updated_at?: string
        }
        Update: {
          anonymize_ip?: boolean
          enabled?: boolean
          exclude_bots?: boolean
          id?: boolean
          retention_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      auth_lockouts: {
        Row: {
          email: string
          failed_attempts: number
          last_attempt_at: string
          locked: boolean
          locked_at: string | null
          updated_at: string
        }
        Insert: {
          email: string
          failed_attempts?: number
          last_attempt_at?: string
          locked?: boolean
          locked_at?: string | null
          updated_at?: string
        }
        Update: {
          email?: string
          failed_attempts?: number
          last_attempt_at?: string
          locked?: boolean
          locked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_category_translations: {
        Row: {
          category_id: string
          description: string | null
          id: string
          locale: string
          meta_description: string | null
          meta_title: string | null
          name: string
        }
        Insert: {
          category_id: string
          description?: string | null
          id?: string
          locale: string
          meta_description?: string | null
          meta_title?: string | null
          name: string
        }
        Update: {
          category_id?: string
          description?: string | null
          id?: string
          locale?: string
          meta_description?: string | null
          meta_title?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_comments: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          id: string
          parent_id: string | null
          post_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          post_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_categories: {
        Row: {
          category_id: string
          post_id: string
        }
        Insert: {
          category_id: string
          post_id: string
        }
        Update: {
          category_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_categories_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_translations: {
        Row: {
          canonical_url: string | null
          content_html: string | null
          content_markdown: string
          excerpt: string | null
          geo_entities: string[] | null
          geo_faq: Json | null
          geo_summary: string | null
          id: string
          locale: string
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          post_id: string
          schema_jsonld: Json | null
          slug: string
          title: string
        }
        Insert: {
          canonical_url?: string | null
          content_html?: string | null
          content_markdown?: string
          excerpt?: string | null
          geo_entities?: string[] | null
          geo_faq?: Json | null
          geo_summary?: string | null
          id?: string
          locale: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          post_id: string
          schema_jsonld?: Json | null
          slug: string
          title: string
        }
        Update: {
          canonical_url?: string | null
          content_html?: string | null
          content_markdown?: string
          excerpt?: string | null
          geo_entities?: string[] | null
          geo_faq?: Json | null
          geo_summary?: string | null
          id?: string
          locale?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          post_id?: string
          schema_jsonld?: Json | null
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_translations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          comments_count: number
          cover_alt: string | null
          cover_image_url: string | null
          created_at: string
          featured: boolean
          geo_keywords: string[] | null
          geo_score: number | null
          id: string
          published_at: string | null
          reading_time_min: number | null
          scheduled_for: string | null
          slug: string
          status: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author_id?: string | null
          comments_count?: number
          cover_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          featured?: boolean
          geo_keywords?: string[] | null
          geo_score?: number | null
          id?: string
          published_at?: string | null
          reading_time_min?: number | null
          scheduled_for?: string | null
          slug: string
          status?: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_id?: string | null
          comments_count?: number
          cover_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          featured?: boolean
          geo_keywords?: string[] | null
          geo_score?: number | null
          id?: string
          published_at?: string | null
          reading_time_min?: number | null
          scheduled_for?: string | null
          slug?: string
          status?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          ip_address: string | null
          locale: string
          message: string
          name: string
          phone: string | null
          read_at: string | null
          replied_at: string | null
          status: string
          subject: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          locale?: string
          message: string
          name: string
          phone?: string | null
          read_at?: string | null
          replied_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          locale?: string
          message?: string
          name?: string
          phone?: string | null
          read_at?: string | null
          replied_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_cents: number
          id: string
          order_id: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_cents?: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_cents?: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          max_uses: number | null
          max_uses_per_user: number | null
          metadata: Json | null
          min_amount_cents: number | null
          starts_at: string | null
          updated_at: string
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          max_uses_per_user?: number | null
          metadata?: Json | null
          min_amount_cents?: number | null
          starts_at?: string | null
          updated_at?: string
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          max_uses_per_user?: number | null
          metadata?: Json | null
          min_amount_cents?: number | null
          starts_at?: string | null
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          pinned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          pinned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_segment_members: {
        Row: {
          added_at: string
          added_by: string | null
          segment_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          segment_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          segment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          rules: Json
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          rules?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          rules?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          html: string
          id: string
          last_error: string | null
          locale: string
          provider_id: string | null
          provider_message_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string
          template_slug: string | null
          text_body: string | null
          to_email: string
          to_name: string | null
          updated_at: string
          user_id: string | null
          variables: Json
        }
        Insert: {
          attempts?: number
          created_at?: string
          html: string
          id?: string
          last_error?: string | null
          locale?: string
          provider_id?: string | null
          provider_message_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject: string
          template_slug?: string | null
          text_body?: string | null
          to_email: string
          to_name?: string | null
          updated_at?: string
          user_id?: string | null
          variables?: Json
        }
        Update: {
          attempts?: number
          created_at?: string
          html?: string
          id?: string
          last_error?: string | null
          locale?: string
          provider_id?: string | null
          provider_message_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template_slug?: string | null
          text_body?: string | null
          to_email?: string
          to_name?: string | null
          updated_at?: string
          user_id?: string | null
          variables?: Json
        }
        Relationships: []
      }
      email_providers: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          is_default: boolean
          name: string
          provider_type: string
          secret_ref: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          provider_type: string
          secret_ref?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          provider_type?: string
          secret_ref?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          translations: Json
          updated_at: string
          variables_doc: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          translations?: Json
          updated_at?: string
          variables_doc?: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          translations?: Json
          updated_at?: string
          variables_doc?: Json
        }
        Relationships: []
      }
      event_reviews: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          city: string | null
          comment: string | null
          created_at: string
          display_name: string | null
          experience_date: string | null
          featured: boolean
          id: string
          legacy: boolean | null
          order_id: string | null
          photos: string[] | null
          rating: number
          status: string
          title: string | null
          translations: Json
          updated_at: string
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          city?: string | null
          comment?: string | null
          created_at?: string
          display_name?: string | null
          experience_date?: string | null
          featured?: boolean
          id?: string
          legacy?: boolean | null
          order_id?: string | null
          photos?: string[] | null
          rating: number
          status?: string
          title?: string | null
          translations?: Json
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          city?: string | null
          comment?: string | null
          created_at?: string
          display_name?: string | null
          experience_date?: string | null
          featured?: boolean
          id?: string
          legacy?: boolean | null
          order_id?: string | null
          photos?: string[] | null
          rating?: number
          status?: string
          title?: string | null
          translations?: Json
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      fiscal_company: {
        Row: {
          address: Json
          cnpj: string
          created_at: string
          default_cnae: string | null
          default_iss_rate: number | null
          default_service_code: string | null
          email: string | null
          id: string
          ie: string | null
          im: string | null
          legal_name: string
          logo_url: string | null
          phone: string | null
          singleton: boolean
          tax_regime: string
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          address?: Json
          cnpj: string
          created_at?: string
          default_cnae?: string | null
          default_iss_rate?: number | null
          default_service_code?: string | null
          email?: string | null
          id?: string
          ie?: string | null
          im?: string | null
          legal_name: string
          logo_url?: string | null
          phone?: string | null
          singleton?: boolean
          tax_regime?: string
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json
          cnpj?: string
          created_at?: string
          default_cnae?: string | null
          default_iss_rate?: number | null
          default_service_code?: string | null
          email?: string | null
          id?: string
          ie?: string | null
          im?: string | null
          legal_name?: string
          logo_url?: string | null
          phone?: string | null
          singleton?: boolean
          tax_regime?: string
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fiscal_invoice_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          invoice_id: string
          message: string | null
          payload: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          invoice_id: string
          message?: string | null
          payload?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          invoice_id?: string
          message?: string | null
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_invoice_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fiscal_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_invoices: {
        Row: {
          access_key: string | null
          amount_cents: number
          cancelled_at: string | null
          created_at: string
          customer_doc: string | null
          customer_email: string | null
          customer_name: string | null
          external_id: string | null
          id: string
          invoice_type: string
          issued_at: string | null
          last_error: string | null
          number: string | null
          order_id: string
          pdf_url: string | null
          provider_id: string | null
          raw_request: Json | null
          raw_response: Json | null
          rps_number: string | null
          rps_series: string | null
          series: string | null
          status: string
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          access_key?: string | null
          amount_cents?: number
          cancelled_at?: string | null
          created_at?: string
          customer_doc?: string | null
          customer_email?: string | null
          customer_name?: string | null
          external_id?: string | null
          id?: string
          invoice_type?: string
          issued_at?: string | null
          last_error?: string | null
          number?: string | null
          order_id: string
          pdf_url?: string | null
          provider_id?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          rps_number?: string | null
          rps_series?: string | null
          series?: string | null
          status?: string
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          access_key?: string | null
          amount_cents?: number
          cancelled_at?: string | null
          created_at?: string
          customer_doc?: string | null
          customer_email?: string | null
          customer_name?: string | null
          external_id?: string | null
          id?: string
          invoice_type?: string
          issued_at?: string | null
          last_error?: string | null
          number?: string | null
          order_id?: string
          pdf_url?: string | null
          provider_id?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          rps_number?: string | null
          rps_series?: string | null
          series?: string | null
          status?: string
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: []
      }
      fiscal_providers: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          is_default: boolean
          is_test: boolean
          name: string
          provider_type: string
          secret_ref: string | null
          supports: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          is_test?: boolean
          name: string
          provider_type: string
          secret_ref?: string | null
          supports?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          is_test?: boolean
          name?: string
          provider_type?: string
          secret_ref?: string | null
          supports?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_text: string
          caption: string | null
          created_at: string
          filename: string
          height: number | null
          id: string
          mime_type: string | null
          public_url: string
          size_bytes: number | null
          storage_path: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string
          caption?: string | null
          created_at?: string
          filename: string
          height?: number | null
          id?: string
          mime_type?: string | null
          public_url: string
          size_bytes?: number | null
          storage_path: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string
          caption?: string | null
          created_at?: string
          filename?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          public_url?: string
          size_bytes?: number | null
          storage_path?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      mfa_factors: {
        Row: {
          created_at: string
          factor_type: string
          friendly_name: string | null
          id: string
          last_used_at: string | null
          secret_encrypted: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          factor_type?: string
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          secret_encrypted: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          factor_type?: string
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          secret_encrypted?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          email_comments: boolean
          email_marketing: boolean
          email_orders: boolean
          inapp_enabled: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_comments?: boolean
          email_marketing?: boolean
          email_orders?: boolean
          inapp_enabled?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_comments?: boolean
          email_marketing?: boolean
          email_orders?: boolean
          inapp_enabled?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          metadata: Json | null
          order_id: string
          product_id: string | null
          product_ref: string | null
          product_type: string
          quantity: number
          total_cents: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          order_id: string
          product_id?: string | null
          product_ref?: string | null
          product_type: string
          quantity?: number
          total_cents?: number
          unit_price_cents?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          product_id?: string | null
          product_ref?: string | null
          product_type?: string
          quantity?: number
          total_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          allocation_status: string | null
          base_price_cents: number | null
          bus_checked_in_at: string | null
          bus_checked_in_by: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          checkin_method: string | null
          checkin_token: string | null
          coupon_code: string | null
          created_at: string
          currency: string
          customer_email: string
          discount_cents: number
          external_reference: string | null
          final_price_cents: number | null
          gateway_id: string | null
          group_id: string | null
          id: string
          installment_quantity: number | null
          lodging_checked_in_at: string | null
          lodging_checked_in_by: string | null
          metadata: Json | null
          notes: string | null
          paid_at: string | null
          participant_id: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_provider_id: string | null
          payment_status: string | null
          reminder_1_sent_at: string | null
          reminder_30_sent_at: string | null
          reminder_7_sent_at: string | null
          reservation_type: string | null
          room_id: string | null
          status: string
          total_cents: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allocation_status?: string | null
          base_price_cents?: number | null
          bus_checked_in_at?: string | null
          bus_checked_in_by?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          checkin_method?: string | null
          checkin_token?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_email: string
          discount_cents?: number
          external_reference?: string | null
          final_price_cents?: number | null
          gateway_id?: string | null
          group_id?: string | null
          id?: string
          installment_quantity?: number | null
          lodging_checked_in_at?: string | null
          lodging_checked_in_by?: string | null
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          participant_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_provider_id?: string | null
          payment_status?: string | null
          reminder_1_sent_at?: string | null
          reminder_30_sent_at?: string | null
          reminder_7_sent_at?: string | null
          reservation_type?: string | null
          room_id?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allocation_status?: string | null
          base_price_cents?: number | null
          bus_checked_in_at?: string | null
          bus_checked_in_by?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          checkin_method?: string | null
          checkin_token?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          discount_cents?: number
          external_reference?: string | null
          final_price_cents?: number | null
          gateway_id?: string | null
          group_id?: string | null
          id?: string
          installment_quantity?: number | null
          lodging_checked_in_at?: string | null
          lodging_checked_in_by?: string | null
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          participant_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_provider_id?: string | null
          payment_status?: string | null
          reminder_1_sent_at?: string | null
          reminder_30_sent_at?: string | null
          reminder_7_sent_at?: string | null
          reservation_type?: string | null
          room_id?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "accommodation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      page_sections: {
        Row: {
          created_at: string
          data: Json
          data_i18n: Json
          id: string
          page_id: string
          position: number
          type: string
          updated_at: string
          visible: boolean
          visible_desktop: boolean
          visible_mobile: boolean
        }
        Insert: {
          created_at?: string
          data?: Json
          data_i18n?: Json
          id?: string
          page_id: string
          position?: number
          type: string
          updated_at?: string
          visible?: boolean
          visible_desktop?: boolean
          visible_mobile?: boolean
        }
        Update: {
          created_at?: string
          data?: Json
          data_i18n?: Json
          id?: string
          page_id?: string
          position?: number
          type?: string
          updated_at?: string
          visible?: boolean
          visible_desktop?: boolean
          visible_mobile?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          page_id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          page_id: string
          snapshot: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          page_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "page_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          meta: Json | null
          og_image_url: string | null
          publish_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          meta?: Json | null
          og_image_url?: string | null
          publish_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          meta?: Json | null
          og_image_url?: string | null
          publish_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          birthdate: string | null
          city: string | null
          cpf: string | null
          created_at: string
          document: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          metadata: Json | null
          phone: string | null
          product_id: string | null
          quantity: number | null
          reservation_type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birthdate?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          metadata?: Json | null
          phone?: string | null
          product_id?: string | null
          quantity?: number | null
          reservation_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          birthdate?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          metadata?: Json | null
          phone?: string | null
          product_id?: string | null
          quantity?: number | null
          reservation_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          is_test: boolean
          name: string
          priority: number
          provider_type: string
          secret_ref: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          is_test?: boolean
          name: string
          priority?: number
          provider_type: string
          secret_ref?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          is_test?: boolean
          name?: string
          priority?: number
          provider_type?: string
          secret_ref?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          amount_cents: number
          checkout_url: string | null
          created_at: string
          currency: string
          external_id: string | null
          gateway_id: string
          id: string
          last_error: string | null
          order_id: string
          raw_request: Json | null
          raw_response: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          external_id?: string | null
          gateway_id: string
          id?: string
          last_error?: string | null
          order_id: string
          raw_request?: Json | null
          raw_response?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          external_id?: string | null
          gateway_id?: string
          id?: string
          last_error?: string | null
          order_id?: string
          raw_request?: Json | null
          raw_response?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          compare_at_cents: number | null
          cover_image_url: string | null
          created_at: string
          currency: string
          event_date: string | null
          event_ends_at: string | null
          event_starts_at: string | null
          gallery: string[] | null
          id: string
          max_per_order: number | null
          metadata: Json | null
          position: number
          price_cents: number
          slug: string
          stock: number | null
          translations: Json
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          compare_at_cents?: number | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          event_date?: string | null
          event_ends_at?: string | null
          event_starts_at?: string | null
          gallery?: string[] | null
          id?: string
          max_per_order?: number | null
          metadata?: Json | null
          position?: number
          price_cents?: number
          slug: string
          stock?: number | null
          translations?: Json
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          compare_at_cents?: number | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          event_date?: string | null
          event_ends_at?: string | null
          event_starts_at?: string | null
          gallery?: string[] | null
          id?: string
          max_per_order?: number | null
          metadata?: Json | null
          position?: number
          price_cents?: number
          slug?: string
          stock?: number | null
          translations?: Json
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          locale: string | null
          marketing_opt_in: boolean
          phone: string | null
          phone_secondary: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          locale?: string | null
          marketing_opt_in?: boolean
          phone?: string | null
          phone_secondary?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          locale?: string | null
          marketing_opt_in?: boolean
          phone?: string | null
          phone_secondary?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      promo_coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          max_uses: number | null
          min_order_cents: number
          product_slugs: string[] | null
          starts_at: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_cents?: number
          product_slugs?: string[] | null
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_cents?: number
          product_slugs?: string[] | null
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number
          id: string
          key: string
        }
        Insert: {
          bucket: string
          count?: number
          id?: string
          key: string
        }
        Update: {
          bucket?: string
          count?: number
          id?: string
          key?: string
        }
        Relationships: []
      }
      receipt_templates: {
        Row: {
          created_at: string
          css_styles: string | null
          html_template: string
          id: string
          is_default: boolean
          name: string
          paper_size: string
          slug: string
          updated_at: string
          variables_doc: Json | null
        }
        Insert: {
          created_at?: string
          css_styles?: string | null
          html_template: string
          id?: string
          is_default?: boolean
          name: string
          paper_size?: string
          slug: string
          updated_at?: string
          variables_doc?: Json | null
        }
        Update: {
          created_at?: string
          css_styles?: string | null
          html_template?: string
          id?: string
          is_default?: boolean
          name?: string
          paper_size?: string
          slug?: string
          updated_at?: string
          variables_doc?: Json | null
        }
        Relationships: []
      }
      receipts: {
        Row: {
          html_snapshot: string | null
          id: string
          issued_at: string
          metadata: Json | null
          number: string
          order_id: string
          pdf_url: string | null
          template_id: string | null
          verification_hash: string
        }
        Insert: {
          html_snapshot?: string | null
          id?: string
          issued_at?: string
          metadata?: Json | null
          number: string
          order_id: string
          pdf_url?: string | null
          template_id?: string | null
          verification_hash: string
        }
        Update: {
          html_snapshot?: string | null
          id?: string
          issued_at?: string
          metadata?: Json | null
          number?: string
          order_id?: string
          pdf_url?: string | null
          template_id?: string | null
          verification_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "receipt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_drafts: {
        Row: {
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reservation_group_members: {
        Row: {
          email: string
          full_name: string
          group_id: string
          id: string
          joined_at: string
          order_id: string | null
          payment_status: string
          phone: string | null
          role: string
          room_id: string | null
          user_id: string | null
        }
        Insert: {
          email: string
          full_name: string
          group_id: string
          id?: string
          joined_at?: string
          order_id?: string | null
          payment_status?: string
          phone?: string | null
          role?: string
          room_id?: string | null
          user_id?: string | null
        }
        Update: {
          email?: string
          full_name?: string
          group_id?: string
          id?: string
          joined_at?: string
          order_id?: string | null
          payment_status?: string
          phone?: string | null
          role?: string
          room_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "reservation_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_group_members_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_group_rooms: {
        Row: {
          capacity: number
          created_at: string
          group_id: string
          id: string
          room_number: number
        }
        Insert: {
          capacity?: number
          created_at?: string
          group_id: string
          id?: string
          room_number: number
        }
        Update: {
          capacity?: number
          created_at?: string
          group_id?: string
          id?: string
          room_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservation_group_rooms_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "reservation_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_groups: {
        Row: {
          capacity: number
          closed_at: string | null
          closed_by: string | null
          coupon_code: string
          created_at: string
          holder_email: string | null
          holder_name: string
          holder_user_id: string
          id: string
          metadata: Json | null
          notified_complete_at: string | null
          product_name: string | null
          product_slug: string
          status: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          closed_at?: string | null
          closed_by?: string | null
          coupon_code: string
          created_at?: string
          holder_email?: string | null
          holder_name: string
          holder_user_id: string
          id?: string
          metadata?: Json | null
          notified_complete_at?: string | null
          product_name?: string | null
          product_slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          closed_at?: string | null
          closed_by?: string | null
          coupon_code?: string
          created_at?: string
          holder_email?: string | null
          holder_name?: string
          holder_user_id?: string
          id?: string
          metadata?: Json | null
          notified_complete_at?: string | null
          product_name?: string | null
          product_slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_ping_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          payload: Json
          scheduled_at: string
          sent_at: string | null
          status: string
          target: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          target: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          target?: string
        }
        Relationships: []
      }
      seo_search_metrics: {
        Row: {
          fetched_at: string
          id: string
          range_days: number
          top_pages: Json
          top_queries: Json
          totals: Json
        }
        Insert: {
          fetched_at?: string
          id?: string
          range_days?: number
          top_pages?: Json
          top_queries?: Json
          totals?: Json
        }
        Update: {
          fetched_at?: string
          id?: string
          range_days?: number
          top_pages?: Json
          top_queries?: Json
          totals?: Json
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      terms_acceptance: {
        Row: {
          accepted_at: string
          accepted_image_rights: boolean | null
          accepted_privacy: boolean | null
          accepted_terms: boolean | null
          id: string
          ip_address: string | null
          participant_id: string | null
          terms_version: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string
          accepted_image_rights?: boolean | null
          accepted_privacy?: boolean | null
          accepted_terms?: boolean | null
          id?: string
          ip_address?: string | null
          participant_id?: string | null
          terms_version: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string
          accepted_image_rights?: boolean | null
          accepted_privacy?: boolean | null
          accepted_terms?: boolean | null
          id?: string
          ip_address?: string | null
          participant_id?: string | null
          terms_version?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          event_type: string | null
          external_event_id: string | null
          gateway_id: string | null
          id: string
          last_retry_at: string | null
          next_retry_at: string | null
          payload: Json
          processed: boolean
          processed_at: string | null
          processing_error: string | null
          provider: string
          received_at: string
          related_order_id: string | null
          retry_count: number
          signature: string | null
          signature_valid: boolean
        }
        Insert: {
          event_type?: string | null
          external_event_id?: string | null
          gateway_id?: string | null
          id?: string
          last_retry_at?: string | null
          next_retry_at?: string | null
          payload: Json
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          provider: string
          received_at?: string
          related_order_id?: string | null
          retry_count?: number
          signature?: string | null
          signature_valid?: boolean
        }
        Update: {
          event_type?: string | null
          external_event_id?: string | null
          gateway_id?: string | null
          id?: string
          last_retry_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          provider?: string
          received_at?: string
          related_order_id?: string | null
          retry_count?: number
          signature?: string | null
          signature_valid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_auth_user: { Args: { _user_id: string }; Returns: undefined }
      admin_set_user_role: {
        Args: {
          _add: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _target: string
        }
        Returns: undefined
      }
      allocate_individual_room: {
        Args: { _order_id: string }
        Returns: boolean
      }
      check_auth_lockout: {
        Args: { _email: string }
        Returns: {
          attempts_left: number
          locked: boolean
          max_attempts: number
        }[]
      }
      clear_auth_lockout: { Args: { _email: string }; Returns: undefined }
      get_auth_user_basic: {
        Args: { _user_id: string }
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          last_sign_in_at: string
          phone: string
          provider: string
        }[]
      }
      get_customer_stats: {
        Args: { _user_id: string }
        Returns: {
          first_order_at: string
          last_order_at: string
          orders_count: number
          paid_orders_count: number
          total_spent_cents: number
        }[]
      }
      get_group_coupon_public: {
        Args: { _coupon: string }
        Returns: {
          available: number
          capacity: number
          coupon_code: string
          created_at: string
          holder_first_name: string
          product_name: string
          product_slug: string
          status: string
          used: number
        }[]
      }
      get_public_avatars: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          id: string
        }[]
      }
      get_public_tracking: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_post_views: { Args: { _slug: string }; Returns: undefined }
      increment_promo_coupon_usage: {
        Args: { _code: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_buyer: { Args: { _user_id: string }; Returns: boolean }
      register_failed_login: {
        Args: { _email: string }
        Returns: {
          attempts_left: number
          locked: boolean
          max_attempts: number
        }[]
      }
      register_participant: {
        Args: {
          _city: string
          _cpf: string
          _email: string
          _full_name: string
          _gender: string
          _metadata?: Json
          _phone: string
          _product_id?: string
          _quantity: number
          _reservation_type: string
        }
        Returns: string
      }
      register_terms_acceptance: {
        Args: {
          _accepted_image_rights: boolean
          _accepted_privacy: boolean
          _accepted_terms: boolean
          _participant_id: string
          _terms_version: string
          _user_agent?: string
        }
        Returns: string
      }
      reservation_group_create: {
        Args: {
          _capacity: number
          _email: string
          _holder_name: string
          _holder_order_id: string
          _holder_user_id: string
          _phone: string
          _product_id: string
          _product_slug: string
        }
        Returns: string
      }
      reservation_group_join_paid: {
        Args: {
          _coupon: string
          _email: string
          _full_name: string
          _order_id: string
          _phone: string
          _user_id: string
        }
        Returns: {
          group_id: string
        }[]
      }
      reservation_group_member_set_room: {
        Args: { _member_id: string; _room_id: string }
        Returns: undefined
      }
      reservation_group_room_add: {
        Args: { _group_id: string }
        Returns: string
      }
      validate_promo_coupon: {
        Args: { _amount_cents: number; _code: string; _product_slug: string }
        Returns: {
          code: string
          discount_cents: number
          discount_type: string
          discount_value: number
          reason: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "editor" | "financeiro" | "customer"
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
    Enums: {
      app_role: ["super_admin", "admin", "editor", "financeiro", "customer"],
    },
  },
} as const
