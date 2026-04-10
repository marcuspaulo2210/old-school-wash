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
      clientes: {
        Row: {
          ativo: boolean
          criado_em: string
          dias_coleta: string[] | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          preco_kg: number | null
          preco_peca: number | null
          responsavel: string | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_cliente"]
          tipo_cobranca: Database["public"]["Enums"]["tipo_cobranca"]
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          dias_coleta?: string[] | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          preco_kg?: number | null
          preco_peca?: number | null
          responsavel?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
          tipo_cobranca?: Database["public"]["Enums"]["tipo_cobranca"]
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          dias_coleta?: string[] | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          preco_kg?: number | null
          preco_peca?: number | null
          responsavel?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
          tipo_cobranca?: Database["public"]["Enums"]["tipo_cobranca"]
        }
        Relationships: []
      }
      conexao_ok: {
        Row: {
          criado_em: string
          id: string
        }
        Insert: {
          criado_em?: string
          id?: string
        }
        Update: {
          criado_em?: string
          id?: string
        }
        Relationships: []
      }
      historico_precos: {
        Row: {
          alterado_por: string
          cliente_id: string
          criado_em: string
          id: string
          preco_anterior: number
          preco_novo: number
          tipo_roupa_id: string | null
        }
        Insert: {
          alterado_por: string
          cliente_id: string
          criado_em?: string
          id?: string
          preco_anterior: number
          preco_novo: number
          tipo_roupa_id?: string | null
        }
        Update: {
          alterado_por?: string
          cliente_id?: string
          criado_em?: string
          id?: string
          preco_anterior?: number
          preco_novo?: number
          tipo_roupa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_precos_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_precos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_precos_tipo_roupa_id_fkey"
            columns: ["tipo_roupa_id"]
            isOneToOne: false
            referencedRelation: "tipos_roupa"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_status: {
        Row: {
          alterado_por: string
          criado_em: string
          id: string
          observacao: string | null
          pedido_id: string
          status_anterior: Database["public"]["Enums"]["status_pedido"] | null
          status_novo: Database["public"]["Enums"]["status_pedido"]
        }
        Insert: {
          alterado_por: string
          criado_em?: string
          id?: string
          observacao?: string | null
          pedido_id: string
          status_anterior?: Database["public"]["Enums"]["status_pedido"] | null
          status_novo: Database["public"]["Enums"]["status_pedido"]
        }
        Update: {
          alterado_por?: string
          criado_em?: string
          id?: string
          observacao?: string | null
          pedido_id?: string
          status_anterior?: Database["public"]["Enums"]["status_pedido"] | null
          status_novo?: Database["public"]["Enums"]["status_pedido"]
        }
        Relationships: [
          {
            foreignKeyName: "historico_status_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_status_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_pedido: {
        Row: {
          descricao_livre: string | null
          diferenca: number | null
          id: string
          pedido_id: string
          quantidade_conferida: number | null
          quantidade_original: number
          tipo_roupa_id: string | null
        }
        Insert: {
          descricao_livre?: string | null
          diferenca?: number | null
          id?: string
          pedido_id: string
          quantidade_conferida?: number | null
          quantidade_original?: number
          tipo_roupa_id?: string | null
        }
        Update: {
          descricao_livre?: string | null
          diferenca?: number | null
          id?: string
          pedido_id?: string
          quantidade_conferida?: number | null
          quantidade_original?: number
          tipo_roupa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_tipo_roupa_id_fkey"
            columns: ["tipo_roupa_id"]
            isOneToOne: false
            referencedRelation: "tipos_roupa"
            referencedColumns: ["id"]
          },
        ]
      }
      log_impersonacao: {
        Row: {
          acessado_em: string
          admin_id: string
          id: string
          usuario_alvo_id: string
        }
        Insert: {
          acessado_em?: string
          admin_id: string
          id?: string
          usuario_alvo_id: string
        }
        Update: {
          acessado_em?: string
          admin_id?: string
          id?: string
          usuario_alvo_id?: string
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          cliente_id: string
          coletado_em: string | null
          criado_em: string
          divergencia_resolvida: boolean
          embalado_em: string | null
          entregue_em: string | null
          id: string
          motorista_id: string | null
          numero_pedido: string
          obs_admin: string | null
          obs_cliente: string | null
          obs_motorista: string | null
          obs_producao: string | null
          peso_kg: number | null
          quem_contou: Database["public"]["Enums"]["quem_contou_enum"]
          status: Database["public"]["Enums"]["status_pedido"]
          tipo_cobranca: Database["public"]["Enums"]["tipo_cobranca"]
          valor_total: number | null
        }
        Insert: {
          cliente_id: string
          coletado_em?: string | null
          criado_em?: string
          divergencia_resolvida?: boolean
          embalado_em?: string | null
          entregue_em?: string | null
          id?: string
          motorista_id?: string | null
          numero_pedido?: string
          obs_admin?: string | null
          obs_cliente?: string | null
          obs_motorista?: string | null
          obs_producao?: string | null
          peso_kg?: number | null
          quem_contou?: Database["public"]["Enums"]["quem_contou_enum"]
          status?: Database["public"]["Enums"]["status_pedido"]
          tipo_cobranca?: Database["public"]["Enums"]["tipo_cobranca"]
          valor_total?: number | null
        }
        Update: {
          cliente_id?: string
          coletado_em?: string | null
          criado_em?: string
          divergencia_resolvida?: boolean
          embalado_em?: string | null
          entregue_em?: string | null
          id?: string
          motorista_id?: string | null
          numero_pedido?: string
          obs_admin?: string | null
          obs_cliente?: string | null
          obs_motorista?: string | null
          obs_producao?: string | null
          peso_kg?: number | null
          quem_contou?: Database["public"]["Enums"]["quem_contou_enum"]
          status?: Database["public"]["Enums"]["status_pedido"]
          tipo_cobranca?: Database["public"]["Enums"]["tipo_cobranca"]
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas: {
        Row: {
          ativo: boolean
          criado_em: string
          dias_semana: string[] | null
          id: string
          motorista_id: string | null
          nome: string
          observacoes: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          dias_semana?: string[] | null
          id?: string
          motorista_id?: string | null
          nome: string
          observacoes?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          dias_semana?: string[] | null
          id?: string
          motorista_id?: string | null
          nome?: string
          observacoes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rotas_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas_clientes: {
        Row: {
          cliente_id: string
          id: string
          ordem: number
          rota_id: string
        }
        Insert: {
          cliente_id: string
          id?: string
          ordem?: number
          rota_id: string
        }
        Update: {
          cliente_id?: string
          id?: string
          ordem?: number
          rota_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotas_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_clientes_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          preco_unitario: number
          tipo_cobranca: Database["public"]["Enums"]["tipo_cobranca_servico"]
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          preco_unitario?: number
          tipo_cobranca?: Database["public"]["Enums"]["tipo_cobranca_servico"]
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          preco_unitario?: number
          tipo_cobranca?: Database["public"]["Enums"]["tipo_cobranca_servico"]
        }
        Relationships: []
      }
      tipos_roupa: {
        Row: {
          ativo: boolean
          cliente_id: string | null
          criado_por_admin: boolean
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          cliente_id?: string | null
          criado_por_admin?: boolean
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string | null
          criado_por_admin?: boolean
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipos_roupa_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean
          cliente_id: string | null
          criado_em: string
          email: string
          id: string
          nome: string
          perfil: Database["public"]["Enums"]["perfil_usuario"]
          permite_cobranca_peca: boolean
          permite_cobranca_peso: boolean
        }
        Insert: {
          ativo?: boolean
          cliente_id?: string | null
          criado_em?: string
          email: string
          id: string
          nome: string
          perfil?: Database["public"]["Enums"]["perfil_usuario"]
          permite_cobranca_peca?: boolean
          permite_cobranca_peso?: boolean
        }
        Update: {
          ativo?: boolean
          cliente_id?: string | null
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          perfil?: Database["public"]["Enums"]["perfil_usuario"]
          permite_cobranca_peca?: boolean
          permite_cobranca_peso?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_perfil_usuario: {
        Args: {
          _email: string
          _nome: string
          _perfil?: Database["public"]["Enums"]["perfil_usuario"]
        }
        Returns: undefined
      }
      meu_cliente_id: { Args: never; Returns: string }
      tem_perfil: {
        Args: {
          _perfil: Database["public"]["Enums"]["perfil_usuario"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      perfil_usuario: "admin" | "cliente" | "motorista" | "producao"
      quem_contou_enum: "cliente" | "lavanderia"
      status_pedido:
        | "aguardando_coleta"
        | "coletado"
        | "em_producao"
        | "embalado"
        | "entregue"
        | "divergencia"
      tipo_cliente: "clinica" | "hospital"
      tipo_cobranca: "peca" | "peso"
      tipo_cobranca_servico: "peca" | "peso" | "pacote"
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
      perfil_usuario: ["admin", "cliente", "motorista", "producao"],
      quem_contou_enum: ["cliente", "lavanderia"],
      status_pedido: [
        "aguardando_coleta",
        "coletado",
        "em_producao",
        "embalado",
        "entregue",
        "divergencia",
      ],
      tipo_cliente: ["clinica", "hospital"],
      tipo_cobranca: ["peca", "peso"],
      tipo_cobranca_servico: ["peca", "peso", "pacote"],
    },
  },
} as const
