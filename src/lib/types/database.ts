/**
 * NAO EDITE ESTE ARQUIVO A MAO.
 *
 * Gerado a partir de supabase/migrations por:
 *   npm run db:types
 *
 * Depois de conectar a Supabase CLI ao projeto, o comando equivalente e:
 *   npx supabase gen types typescript --linked > src/lib/types/database.ts
 */

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
      clients: {
        Row: {
          id: string
          owner_id: string
          nome: string
          cidade: string | null
          telefone: string | null
          instagram: string | null
          interesses: string | null
          observacoes: string | null
          ativo: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          nome: string
          cidade?: string | null
          telefone?: string | null
          instagram?: string | null
          interesses?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          nome?: string
          cidade?: string | null
          telefone?: string | null
          instagram?: string | null
          interesses?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      consignment_payouts: {
        Row: {
          id: string
          owner_id: string
          consignment_id: string
          sale_id: string
          supplier_id: string
          valor: number
          status: Database["public"]["Enums"]["payout_status"]
          data_pagamento: string | null
          forma_pagamento: string | null
          comprovante_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          consignment_id: string
          sale_id: string
          supplier_id: string
          valor: number
          status?: Database["public"]["Enums"]["payout_status"]
          data_pagamento?: string | null
          forma_pagamento?: string | null
          comprovante_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          consignment_id?: string
          sale_id?: string
          supplier_id?: string
          valor?: number
          status?: Database["public"]["Enums"]["payout_status"]
          data_pagamento?: string | null
          forma_pagamento?: string | null
          comprovante_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignment_payouts_consignment_id_fkey"
            columns: ["consignment_id"]
            isOneToOne: false
            referencedRelation: "consignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_payouts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_payouts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      consignments: {
        Row: {
          id: string
          owner_id: string
          watch_id: string
          supplier_id: string
          modalidade: Database["public"]["Enums"]["consignment_mode"]
          valor_repasse_fixo: number | null
          percentual_wata: number | null
          prazo: string | null
          notas: string | null
          encerrado_em: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          watch_id: string
          supplier_id: string
          modalidade: Database["public"]["Enums"]["consignment_mode"]
          valor_repasse_fixo?: number | null
          percentual_wata?: number | null
          prazo?: string | null
          notas?: string | null
          encerrado_em?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          watch_id?: string
          supplier_id?: string
          modalidade?: Database["public"]["Enums"]["consignment_mode"]
          valor_repasse_fixo?: number | null
          percentual_wata?: number | null
          prazo?: string | null
          notas?: string | null
          encerrado_em?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignments_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credit_movements: {
        Row: {
          id: string
          owner_id: string
          client_id: string
          reservation_id: string | null
          sale_id: string | null
          tipo: Database["public"]["Enums"]["credit_movement_type"]
          valor: number
          motivo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          client_id: string
          reservation_id?: string | null
          sale_id?: string | null
          tipo: Database["public"]["Enums"]["credit_movement_type"]
          valor: number
          motivo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          client_id?: string
          reservation_id?: string | null
          sale_id?: string | null
          tipo?: Database["public"]["Enums"]["credit_movement_type"]
          valor?: number
          motivo?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_credit_movements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_movements_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          id: string
          owner_id: string
          watch_id: string | null
          sale_id: string | null
          categoria: Database["public"]["Enums"]["expense_category"]
          descricao: string | null
          valor: number
          data: string
          status: Database["public"]["Enums"]["financial_status"]
          created_at: string
          updated_at: string
          financial_transaction_id: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          watch_id?: string | null
          sale_id?: string | null
          categoria?: Database["public"]["Enums"]["expense_category"]
          descricao?: string | null
          valor: number
          data?: string
          status?: Database["public"]["Enums"]["financial_status"]
          created_at?: string
          updated_at?: string
          financial_transaction_id?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          watch_id?: string | null
          sale_id?: string | null
          categoria?: Database["public"]["Enums"]["expense_category"]
          descricao?: string | null
          valor?: number
          data?: string
          status?: Database["public"]["Enums"]["financial_status"]
          created_at?: string
          updated_at?: string
          financial_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_financial_transaction_fk"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          id: string
          owner_id: string
          direcao: Database["public"]["Enums"]["financial_direction"]
          categoria: Database["public"]["Enums"]["financial_category"]
          valor: number
          status: Database["public"]["Enums"]["financial_status"]
          data: string
          descricao: string | null
          watch_id: string | null
          sale_id: string | null
          reservation_id: string | null
          expense_id: string | null
          payout_id: string | null
          client_id: string | null
          idempotency_key: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          direcao: Database["public"]["Enums"]["financial_direction"]
          categoria: Database["public"]["Enums"]["financial_category"]
          valor: number
          status?: Database["public"]["Enums"]["financial_status"]
          data?: string
          descricao?: string | null
          watch_id?: string | null
          sale_id?: string | null
          reservation_id?: string | null
          expense_id?: string | null
          payout_id?: string | null
          client_id?: string | null
          idempotency_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          direcao?: Database["public"]["Enums"]["financial_direction"]
          categoria?: Database["public"]["Enums"]["financial_category"]
          valor?: number
          status?: Database["public"]["Enums"]["financial_status"]
          data?: string
          descricao?: string | null
          watch_id?: string | null
          sale_id?: string | null
          reservation_id?: string | null
          expense_id?: string | null
          payout_id?: string | null
          client_id?: string | null
          idempotency_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "consignment_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          nome: string
          role: Database["public"]["Enums"]["role_type"]
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nome?: string
          role?: Database["public"]["Enums"]["role_type"]
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["role_type"]
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_opportunities: {
        Row: {
          id: string
          owner_id: string
          modelo: string
          referencia: string | null
          cidade: string | null
          valor_pedido: number | null
          minha_oferta: number | null
          valor_fechado: number | null
          supplier_id: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          notas: string | null
          purchased_watch_id: string | null
          data_contato: string
          data_fechamento: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          modelo: string
          referencia?: string | null
          cidade?: string | null
          valor_pedido?: number | null
          minha_oferta?: number | null
          valor_fechado?: number | null
          supplier_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          notas?: string | null
          purchased_watch_id?: string | null
          data_contato?: string
          data_fechamento?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          modelo?: string
          referencia?: string | null
          cidade?: string | null
          valor_pedido?: number | null
          minha_oferta?: number | null
          valor_fechado?: number | null
          supplier_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          notas?: string | null
          purchased_watch_id?: string | null
          data_contato?: string
          data_fechamento?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_opportunities_purchased_watch_id_fkey"
            columns: ["purchased_watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_opportunities_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          id: string
          owner_id: string
          watch_id: string
          client_id: string
          valor_combinado: number
          validade: string
          status: Database["public"]["Enums"]["reservation_status"]
          valor_sinal: number
          data_sinal: string | null
          forma_pagamento: string | null
          destino_sinal: Database["public"]["Enums"]["deposit_fate"] | null
          saldo_restante: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          watch_id: string
          client_id: string
          valor_combinado: number
          validade: string
          status?: Database["public"]["Enums"]["reservation_status"]
          valor_sinal?: number
          data_sinal?: string | null
          forma_pagamento?: string | null
          destino_sinal?: Database["public"]["Enums"]["deposit_fate"] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          watch_id?: string
          client_id?: string
          valor_combinado?: number
          validade?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          valor_sinal?: number
          data_sinal?: string | null
          forma_pagamento?: string | null
          destino_sinal?: Database["public"]["Enums"]["deposit_fate"] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          id: string
          owner_id: string
          watch_id: string
          client_id: string
          reservation_id: string | null
          valor_venda: number
          origem: string | null
          forma_pagamento: string | null
          data_venda: string
          lucro_bruto: number
          lucro_liquido: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          watch_id: string
          client_id: string
          reservation_id?: string | null
          valor_venda: number
          origem?: string | null
          forma_pagamento?: string | null
          data_venda?: string
          lucro_bruto?: number
          lucro_liquido?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          watch_id?: string
          client_id?: string
          reservation_id?: string | null
          valor_venda?: number
          origem?: string | null
          forma_pagamento?: string | null
          data_venda?: string
          lucro_bruto?: number
          lucro_liquido?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: true
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          owner_id: string
          nome_loja: string
          logo_url: string | null
          saldo_inicial: number
          timezone: string
          canais_venda: Json
          categorias: Json
          dias_estoque_parado: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          nome_loja?: string
          logo_url?: string | null
          saldo_inicial?: number
          timezone?: string
          canais_venda?: Json
          categorias?: Json
          dias_estoque_parado?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          nome_loja?: string
          logo_url?: string | null
          saldo_inicial?: number
          timezone?: string
          canais_venda?: Json
          categorias?: Json
          dias_estoque_parado?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          id: string
          owner_id: string
          nome: string
          cidade: string | null
          telefone: string | null
          instagram: string | null
          tipo_relacao: Database["public"]["Enums"]["supplier_relation"]
          observacoes: string | null
          ativo: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          nome: string
          cidade?: string | null
          telefone?: string | null
          instagram?: string | null
          tipo_relacao?: Database["public"]["Enums"]["supplier_relation"]
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          nome?: string
          cidade?: string | null
          telefone?: string | null
          instagram?: string | null
          tipo_relacao?: Database["public"]["Enums"]["supplier_relation"]
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      watch_photos: {
        Row: {
          id: string
          owner_id: string
          watch_id: string
          storage_path: string
          ordem: number
          is_cover: boolean
          alt_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          watch_id: string
          storage_path: string
          ordem?: number
          is_cover?: boolean
          alt_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          watch_id?: string
          storage_path?: string
          ordem?: number
          is_cover?: boolean
          alt_text?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_photos_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_status_history: {
        Row: {
          id: string
          owner_id: string
          watch_id: string
          status_anterior: Database["public"]["Enums"]["watch_status"] | null
          status_novo: Database["public"]["Enums"]["watch_status"]
          motivo: string | null
          actor_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          watch_id: string
          status_anterior?: Database["public"]["Enums"]["watch_status"] | null
          status_novo: Database["public"]["Enums"]["watch_status"]
          motivo?: string | null
          actor_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          watch_id?: string
          status_anterior?: Database["public"]["Enums"]["watch_status"] | null
          status_novo?: Database["public"]["Enums"]["watch_status"]
          motivo?: string | null
          actor_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_status_history_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "watches"
            referencedColumns: ["id"]
          },
        ]
      }
      watches: {
        Row: {
          id: string
          wata_id: string
          owner_id: string
          marca: string
          modelo: string
          referencia: string | null
          ano: number | null
          movimento: Database["public"]["Enums"]["movement_type"] | null
          diametro_mm: number | null
          mostrador: string | null
          condicao: string | null
          valor_compra: number | null
          valor_minimo: number | null
          valor_anunciado: number | null
          valor_vendido: number | null
          tipo: Database["public"]["Enums"]["watch_type"]
          status: Database["public"]["Enums"]["watch_status"]
          supplier_id: string | null
          data_entrada: string
          observacoes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          wata_id?: string
          owner_id: string
          marca: string
          modelo: string
          referencia?: string | null
          ano?: number | null
          movimento?: Database["public"]["Enums"]["movement_type"] | null
          diametro_mm?: number | null
          mostrador?: string | null
          condicao?: string | null
          valor_compra?: number | null
          valor_minimo?: number | null
          valor_anunciado?: number | null
          valor_vendido?: number | null
          tipo: Database["public"]["Enums"]["watch_type"]
          status?: Database["public"]["Enums"]["watch_status"]
          supplier_id?: string | null
          data_entrada?: string
          observacoes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          wata_id?: string
          owner_id?: string
          marca?: string
          modelo?: string
          referencia?: string | null
          ano?: number | null
          movimento?: Database["public"]["Enums"]["movement_type"] | null
          diametro_mm?: number | null
          mostrador?: string | null
          condicao?: string | null
          valor_compra?: number | null
          valor_minimo?: number | null
          valor_anunciado?: number | null
          valor_vendido?: number | null
          tipo?: Database["public"]["Enums"]["watch_type"]
          status?: Database["public"]["Enums"]["watch_status"]
          supplier_id?: string | null
          data_entrada?: string
          observacoes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_alerts: {
        Row: {
          owner_id: string | null
          tipo: string | null
          referencia_id: string | null
          data_referencia: string | null
          dias_restantes: number | null
          valor: number | null
        }
        Relationships: []
      }
      customer_credit_balances: {
        Row: {
          owner_id: string | null
          client_id: string | null
          nome: string | null
          saldo: number | null
        }
        Relationships: []
      }
      dashboard_summary: {
        Row: {
          owner_id: string | null
          capital_investido: number | null
          valor_estoque: number | null
          lucro_potencial_proprio: number | null
          lucro_minimo_proprio: number | null
          lucro_realizado: number | null
          caixa: number | null
          total_disponivel: number | null
          total_reservado: number | null
          total_vendido: number | null
          repasses_pendentes: number | null
        }
        Relationships: []
      }
      monthly_sales_profit: {
        Row: {
          owner_id: string | null
          mes: string | null
          quantidade: number | null
          receita: number | null
          lucro: number | null
        }
        Relationships: []
      }
      sales_by_origin: {
        Row: {
          owner_id: string | null
          origem: string | null
          quantidade: number | null
          valor: number | null
        }
        Relationships: []
      }
      stock_aging: {
        Row: {
          watch_id: string | null
          owner_id: string | null
          wata_id: string | null
          marca: string | null
          modelo: string | null
          tipo: Database["public"]["Enums"]["watch_type"] | null
          status: Database["public"]["Enums"]["watch_status"] | null
          valor_anunciado: number | null
          data_entrada: string | null
          dias_em_estoque: number | null
          parado: boolean | null
        }
        Relationships: []
      }
      stock_valuation: {
        Row: {
          watch_id: string | null
          owner_id: string | null
          wata_id: string | null
          marca: string | null
          modelo: string | null
          tipo: Database["public"]["Enums"]["watch_type"] | null
          status: Database["public"]["Enums"]["watch_status"] | null
          data_entrada: string | null
          valor_compra: number | null
          valor_minimo: number | null
          valor_anunciado: number | null
          despesas_vinculadas: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_reservation: {
        Args: { p_reservation_id: string; p_status?: unknown; p_destino_sinal?: unknown; p_motivo?: string }
        Returns: { watch_status: unknown; transaction_id: string; credit_movement_id: string }[]
      }
      complete_sale: {
        Args: { p_watch_id: string; p_client_id: string; p_valor_venda: number; p_origem?: string; p_forma_pagamento?: string; p_data_venda?: string }
        Returns: { sale_id: string; lucro_bruto: number; lucro_liquido: number; entrada_caixa: number; sinal_aproveitado: number; payout_id: string }[]
      }
      confirm_purchase: {
        Args: { p_opportunity_id: string; p_valor_fechado: number; p_marca: string; p_modelo: string; p_data_compra?: string; p_supplier_id?: string; p_referencia?: string; p_ano?: number; p_movimento?: unknown; p_diametro_mm?: number; p_mostrador?: string; p_condicao?: string; p_valor_minimo?: number; p_valor_anunciado?: number; p_observacoes?: string }
        Returns: { watch_id: string; wata_id: string; expense_id: string; transaction_id: string }[]
      }
      consignment_payout_amount: {
        Args: { p_sale_id: string }
        Returns: number
      }
      create_reservation: {
        Args: { p_watch_id: string; p_client_id: string; p_valor_combinado: number; p_validade: string; p_valor_sinal?: number; p_data_sinal?: string; p_forma_pagamento?: string }
        Returns: { reservation_id: string; watch_status: unknown; saldo_restante: number }[]
      }
      next_wata_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      pay_consignment_payout: {
        Args: { p_payout_id: string; p_data_pagamento?: string; p_forma_pagamento?: string; p_comprovante_path?: string }
        Returns: { transaction_id: string; valor: number }[]
      }
      recalc_sale_profit: {
        Args: { p_sale_id: string }
        Returns: undefined
      }
      reverse_financial_transaction: {
        Args: { p_transaction_id: string; p_motivo?: string }
        Returns: { transaction_id: string; expense_id: string }[]
      }
      sale_gross_profit: {
        Args: { p_sale_id: string }
        Returns: number
      }
      watch_linked_expenses: {
        Args: { p_watch_id: string; p_sale_id?: string }
        Returns: number
      }
    }
    Enums: {
      consignment_mode: "FIXED_PAYOUT" | "WATA_PERCENTAGE"
      credit_movement_type: "CREDIT" | "DEBIT"
      deposit_fate: "REFUNDED" | "RETAINED" | "CUSTOMER_CREDIT"
      expense_category: "PURCHASE" | "SHIPPING" | "SERVICE" | "STRAP" | "PACKAGING" | "META_ADS" | "PAYOUT" | "OTHER"
      financial_category: "SALE" | "RESERVATION_DEPOSIT" | "RETAINED_DEPOSIT" | "OTHER_INCOME" | "PURCHASE" | "SHIPPING" | "SERVICE" | "STRAP" | "PACKAGING" | "META_ADS" | "PAYOUT" | "DEPOSIT_REFUND" | "OTHER_EXPENSE"
      financial_direction: "INCOME" | "EXPENSE"
      financial_status: "PENDING" | "CONFIRMED" | "REVERSED" | "CANCELLED"
      movement_type: "MANUAL" | "AUTOMATIC" | "QUARTZ" | "SOLAR" | "OTHER"
      payout_status: "PENDING" | "PAID" | "CANCELLED"
      purchase_status: "NEGOTIATING" | "PURCHASED" | "LOST"
      reservation_status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED"
      role_type: "ADMIN"
      supplier_relation: "SELLER" | "CONSIGNOR" | "BOTH"
      watch_status: "AVAILABLE" | "RESERVED" | "SOLD"
      watch_type: "OWNED" | "CONSIGNED"
    }
    CompositeTypes: Record<string, never>
  }
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> =
  PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
