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
      clientes: {
        Row: {
          ativo: boolean
          atualizado_em: string
          auth_user_id: string | null
          bloqueado_ate: string | null
          criado_em: string
          dias_coleta: string[] | null
          email: string | null
          endereco: string | null
          id: string
          motorista_id: string | null
          nome: string
          observacoes: string | null
          preco_kg: number | null
          preco_peca: number | null
          primeiro_acesso: boolean
          quantidade_trocas_senha: number
          responsavel: string | null
          rota_id: string | null
          tarifa_minima: number | null
          telefone: string | null
          tentativas_login: number
          tipo: Database["public"]["Enums"]["tipo_cliente"]
          tipo_cobranca: Database["public"]["Enums"]["tipo_cobranca"]
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          auth_user_id?: string | null
          bloqueado_ate?: string | null
          criado_em?: string
          dias_coleta?: string[] | null
          email?: string | null
          endereco?: string | null
          id?: string
          motorista_id?: string | null
          nome: string
          observacoes?: string | null
          preco_kg?: number | null
          preco_peca?: number | null
          primeiro_acesso?: boolean
          quantidade_trocas_senha?: number
          responsavel?: string | null
          rota_id?: string | null
          tarifa_minima?: number | null
          telefone?: string | null
          tentativas_login?: number
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
          tipo_cobranca?: Database["public"]["Enums"]["tipo_cobranca"]
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          auth_user_id?: string | null
          bloqueado_ate?: string | null
          criado_em?: string
          dias_coleta?: string[] | null
          email?: string | null
          endereco?: string | null
          id?: string
          motorista_id?: string | null
          nome?: string
          observacoes?: string | null
          preco_kg?: number | null
          preco_peca?: number | null
          primeiro_acesso?: boolean
          quantidade_trocas_senha?: number
          responsavel?: string | null
          rota_id?: string | null
          tarifa_minima?: number | null
          telefone?: string | null
          tentativas_login?: number
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
          tipo_cobranca?: Database["public"]["Enums"]["tipo_cobranca"]
        }
        Relationships: [
          {
            foreignKeyName: "clientes_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
        ]
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
      historico_saldo: {
        Row: {
          cliente_id: string
          criado_em: string
          descricao: string
          editado_por: string | null
          id: string
          obs: string | null
          pedido_id: string | null
          quantidade_devolvida: number
          quantidade_enviada: number
          saldo_anterior: number
          saldo_novo: number
          tipo: string
        }
        Insert: {
          cliente_id: string
          criado_em?: string
          descricao: string
          editado_por?: string | null
          id?: string
          obs?: string | null
          pedido_id?: string | null
          quantidade_devolvida?: number
          quantidade_enviada?: number
          saldo_anterior?: number
          saldo_novo?: number
          tipo?: string
        }
        Update: {
          cliente_id?: string
          criado_em?: string
          descricao?: string
          editado_por?: string | null
          id?: string
          obs?: string | null
          pedido_id?: string | null
          quantidade_devolvida?: number
          quantidade_enviada?: number
          saldo_anterior?: number
          saldo_novo?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_saldo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_saldo_editado_por_fkey"
            columns: ["editado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_saldo_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
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
          origem: string
          pedido_id: string
          quantidade_conferida: number | null
          quantidade_original: number
          tipo_roupa_id: string | null
        }
        Insert: {
          descricao_livre?: string | null
          diferenca?: number | null
          id?: string
          origem?: string
          pedido_id: string
          quantidade_conferida?: number | null
          quantidade_original?: number
          tipo_roupa_id?: string | null
        }
        Update: {
          descricao_livre?: string | null
          diferenca?: number | null
          id?: string
          origem?: string
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
      itens_saida: {
        Row: {
          criado_em: string
          criado_por: string | null
          descricao_livre: string | null
          id: string
          observacao: string | null
          pedido_id: string
          quantidade: number
          tipo_roupa_id: string | null
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          descricao_livre?: string | null
          id?: string
          observacao?: string | null
          pedido_id: string
          quantidade?: number
          tipo_roupa_id?: string | null
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          descricao_livre?: string | null
          id?: string
          observacao?: string | null
          pedido_id?: string
          quantidade?: number
          tipo_roupa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_saida_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_saida_tipo_roupa_id_fkey"
            columns: ["tipo_roupa_id"]
            isOneToOne: false
            referencedRelation: "tipos_roupa"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_peso: {
        Row: {
          cliente_id: string
          criado_em: string
          id: string
          motorista_id: string
          observacao: string | null
          pedido_id: string
          peso_kg: number
        }
        Insert: {
          cliente_id: string
          criado_em?: string
          id?: string
          motorista_id: string
          observacao?: string | null
          pedido_id: string
          peso_kg: number
        }
        Update: {
          cliente_id?: string
          criado_em?: string
          id?: string
          motorista_id?: string
          observacao?: string | null
          pedido_id?: string
          peso_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_peso_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_peso_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
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
      notificacoes: {
        Row: {
          criado_em: string
          id: string
          lida: boolean
          mensagem: string
          pedido_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          lida?: boolean
          mensagem: string
          pedido_id?: string | null
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          lida?: boolean
          mensagem?: string
          pedido_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string
          coletado_em: string | null
          criado_em: string
          data_coleta_prevista: string | null
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
          peso_informado_cliente: number | null
          peso_kg: number | null
          peso_motorista_em: string | null
          peso_motorista_kg: number | null
          peso_motorista_obs: string | null
          peso_recebido_producao: number | null
          pronto_em: string | null
          quem_contou: Database["public"]["Enums"]["quem_contou_enum"]
          rascunho: boolean
          saida_em: string | null
          saida_registrada: boolean | null
          saiu_em: string | null
          status: Database["public"]["Enums"]["status_pedido"]
          status_entrada: string
          tipo_cobranca: Database["public"]["Enums"]["tipo_cobranca"]
          tipo_registro_producao: string | null
          valor_total: number | null
        }
        Insert: {
          cliente_id: string
          coletado_em?: string | null
          criado_em?: string
          data_coleta_prevista?: string | null
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
          peso_informado_cliente?: number | null
          peso_kg?: number | null
          peso_motorista_em?: string | null
          peso_motorista_kg?: number | null
          peso_motorista_obs?: string | null
          peso_recebido_producao?: number | null
          pronto_em?: string | null
          quem_contou?: Database["public"]["Enums"]["quem_contou_enum"]
          rascunho?: boolean
          saida_em?: string | null
          saida_registrada?: boolean | null
          saiu_em?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          status_entrada?: string
          tipo_cobranca?: Database["public"]["Enums"]["tipo_cobranca"]
          tipo_registro_producao?: string | null
          valor_total?: number | null
        }
        Update: {
          cliente_id?: string
          coletado_em?: string | null
          criado_em?: string
          data_coleta_prevista?: string | null
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
          peso_informado_cliente?: number | null
          peso_kg?: number | null
          peso_motorista_em?: string | null
          peso_motorista_kg?: number | null
          peso_motorista_obs?: string | null
          peso_recebido_producao?: number | null
          pronto_em?: string | null
          quem_contou?: Database["public"]["Enums"]["quem_contou_enum"]
          rascunho?: boolean
          saida_em?: string | null
          saida_registrada?: boolean | null
          saiu_em?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          status_entrada?: string
          tipo_cobranca?: Database["public"]["Enums"]["tipo_cobranca"]
          tipo_registro_producao?: string | null
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
      precos_cliente: {
        Row: {
          cliente_id: string
          criado_em: string
          id: string
          preco_unitario: number
          tipo_roupa_id: string
        }
        Insert: {
          cliente_id: string
          criado_em?: string
          id?: string
          preco_unitario: number
          tipo_roupa_id: string
        }
        Update: {
          cliente_id?: string
          criado_em?: string
          id?: string
          preco_unitario?: number
          tipo_roupa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "precos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precos_cliente_tipo_roupa_id_fkey"
            columns: ["tipo_roupa_id"]
            isOneToOne: false
            referencedRelation: "tipos_roupa"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas: {
        Row: {
          ativo: boolean
          criado_em: string
          dias_semana: string[] | null
          horario_corte: string | null
          id: string
          motorista_id: string | null
          nome: string
          observacoes: string | null
          periodo: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          dias_semana?: string[] | null
          horario_corte?: string | null
          id?: string
          motorista_id?: string | null
          nome: string
          observacoes?: string | null
          periodo?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          dias_semana?: string[] | null
          horario_corte?: string | null
          id?: string
          motorista_id?: string | null
          nome?: string
          observacoes?: string | null
          periodo?: string | null
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
      saldo_roupas: {
        Row: {
          cliente_id: string
          descricao: string
          id: string
          obs_admin: string | null
          saldo: number | null
          total_devolvido: number
          total_enviado: number
          ultima_atualizacao: string
        }
        Insert: {
          cliente_id: string
          descricao: string
          id?: string
          obs_admin?: string | null
          saldo?: number | null
          total_devolvido?: number
          total_enviado?: number
          ultima_atualizacao?: string
        }
        Update: {
          cliente_id?: string
          descricao?: string
          id?: string
          obs_admin?: string | null
          saldo?: number | null
          total_devolvido?: number
          total_enviado?: number
          ultima_atualizacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "saldo_roupas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
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
      solicitacoes_clientes: {
        Row: {
          criado_em: string
          email: string | null
          id: string
          motivo_recusa: string | null
          motorista_id: string
          nome: string
          observacoes: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          status: string
          telefone: string | null
          tipo: string
        }
        Insert: {
          criado_em?: string
          email?: string | null
          id?: string
          motivo_recusa?: string | null
          motorista_id: string
          nome: string
          observacoes?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          telefone?: string | null
          tipo?: string
        }
        Update: {
          criado_em?: string
          email?: string | null
          id?: string
          motivo_recusa?: string | null
          motorista_id?: string
          nome?: string
          observacoes?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          telefone?: string | null
          tipo?: string
        }
        Relationships: []
      }
      solicitacoes_troca_senha: {
        Row: {
          criado_em: string
          id: string
          resolvido_em: string | null
          resolvido_por: string | null
          status: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          user_id?: string
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
          preco_unitario: number | null
        }
        Insert: {
          ativo?: boolean
          cliente_id?: string | null
          criado_por_admin?: boolean
          id?: string
          nome: string
          preco_unitario?: number | null
        }
        Update: {
          ativo?: boolean
          cliente_id?: string | null
          criado_por_admin?: boolean
          id?: string
          nome?: string
          preco_unitario?: number | null
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
          primeiro_acesso: boolean
          quantidade_trocas_senha: number
          telefone: string | null
          username: string | null
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
          primeiro_acesso?: boolean
          quantidade_trocas_senha?: number
          telefone?: string | null
          username?: string | null
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
          primeiro_acesso?: boolean
          quantidade_trocas_senha?: number
          telefone?: string | null
          username?: string | null
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
      admin_ids: { Args: never; Returns: string[] }
      buscar_cliente_por_nome: {
        Args: { _nome: string }
        Returns: {
          auth_email: string
          bloqueado: boolean
        }[]
      }
      buscar_funcionario_login: {
        Args: { _identificador: string }
        Returns: {
          auth_email: string
        }[]
      }
      cliente_tem_pedidos: { Args: { _cliente_id: string }; Returns: boolean }
      criar_perfil_usuario: {
        Args: {
          _email: string
          _nome: string
          _perfil?: Database["public"]["Enums"]["perfil_usuario"]
        }
        Returns: undefined
      }
      meu_cliente_id: { Args: never; Returns: string }
      meu_motorista_id: { Args: never; Returns: string }
      motorista_fallback_id: { Args: never; Returns: string }
      motorista_pode_ver_cliente: {
        Args: { _cliente_id: string }
        Returns: boolean
      }
      nome_motorista: { Args: { _id: string }; Returns: string }
      notificar_motorista_pedido: {
        Args: {
          _mensagem: string
          _pedido_id: string
          _tipo?: string
          _titulo: string
        }
        Returns: undefined
      }
      registrar_tentativa_login: {
        Args: { _nome_clinica: string }
        Returns: undefined
      }
      resetar_tentativas_login: {
        Args: { _nome_clinica: string }
        Returns: undefined
      }
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
        | "pronto_para_entrega"
        | "saiu_para_entrega"
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
        "pronto_para_entrega",
        "saiu_para_entrega",
      ],
      tipo_cliente: ["clinica", "hospital"],
      tipo_cobranca: ["peca", "peso"],
      tipo_cobranca_servico: ["peca", "peso", "pacote"],
    },
  },
} as const
