// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "./helpers/database";

/**
 * Compra parcelada.
 *
 * O ponto central: a parcela pendente mostra o que se deve, mas so pesa no
 * caixa quando e paga.
 */
describe("parcelamento", () => {
  let ctx: TestDatabase;
  let owner: string;
  let outro: string;

  async function caixa() {
    const result = await ctx.db.query<{ caixa: string }>(
      "select caixa from public.dashboard_summary where owner_id = $1",
      [owner],
    );

    return Number(result.rows[0].caixa);
  }

  async function parcelar(
    descricao: string,
    total: number,
    parcelas: number,
    userId = owner,
  ) {
    return ctx.asUser(userId, () =>
      ctx.db.query<{
        parcelamento_id: string;
        parcela_numero: number;
        valor: string;
        vencimento: string;
      }>(
        `select * from public.create_installment_purchase(
           p_descricao => $1,
           p_valor_total => $2,
           p_parcelas => $3::smallint
         )`,
        [descricao, total, parcelas],
      ),
    );
  }

  async function parcelas(grupoId: string) {
    return ctx.db.query<{
      id: string;
      valor: string;
      status: string;
      descricao: string;
      parcela_numero: number;
      data: string;
    }>(
      `select id, valor, status, descricao, parcela_numero, data
       from public.financial_transactions
       where parcelamento_id = $1 order by parcela_numero`,
      [grupoId],
    );
  }

  async function pagar(transactionId: string, userId = owner) {
    return ctx.asUser(userId, () =>
      ctx.db.query(
        "select * from public.pay_installment(p_transaction_id => $1)",
        [transactionId],
      ),
    );
  }

  beforeAll(async () => {
    ctx = await createTestDatabase();
    owner = await ctx.createUser("dono@wata.test");
    outro = await ctx.createUser("outro@wata.test");

    await ctx.db.query(
      "insert into public.settings (owner_id, saldo_inicial) values ($1, 20000)",
      [owner],
    );
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe("criacao", () => {
    it("cria uma parcela por prestacao, todas pendentes", async () => {
      const result = await parcelar("Tag Heuer ref X", 5000, 5);
      const grupo = result.rows[0].parcelamento_id;

      const linhas = await parcelas(grupo);

      expect(linhas.rows).toHaveLength(5);
      expect(linhas.rows.every((row) => row.status === "PENDING")).toBe(true);
      expect(linhas.rows.map((row) => Number(row.valor))).toEqual([
        1000, 1000, 1000, 1000, 1000,
      ]);
    });

    it("descreve a parcela no formato pedido", async () => {
      const result = await parcelar("Tag Heuer ref X", 5000, 5);
      const linhas = await parcelas(result.rows[0].parcelamento_id);

      expect(linhas.rows[0].descricao).toBe("Parcela 1/5 - Tag Heuer ref X");
      expect(linhas.rows[4].descricao).toBe("Parcela 5/5 - Tag Heuer ref X");
    });

    it("nao perde centavo em divisao inexata", async () => {
      /*
       * 1000 em 3 daria 333,33 tres vezes e sumiria 1 centavo. O resto vai na
       * ultima parcela: a soma tem de bater exatamente com o total.
       */
      const result = await parcelar("Divisao inexata", 1000, 3);
      const linhas = await parcelas(result.rows[0].parcelamento_id);

      const valores = linhas.rows.map((row) => Number(row.valor));

      expect(valores).toEqual([333.33, 333.33, 333.34]);
      expect(valores.reduce((soma, v) => soma + v, 0)).toBeCloseTo(1000, 2);
    });

    it("espaca os vencimentos em um mes", async () => {
      const result = await parcelar("Mensal", 300, 3);
      const linhas = await parcelas(result.rows[0].parcelamento_id);

      const datas = linhas.rows.map((row) => new Date(row.data));

      expect(datas[1].getUTCMonth()).toBe((datas[0].getUTCMonth() + 1) % 12);
      expect(datas[2].getUTCMonth()).toBe((datas[0].getUTCMonth() + 2) % 12);
    });

    it("nao mexe no caixa ao criar", async () => {
      const antes = await caixa();

      await parcelar("Nao debita ainda", 3000, 3);

      expect(await caixa()).toBe(antes);
    });

    it("mostra o total devido como pendente", async () => {
      const result = await parcelar("Total pendente", 1200, 4);

      const pendente = await ctx.db.query<{ soma: string }>(
        `select coalesce(sum(valor), 0) as soma
         from public.financial_transactions
         where parcelamento_id = $1 and status = 'PENDING'`,
        [result.rows[0].parcelamento_id],
      );

      expect(Number(pendente.rows[0].soma)).toBe(1200);
    });

    it("recusa menos de duas parcelas", async () => {
      await expect(parcelar("Uma so", 1000, 1)).rejects.toThrow(
        /entre 2 e 60/i,
      );
    });

    it("recusa valor zerado ou negativo", async () => {
      await expect(parcelar("Sem valor", 0, 3)).rejects.toThrow(
        /valor total/i,
      );
    });

    it("recusa descricao vazia", async () => {
      await expect(parcelar("   ", 1000, 3)).rejects.toThrow(/descricao/i);
    });
  });

  describe("pagamento", () => {
    it("debita o caixa apenas quando a parcela e paga", async () => {
      const result = await parcelar("Pagamento gradual", 3000, 3);
      const linhas = await parcelas(result.rows[0].parcelamento_id);

      const antes = await caixa();

      await pagar(linhas.rows[0].id);
      expect(await caixa()).toBe(antes - 1000);

      await pagar(linhas.rows[1].id);
      expect(await caixa()).toBe(antes - 2000);

      // A terceira segue pendente e nao entrou na conta.
      expect(await caixa()).toBe(antes - 2000);
    });

    it("registra a data do pagamento", async () => {
      const result = await parcelar("Data do pagamento", 2000, 2);
      const linhas = await parcelas(result.rows[0].parcelamento_id);

      await pagar(linhas.rows[0].id);

      const depois = await ctx.db.query<{ status: string; data: string }>(
        "select status, data from public.financial_transactions where id = $1",
        [linhas.rows[0].id],
      );

      expect(depois.rows[0].status).toBe("CONFIRMED");
      expect(depois.rows[0].data).toEqual(expect.anything());
    });

    it("recusa pagar a mesma parcela duas vezes", async () => {
      const result = await parcelar("Duas vezes", 2000, 2);
      const linhas = await parcelas(result.rows[0].parcelamento_id);

      await pagar(linhas.rows[0].id);

      await expect(pagar(linhas.rows[0].id)).rejects.toThrow(/ja esta como/i);
    });

    it("recusa marcar lancamento comum como parcela paga", async () => {
      const avulso = await ctx.db.query<{ id: string }>(
        `insert into public.financial_transactions
           (owner_id, direcao, categoria, valor, status)
         values ($1, 'EXPENSE', 'META_ADS', 300, 'PENDING') returning id`,
        [owner],
      );

      await expect(pagar(avulso.rows[0].id)).rejects.toThrow(
        /nao e uma parcela/i,
      );
    });

    it("nao paga parcela de outro usuario", async () => {
      const result = await parcelar("De outro", 2000, 2);
      const linhas = await parcelas(result.rows[0].parcelamento_id);

      await expect(pagar(linhas.rows[0].id, outro)).rejects.toThrow(
        /nao encontrada/i,
      );

      const depois = await ctx.db.query<{ status: string }>(
        "select status from public.financial_transactions where id = $1",
        [linhas.rows[0].id],
      );
      expect(depois.rows[0].status).toBe("PENDING");
    });

    it("nao cria parcelamento em nome de outro usuario", async () => {
      const result = await parcelar("Do outro usuario", 1000, 2, outro);

      const dono = await ctx.db.query<{ owner_id: string }>(
        "select owner_id from public.financial_transactions where parcelamento_id = $1 limit 1",
        [result.rows[0].parcelamento_id],
      );

      expect(dono.rows[0].owner_id).toBe(outro);
    });
  });

  describe("efeito acumulado", () => {
    it("pagar todas as parcelas debita exatamente o total", async () => {
      const antes = await caixa();
      const result = await parcelar("Total exato", 1000, 3);
      const linhas = await parcelas(result.rows[0].parcelamento_id);

      for (const linha of linhas.rows) {
        await pagar(linha.id);
      }

      // Inclui o centavo do arredondamento: 333,33 + 333,33 + 333,34.
      expect(await caixa()).toBe(antes - 1000);
    });
  });
});

/**
 * Edicao do parcelamento (migration 00018).
 *
 * Combinado errado, valor torto e pagamento marcado por engano sao normais no
 * uso diario: precisam ter conserto sem estornar tudo e recriar.
 */
describe("parcelamento editavel", () => {
  let ctx: TestDatabase;
  let owner: string;
  let outro: string;

  async function caixa() {
    const result = await ctx.db.query<{ caixa: string }>(
      "select caixa from public.dashboard_summary where owner_id = $1",
      [owner],
    );

    return Number(result.rows[0].caixa);
  }

  async function criar(descricao: string, total: number, parcelas: number) {
    const result = await ctx.asUser(owner, () =>
      ctx.db.query<{ parcelamento_id: string }>(
        `select * from public.create_installment_purchase(
           p_descricao => $1, p_valor_total => $2, p_parcelas => $3::smallint
         )`,
        [descricao, total, parcelas],
      ),
    );

    const grupo = result.rows[0].parcelamento_id;

    const linhas = await ctx.db.query<{
      id: string;
      valor: string;
      status: string;
      data: string;
      descricao: string;
      parcela_vencimento: string;
    }>(
      `select id, valor, status, data, descricao, parcela_vencimento
       from public.financial_transactions
       where parcelamento_id = $1 order by parcela_numero`,
      [grupo],
    );

    return { grupo, linhas: linhas.rows };
  }

  beforeAll(async () => {
    ctx = await createTestDatabase();
    owner = await ctx.createUser("dono@wata.test");
    outro = await ctx.createUser("outro@wata.test");

    await ctx.db.query(
      "insert into public.settings (owner_id, saldo_inicial) values ($1, 30000)",
      [owner],
    );
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it("altera o valor de uma parcela pendente", async () => {
    const { linhas } = await criar("Ajuste de valor", 3000, 3);

    await ctx.asUser(owner, () =>
      ctx.db.query(
        "select * from public.update_installment(p_transaction_id => $1, p_valor => $2)",
        [linhas[0].id, 1200],
      ),
    );

    const depois = await ctx.db.query<{ valor: string }>(
      "select valor from public.financial_transactions where id = $1",
      [linhas[0].id],
    );

    expect(Number(depois.rows[0].valor)).toBe(1200);
  });

  it("altera o vencimento sem mexer no caixa", async () => {
    const antes = await caixa();
    const { linhas } = await criar("Ajuste de data", 2000, 2);

    await ctx.asUser(owner, () =>
      ctx.db.query(
        "select * from public.update_installment(p_transaction_id => $1, p_vencimento => current_date + 45)",
        [linhas[0].id],
      ),
    );

    expect(await caixa()).toBe(antes);
  });

  it("recusa editar parcela ja paga", async () => {
    const { linhas } = await criar("Ja paga", 2000, 2);

    await ctx.asUser(owner, () =>
      ctx.db.query("select * from public.pay_installment(p_transaction_id => $1)", [
        linhas[0].id,
      ]),
    );

    await expect(
      ctx.asUser(owner, () =>
        ctx.db.query(
          "select * from public.update_installment(p_transaction_id => $1, p_valor => 999)",
          [linhas[0].id],
        ),
      ),
    ).rejects.toThrow(/desfaca o pagamento/i);
  });

  it("desfaz o pagamento devolvendo o valor ao caixa", async () => {
    const { linhas } = await criar("Desfazer", 2000, 2);
    const antes = await caixa();

    await ctx.asUser(owner, () =>
      ctx.db.query("select * from public.pay_installment(p_transaction_id => $1)", [
        linhas[0].id,
      ]),
    );
    expect(await caixa()).toBe(antes - 1000);

    await ctx.asUser(owner, () =>
      ctx.db.query("select * from public.unpay_installment(p_transaction_id => $1)", [
        linhas[0].id,
      ]),
    );

    expect(await caixa()).toBe(antes);
  });

  it("restaura o vencimento combinado ao desfazer", async () => {
    /*
     * Pagar sobrescreve a data no extrato com a data do pagamento. O
     * vencimento vive em coluna propria justamente para sobreviver a isso.
     */
    const { linhas } = await criar("Vencimento preservado", 2000, 2);
    const vencimentoOriginal = linhas[0].parcela_vencimento;

    await ctx.asUser(owner, () =>
      ctx.db.query(
        "select * from public.pay_installment(p_transaction_id => $1, p_data_pagamento => current_date + 10)",
        [linhas[0].id],
      ),
    );

    await ctx.asUser(owner, () =>
      ctx.db.query("select * from public.unpay_installment(p_transaction_id => $1)", [
        linhas[0].id,
      ]),
    );

    const depois = await ctx.db.query<{ status: string; data: string }>(
      "select status, data from public.financial_transactions where id = $1",
      [linhas[0].id],
    );

    expect(depois.rows[0].status).toBe("PENDING");
    expect(depois.rows[0].data).toEqual(vencimentoOriginal);
  });

  it("recusa desfazer parcela que nao esta paga", async () => {
    const { linhas } = await criar("Nao paga", 2000, 2);

    await expect(
      ctx.asUser(owner, () =>
        ctx.db.query(
          "select * from public.unpay_installment(p_transaction_id => $1)",
          [linhas[0].id],
        ),
      ),
    ).rejects.toThrow(/nao esta paga/i);
  });

  it("renomeia todas as parcelas de uma vez", async () => {
    const { grupo } = await criar("Nome errado", 3000, 3);

    await ctx.asUser(owner, () =>
      ctx.db.query(
        "select public.rename_installment_plan($1, $2)",
        [grupo, "Tag Heuer ref Y"],
      ),
    );

    const depois = await ctx.db.query<{ descricao: string }>(
      `select descricao from public.financial_transactions
       where parcelamento_id = $1 order by parcela_numero`,
      [grupo],
    );

    expect(depois.rows.map((row) => row.descricao)).toEqual([
      "Parcela 1/3 - Tag Heuer ref Y",
      "Parcela 2/3 - Tag Heuer ref Y",
      "Parcela 3/3 - Tag Heuer ref Y",
    ]);
  });

  it("nao edita parcela de outro usuario", async () => {
    const { linhas } = await criar("Protegida", 2000, 2);

    await expect(
      ctx.asUser(outro, () =>
        ctx.db.query(
          "select * from public.update_installment(p_transaction_id => $1, p_valor => 1)",
          [linhas[0].id],
        ),
      ),
    ).rejects.toThrow(/nao encontrada/i);
  });

  it("nao renomeia parcelamento de outro usuario", async () => {
    const { grupo } = await criar("Protegido", 2000, 2);

    await expect(
      ctx.asUser(outro, () =>
        ctx.db.query("select public.rename_installment_plan($1, $2)", [
          grupo,
          "Invadido",
        ]),
      ),
    ).rejects.toThrow(/nao encontrado/i);
  });
});
