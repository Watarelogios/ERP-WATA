-- 00018_parcelamento_editavel.sql
-- Tornar o parcelamento editavel: corrigir parcela, renomear e desfazer.
--
-- Combinado errado, valor digitado torto ou pagamento marcado por engano sao
-- normais no uso diario. Sem edicao, a unica saida seria estornar tudo e
-- recriar, perdendo o historico.
--
-- Antes disso, a data de vencimento era sobrescrita pela data do pagamento, o
-- que impedia desfazer sem perder a informacao. O vencimento passa a ter
-- coluna propria.

alter table public.financial_transactions
  add column if not exists parcela_vencimento date;

comment on column public.financial_transactions.parcela_vencimento is
  'Vencimento combinado da parcela. Nao muda quando ela e paga.';

-- Parcelas ja criadas: o vencimento e a data que elas tem hoje.
update public.financial_transactions
set parcela_vencimento = data
where parcelamento_id is not null and parcela_vencimento is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'financial_vencimento_so_em_parcela'
  ) then
    alter table public.financial_transactions
      add constraint financial_vencimento_so_em_parcela check (
        parcelamento_id is not null or parcela_vencimento is null
      );
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Criacao: passa a gravar o vencimento em coluna propria.
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
   * Divisao em centavos inteiros: dividir em reais deixaria sobra. O resto vai
   * na ultima parcela, entao a soma bate exata com o total.
   */
  v_total_cents := round(p_valor_total * 100);
  v_base_cents := v_total_cents / p_parcelas;
  v_resto_cents := v_total_cents - (v_base_cents * p_parcelas);

  for i in 1..p_parcelas loop
    v_valor := (
      case when i = p_parcelas then v_base_cents + v_resto_cents
           else v_base_cents end
    )::numeric / 100;

    v_vencimento := (v_primeiro + ((i - 1) || ' month')::interval)::date;

    insert into public.financial_transactions (
      owner_id, direcao, categoria, valor, status, data, descricao,
      watch_id, parcelamento_id, parcela_numero, parcela_total,
      parcela_vencimento, idempotency_key
    )
    values (
      v_owner, 'EXPENSE', p_categoria, v_valor, 'PENDING', v_vencimento,
      format('Parcela %s/%s - %s', i, p_parcelas, trim(p_descricao)),
      p_watch_id, v_grupo, i::smallint, p_parcelas,
      v_vencimento, 'installment:' || v_grupo::text || ':' || i::text
    );

    return query select v_grupo, i::smallint, v_valor, v_vencimento;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Editar uma parcela pendente
--
-- Parcela paga nao e editada aqui: o dinheiro ja saiu. Desfazer o pagamento
-- primeiro deixa claro que o caixa volta atras.
-- ---------------------------------------------------------------------------
create or replace function public.update_installment(
  p_transaction_id uuid,
  p_valor numeric default null,
  p_vencimento date default null
)
returns table (valor numeric, vencimento date)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_transaction public.financial_transactions%rowtype;
  v_valor numeric(14, 2);
  v_vencimento date;
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
    raise exception
      'Esta parcela ja foi paga. Desfaca o pagamento antes de alterar o valor.'
      using errcode = 'check_violation';
  end if;

  v_valor := coalesce(p_valor, v_transaction.valor);
  v_vencimento := coalesce(
    p_vencimento, v_transaction.parcela_vencimento, v_transaction.data
  );

  if v_valor <= 0 then
    raise exception 'O valor da parcela precisa ser maior que zero.'
      using errcode = 'check_violation';
  end if;

  update public.financial_transactions
  set valor = v_valor,
      -- Pendente: a data no extrato acompanha o vencimento.
      data = v_vencimento,
      parcela_vencimento = v_vencimento
  where id = p_transaction_id;

  return query select v_valor, v_vencimento;
end;
$$;

-- ---------------------------------------------------------------------------
-- Desfazer o pagamento de uma parcela
--
-- Marcar como paga por engano e comum. Voltar para pendente devolve o valor ao
-- caixa e restaura o vencimento combinado.
-- ---------------------------------------------------------------------------
create or replace function public.unpay_installment(p_transaction_id uuid)
returns table (valor numeric, vencimento date)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_transaction public.financial_transactions%rowtype;
  v_vencimento date;
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

  if v_transaction.status <> 'CONFIRMED' then
    raise exception 'Esta parcela nao esta paga.'
      using errcode = 'check_violation';
  end if;

  v_vencimento := coalesce(v_transaction.parcela_vencimento, v_transaction.data);

  update public.financial_transactions
  set status = 'PENDING', data = v_vencimento
  where id = p_transaction_id;

  return query select v_transaction.valor, v_vencimento;
end;
$$;

-- ---------------------------------------------------------------------------
-- Renomear a compra parcelada
--
-- A descricao se repete em todas as parcelas; corrigir uma a uma seria
-- trabalho manual garantido de ficar pela metade.
-- ---------------------------------------------------------------------------
create or replace function public.rename_installment_plan(
  p_parcelamento_id uuid,
  p_descricao text
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_afetadas integer;
begin
  if v_owner is null then
    raise exception 'Sessao invalida.' using errcode = 'insufficient_privilege';
  end if;

  if p_descricao is null or length(trim(p_descricao)) = 0 then
    raise exception 'Informe a descricao da compra.'
      using errcode = 'check_violation';
  end if;

  update public.financial_transactions
  set descricao = format(
        'Parcela %s/%s - %s',
        parcela_numero, parcela_total, trim(p_descricao)
      )
  where parcelamento_id = p_parcelamento_id and owner_id = v_owner;

  get diagnostics v_afetadas = row_count;

  if v_afetadas = 0 then
    raise exception 'Parcelamento nao encontrado.'
      using errcode = 'no_data_found';
  end if;

  return v_afetadas;
end;
$$;

revoke all on function public.update_installment(uuid, numeric, date) from anon;
grant execute on function public.update_installment(uuid, numeric, date)
  to authenticated;

revoke all on function public.unpay_installment(uuid) from anon;
grant execute on function public.unpay_installment(uuid) to authenticated;

revoke all on function public.rename_installment_plan(uuid, text) from anon;
grant execute on function public.rename_installment_plan(uuid, text)
  to authenticated;
