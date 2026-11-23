// GENERATED REFERENCE: schema types from connected Planes OS production Supabase, 2026-11-23.
// Schema only: no rows, access tokens, or secrets. Do not treat as a migration.
// Refresh only after a deliberate schema review.
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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          provider: string | null
          reason: string | null
          rejection_reason: string | null
          requested_at: string
          requested_role: Database["public"]["Enums"]["planes_user_role"] | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["planes_user_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          provider?: string | null
          reason?: string | null
          rejection_reason?: string | null
          requested_at?: string
          requested_role?:
            | Database["public"]["Enums"]["planes_user_role"]
            | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["planes_user_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          provider?: string | null
          reason?: string | null
          rejection_reason?: string | null
          requested_at?: string
          requested_role?:
            | Database["public"]["Enums"]["planes_user_role"]
            | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["planes_user_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          metadata: Json
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          target_user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          metadata: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assistant_last_daily_greeting_at: string | null
          assistant_onboarding_completed_at: string | null
          assistant_persona: string | null
          assistant_voice_enabled: boolean
          avatar_url: string | null
          birth_date: string | null
          company: string | null
          cpf: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          rg: string | null
          role: Database["public"]["Enums"]["planes_user_role"] | null
          sector: string | null
          status: Database["public"]["Enums"]["planes_user_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assistant_last_daily_greeting_at?: string | null
          assistant_onboarding_completed_at?: string | null
          assistant_persona?: string | null
          assistant_voice_enabled?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          company?: string | null
          cpf?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          rg?: string | null
          role?: Database["public"]["Enums"]["planes_user_role"] | null
          sector?: string | null
          status?: Database["public"]["Enums"]["planes_user_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assistant_last_daily_greeting_at?: string | null
          assistant_onboarding_completed_at?: string | null
          assistant_persona?: string | null
          assistant_voice_enabled?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          company?: string | null
          cpf?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          rg?: string | null
          role?: Database["public"]["Enums"]["planes_user_role"] | null
          sector?: string | null
          status?: Database["public"]["Enums"]["planes_user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      project_metrics: {
        Row: {
          financial_spent_m: number
          id: string
          pac_score: number
          physical_progress: number
          project_id: string
          target_progress: number
          updated_at: string
          workers_count: number
        }
        Insert: {
          financial_spent_m?: number
          id?: string
          pac_score?: number
          physical_progress?: number
          project_id: string
          target_progress?: number
          updated_at?: string
          workers_count?: number
        }
        Update: {
          financial_spent_m?: number
          id?: string
          pac_score?: number
          physical_progress?: number
          project_id?: string
          target_progress?: number
          updated_at?: string
          workers_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_supplies: {
        Row: {
          created_at: string
          delivery_text: string
          id: string
          name: string
          project_id: string
          quantity_text: string
          sector: string
          status: string
          supplier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_text?: string
          id?: string
          name: string
          project_id: string
          quantity_text?: string
          sector?: string
          status?: string
          supplier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_text?: string
          id?: string
          name?: string
          project_id?: string
          quantity_text?: string
          sector?: string
          status?: string
          supplier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_supplies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          created_at: string
          deadline_text: string
          done: boolean
          id: string
          project_id: string
          responsible: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline_text?: string
          done?: boolean
          id?: string
          project_id: string
          responsible?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline_text?: string
          done?: boolean
          id?: string
          project_id?: string
          responsible?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_validations: {
        Row: {
          created_at: string
          front: string
          gps: string
          id: string
          item: string
          project_id: string
          quantity_text: string
          recorded_at_text: string
          rejection_reason: string | null
          responsible: string
          role_title: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          front?: string
          gps?: string
          id?: string
          item: string
          project_id: string
          quantity_text?: string
          recorded_at_text?: string
          rejection_reason?: string | null
          responsible?: string
          role_title?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          front?: string
          gps?: string
          id?: string
          item?: string
          project_id?: string
          quantity_text?: string
          recorded_at_text?: string
          rejection_reason?: string | null
          responsible?: string
          role_title?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_validations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          active: boolean
          budget_text: string
          client: string
          code: string | null
          created_at: string
          deadline_text: string
          description: string
          id: string
          location: string
          name: string
          spreadsheets_count: number
          status: string
          takt: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          budget_text?: string
          client?: string
          code?: string | null
          created_at?: string
          deadline_text?: string
          description?: string
          id?: string
          location?: string
          name: string
          spreadsheets_count?: number
          status?: string
          takt?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          budget_text?: string
          client?: string
          code?: string | null
          created_at?: string
          deadline_text?: string
          description?: string
          id?: string
          location?: string
          name?: string
          spreadsheets_count?: number
          status?: string
          takt?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          action: string
          allowed: boolean
          created_at: string
          module: string
          role: Database["public"]["Enums"]["planes_user_role"]
        }
        Insert: {
          action: string
          allowed?: boolean
          created_at?: string
          module: string
          role: Database["public"]["Enums"]["planes_user_role"]
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string
          module?: string
          role?: Database["public"]["Enums"]["planes_user_role"]
        }
        Relationships: []
      }
      user_behavior_events: {
        Row: {
          created_at: string
          event_type: string
          id: number
          interaction_mode: string | null
          metadata: Json
          module: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: never
          interaction_mode?: string | null
          metadata?: Json
          module?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: never
          interaction_mode?: string | null
          metadata?: Json
          module?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_intelligence_profiles: {
        Row: {
          last_active_hour: number | null
          module_counts: Json
          preferred_mode: string | null
          topic_counts: Json
          total_interactions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          last_active_hour?: number | null
          module_counts?: Json
          preferred_mode?: string | null
          topic_counts?: Json
          total_interactions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          last_active_hour?: number | null
          module_counts?: Json
          preferred_mode?: string | null
          topic_counts?: Json
          total_interactions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          action: string
          allowed: boolean
          created_at: string
          created_by: string | null
          module: string
          user_id: string
        }
        Insert: {
          action: string
          allowed: boolean
          created_at?: string
          created_by?: string | null
          module: string
          user_id: string
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string
          created_by?: string | null
          module?: string
          user_id?: string
        }
        Relationships: []
      }
      user_project_access: {
        Row: {
          created_at: string
          created_by: string | null
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_project_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_project_intelligence_context: {
        Row: {
          last_interaction_at: string
          last_module: string | null
          last_seen_at: string | null
          last_snapshot: Json
          last_topic: string | null
          module_counts: Json
          preferred_mode: string | null
          project_id: string
          recent_actions: Json
          topic_counts: Json
          total_interactions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          last_interaction_at?: string
          last_module?: string | null
          last_seen_at?: string | null
          last_snapshot?: Json
          last_topic?: string | null
          module_counts?: Json
          preferred_mode?: string | null
          project_id: string
          recent_actions?: Json
          topic_counts?: Json
          total_interactions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          last_interaction_at?: string
          last_module?: string | null
          last_seen_at?: string | null
          last_snapshot?: Json
          last_topic?: string | null
          module_counts?: Json
          preferred_mode?: string | null
          project_id?: string
          recent_actions?: Json
          topic_counts?: Json
          total_interactions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_project_intelligence_context_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_work_access: {
        Row: {
          created_at: string
          created_by: string | null
          user_id: string
          work_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          user_id: string
          work_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          user_id?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_work_access_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      works: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          id: string
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "works_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_review_access_request: {
        Args: {
          p_actor_id: string
          p_admin_notes?: string
          p_decision: string
          p_project_ids?: string[]
          p_rejection_reason?: string
          p_request_id: string
          p_role?: Database["public"]["Enums"]["planes_user_role"]
          p_work_ids?: string[]
        }
        Returns: Json
      }
      private_email_claim_batch: {
        Args: { p_limit?: number; p_worker: string }
        Returns: {
          attempt_count: number
          id: string
          payload: Json
          subject: string
          template_key: string
          to_email: string
        }[]
      }
      private_email_claim_for_user: {
        Args: { p_limit?: number; p_user_id: string; p_worker: string }
        Returns: {
          attempt_count: number
          id: string
          payload: Json
          subject: string
          template_key: string
          to_email: string
        }[]
      }
      private_email_mark_failed: {
        Args: {
          p_error: string
          p_id: string
          p_retry_after_seconds?: number
          p_worker: string
        }
        Returns: boolean
      }
      private_email_mark_sent: {
        Args: { p_id: string; p_provider_message_id?: string; p_worker: string }
        Returns: boolean
      }
    }
    Enums: {
      planes_user_role:
        | "super_admin"
        | "admin"
        | "gestor"
        | "engenharia"
        | "campo"
        | "financeiro"
        | "cliente"
      planes_user_status: "pending" | "approved" | "rejected" | "suspended"
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
    Enums: {
      planes_user_role: [
        "super_admin",
        "admin",
        "gestor",
        "engenharia",
        "campo",
        "financeiro",
        "cliente",
      ],
      planes_user_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
