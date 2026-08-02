import type { Enums } from "@/lib/types/database";

/**
 * Mapeamento unico enum -> rotulo em portugues e tom visual (Secao 9).
 *
 * Os valores persistidos ficam em ingles por padronizacao tecnica; a interface
 * nunca mostra o valor cru. Centralizar aqui evita que o mesmo status apareca
 * como "Disponivel" em uma tela e "Em estoque" em outra.
 *
 * O tom acompanha a Secao 16: verde para disponivel/concluido/entrada, ambar
 * para reservado/negociando/pendente, vermelho para erro/vencido/estorno.
 * O componente StatusChip sempre exibe texto + icone — cor nunca carrega a
 * informacao sozinha.
 */

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export type LabelEntry = {
  label: string;
  tone: Tone;
  /** Texto curto de apoio, quando o rotulo sozinho deixa duvida. */
  hint?: string;
};

type LabelMap<T extends string> = Record<T, LabelEntry>;

export const WATCH_TYPE: LabelMap<Enums<"watch_type">> = {
  OWNED: { label: "Proprio", tone: "neutral", hint: "Comprado pela WATA" },
  CONSIGNED: {
    label: "Consignado",
    tone: "info",
    hint: "De terceiro, com repasse",
  },
};

export const WATCH_STATUS: LabelMap<Enums<"watch_status">> = {
  AVAILABLE: { label: "Disponivel", tone: "success" },
  RESERVED: { label: "Reservado", tone: "warning" },
  SOLD: { label: "Vendido", tone: "neutral" },
};

export const MOVEMENT_TYPE: LabelMap<Enums<"movement_type">> = {
  MANUAL: { label: "Corda manual", tone: "neutral" },
  AUTOMATIC: { label: "Automatico", tone: "neutral" },
  QUARTZ: { label: "Quartzo", tone: "neutral" },
  SOLAR: { label: "Solar", tone: "neutral" },
  OTHER: { label: "Outro", tone: "neutral" },
};

export const PURCHASE_STATUS: LabelMap<Enums<"purchase_status">> = {
  NEGOTIATING: { label: "Negociando", tone: "warning" },
  PURCHASED: { label: "Comprado", tone: "success" },
  LOST: { label: "Perdido", tone: "neutral" },
};

export const RESERVATION_STATUS: LabelMap<Enums<"reservation_status">> = {
  ACTIVE: { label: "Ativa", tone: "warning" },
  COMPLETED: { label: "Concluida", tone: "success" },
  CANCELLED: { label: "Cancelada", tone: "neutral" },
  EXPIRED: { label: "Vencida", tone: "danger" },
};

export const DEPOSIT_FATE: LabelMap<Enums<"deposit_fate">> = {
  REFUNDED: {
    label: "Devolvido",
    tone: "neutral",
    hint: "Saida no caixa equivalente ao sinal",
  },
  RETAINED: {
    label: "Retido",
    tone: "success",
    hint: "Dinheiro fica no caixa como receita",
  },
  CUSTOMER_CREDIT: {
    label: "Virou credito",
    tone: "info",
    hint: "Cliente usa em uma compra futura",
  },
};

export const CONSIGNMENT_MODE: LabelMap<Enums<"consignment_mode">> = {
  FIXED_PAYOUT: {
    label: "Repasse fixo",
    tone: "neutral",
    hint: "O consignante recebe um valor combinado",
  },
  WATA_PERCENTAGE: {
    label: "Comissao da WATA",
    tone: "neutral",
    hint: "A WATA fica com um percentual da venda",
  },
};

export const PAYOUT_STATUS: LabelMap<Enums<"payout_status">> = {
  PENDING: { label: "Pendente", tone: "warning" },
  PAID: { label: "Pago", tone: "success" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
};

export const FINANCIAL_DIRECTION: LabelMap<Enums<"financial_direction">> = {
  INCOME: { label: "Entrada", tone: "success" },
  EXPENSE: { label: "Saida", tone: "danger" },
};

export const FINANCIAL_STATUS: LabelMap<Enums<"financial_status">> = {
  PENDING: { label: "Pendente", tone: "warning" },
  CONFIRMED: { label: "Confirmado", tone: "success" },
  REVERSED: { label: "Estornado", tone: "danger" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
};

export const EXPENSE_CATEGORY: LabelMap<Enums<"expense_category">> = {
  PURCHASE: { label: "Compra", tone: "neutral" },
  SHIPPING: { label: "Envio", tone: "neutral" },
  SERVICE: { label: "Servico", tone: "neutral" },
  STRAP: { label: "Pulseira", tone: "neutral" },
  PACKAGING: { label: "Embalagem", tone: "neutral" },
  META_ADS: { label: "Meta Ads", tone: "neutral" },
  PAYOUT: { label: "Repasse", tone: "neutral" },
  OTHER: { label: "Outros", tone: "neutral" },
};

export const FINANCIAL_CATEGORY: LabelMap<Enums<"financial_category">> = {
  SALE: { label: "Venda", tone: "success" },
  RESERVATION_DEPOSIT: { label: "Sinal de reserva", tone: "success" },
  RETAINED_DEPOSIT: { label: "Sinal retido", tone: "success" },
  OTHER_INCOME: { label: "Outras entradas", tone: "success" },
  PURCHASE: { label: "Compra de relogio", tone: "danger" },
  SHIPPING: { label: "Envio", tone: "danger" },
  SERVICE: { label: "Servico", tone: "danger" },
  STRAP: { label: "Pulseira", tone: "danger" },
  PACKAGING: { label: "Embalagem", tone: "danger" },
  META_ADS: { label: "Meta Ads", tone: "danger" },
  PAYOUT: { label: "Repasse ao consignante", tone: "danger" },
  DEPOSIT_REFUND: { label: "Devolucao de sinal", tone: "danger" },
  OTHER_EXPENSE: { label: "Outras saidas", tone: "danger" },
};

export const SUPPLIER_RELATION: LabelMap<Enums<"supplier_relation">> = {
  SELLER: { label: "Vendedor", tone: "neutral", hint: "Vende para a WATA" },
  CONSIGNOR: {
    label: "Consignante",
    tone: "info",
    hint: "Deixa pecas em consignacao",
  },
  BOTH: { label: "Vendedor e consignante", tone: "info" },
};

export const CREDIT_MOVEMENT_TYPE: LabelMap<Enums<"credit_movement_type">> = {
  CREDIT: { label: "Credito", tone: "success" },
  DEBIT: { label: "Uso do credito", tone: "neutral" },
};

/** Converte um mapa em lista pronta para select e filtro. */
export function toOptions<T extends string>(
  map: LabelMap<T>,
): Array<{ value: T; label: string; hint?: string }> {
  return (Object.entries(map) as Array<[T, LabelEntry]>).map(
    ([value, entry]) => ({
      value,
      label: entry.label,
      hint: entry.hint,
    }),
  );
}
