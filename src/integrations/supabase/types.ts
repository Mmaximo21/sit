export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      ai_messages: {
        Row: {
          content: Json;
          created_at: string;
          id: string;
          role: string;
          thread_id: string;
        };
        Insert: {
          content?: Json;
          created_at?: string;
          id?: string;
          role: string;
          thread_id: string;
        };
        Update: {
          content?: Json;
          created_at?: string;
          id?: string;
          role?: string;
          thread_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "ai_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_threads: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      assessment_periods: {
        Row: {
          created_at: string;
          created_by: string | null;
          due_date: string | null;
          id: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          due_date?: string | null;
          id?: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          due_date?: string | null;
          id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assessments: {
        Row: {
          author_id: string;
          closed_at: string | null;
          created_at: string;
          data: Json;
          id: string;
          master_notes: string | null;
          period_id: string | null;
          resident_id: string | null;
          resident_name: string;
          specialty: string;
          status: string;
          submitted_at: string | null;
          updated_at: string;
          admission_date: string | null;
          diagnosis: string | null;
        };
        Insert: {
          author_id: string;
          closed_at?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          master_notes?: string | null;
          period_id?: string | null;
          resident_id?: string | null;
          resident_name?: string;
          specialty: string;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
          admission_date?: string | null;
          diagnosis?: string | null;
        };
        Update: {
          author_id?: string;
          closed_at?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          master_notes?: string | null;
          period_id?: string | null;
          resident_id?: string | null;
          resident_name?: string;
          specialty?: string;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
          admission_date?: string | null;
          diagnosis?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "assessment_periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_resident_id_fkey";
            columns: ["resident_id"];
            isOneToOne: false;
            referencedRelation: "residents";
            referencedColumns: ["id"];
          },
        ];
      };
      care_plans: {
        Row: {
          author_id: string;
          closed_at: string | null;
          created_at: string;
          data: Json;
          id: string;
          master_notes: string | null;
          period_label: string;
          resident_id: string | null;
          resident_name: string;
          specialty: string;
          status: string;
          submitted_at: string | null;
          updated_at: string;
          admission_date: string | null;
          diagnosis: string | null;
        };
        Insert: {
          author_id: string;
          closed_at?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          master_notes?: string | null;
          period_label?: string;
          resident_id?: string | null;
          resident_name?: string;
          specialty: string;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
          admission_date?: string | null;
          diagnosis?: string | null;
        };
        Update: {
          author_id?: string;
          closed_at?: string | null;
          created_at?: string;
          data?: Json;
          id?: string;
          master_notes?: string | null;
          period_label?: string;
          resident_id?: string | null;
          resident_name?: string;
          specialty?: string;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
          admission_date?: string | null;
          diagnosis?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "care_plans_resident_id_fkey";
            columns: ["resident_id"];
            isOneToOne: false;
            referencedRelation: "residents";
            referencedColumns: ["id"];
          },
        ];
      };
      closing_terms: {
        Row: {
          active: boolean;
          created_at: string;
          description: string;
          id: string;
          specialty: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string;
          id?: string;
          specialty?: string | null;
          title?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string;
          id?: string;
          specialty?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coordinator_scopes: {
        Row: {
          created_at: string;
          id: string;
          specialty: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          specialty?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          specialty?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      councils: {
        Row: {
          acronym: string;
          active: boolean;
          created_at: string;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          acronym: string;
          active?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          acronym?: string;
          active?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      deletion_logs: {
        Row: {
          created_at: string;
          deleted_by: string;
          deleted_by_name: string;
          details: Json;
          id: string;
          record_date: string | null;
          record_label: string;
          record_type: string;
        };
        Insert: {
          created_at?: string;
          deleted_by: string;
          deleted_by_name: string;
          details?: Json;
          id?: string;
          record_date?: string | null;
          record_label: string;
          record_type: string;
        };
        Update: {
          created_at?: string;
          deleted_by?: string;
          deleted_by_name?: string;
          details?: Json;
          id?: string;
          record_date?: string | null;
          record_label?: string;
          record_type?: string;
        };
        Relationships: [];
      };
      exam_files: {
        Row: {
          category: string;
          created_at: string;
          exam_date: string | null;
          file_name: string;
          file_path: string;
          file_size: number | null;
          file_type: string | null;
          id: string;
          notes: string | null;
          resident_id: string;
          specialty: string | null;
          title: string;
          updated_at: string;
          uploaded_by: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          exam_date?: string | null;
          file_name: string;
          file_path: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          notes?: string | null;
          resident_id: string;
          specialty?: string | null;
          title: string;
          updated_at?: string;
          uploaded_by: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          exam_date?: string | null;
          file_name?: string;
          file_path?: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          notes?: string | null;
          resident_id?: string;
          specialty?: string | null;
          title?: string;
          updated_at?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exam_files_resident_id_fkey";
            columns: ["resident_id"];
            isOneToOne: false;
            referencedRelation: "residents";
            referencedColumns: ["id"];
          },
        ];
      };
      menus: {
        Row: {
          author_id: string;
          created_at: string;
          data: Json;
          id: string;
          menu_date: string | null;
          notes: string | null;
          resident_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          data?: Json;
          id?: string;
          menu_date?: string | null;
          notes?: string | null;
          resident_id: string;
          title?: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          data?: Json;
          id?: string;
          menu_date?: string | null;
          notes?: string | null;
          resident_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menus_resident_id_fkey";
            columns: ["resident_id"];
            isOneToOne: false;
            referencedRelation: "residents";
            referencedColumns: ["id"];
          },
        ];
      };
      notices: {
        Row: {
          body: string;
          created_at: string;
          created_by: string;
          created_by_name: string;
          expires_at: string;
          id: string;
          level: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          created_by: string;
          created_by_name?: string;
          expires_at?: string;
          id?: string;
          level?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string;
          created_by_name?: string;
          expires_at?: string;
          id?: string;
          level?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      nursing_census: {
        Row: {
          author_id: string;
          census_date: string;
          created_at: string;
          data: Json;
          id: string;
          nurse_name: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          census_date?: string;
          created_at?: string;
          data?: Json;
          id?: string;
          nurse_name?: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          census_date?: string;
          created_at?: string;
          data?: Json;
          id?: string;
          nurse_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      period_deadlines: {
        Row: {
          created_at: string;
          due_date: string | null;
          id: string;
          period_id: string;
          specialty: string;
        };
        Insert: {
          created_at?: string;
          due_date?: string | null;
          id?: string;
          period_id: string;
          specialty: string;
        };
        Update: {
          created_at?: string;
          due_date?: string | null;
          id?: string;
          period_id?: string;
          specialty?: string;
        };
        Relationships: [
          {
            foreignKeyName: "period_deadlines_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "assessment_periods";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          active: boolean;
          created_at: string;
          full_name: string;
          id: string;
          professional_registry: string | null;
          specialty: string | null;
          updated_at: string;
          username: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          full_name?: string;
          id: string;
          professional_registry?: string | null;
          specialty?: string | null;
          updated_at?: string;
          username: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          full_name?: string;
          id?: string;
          professional_registry?: string | null;
          specialty?: string | null;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      resident_exits: {
        Row: {
          attachments: Json;
          author_id: string | null;
          author_name: string;
          cause: string | null;
          created_at: string;
          destination: string | null;
          exit_date: string;
          exit_type: string;
          id: string;
          report: string;
          resident_id: string | null;
          resident_name: string;
          updated_at: string;
        };
        Insert: {
          attachments?: Json;
          author_id?: string | null;
          author_name?: string;
          cause?: string | null;
          created_at?: string;
          destination?: string | null;
          exit_date: string;
          exit_type: string;
          id?: string;
          report?: string;
          resident_id?: string | null;
          resident_name: string;
          updated_at?: string;
        };
        Update: {
          attachments?: Json;
          author_id?: string | null;
          author_name?: string;
          cause?: string | null;
          created_at?: string;
          destination?: string | null;
          exit_date?: string;
          exit_type?: string;
          id?: string;
          report?: string;
          resident_id?: string | null;
          resident_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resident_exits_resident_id_fkey";
            columns: ["resident_id"];
            isOneToOne: false;
            referencedRelation: "residents";
            referencedColumns: ["id"];
          },
        ];
      };
      residents: {
        Row: {
          active: boolean;
          admission_date: string | null;
          birth_date: string | null;
          created_at: string;
          created_by: string | null;
          diagnosis: string | null;
          full_name: string;
          id: string;
          sex: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          admission_date?: string | null;
          birth_date?: string | null;
          created_at?: string;
          created_by?: string | null;
          diagnosis?: string | null;
          full_name: string;
          id?: string;
          sex?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          admission_date?: string | null;
          birth_date?: string | null;
          created_at?: string;
          created_by?: string | null;
          diagnosis?: string | null;
          full_name?: string;
          id?: string;
          sex?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      shift_reports: {
        Row: {
          author_id: string;
          author_name: string;
          content: string;
          created_at: string;
          id: string;
          report_date: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          author_name?: string;
          content?: string;
          created_at?: string;
          id?: string;
          report_date?: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          author_name?: string;
          content?: string;
          created_at?: string;
          id?: string;
          report_date?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      specialties: {
        Row: {
          active: boolean;
          created_at: string;
          default_council: string | null;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          default_council?: string | null;
          id?: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          default_council?: string | null;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      specialty_signatures: {
        Row: {
          created_at: string;
          file_name: string;
          file_path: string;
          id: string;
          mime_type: string | null;
          specialty: string;
          updated_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          file_path: string;
          id?: string;
          mime_type?: string | null;
          specialty: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          file_path?: string;
          id?: string;
          mime_type?: string | null;
          specialty?: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_tab_permissions: {
        Row: {
          allowed: boolean;
          created_at: string;
          id: string;
          tab: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          allowed?: boolean;
          created_at?: string;
          id?: string;
          tab: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          allowed?: boolean;
          created_at?: string;
          id?: string;
          tab?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      work_schedule_sectors: {
        Row: {
          anchor_date: string;
          created_at: string;
          notes: string | null;
          sector: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          anchor_date: string;
          created_at?: string;
          notes?: string | null;
          sector: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          anchor_date?: string;
          created_at?: string;
          notes?: string | null;
          sector?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      work_schedule_settings: {
        Row: {
          anchor_date: string;
          id: boolean;
          notes: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          anchor_date?: string;
          id?: boolean;
          notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          anchor_date?: string;
          id?: boolean;
          notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      work_shift_medical_leaves: {
        Row: {
          created_at: string;
          created_by: string | null;
          end_date: string | null;
          id: string;
          member_id: string | null;
          member_name: string | null;
          note: string | null;
          sector: string | null;
          start_date: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          end_date?: string | null;
          id?: string;
          member_id?: string | null;
          member_name?: string | null;
          note?: string | null;
          sector?: string | null;
          start_date: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          end_date?: string | null;
          id?: string;
          member_id?: string | null;
          member_name?: string | null;
          note?: string | null;
          sector?: string | null;
          start_date?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_shift_medical_leaves_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "work_shift_members";
            referencedColumns: ["id"];
          },
        ];
      };
      work_shift_members: {
        Row: {
          council: string | null;
          created_at: string;
          id: string;
          job_title: string | null;
          name: string;
          registry_number: string | null;
          sector: string;
          shift: string;
          updated_at: string;
          work_hours: string | null;
        };
        Insert: {
          council?: string | null;
          created_at?: string;
          id?: string;
          job_title?: string | null;
          name: string;
          registry_number?: string | null;
          sector?: string;
          shift: string;
          updated_at?: string;
          work_hours?: string | null;
        };
        Update: {
          council?: string | null;
          created_at?: string;
          id?: string;
          job_title?: string | null;
          name?: string;
          registry_number?: string | null;
          sector?: string;
          shift?: string;
          updated_at?: string;
          work_hours?: string | null;
        };
        Relationships: [];
      };
      work_shift_rotations: {
        Row: {
          created_at: string;
          created_by: string | null;
          effective_date: string;
          id: string;
          member_id: string;
          note: string | null;
          to_shift: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          effective_date: string;
          id?: string;
          member_id: string;
          note?: string | null;
          to_shift: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          effective_date?: string;
          id?: string;
          member_id?: string;
          note?: string | null;
          to_shift?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_shift_rotations_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "work_shift_members";
            referencedColumns: ["id"];
          },
        ];
      };
      work_shift_vacations: {
        Row: {
          cover_job_title: string | null;
          cover_name: string;
          created_at: string;
          created_by: string | null;
          end_date: string;
          id: string;
          member_id: string;
          note: string | null;
          start_date: string;
          updated_at: string;
        };
        Insert: {
          cover_job_title?: string | null;
          cover_name: string;
          created_at?: string;
          created_by?: string | null;
          end_date: string;
          id?: string;
          member_id: string;
          note?: string | null;
          start_date: string;
          updated_at?: string;
        };
        Update: {
          cover_job_title?: string | null;
          cover_name?: string;
          created_at?: string;
          created_by?: string | null;
          end_date?: string;
          id?: string;
          member_id?: string;
          note?: string | null;
          start_date?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_shift_vacations_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "work_shift_members";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      app_role: "master" | "profissional" | "coordenador" | "coordenacao";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
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
      app_role: ["master", "profissional", "coordenador", "coordenacao"],
    },
  },
} as const;
