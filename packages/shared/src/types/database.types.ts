export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          business_id: string | null;
          changes: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          business_id?: string | null;
          changes?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          business_id?: string | null;
          changes?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      availability_exceptions: {
        Row: {
          business_id: string;
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          listing_id: string | null;
          reason: string | null;
          scope: Database["public"]["Enums"]["exception_scope"];
          staff_id: string | null;
          starts_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          id?: string;
          listing_id?: string | null;
          reason?: string | null;
          scope: Database["public"]["Enums"]["exception_scope"];
          staff_id?: string | null;
          starts_at: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          id?: string;
          listing_id?: string | null;
          reason?: string | null;
          scope?: Database["public"]["Enums"]["exception_scope"];
          staff_id?: string | null;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "availability_exceptions_business_id_listing_id_fkey";
            columns: ["business_id", "listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "availability_exceptions_business_id_staff_id_fkey";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      availability_rules: {
        Row: {
          business_id: string;
          capacity: number;
          created_at: string;
          id: string;
          is_active: boolean;
          listing_id: string;
          staff_id: string | null;
          start_time: string;
          updated_at: string;
          valid_from: string;
          valid_until: string | null;
          weekdays: number[];
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          capacity: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          listing_id: string;
          staff_id?: string | null;
          start_time: string;
          updated_at?: string;
          valid_from?: string;
          valid_until?: string | null;
          weekdays: number[];
        };
        Update: {
          business_id?: string;
          capacity?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          listing_id?: string;
          staff_id?: string | null;
          start_time?: string;
          updated_at?: string;
          valid_from?: string;
          valid_until?: string | null;
          weekdays?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "availability_rules_business_id_listing_id_fkey";
            columns: ["business_id", "listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "availability_rules_business_id_staff_id_fkey";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      badge_tags: {
        Row: {
          badge_id: string;
          tag_id: string;
          weight: number;
        };
        ComputedFields: never;
        Insert: {
          badge_id: string;
          tag_id: string;
          weight?: number;
        };
        Update: {
          badge_id?: string;
          tag_id?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "badge_tags_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "badge_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      badges: {
        Row: {
          code: string;
          description: string | null;
          icon: string | null;
          id: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["badge_kind"];
          name: string;
          primary_trait: string | null;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["badge_kind"];
          name: string;
          primary_trait?: string | null;
          sort_order?: number;
        };
        Update: {
          code?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["badge_kind"];
          name?: string;
          primary_trait?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      booking_events: {
        Row: {
          actor_id: string | null;
          booking_id: string;
          business_id: string;
          created_at: string;
          from_status: Database["public"]["Enums"]["booking_status"] | null;
          id: number;
          note: string | null;
          to_status: Database["public"]["Enums"]["booking_status"];
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          booking_id: string;
          business_id: string;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["booking_status"] | null;
          id?: never;
          note?: string | null;
          to_status: Database["public"]["Enums"]["booking_status"];
        };
        Update: {
          actor_id?: string | null;
          booking_id?: string;
          business_id?: string;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["booking_status"] | null;
          id?: never;
          note?: string | null;
          to_status?: Database["public"]["Enums"]["booking_status"];
        };
        Relationships: [
          {
            foreignKeyName: "booking_events_business_id_booking_id_fkey";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      booking_items: {
        Row: {
          booking_id: string;
          business_id: string;
          id: string;
          name: string;
          option_id: string | null;
          quantity: number;
          total_amount: number;
          unit_amount: number;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          business_id: string;
          id?: string;
          name: string;
          option_id?: string | null;
          quantity: number;
          total_amount: number;
          unit_amount: number;
        };
        Update: {
          booking_id?: string;
          business_id?: string;
          id?: string;
          name?: string;
          option_id?: string | null;
          quantity?: number;
          total_amount?: number;
          unit_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "booking_items_business_id_booking_id_fkey";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "booking_items_business_id_option_id_fkey";
            columns: ["business_id", "option_id"];
            isOneToOne: false;
            referencedRelation: "listing_options";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      bookings: {
        Row: {
          business_id: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          code: string;
          completed_at: string | null;
          confirmed_at: string | null;
          consumer_id: string;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          coupon_id: string | null;
          created_at: string;
          currency: string;
          discount_amount: number;
          during: unknown;
          ends_at: string;
          external_ref: string | null;
          fee_amount: number;
          group_id: string | null;
          guest_count: number;
          id: string;
          idempotency_key: string | null;
          listing_id: string;
          location_id: string | null;
          membership_id: string | null;
          notes: string | null;
          payment_status: Database["public"]["Enums"]["booking_payment_status"];
          slot_id: string | null;
          source: Database["public"]["Enums"]["booking_source"];
          staff_id: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          subtotal_amount: number;
          tax_amount: number;
          total_amount: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          code?: string;
          completed_at?: string | null;
          confirmed_at?: string | null;
          consumer_id: string;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          coupon_id?: string | null;
          created_at?: string;
          currency?: string;
          discount_amount?: number;
          during?: never;
          ends_at: string;
          external_ref?: string | null;
          fee_amount?: number;
          group_id?: string | null;
          guest_count?: number;
          id?: string;
          idempotency_key?: string | null;
          listing_id: string;
          location_id?: string | null;
          membership_id?: string | null;
          notes?: string | null;
          payment_status?: Database["public"]["Enums"]["booking_payment_status"];
          slot_id?: string | null;
          source?: Database["public"]["Enums"]["booking_source"];
          staff_id?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["booking_status"];
          subtotal_amount: number;
          tax_amount?: number;
          total_amount: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          code?: string;
          completed_at?: string | null;
          confirmed_at?: string | null;
          consumer_id?: string;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          coupon_id?: string | null;
          created_at?: string;
          currency?: string;
          discount_amount?: number;
          during?: never;
          ends_at?: string;
          external_ref?: string | null;
          fee_amount?: number;
          group_id?: string | null;
          guest_count?: number;
          id?: string;
          idempotency_key?: string | null;
          listing_id?: string;
          location_id?: string | null;
          membership_id?: string | null;
          notes?: string | null;
          payment_status?: Database["public"]["Enums"]["booking_payment_status"];
          slot_id?: string | null;
          source?: Database["public"]["Enums"]["booking_source"];
          staff_id?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          subtotal_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_business_id_listing_id_fkey";
            columns: ["business_id", "listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "bookings_business_id_location_id_fkey";
            columns: ["business_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "business_locations";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "bookings_business_id_slot_id_fkey";
            columns: ["business_id", "slot_id"];
            isOneToOne: false;
            referencedRelation: "slots";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "bookings_business_id_staff_id_fkey";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "bookings_consumer_id_fkey";
            columns: ["consumer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_coupon_fk";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_group_fk";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_membership_fk";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["id"];
          },
        ];
      };
      bucket_list_items: {
        Row: {
          bucket_list_id: string;
          business_id: string | null;
          created_at: string;
          id: string;
          listing_id: string | null;
          note: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          bucket_list_id: string;
          business_id?: string | null;
          created_at?: string;
          id?: string;
          listing_id?: string | null;
          note?: string | null;
          user_id: string;
        };
        Update: {
          bucket_list_id?: string;
          business_id?: string | null;
          created_at?: string;
          id?: string;
          listing_id?: string | null;
          note?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bucket_list_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bucket_list_items_list_fk";
            columns: ["bucket_list_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "bucket_lists";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "bucket_list_items_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      bucket_lists: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          share_token: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          share_token?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          share_token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      business_api_keys: {
        Row: {
          business_id: string;
          created_at: string;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          key_hash: string;
          key_prefix: string;
          last_used_at: string | null;
          name: string;
          revoked_at: string | null;
          scopes: string[];
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          key_hash: string;
          key_prefix: string;
          last_used_at?: string | null;
          name: string;
          revoked_at?: string | null;
          scopes?: string[];
        };
        Update: {
          business_id?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          key_hash?: string;
          key_prefix?: string;
          last_used_at?: string | null;
          name?: string;
          revoked_at?: string | null;
          scopes?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "business_api_keys_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_hours: {
        Row: {
          business_id: string;
          closes_at: string;
          created_at: string;
          id: string;
          opens_at: string;
          updated_at: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          closes_at: string;
          created_at?: string;
          id?: string;
          opens_at: string;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          business_id?: string;
          closes_at?: string;
          created_at?: string;
          id?: string;
          opens_at?: string;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_locations: {
        Row: {
          address_line1: string;
          address_line2: string | null;
          area: string | null;
          business_id: string;
          city: string;
          country_code: string;
          created_at: string;
          geo: unknown;
          id: string;
          is_primary: boolean;
          name: string;
          postal_code: string | null;
          province: string | null;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address_line1: string;
          address_line2?: string | null;
          area?: string | null;
          business_id: string;
          city: string;
          country_code?: string;
          created_at?: string;
          geo?: unknown;
          id?: string;
          is_primary?: boolean;
          name: string;
          postal_code?: string | null;
          province?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          address_line1?: string;
          address_line2?: string | null;
          area?: string | null;
          business_id?: string;
          city?: string;
          country_code?: string;
          created_at?: string;
          geo?: unknown;
          id?: string;
          is_primary?: boolean;
          name?: string;
          postal_code?: string | null;
          province?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_locations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_members: {
        Row: {
          business_id: string;
          created_at: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["business_role"];
          status: Database["public"]["Enums"]["member_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          invited_by?: string | null;
          role: Database["public"]["Enums"]["business_role"];
          status?: Database["public"]["Enums"]["member_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["business_role"];
          status?: Database["public"]["Enums"]["member_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      business_photos: {
        Row: {
          alt: string | null;
          business_id: string;
          created_at: string;
          id: string;
          sort_order: number;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          alt?: string | null;
          business_id: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          url: string;
        };
        Update: {
          alt?: string | null;
          business_id?: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_photos_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_private: {
        Row: {
          business_id: string;
          commission_bps: number | null;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          legal_name: string | null;
          payout_model: Database["public"]["Enums"]["payout_model"] | null;
          tax_id: string | null;
          updated_at: string;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          commission_bps?: number | null;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          legal_name?: string | null;
          payout_model?: Database["public"]["Enums"]["payout_model"] | null;
          tax_id?: string | null;
          updated_at?: string;
          verified_at?: string | null;
        };
        Update: {
          business_id?: string;
          commission_bps?: number | null;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          legal_name?: string | null;
          payout_model?: Database["public"]["Enums"]["payout_model"] | null;
          tax_id?: string | null;
          updated_at?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_private_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          cover_url: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string | null;
          email: string | null;
          external_ref: string | null;
          id: string;
          is_verified: boolean;
          kind: Database["public"]["Enums"]["business_kind"];
          logo_url: string | null;
          name: string;
          phone: string | null;
          rating_avg: number;
          rating_count: number;
          slug: string;
          status: Database["public"]["Enums"]["business_status"];
          tagline: string | null;
          timezone: string;
          updated_at: string;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          email?: string | null;
          external_ref?: string | null;
          id?: string;
          is_verified?: boolean;
          kind: Database["public"]["Enums"]["business_kind"];
          logo_url?: string | null;
          name: string;
          phone?: string | null;
          rating_avg?: number;
          rating_count?: number;
          slug: string;
          status?: Database["public"]["Enums"]["business_status"];
          tagline?: string | null;
          timezone?: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          email?: string | null;
          external_ref?: string | null;
          id?: string;
          is_verified?: boolean;
          kind?: Database["public"]["Enums"]["business_kind"];
          logo_url?: string | null;
          name?: string;
          phone?: string | null;
          rating_avg?: number;
          rating_count?: number;
          slug?: string;
          status?: Database["public"]["Enums"]["business_status"];
          tagline?: string | null;
          timezone?: string;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          icon: string | null;
          id: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["category_kind"];
          name: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          kind: Database["public"]["Enums"]["category_kind"];
          name: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
        };
        Update: {
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["category_kind"];
          name?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          is_muted: boolean;
          joined_at: string;
          last_read_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          conversation_id: string;
          is_muted?: boolean;
          joined_at?: string;
          last_read_at?: string | null;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          is_muted?: boolean;
          joined_at?: string;
          last_read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          booking_id: string | null;
          business_id: string | null;
          created_at: string;
          created_by: string | null;
          group_id: string | null;
          id: string;
          last_message_at: string | null;
          type: Database["public"]["Enums"]["conversation_type"];
        };
        ComputedFields: never;
        Insert: {
          booking_id?: string | null;
          business_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          group_id?: string | null;
          id?: string;
          last_message_at?: string | null;
          type: Database["public"]["Enums"]["conversation_type"];
        };
        Update: {
          booking_id?: string | null;
          business_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          group_id?: string | null;
          id?: string;
          last_message_at?: string | null;
          type?: Database["public"]["Enums"]["conversation_type"];
        };
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: true;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      coupon_redemptions: {
        Row: {
          booking_id: string;
          business_id: string | null;
          coupon_id: string;
          created_at: string;
          discount_amount: number;
          id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          business_id?: string | null;
          coupon_id: string;
          created_at?: string;
          discount_amount: number;
          id?: string;
          user_id: string;
        };
        Update: {
          booking_id?: string;
          business_id?: string | null;
          coupon_id?: string;
          created_at?: string;
          discount_amount?: number;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_redemptions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          business_id: string | null;
          code: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string | null;
          discount_type: Database["public"]["Enums"]["discount_type"];
          discount_value: number;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          is_public: boolean;
          listing_ids: string[] | null;
          max_discount_amount: number | null;
          max_redemptions: number | null;
          min_subtotal_amount: number;
          per_user_limit: number | null;
          starts_at: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id?: string | null;
          code: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          discount_type: Database["public"]["Enums"]["discount_type"];
          discount_value: number;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          is_public?: boolean;
          listing_ids?: string[] | null;
          max_discount_amount?: number | null;
          max_redemptions?: number | null;
          min_subtotal_amount?: number;
          per_user_limit?: number | null;
          starts_at?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string | null;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          discount_type?: Database["public"]["Enums"]["discount_type"];
          discount_value?: number;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          is_public?: boolean;
          listing_ids?: string[] | null;
          max_discount_amount?: number | null;
          max_redemptions?: number | null;
          min_subtotal_amount?: number;
          per_user_limit?: number | null;
          starts_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coupons_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      group_members: {
        Row: {
          created_at: string;
          group_id: string;
          invited_by: string | null;
          joined_at: string | null;
          role: Database["public"]["Enums"]["group_role"];
          status: Database["public"]["Enums"]["group_member_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          group_id: string;
          invited_by?: string | null;
          joined_at?: string | null;
          role?: Database["public"]["Enums"]["group_role"];
          status: Database["public"]["Enums"]["group_member_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          invited_by?: string | null;
          joined_at?: string | null;
          role?: Database["public"]["Enums"]["group_role"];
          status?: Database["public"]["Enums"]["group_member_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          cover_url: string | null;
          created_at: string;
          description: string | null;
          destination_city: string | null;
          destination_geo: unknown;
          end_date: string | null;
          id: string;
          interest_tag_ids: string[];
          is_open_to_match: boolean;
          max_members: number;
          name: string;
          owner_id: string;
          start_date: string | null;
          updated_at: string;
          visibility: Database["public"]["Enums"]["group_visibility"];
        };
        ComputedFields: never;
        Insert: {
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          destination_city?: string | null;
          destination_geo?: unknown;
          end_date?: string | null;
          id?: string;
          interest_tag_ids?: string[];
          is_open_to_match?: boolean;
          max_members?: number;
          name: string;
          owner_id: string;
          start_date?: string | null;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["group_visibility"];
        };
        Update: {
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          destination_city?: string | null;
          destination_geo?: unknown;
          end_date?: string | null;
          id?: string;
          interest_tag_ids?: string[];
          is_open_to_match?: boolean;
          max_members?: number;
          name?: string;
          owner_id?: string;
          start_date?: string | null;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["group_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      legal_acceptances: {
        Row: {
          accepted_at: string;
          document_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string;
          document_id: string;
          user_id: string;
        };
        Update: {
          accepted_at?: string;
          document_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "legal_acceptances_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "legal_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      legal_documents: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          published_at: string | null;
          title: string;
          type: Database["public"]["Enums"]["legal_document_type"];
          version: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          published_at?: string | null;
          title: string;
          type: Database["public"]["Enums"]["legal_document_type"];
          version: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          published_at?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["legal_document_type"];
          version?: string;
        };
        Relationships: [];
      };
      listing_media: {
        Row: {
          alt: string | null;
          business_id: string;
          created_at: string;
          id: string;
          listing_id: string;
          sort_order: number;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          alt?: string | null;
          business_id: string;
          created_at?: string;
          id?: string;
          listing_id: string;
          sort_order?: number;
          url: string;
        };
        Update: {
          alt?: string | null;
          business_id?: string;
          created_at?: string;
          id?: string;
          listing_id?: string;
          sort_order?: number;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listing_media_business_id_listing_id_fkey";
            columns: ["business_id", "listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      listing_options: {
        Row: {
          business_id: string;
          description: string | null;
          duration_minutes: number | null;
          external_ref: string | null;
          id: string;
          is_active: boolean;
          listing_id: string;
          max_quantity: number | null;
          name: string;
          price_amount: number;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          description?: string | null;
          duration_minutes?: number | null;
          external_ref?: string | null;
          id?: string;
          is_active?: boolean;
          listing_id: string;
          max_quantity?: number | null;
          name: string;
          price_amount: number;
          sort_order?: number;
        };
        Update: {
          business_id?: string;
          description?: string | null;
          duration_minutes?: number | null;
          external_ref?: string | null;
          id?: string;
          is_active?: boolean;
          listing_id?: string;
          max_quantity?: number | null;
          name?: string;
          price_amount?: number;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "listing_options_business_id_listing_id_fkey";
            columns: ["business_id", "listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      listing_staff: {
        Row: {
          business_id: string;
          listing_id: string;
          staff_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          listing_id: string;
          staff_id: string;
        };
        Update: {
          business_id?: string;
          listing_id?: string;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listing_staff_business_id_listing_id_fkey";
            columns: ["business_id", "listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "listing_staff_business_id_staff_id_fkey";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      listing_tags: {
        Row: {
          business_id: string;
          listing_id: string;
          tag_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          listing_id: string;
          tag_id: string;
        };
        Update: {
          business_id?: string;
          listing_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listing_tags_business_id_listing_id_fkey";
            columns: ["business_id", "listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "listing_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          booking_count: number;
          booking_mode: Database["public"]["Enums"]["booking_mode"];
          buffer_minutes: number;
          business_id: string;
          cancellation_policy: Database["public"]["Enums"]["cancellation_policy"];
          category_id: string | null;
          city: string;
          created_at: string;
          currency: string;
          description: string | null;
          duration_minutes: number;
          excludes: string[];
          external_ref: string | null;
          id: string;
          includes: string[];
          instant_book: boolean;
          languages: string[];
          location_id: string | null;
          max_guests: number;
          meeting_point: unknown;
          meeting_point_notes: string | null;
          min_guests: number;
          popularity_score: number;
          price_amount: number;
          price_unit: Database["public"]["Enums"]["price_unit"];
          published_at: string | null;
          rating_avg: number;
          rating_count: number;
          search_vector: unknown;
          slot_interval_minutes: number;
          slug: string;
          status: Database["public"]["Enums"]["listing_status"];
          summary: string | null;
          title: string;
          type: Database["public"]["Enums"]["listing_type"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          booking_count?: number;
          booking_mode: Database["public"]["Enums"]["booking_mode"];
          buffer_minutes?: number;
          business_id: string;
          cancellation_policy?: Database["public"]["Enums"]["cancellation_policy"];
          category_id?: string | null;
          city: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          duration_minutes: number;
          excludes?: string[];
          external_ref?: string | null;
          id?: string;
          includes?: string[];
          instant_book?: boolean;
          languages?: string[];
          location_id?: string | null;
          max_guests?: number;
          meeting_point?: unknown;
          meeting_point_notes?: string | null;
          min_guests?: number;
          popularity_score?: number;
          price_amount: number;
          price_unit?: Database["public"]["Enums"]["price_unit"];
          published_at?: string | null;
          rating_avg?: number;
          rating_count?: number;
          search_vector?: never;
          slot_interval_minutes?: number;
          slug: string;
          status?: Database["public"]["Enums"]["listing_status"];
          summary?: string | null;
          title: string;
          type: Database["public"]["Enums"]["listing_type"];
          updated_at?: string;
        };
        Update: {
          booking_count?: number;
          booking_mode?: Database["public"]["Enums"]["booking_mode"];
          buffer_minutes?: number;
          business_id?: string;
          cancellation_policy?: Database["public"]["Enums"]["cancellation_policy"];
          category_id?: string | null;
          city?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          duration_minutes?: number;
          excludes?: string[];
          external_ref?: string | null;
          id?: string;
          includes?: string[];
          instant_book?: boolean;
          languages?: string[];
          location_id?: string | null;
          max_guests?: number;
          meeting_point?: unknown;
          meeting_point_notes?: string | null;
          min_guests?: number;
          popularity_score?: number;
          price_amount?: number;
          price_unit?: Database["public"]["Enums"]["price_unit"];
          published_at?: string | null;
          rating_avg?: number;
          rating_count?: number;
          search_vector?: never;
          slot_interval_minutes?: number;
          slug?: string;
          status?: Database["public"]["Enums"]["listing_status"];
          summary?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["listing_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_business_id_location_id_fkey";
            columns: ["business_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "business_locations";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "listings_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      membership_plans: {
        Row: {
          benefits: NonNullable<Json>;
          business_id: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          discount_percent: number | null;
          id: string;
          included_sessions: number | null;
          interval: Database["public"]["Enums"]["membership_interval"];
          is_active: boolean;
          name: string;
          price_amount: number;
          provider: string | null;
          provider_plan_ref: string | null;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          benefits?: NonNullable<Json>;
          business_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          discount_percent?: number | null;
          id?: string;
          included_sessions?: number | null;
          interval: Database["public"]["Enums"]["membership_interval"];
          is_active?: boolean;
          name: string;
          price_amount: number;
          provider?: string | null;
          provider_plan_ref?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          benefits?: NonNullable<Json>;
          business_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          discount_percent?: number | null;
          id?: string;
          included_sessions?: number | null;
          interval?: Database["public"]["Enums"]["membership_interval"];
          is_active?: boolean;
          name?: string;
          price_amount?: number;
          provider?: string | null;
          provider_plan_ref?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "membership_plans_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          business_id: string | null;
          cancel_at_period_end: boolean;
          cancelled_at: string | null;
          created_at: string;
          current_period_end: string | null;
          external_ref: string | null;
          id: string;
          plan_id: string;
          provider: string | null;
          provider_subscription_ref: string | null;
          sessions_remaining: number | null;
          started_at: string;
          status: Database["public"]["Enums"]["membership_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id?: string | null;
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          external_ref?: string | null;
          id?: string;
          plan_id: string;
          provider?: string | null;
          provider_subscription_ref?: string | null;
          sessions_remaining?: number | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          business_id?: string | null;
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          external_ref?: string | null;
          id?: string;
          plan_id?: string;
          provider?: string | null;
          provider_subscription_ref?: string | null;
          sessions_remaining?: number | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "membership_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          attachments: NonNullable<Json>;
          body: string | null;
          conversation_id: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          sender_business_id: string | null;
          sender_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          attachments?: NonNullable<Json>;
          body?: string | null;
          conversation_id: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          sender_business_id?: string | null;
          sender_id?: string | null;
        };
        Update: {
          attachments?: NonNullable<Json>;
          body?: string | null;
          conversation_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          sender_business_id?: string | null;
          sender_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_business_id_fkey";
            columns: ["sender_business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          data: NonNullable<Json>;
          id: string;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      payment_customers: {
        Row: {
          created_at: string;
          provider: string;
          provider_customer_ref: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          provider: string;
          provider_customer_ref: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          provider?: string;
          provider_customer_ref?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          booking_id: string | null;
          business_id: string | null;
          collected_by: Database["public"]["Enums"]["payout_model"];
          created_at: string;
          currency: string;
          failure_reason: string | null;
          id: string;
          membership_id: string | null;
          metadata: NonNullable<Json>;
          method: string | null;
          method_summary: string | null;
          paid_at: string | null;
          payer_id: string | null;
          platform_fee_amount: number;
          provider: string;
          provider_account_ref: string | null;
          provider_transaction_ref: string | null;
          recorded_by: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          booking_id?: string | null;
          business_id?: string | null;
          collected_by: Database["public"]["Enums"]["payout_model"];
          created_at?: string;
          currency?: string;
          failure_reason?: string | null;
          id?: string;
          membership_id?: string | null;
          metadata?: NonNullable<Json>;
          method?: string | null;
          method_summary?: string | null;
          paid_at?: string | null;
          payer_id?: string | null;
          platform_fee_amount?: number;
          provider: string;
          provider_account_ref?: string | null;
          provider_transaction_ref?: string | null;
          recorded_by?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Update: {
          amount?: number;
          booking_id?: string | null;
          business_id?: string | null;
          collected_by?: Database["public"]["Enums"]["payout_model"];
          created_at?: string;
          currency?: string;
          failure_reason?: string | null;
          id?: string;
          membership_id?: string | null;
          metadata?: NonNullable<Json>;
          method?: string | null;
          method_summary?: string | null;
          paid_at?: string | null;
          payer_id?: string | null;
          platform_fee_amount?: number;
          provider?: string;
          provider_account_ref?: string | null;
          provider_transaction_ref?: string | null;
          recorded_by?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_business_id_booking_id_fkey";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "payments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_membership_fk";
            columns: ["membership_id"];
            isOneToOne: false;
            referencedRelation: "memberships";
            referencedColumns: ["id"];
          },
        ];
      };
      payout_accounts: {
        Row: {
          account_number_last4: string | null;
          account_title: string;
          bank_name: string | null;
          business_id: string;
          created_at: string;
          iban_masked: string | null;
          id: string;
          is_default: boolean;
          provider: string;
          provider_account_ref: string | null;
          updated_at: string;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          account_number_last4?: string | null;
          account_title: string;
          bank_name?: string | null;
          business_id: string;
          created_at?: string;
          iban_masked?: string | null;
          id?: string;
          is_default?: boolean;
          provider: string;
          provider_account_ref?: string | null;
          updated_at?: string;
          verified_at?: string | null;
        };
        Update: {
          account_number_last4?: string | null;
          account_title?: string;
          bank_name?: string | null;
          business_id?: string;
          created_at?: string;
          iban_masked?: string | null;
          id?: string;
          is_default?: boolean;
          provider?: string;
          provider_account_ref?: string | null;
          updated_at?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payout_accounts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      payout_items: {
        Row: {
          business_id: string;
          fee_amount: number;
          gross_amount: number;
          net_amount: number;
          payment_id: string;
          payout_id: string;
          refund_amount: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          fee_amount?: number;
          gross_amount: number;
          net_amount: number;
          payment_id: string;
          payout_id: string;
          refund_amount?: number;
        };
        Update: {
          business_id?: string;
          fee_amount?: number;
          gross_amount?: number;
          net_amount?: number;
          payment_id?: string;
          payout_id?: string;
          refund_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "payout_items_business_id_payment_id_fkey";
            columns: ["business_id", "payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "payout_items_business_id_payout_id_fkey";
            columns: ["business_id", "payout_id"];
            isOneToOne: false;
            referencedRelation: "payouts";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      payouts: {
        Row: {
          amount: number;
          business_id: string;
          created_at: string;
          currency: string;
          id: string;
          paid_at: string | null;
          payout_account_id: string | null;
          period_end: string | null;
          period_start: string | null;
          provider: string | null;
          provider_payout_ref: string | null;
          status: Database["public"]["Enums"]["payout_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          business_id: string;
          created_at?: string;
          currency?: string;
          id?: string;
          paid_at?: string | null;
          payout_account_id?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          provider?: string | null;
          provider_payout_ref?: string | null;
          status?: Database["public"]["Enums"]["payout_status"];
          updated_at?: string;
        };
        Update: {
          amount?: number;
          business_id?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          paid_at?: string | null;
          payout_account_id?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          provider?: string | null;
          provider_payout_ref?: string | null;
          status?: Database["public"]["Enums"]["payout_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payouts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payouts_business_id_payout_account_id_fkey";
            columns: ["business_id", "payout_account_id"];
            isOneToOne: false;
            referencedRelation: "payout_accounts";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      place_recommendations: {
        Row: {
          address: string | null;
          admin_notes: string | null;
          business_id: string | null;
          category_id: string | null;
          city: string;
          contact_phone: string | null;
          created_at: string;
          geo: unknown;
          id: string;
          name: string;
          note: string | null;
          status: Database["public"]["Enums"]["recommendation_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          admin_notes?: string | null;
          business_id?: string | null;
          category_id?: string | null;
          city: string;
          contact_phone?: string | null;
          created_at?: string;
          geo?: unknown;
          id?: string;
          name: string;
          note?: string | null;
          status?: Database["public"]["Enums"]["recommendation_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string | null;
          admin_notes?: string | null;
          business_id?: string | null;
          category_id?: string | null;
          city?: string;
          contact_phone?: string | null;
          created_at?: string;
          geo?: unknown;
          id?: string;
          name?: string;
          note?: string | null;
          status?: Database["public"]["Enums"]["recommendation_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "place_recommendations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "place_recommendations_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          description: string | null;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          description?: string | null;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string | null;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      profile_private: {
        Row: {
          date_of_birth: string | null;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          locale: string;
          notification_prefs: NonNullable<Json>;
          phone: string | null;
          sign_up_completed_at: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          date_of_birth?: string | null;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          locale?: string;
          notification_prefs?: NonNullable<Json>;
          phone?: string | null;
          sign_up_completed_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          date_of_birth?: string | null;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          locale?: string;
          notification_prefs?: NonNullable<Json>;
          phone?: string | null;
          sign_up_completed_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string;
          home_city: string | null;
          id: string;
          personality_badge_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          home_city?: string | null;
          id: string;
          personality_badge_id?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          home_city?: string | null;
          id?: string;
          personality_badge_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_personality_badge_fk";
            columns: ["personality_badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
        ];
      };
      push_tokens: {
        Row: {
          created_at: string;
          device_name: string | null;
          id: string;
          last_seen_at: string;
          platform: Database["public"]["Enums"]["device_platform"];
          token: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          last_seen_at?: string;
          platform: Database["public"]["Enums"]["device_platform"];
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          last_seen_at?: string;
          platform?: Database["public"]["Enums"]["device_platform"];
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      quiz_answers: {
        Row: {
          icon: string | null;
          id: string;
          image_url: string | null;
          label: string;
          question_id: string;
          sort_order: number;
          trait_weights: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          icon?: string | null;
          id?: string;
          image_url?: string | null;
          label: string;
          question_id: string;
          sort_order?: number;
          trait_weights?: NonNullable<Json>;
        };
        Update: {
          icon?: string | null;
          id?: string;
          image_url?: string | null;
          label?: string;
          question_id?: string;
          sort_order?: number;
          trait_weights?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          config: NonNullable<Json>;
          id: string;
          image_url: string | null;
          is_active: boolean;
          kind: Database["public"]["Enums"]["quiz_question_kind"];
          prompt: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          config?: NonNullable<Json>;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["quiz_question_kind"];
          prompt: string;
          sort_order?: number;
        };
        Update: {
          config?: NonNullable<Json>;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["quiz_question_kind"];
          prompt?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      quiz_results: {
        Row: {
          answer_ids: string[];
          badge_id: string | null;
          completed_at: string;
          id: string;
          trait_scores: NonNullable<Json>;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          answer_ids: string[];
          badge_id?: string | null;
          completed_at?: string;
          id?: string;
          trait_scores: NonNullable<Json>;
          user_id: string;
        };
        Update: {
          answer_ids?: string[];
          badge_id?: string | null;
          completed_at?: string;
          id?: string;
          trait_scores?: NonNullable<Json>;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_results_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
        ];
      };
      refunds: {
        Row: {
          amount: number;
          business_id: string | null;
          created_at: string;
          currency: string;
          id: string;
          payment_id: string;
          processed_at: string | null;
          provider_refund_ref: string | null;
          reason: string | null;
          requested_by: string | null;
          status: Database["public"]["Enums"]["refund_status"];
          to_wallet: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          business_id?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          payment_id: string;
          processed_at?: string | null;
          provider_refund_ref?: string | null;
          reason?: string | null;
          requested_by?: string | null;
          status?: Database["public"]["Enums"]["refund_status"];
          to_wallet?: boolean;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          business_id?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          payment_id?: string;
          processed_at?: string | null;
          provider_refund_ref?: string | null;
          reason?: string | null;
          requested_by?: string | null;
          status?: Database["public"]["Enums"]["refund_status"];
          to_wallet?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_business_id_payment_id_fkey";
            columns: ["business_id", "payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "refunds_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          author_id: string;
          body: string | null;
          booking_id: string;
          business_id: string;
          business_reply: string | null;
          created_at: string;
          id: string;
          listing_id: string;
          photos: string[];
          rating: number;
          replied_at: string | null;
          replied_by: string | null;
          staff_id: string | null;
          status: Database["public"]["Enums"]["review_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          body?: string | null;
          booking_id: string;
          business_id: string;
          business_reply?: string | null;
          created_at?: string;
          id?: string;
          listing_id: string;
          photos?: string[];
          rating: number;
          replied_at?: string | null;
          replied_by?: string | null;
          staff_id?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string | null;
          booking_id?: string;
          business_id?: string;
          business_reply?: string | null;
          created_at?: string;
          id?: string;
          listing_id?: string;
          photos?: string[];
          rating?: number;
          replied_at?: string | null;
          replied_by?: string | null;
          staff_id?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_business_id_booking_id_fkey";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "reviews_business_id_listing_id_fkey";
            columns: ["business_id", "listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "reviews_business_id_staff_id_fkey";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      slots: {
        Row: {
          business_id: string;
          capacity: number;
          created_at: string;
          ends_at: string;
          external_ref: string | null;
          id: string;
          listing_id: string;
          rule_id: string | null;
          seats_booked: number;
          staff_id: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["slot_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          capacity: number;
          created_at?: string;
          ends_at: string;
          external_ref?: string | null;
          id?: string;
          listing_id: string;
          rule_id?: string | null;
          seats_booked?: number;
          staff_id?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["slot_status"];
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          capacity?: number;
          created_at?: string;
          ends_at?: string;
          external_ref?: string | null;
          id?: string;
          listing_id?: string;
          rule_id?: string | null;
          seats_booked?: number;
          staff_id?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["slot_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "slots_business_id_listing_id_fkey";
            columns: ["business_id", "listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "slots_business_id_staff_id_fkey";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "slots_rule_id_fkey";
            columns: ["rule_id"];
            isOneToOne: false;
            referencedRelation: "availability_rules";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_members: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          business_id: string;
          created_at: string;
          display_name: string;
          external_ref: string | null;
          id: string;
          is_active: boolean;
          is_bookable: boolean;
          is_host: boolean;
          languages: string[];
          rating_avg: number;
          rating_count: number;
          title: string | null;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          business_id: string;
          created_at?: string;
          display_name: string;
          external_ref?: string | null;
          id?: string;
          is_active?: boolean;
          is_bookable?: boolean;
          is_host?: boolean;
          languages?: string[];
          rating_avg?: number;
          rating_count?: number;
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          business_id?: string;
          created_at?: string;
          display_name?: string;
          external_ref?: string | null;
          id?: string;
          is_active?: boolean;
          is_bookable?: boolean;
          is_host?: boolean;
          languages?: string[];
          rating_avg?: number;
          rating_count?: number;
          title?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_schedules: {
        Row: {
          business_id: string;
          created_at: string;
          end_time: string;
          id: string;
          location_id: string | null;
          staff_id: string;
          start_time: string;
          valid_from: string | null;
          valid_until: string | null;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          end_time: string;
          id?: string;
          location_id?: string | null;
          staff_id: string;
          start_time: string;
          valid_from?: string | null;
          valid_until?: string | null;
          weekday: number;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          end_time?: string;
          id?: string;
          location_id?: string | null;
          staff_id?: string;
          start_time?: string;
          valid_from?: string | null;
          valid_until?: string | null;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "staff_schedules_business_id_location_id_fkey";
            columns: ["business_id", "location_id"];
            isOneToOne: false;
            referencedRelation: "business_locations";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "staff_schedules_business_id_staff_id_fkey";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      support_messages: {
        Row: {
          attachments: NonNullable<Json>;
          body: string;
          created_at: string;
          id: string;
          is_staff_reply: boolean;
          sender_id: string | null;
          ticket_id: string;
        };
        ComputedFields: never;
        Insert: {
          attachments?: NonNullable<Json>;
          body: string;
          created_at?: string;
          id?: string;
          is_staff_reply?: boolean;
          sender_id?: string | null;
          ticket_id: string;
        };
        Update: {
          attachments?: NonNullable<Json>;
          body?: string;
          created_at?: string;
          id?: string;
          is_staff_reply?: boolean;
          sender_id?: string | null;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          assigned_to: string | null;
          booking_id: string | null;
          business_id: string | null;
          created_at: string;
          id: string;
          status: Database["public"]["Enums"]["support_status"];
          subject: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_to?: string | null;
          booking_id?: string | null;
          business_id?: string | null;
          created_at?: string;
          id?: string;
          status?: Database["public"]["Enums"]["support_status"];
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assigned_to?: string | null;
          booking_id?: string | null;
          business_id?: string | null;
          created_at?: string;
          id?: string;
          status?: Database["public"]["Enums"]["support_status"];
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_tickets_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          awarded_at: string;
          badge_id: string;
          source: Database["public"]["Enums"]["badge_source"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          awarded_at?: string;
          badge_id: string;
          source: Database["public"]["Enums"]["badge_source"];
          user_id: string;
        };
        Update: {
          awarded_at?: string;
          badge_id?: string;
          source?: Database["public"]["Enums"]["badge_source"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_transactions: {
        Row: {
          amount: number;
          booking_id: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          refund_id: string | null;
          type: Database["public"]["Enums"]["wallet_transaction_type"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          booking_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          refund_id?: string | null;
          type: Database["public"]["Enums"]["wallet_transaction_type"];
          user_id: string;
        };
        Update: {
          amount?: number;
          booking_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          refund_id?: string | null;
          type?: Database["public"]["Enums"]["wallet_transaction_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wallet_transactions_refund_id_fkey";
            columns: ["refund_id"];
            isOneToOne: false;
            referencedRelation: "refunds";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      wallet_balances: {
        Row: {
          balance: number | null;
          currency: string;
          user_id: string;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      business_is_open: {
        Args: { p_at?: string; p_business_id: string };
        Returns: boolean;
      };
      business_location_points: {
        Args: { p_business_id: string };
        Returns: {
          lat: number;
          lng: number;
          location_id: string;
        }[];
      };
      cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string };
        Returns: {
          business_id: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          code: string;
          completed_at: string | null;
          confirmed_at: string | null;
          consumer_id: string;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          coupon_id: string | null;
          created_at: string;
          currency: string;
          discount_amount: number;
          during: unknown;
          ends_at: string;
          external_ref: string | null;
          fee_amount: number;
          group_id: string | null;
          guest_count: number;
          id: string;
          idempotency_key: string | null;
          listing_id: string;
          location_id: string | null;
          membership_id: string | null;
          notes: string | null;
          payment_status: Database["public"]["Enums"]["booking_payment_status"];
          slot_id: string | null;
          source: Database["public"]["Enums"]["booking_source"];
          staff_id: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          subtotal_amount: number;
          tax_amount: number;
          total_amount: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_booking: {
        Args: {
          p_contact_phone?: string;
          p_coupon_code?: string;
          p_group_id?: string;
          p_guest_count?: number;
          p_idempotency_key?: string;
          p_items?: Json;
          p_listing_id: string;
          p_notes?: string;
          p_slot_id?: string;
          p_source?: Database["public"]["Enums"]["booking_source"];
          p_staff_id?: string;
          p_starts_at?: string;
        };
        Returns: {
          business_id: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          code: string;
          completed_at: string | null;
          confirmed_at: string | null;
          consumer_id: string;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          coupon_id: string | null;
          created_at: string;
          currency: string;
          discount_amount: number;
          during: unknown;
          ends_at: string;
          external_ref: string | null;
          fee_amount: number;
          group_id: string | null;
          guest_count: number;
          id: string;
          idempotency_key: string | null;
          listing_id: string;
          location_id: string | null;
          membership_id: string | null;
          notes: string | null;
          payment_status: Database["public"]["Enums"]["booking_payment_status"];
          slot_id: string | null;
          source: Database["public"]["Enums"]["booking_source"];
          staff_id: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          subtotal_amount: number;
          tax_amount: number;
          total_amount: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_business_api_key: {
        Args: { p_business_id: string; p_name: string; p_scopes?: string[] };
        Returns: {
          api_key: string;
          id: string;
          key_prefix: string;
        }[];
      };
      email_sign_in_method: { Args: { p_email: string }; Returns: string };
      find_matching_groups: {
        Args: {
          p_city?: string;
          p_end?: string;
          p_limit?: number;
          p_start?: string;
        };
        Returns: {
          cover_url: string | null;
          created_at: string;
          description: string | null;
          destination_city: string | null;
          destination_geo: unknown;
          end_date: string | null;
          id: string;
          interest_tag_ids: string[];
          is_open_to_match: boolean;
          max_members: number;
          name: string;
          owner_id: string;
          start_date: string | null;
          updated_at: string;
          visibility: Database["public"]["Enums"]["group_visibility"];
        }[];
        SetofOptions: {
          from: "*";
          to: "groups";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      get_available_times: {
        Args: {
          p_date: string;
          p_listing_id: string;
          p_option_id?: string;
          p_staff_id?: string;
        };
        Returns: {
          ends_at: string;
          staff_id: string;
          starts_at: string;
        }[];
      };
      listing_distances: {
        Args: { p_lat: number; p_listing_ids: string[]; p_lng: number };
        Returns: {
          distance_km: number;
          listing_id: string;
        }[];
      };
      recommended_listings: {
        Args: { p_city?: string; p_limit?: number };
        Returns: {
          booking_count: number;
          booking_mode: Database["public"]["Enums"]["booking_mode"];
          buffer_minutes: number;
          business_id: string;
          cancellation_policy: Database["public"]["Enums"]["cancellation_policy"];
          category_id: string | null;
          city: string;
          created_at: string;
          currency: string;
          description: string | null;
          duration_minutes: number;
          excludes: string[];
          external_ref: string | null;
          id: string;
          includes: string[];
          instant_book: boolean;
          languages: string[];
          location_id: string | null;
          max_guests: number;
          meeting_point: unknown;
          meeting_point_notes: string | null;
          min_guests: number;
          popularity_score: number;
          price_amount: number;
          price_unit: Database["public"]["Enums"]["price_unit"];
          published_at: string | null;
          rating_avg: number;
          rating_count: number;
          search_vector: unknown;
          slot_interval_minutes: number;
          slug: string;
          status: Database["public"]["Enums"]["listing_status"];
          summary: string | null;
          title: string;
          type: Database["public"]["Enums"]["listing_type"];
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "listings";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      reply_to_review: {
        Args: { p_reply: string; p_review_id: string };
        Returns: {
          author_id: string;
          body: string | null;
          booking_id: string;
          business_id: string;
          business_reply: string | null;
          created_at: string;
          id: string;
          listing_id: string;
          photos: string[];
          rating: number;
          replied_at: string | null;
          replied_by: string | null;
          staff_id: string | null;
          status: Database["public"]["Enums"]["review_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "reviews";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reviewable_bookings: {
        Args: { p_business_id: string };
        Returns: {
          booking_id: string;
          listing_id: string;
          listing_title: string;
          starts_at: string;
        }[];
      };
      start_business_conversation: {
        Args: { p_booking_id?: string; p_business_id: string };
        Returns: {
          booking_id: string | null;
          business_id: string | null;
          created_at: string;
          created_by: string | null;
          group_id: string | null;
          id: string;
          last_message_at: string | null;
          type: Database["public"]["Enums"]["conversation_type"];
        };
        SetofOptions: {
          from: "*";
          to: "conversations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      start_direct_conversation: {
        Args: { p_user_id: string };
        Returns: {
          booking_id: string | null;
          business_id: string | null;
          created_at: string;
          created_by: string | null;
          group_id: string | null;
          id: string;
          last_message_at: string | null;
          type: Database["public"]["Enums"]["conversation_type"];
        };
        SetofOptions: {
          from: "*";
          to: "conversations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_quiz: {
        Args: { p_answer_ids: string[] };
        Returns: {
          answer_ids: string[];
          badge_id: string | null;
          completed_at: string;
          id: string;
          trait_scores: NonNullable<Json>;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "quiz_results";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_booking_status: {
        Args: {
          p_booking_id: string;
          p_reason?: string;
          p_status: Database["public"]["Enums"]["booking_status"];
        };
        Returns: {
          business_id: string;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          code: string;
          completed_at: string | null;
          confirmed_at: string | null;
          consumer_id: string;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          coupon_id: string | null;
          created_at: string;
          currency: string;
          discount_amount: number;
          during: unknown;
          ends_at: string;
          external_ref: string | null;
          fee_amount: number;
          group_id: string | null;
          guest_count: number;
          id: string;
          idempotency_key: string | null;
          listing_id: string;
          location_id: string | null;
          membership_id: string | null;
          notes: string | null;
          payment_status: Database["public"]["Enums"]["booking_payment_status"];
          slot_id: string | null;
          source: Database["public"]["Enums"]["booking_source"];
          staff_id: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          subtotal_amount: number;
          tax_amount: number;
          total_amount: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      badge_kind: "personality" | "achievement";
      badge_source: "quiz" | "achievement" | "admin";
      booking_mode: "slot" | "appointment";
      booking_payment_status:
        | "unpaid"
        | "partially_paid"
        | "paid"
        | "partially_refunded"
        | "refunded";
      booking_source: "app" | "web" | "portal" | "pos";
      booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled_by_consumer"
        | "cancelled_by_business"
        | "no_show";
      business_kind: "host" | "operator" | "venue";
      business_role: "owner" | "manager" | "staff";
      business_status: "draft" | "pending_review" | "active" | "suspended";
      cancellation_policy:
        "flexible" | "moderate" | "strict" | "non_refundable";
      category_kind: "experience" | "service";
      conversation_type: "direct" | "business" | "group";
      device_platform: "ios" | "android" | "web";
      discount_type: "percent" | "fixed";
      exception_scope: "business" | "listing" | "staff";
      group_member_status: "invited" | "requested" | "active" | "left";
      group_role: "owner" | "admin" | "member";
      group_visibility: "private" | "public";
      legal_document_type: "terms" | "privacy" | "cancellation" | "host_terms";
      listing_status: "draft" | "published" | "archived";
      listing_type: "experience" | "service";
      member_status: "invited" | "active";
      membership_interval: "month" | "year" | "one_time";
      membership_status: "active" | "past_due" | "cancelled" | "expired";
      payment_status: "pending" | "succeeded" | "failed" | "cancelled";
      payout_model: "direct" | "platform_collect";
      payout_status: "pending" | "processing" | "paid" | "failed";
      price_unit: "per_person" | "per_booking";
      quiz_question_kind:
        "photo_list" | "emoji_list" | "glass" | "seat" | "slider";
      recommendation_status: "new" | "reviewed" | "onboarded" | "rejected";
      refund_status: "pending" | "succeeded" | "failed";
      review_status: "published" | "hidden" | "flagged";
      slot_status: "open" | "full" | "cancelled";
      support_status: "open" | "pending" | "resolved" | "closed";
      wallet_transaction_type:
        "credit" | "debit" | "refund_credit" | "promo" | "adjustment";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      badge_kind: ["personality", "achievement"],
      badge_source: ["quiz", "achievement", "admin"],
      booking_mode: ["slot", "appointment"],
      booking_payment_status: [
        "unpaid",
        "partially_paid",
        "paid",
        "partially_refunded",
        "refunded",
      ],
      booking_source: ["app", "web", "portal", "pos"],
      booking_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled_by_consumer",
        "cancelled_by_business",
        "no_show",
      ],
      business_kind: ["host", "operator", "venue"],
      business_role: ["owner", "manager", "staff"],
      business_status: ["draft", "pending_review", "active", "suspended"],
      cancellation_policy: ["flexible", "moderate", "strict", "non_refundable"],
      category_kind: ["experience", "service"],
      conversation_type: ["direct", "business", "group"],
      device_platform: ["ios", "android", "web"],
      discount_type: ["percent", "fixed"],
      exception_scope: ["business", "listing", "staff"],
      group_member_status: ["invited", "requested", "active", "left"],
      group_role: ["owner", "admin", "member"],
      group_visibility: ["private", "public"],
      legal_document_type: ["terms", "privacy", "cancellation", "host_terms"],
      listing_status: ["draft", "published", "archived"],
      listing_type: ["experience", "service"],
      member_status: ["invited", "active"],
      membership_interval: ["month", "year", "one_time"],
      membership_status: ["active", "past_due", "cancelled", "expired"],
      payment_status: ["pending", "succeeded", "failed", "cancelled"],
      payout_model: ["direct", "platform_collect"],
      payout_status: ["pending", "processing", "paid", "failed"],
      price_unit: ["per_person", "per_booking"],
      quiz_question_kind: [
        "photo_list",
        "emoji_list",
        "glass",
        "seat",
        "slider",
      ],
      recommendation_status: ["new", "reviewed", "onboarded", "rejected"],
      refund_status: ["pending", "succeeded", "failed"],
      review_status: ["published", "hidden", "flagged"],
      slot_status: ["open", "full", "cancelled"],
      support_status: ["open", "pending", "resolved", "closed"],
      wallet_transaction_type: [
        "credit",
        "debit",
        "refund_credit",
        "promo",
        "adjustment",
      ],
    },
  },
} as const;
