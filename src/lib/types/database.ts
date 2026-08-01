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
      }
      customer_credit_balances: {
        Row: {
          owner_id: string | null
          client_id: string | null
          nome: string | null
          saldo: number | null
        }
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
      }
      monthly_sales_profit: {
        Row: {
          owner_id: string | null
          mes: string | null
          quantidade: number | null
          receita: number | null
          lucro: number | null
        }
      }
      sales_by_origin: {
        Row: {
          owner_id: string | null
          origem: string | null
          quantidade: number | null
          valor: number | null
        }
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
      }
    }
    Functions: {
      consignment_payout_amount: unknown
      next_wata_id: unknown
      recalc_sale_profit: unknown
      sale_gross_profit: unknown
      watch_linked_expenses: unknown
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
