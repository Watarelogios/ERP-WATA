import { describe, expect, it } from "vitest";

import * as labels from "@/lib/labels";

/**
 * A Secao 9 exige um unico modulo de rotulos. Estes testes garantem que ele
 * cobre todos os valores dos enums: um enum novo sem rotulo apareceria na
 * interface como texto cru em ingles.
 */

const MAPS = {
  WATCH_TYPE: ["OWNED", "CONSIGNED"],
  WATCH_STATUS: ["AVAILABLE", "RESERVED", "SOLD"],
  MOVEMENT_TYPE: ["MANUAL", "AUTOMATIC", "QUARTZ", "SOLAR", "OTHER"],
  PURCHASE_STATUS: ["NEGOTIATING", "PURCHASED", "LOST"],
  RESERVATION_STATUS: ["ACTIVE", "COMPLETED", "CANCELLED", "EXPIRED"],
  DEPOSIT_FATE: ["REFUNDED", "RETAINED", "CUSTOMER_CREDIT"],
  CONSIGNMENT_MODE: ["FIXED_PAYOUT", "WATA_PERCENTAGE"],
  PAYOUT_STATUS: ["PENDING", "PAID", "CANCELLED"],
  FINANCIAL_DIRECTION: ["INCOME", "EXPENSE"],
  FINANCIAL_STATUS: ["PENDING", "CONFIRMED", "REVERSED", "CANCELLED"],
  EXPENSE_CATEGORY: [
    "PURCHASE",
    "SHIPPING",
    "SERVICE",
    "STRAP",
    "PACKAGING",
    "META_ADS",
    "PAYOUT",
    "OTHER",
  ],
  FINANCIAL_CATEGORY: [
    "SALE",
    "RESERVATION_DEPOSIT",
    "RETAINED_DEPOSIT",
    "OTHER_INCOME",
    "PURCHASE",
    "SHIPPING",
    "SERVICE",
    "STRAP",
    "PACKAGING",
    "META_ADS",
    "PAYOUT",
    "DEPOSIT_REFUND",
    "OTHER_EXPENSE",
  ],
  SUPPLIER_RELATION: ["SELLER", "CONSIGNOR", "BOTH"],
  CREDIT_MOVEMENT_TYPE: ["CREDIT", "DEBIT"],
} as const;

const TONES = ["neutral", "success", "warning", "danger", "info"];

describe("mapeamento de enums", () => {
  for (const [nome, valores] of Object.entries(MAPS)) {
    describe(nome, () => {
      const map = labels[nome as keyof typeof labels] as Record<
        string,
        labels.LabelEntry
      >;

      it("cobre exatamente os valores do enum", () => {
        expect(Object.keys(map).sort()).toEqual([...valores].sort());
      });

      it("tem rotulo em portugues e tom valido", () => {
        for (const valor of valores) {
          const entry = map[valor];

          expect(entry.label.length).toBeGreaterThan(0);
          // Rotulo igual ao valor cru significa que faltou traduzir.
          expect(entry.label).not.toBe(valor);
          expect(TONES).toContain(entry.tone);
        }
      });
    });
  }
});

describe("toOptions", () => {
  it("gera lista pronta para select preservando a ordem", () => {
    expect(labels.toOptions(labels.WATCH_STATUS)).toEqual([
      { value: "AVAILABLE", label: "Disponivel", hint: undefined },
      { value: "RESERVED", label: "Reservado", hint: undefined },
      { value: "SOLD", label: "Vendido", hint: undefined },
    ]);
  });

  it("carrega o texto de apoio quando existe", () => {
    const options = labels.toOptions(labels.WATCH_TYPE);

    expect(options[0].hint).toBe("Comprado pela WATA");
  });
});

describe("coerencia dos tons (Secao 16)", () => {
  it("usa verde para disponivel, entrada e concluido", () => {
    expect(labels.WATCH_STATUS.AVAILABLE.tone).toBe("success");
    expect(labels.FINANCIAL_DIRECTION.INCOME.tone).toBe("success");
    expect(labels.RESERVATION_STATUS.COMPLETED.tone).toBe("success");
  });

  it("usa ambar para reservado, negociando e pendente", () => {
    expect(labels.WATCH_STATUS.RESERVED.tone).toBe("warning");
    expect(labels.PURCHASE_STATUS.NEGOTIATING.tone).toBe("warning");
    expect(labels.PAYOUT_STATUS.PENDING.tone).toBe("warning");
    expect(labels.FINANCIAL_STATUS.PENDING.tone).toBe("warning");
  });

  it("usa vermelho para vencido, estorno e saida", () => {
    expect(labels.RESERVATION_STATUS.EXPIRED.tone).toBe("danger");
    expect(labels.FINANCIAL_STATUS.REVERSED.tone).toBe("danger");
    expect(labels.FINANCIAL_DIRECTION.EXPENSE.tone).toBe("danger");
  });
});
