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
      current_stats: {
        Row: {
          bench_max: number;
          created_at: string;
          deadlift_max: number;
          id: string;
          squat_max: number;
          updated_at: string;
          user_id: string;
          weight: number;
        };
        Insert: {
          bench_max?: number;
          created_at?: string;
          deadlift_max?: number;
          id?: string;
          squat_max?: number;
          updated_at?: string;
          user_id: string;
          weight?: number;
        };
        Update: {
          bench_max?: number;
          created_at?: string;
          deadlift_max?: number;
          id?: string;
          squat_max?: number;
          updated_at?: string;
          user_id?: string;
          weight?: number;
        };
        Relationships: [];
      };
      equipment_checklist: {
        Row: {
          category: string;
          checked: boolean | null;
          created_at: string;
          custom_item: boolean | null;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category: string;
          checked?: boolean | null;
          created_at?: string;
          custom_item?: boolean | null;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          checked?: boolean | null;
          created_at?: string;
          custom_item?: boolean | null;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      meet_goals: {
        Row: {
          confidence: number;
          created_at: string;
          id: string;
          lift_type: string;
          meet_id: string;
          opener: number;
          second: number;
          third: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          confidence?: number;
          created_at?: string;
          id?: string;
          lift_type: string;
          meet_id: string;
          opener?: number;
          second?: number;
          third?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          confidence?: number;
          created_at?: string;
          id?: string;
          lift_type?: string;
          meet_id?: string;
          opener?: number;
          second?: number;
          third?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meet_goals_meet_id_fkey";
            columns: ["meet_id"];
            isOneToOne: false;
            referencedRelation: "meets";
            referencedColumns: ["id"];
          }
        ];
      };
      meets: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean | null;
          location: string | null;
          meet_date: string;
          meet_name: string | null;
          target_weight_class: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          location?: string | null;
          meet_date: string;
          meet_name?: string | null;
          target_weight_class: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          location?: string | null;
          meet_date?: string;
          meet_name?: string | null;
          target_weight_class?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          amount: number | null;
          cancel_at_period_end: boolean | null;
          canceled_at: number | null;
          created_at: string;
          currency: string | null;
          current_period_end: number | null;
          current_period_start: number | null;
          custom_field_data: Json | null;
          customer_cancellation_comment: string | null;
          customer_cancellation_reason: string | null;
          customer_id: string | null;
          ended_at: number | null;
          id: string;
          interval: string | null;
          metadata: Json | null;
          polar_id: string | null;
          polar_price_id: string | null;
          started_at: number | null;
          status: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          amount?: number | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: number | null;
          created_at?: string;
          currency?: string | null;
          current_period_end?: number | null;
          current_period_start?: number | null;
          custom_field_data?: Json | null;
          customer_cancellation_comment?: string | null;
          customer_cancellation_reason?: string | null;
          customer_id?: string | null;
          ended_at?: number | null;
          id?: string;
          interval?: string | null;
          metadata?: Json | null;
          polar_id?: string | null;
          polar_price_id?: string | null;
          started_at?: number | null;
          status?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          amount?: number | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: number | null;
          created_at?: string;
          currency?: string | null;
          current_period_end?: number | null;
          current_period_start?: number | null;
          custom_field_data?: Json | null;
          customer_cancellation_comment?: string | null;
          customer_cancellation_reason?: string | null;
          customer_id?: string | null;
          ended_at?: number | null;
          id?: string;
          interval?: string | null;
          metadata?: Json | null;
          polar_id?: string | null;
          polar_price_id?: string | null;
          started_at?: number | null;
          status?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["user_id"];
          }
        ];
      };
      training_history: {
        Row: {
          created_at: string | null;
          estimated_1rm: number | null;
          id: string;
          lift_type: string | null;
          reps: number;
          rpe: number | null;
          sets: number;
          training_date: string;
          user_id: string | null;
          volume: number | null;
          weight: number;
        };
        Insert: {
          created_at?: string | null;
          estimated_1rm?: number | null;
          id?: string;
          lift_type?: string | null;
          reps: number;
          rpe?: number | null;
          sets: number;
          training_date: string;
          user_id?: string | null;
          volume?: number | null;
          weight: number;
        };
        Update: {
          created_at?: string | null;
          estimated_1rm?: number | null;
          id?: string;
          lift_type?: string | null;
          reps?: number;
          rpe?: number | null;
          sets?: number;
          training_date?: string;
          user_id?: string | null;
          volume?: number | null;
          weight?: number;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          created_at: string;
          dashboard_start_tab: string | null;
          id: string;
          theme: string | null;
          updated_at: string;
          user_id: string;
          weight_unit: string;
        };
        Insert: {
          created_at?: string;
          dashboard_start_tab?: string | null;
          id?: string;
          theme?: string | null;
          updated_at?: string;
          user_id: string;
          weight_unit?: string;
        };
        Update: {
          created_at?: string;
          dashboard_start_tab?: string | null;
          id?: string;
          theme?: string | null;
          updated_at?: string;
          user_id?: string;
          weight_unit?: string;
        };
        Relationships: [];
      };
      user_lifts: {
        Row: {
          id: string;
          user_id: string;
          lift_type: string;
          max_weight: number;
          confidence: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lift_type: string;
          max_weight?: number;
          confidence?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lift_type?: string;
          max_weight?: number;
          confidence?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          credits: string | null;
          email: string | null;
          full_name: string | null;
          gender: Database["public"]["Enums"]["gender"] | null;
          id: string;
          image: string | null;
          name: string | null;
          subscription: string | null;
          token_identifier: string;
          unit_preference: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          credits?: string | null;
          email?: string | null;
          full_name?: string | null;
          gender?: Database["public"]["Enums"]["gender"] | null;
          id: string;
          image?: string | null;
          name?: string | null;
          subscription?: string | null;
          token_identifier: string;
          unit_preference?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          credits?: string | null;
          email?: string | null;
          full_name?: string | null;
          gender?: Database["public"]["Enums"]["gender"] | null;
          id?: string;
          image?: string | null;
          name?: string | null;
          subscription?: string | null;
          token_identifier?: string;
          unit_preference?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          created_at: string;
          data: Json | null;
          error: string | null;
          event_type: string;
          id: string;
          modified_at: string;
          polar_event_id: string | null;
          type: string;
        };
        Insert: {
          created_at?: string;
          data?: Json | null;
          error?: string | null;
          event_type: string;
          id?: string;
          modified_at?: string;
          polar_event_id?: string | null;
          type: string;
        };
        Update: {
          created_at?: string;
          data?: Json | null;
          error?: string | null;
          event_type?: string;
          id?: string;
          modified_at?: string;
          polar_event_id?: string | null;
          type?: string;
        };
        Relationships: [];
      };
      weight_history: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          user_id: string;
          weight: number;
        };
        Insert: {
          created_at?: string;
          date: string;
          id?: string;
          user_id: string;
          weight: number;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          user_id?: string;
          weight?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      category: "essential" | "optional" | "meet-day";
      gender: "Male" | "Female" | "Other";
      lifts: "squat" | "bench" | "deadlift";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      category: ["essential", "optional", "meet-day"],
      gender: ["Male", "Female", "Other"],
      lifts: ["squat", "bench", "deadlift"],
    },
  },
} as const;
