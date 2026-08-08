-- 00017_parcelamento.sql
-- Compra parcelada: uma saida futura por parcela.
--
-- O modelo ja resolvia metade disso: o caixa soma apenas lancamentos
-- CONFIRMED, entao uma parcela nasce PENDING e so entra na conta quando e
-- paga. Nao ha "conta a pagar" separada — cada parcela e um lancamento de
-- verdade, no extrato, desde o dia em que a compra foi feita.
--
-- Faltava agrupar as parcelas de uma mesma compra, para exibir "3/5" e o que
-- ainda falta pagar.

alter table public.financial_transactions
  add column if not exists parcelamento_id uuid,
  add column if not exists parcela_numero smallint,
  add column if not exists parcela_total smallint;

comment on column public.financial_transactions.parcelamento_id is
  'Agrupa as parcelas de uma mesma compra parcelada.';
comment on column public.financial_transactions.data is
  'Vencimento enquanto a parcela esta pendente; data do pagamento depois dela paga.';

do $$
begin
  -- Os tres campos andam juntos: parcela solta sem grupo nao faz sentido.
  if not exists (
    select 1 from pg_constraint where conname = 'financial_parcelamento_completo'
  ) then
    alter table public.financial_transactions
      add constraint financial_parcelamento_completo check (
        (parcelamento_id is null and parcela_numero is null
          and parcela_total is null)
        or (parcelamento_id is not null and parcela_numero is not null
          and parcela_total is not null
          and parcela_numero >= 1 and parcela_total >= 1
          and parcela_numero <= parcela_total)
      );
  end if;
end
$$;

create index if not exists financial_parcelamento_idx
  on public.financial_transactions (owner_id, parcelamento_id, parcela_numero)
  where parcelamento_id is not null;

-- ---------------------------------------------------------------------------
-- Criar a compra parcelada
--
-- As parcelas sao criadas todas de uma vez, pendentes, com vencimento mensal.
-- Assim o total devido aparece no dia da compra, e nao aos poucos conforme a
-- pessoa lembra de lancar.
-- ---------------------------------------------------------------------------
create or replace function public.create_installment_purchase(
  p_descricao text,
  p_valor_total numeric,
  p_parcelas smallint,
  p_primeiro_vencimento date default null,
  p_categoria public.financial_category default 'PURCHASE',
  p_watch_id uuid default null
)
returns table (
  parcelamento_id uuid,
  parcela_numero smallint,
  valor numeric,
  vencimento date
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_grupo uuid := gen_random_uuid();
  v_primeiro date := coalesce(p_primeiro_vencimento, current_date);
  v_total_cents bigint;
  v_base_cents bigint;
  v_resto_cents bigint;
  v_valor numeric(14, 2);
  v_vencimento date;
  /* A variavel do FOR em plpgsql e sempre integer: o cast e feito no uso. */
  i integer;
begin
  if v_owner is null then
    raise exception 'Sessao invalida.' using errcode = 'insufficient_privilege';
  end if;

  if p_valor_total is null or p_valor_total <= 0 then
    raise exception 'Informe o valor total da compra.'
      using errcode = 'check_violation';
  end if;

  if p_parcelas is null or p_parcelas < 2 or p_parcelas > 60 then
    raise exception 'O numero de parcelas deve estar entre 2 e 60.'
      using errcode = 'check_violation';
  end if;

  if p_descricao is null or length(trim(p_descricao)) = 0 then
    raise exception 'Informe a descricao da compra.'
      using errcode = 'check_violation';
  end if;

  if p_categoria not in (
    'PURCHASE', 'SHIPPING', 'SERVICE', 'STRAP', 'PACKAGING',
    'META_ADS', 'OTHER_EXPENSE'
  ) then
    raise exception 'Categoria invalida para uma compra parcelada.'
      using errcode = 'check_violation';
  end if;

  /*
   * Divisao em centavos inteiros. Dividir em reais deixaria sobra: 1000 em 3
   * daria 333,33 tres vezes, somando 999,99. O resto vai na ultima parcela,
   * entao a soma das parcelas e sempre igual ao total.
   */
  v_total_cents := round(p_valor_total * 100);
  v_base_cents := v_total_cents / p_parcelas;
  v_resto_cents := v_total_cents - (v_base_cents * p_parcelas);

  for i in 1..p_parcelas loop
    v_valor := (
      case when i = p_parcelas then v_base_cents + v_resto_cents
           else v_base_cents end
    )::numeric / 100;

    -- Vencimento mensal a partir do primeiro.
    v_vencimento := (v_primeiro + ((i - 1) || ' month')::interval)::date;

    insert into public.financial_transactions (
      owner_id, direcao, categoria, valor, status, data, descricao,
      watch_id, parcelamento_id, parcela_numero, parcela_total,
      idempotency_key
    )
    values (
      v_owner, 'EXPENSE', p_categoria, v_valor, 'PENDING', v_vencimento,
      format('Parcela %s/%s - %s', i, p_parcelas, trim(p_descricao)),
      p_watch_id, v_grupo, i::smallint, p_parcelas,
      'installment:' || v_grupo::text || ':' || i::text
    );

    return query select v_grupo, i::smallint, v_valor, v_vencimento;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Marcar uma parcela como paga
--
-- A parcela sai de PENDING para CONFIRMED e so entao pesa no caixa. A data
-- passa a ser a do pagamento, porque e quando o dinheiro saiu de fato.
-- ---------------------------------------------------------------------------
create or replace function public.pay_installment(
  p_transaction_id uuid,
  p_data_pagamento date default null
)
returns table (valor numeric, parcela_numero smallint, parcela_total smallint)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_transaction public.financial_transactions%rowtype;
begin
  if v_owner is null then
    raise exception 'Sessao invalida.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_transaction
  from public.financial_transactions
  where id = p_transaction_id and owner_id = v_owner
  for update;

  if not found then
    raise exception 'Parcela nao encontrada.' using errcode = 'no_data_found';
  end if;

  if v_transaction.parcelamento_id is null then
    raise exception 'Este lancamento nao e uma parcela.'
      using errcode = 'check_violation';
  end if;

  if v_transaction.status <> 'PENDING' then
    raise exception 'Esta parcela ja esta como %.', v_transaction.status
      using errcode = 'check_violation';
  end if;

  update public.financial_transactions
  set status = 'CONFIRMED',
      data = coalesce(p_data_pagamento, current_date)
  where id = p_transaction_id;

  return query
    select v_transaction.valor,
           v_transaction.parcela_numero,
           v_transaction.parcela_total;
end;
$$;

comment on function public.create_installment_purchase(
  text, numeric, smallint, date, public.financial_category, uuid
) is 'Cria as parcelas pendentes de uma compra parcelada.';

comment on function public.pay_installment(uuid, date) is
  'Confirma o pagamento de uma parcela, debitando o caixa uma unica vez.';

revoke all on function public.create_installment_purchase(
  text, numeric, smallint, date, public.financial_category, uuid
) from anon;
grant execute on function public.create_installment_purchase(
  text, numeric, smallint, date, public.financial_category, uuid
) to authenticated;

revoke all on function public.pay_installment(uuid, date) from anon;
grant execute on function public.pay_installment(uuid, date) to authenticated;
