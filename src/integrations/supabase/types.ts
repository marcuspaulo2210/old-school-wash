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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          created_at: string
          id: string
          name: string
          observation: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          observation?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          observation?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      clothing_types: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
          unit: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          unit?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          unit?: string
        }
        Relationships: []
      }
      lots: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          finalized_at: string | null
          id: string
          lot_number: number
          notes: string | null
          status: Database["public"]["Enums"]["lot_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          id?: string
          lot_number?: number
          notes?: string | null
          status?: Database["public"]["Enums"]["lot_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          id?: string
          lot_number?: number
          notes?: string | null
          status?: Database["public"]["Enums"]["lot_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_entries: {
        Row: {
          clothing_type_id: string
          created_at: string
          id: string
          lot_id: string
          quantity_packed: number
          updated_at: string
        }
        Insert: {
          clothing_type_id: string
          created_at?: string
          id?: string
          lot_id: string
          quantity_packed?: number
          updated_at?: string
        }
        Update: {
          clothing_type_id?: string
          created_at?: string
          id?: string
          lot_id?: string
          quantity_packed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packaging_entries_clothing_type_id_fkey"
            columns: ["clothing_type_id"]
            isOneToOne: false
            referencedRelation: "clothing_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      production_entries: {
        Row: {
          clothing_type_id: string
          created_at: string
          id: string
          lot_id: string
          mesa: string
          quantity: number
          updated_at: string
        }
        Insert: {
          clothing_type_id: string
          created_at?: string
          id?: string
          lot_id: string
          mesa: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          clothing_type_id?: string
          created_at?: string
          id?: string
          lot_id?: string
          mesa?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_entries_clothing_type_id_fkey"
            columns: ["clothing_type_id"]
            isOneToOne: false
            referencedRelation: "clothing_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_entries_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "producao"
      lot_status: "em_producao" | "finalizado" | "conferido"
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
      app_role: ["admin", "producao"],
      lot_status: ["em_producao", "finalizado", "conferido"],
    },
  },
} as const
