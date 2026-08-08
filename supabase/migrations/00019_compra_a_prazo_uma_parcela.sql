-- 00019_compra_a_prazo_uma_parcela.sql
-- Liberar a compra a prazo em parcela unica.
--
-- Comprar no cartao para pagar so no dia 10 e a prazo do mesmo jeito que 5x:
-- o dinheiro ainda nao saiu e existe um vencimento a acompanhar. Exigir duas
-- parcelas obrigava a registrar como saida confirmada, debitando o caixa hoje
-- por um valor que so sai no mes que vem.
--
-- Com uma parcela so, o prefixo "Parcela 1/1 - " nao informa nada e ainda
-- polui o extrato: a descricao fica limpa.

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
  v_descricao text;
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

  if p_parcelas is null or p_parcelas < 1 or p_parcelas > 60 then
    raise exception 'O numero de parcelas deve estar entre 1 e 60.'
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

    v_descricao := case
      when p_parcelas = 1 then trim(p_descricao)
      else format('Parcela %s/%s - %s', i, p_parcelas, trim(p_descricao))
    end;

    insert into public.financial_transactions (
      owner_id, direcao, categoria, valor, status, data, descricao,
      watch_id, parcelamento_id, parcela_numero, parcela_total,
      parcela_vencimento, idempotency_key
    )
    values (
      v_owner, 'EXPENSE', p_categoria, v_valor, 'PENDING', v_vencimento,
      v_descricao,
      p_watch_id, v_grupo, i::smallint, p_parcelas,
      v_vencimento, 'installment:' || v_grupo::text || ':' || i::text
    );

    return query select v_grupo, i::smallint, v_valor, v_vencimento;
  end loop;
end;
$$;

-- Renomear precisa seguir a mesma regra, senao o "1/1" voltaria pela edicao.
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
  set descricao = case
        when parcela_total = 1 then trim(p_descricao)
        else format(
          'Parcela %s/%s - %s',
          parcela_numero, parcela_total, trim(p_descricao)
        )
      end
  where parcelamento_id = p_parcelamento_id and owner_id = v_owner;

  get diagnostics v_afetadas = row_count;

  if v_afetadas = 0 then
    raise exception 'Parcelamento nao encontrado.'
      using errcode = 'no_data_found';
  end if;

  return v_afetadas;
end;
$$;
