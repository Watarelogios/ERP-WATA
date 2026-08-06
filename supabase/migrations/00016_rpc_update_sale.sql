-- 00016_rpc_update_sale.sql
-- Editar uma venda ja concluida, recalculando o que dela depende.
--
-- Uma venda nao e um registro isolado: dela dependem o lucro, o valor vendido
-- do relogio, a entrada no caixa e, em item consignado, o repasse ao
-- consignante. Editar so a linha de `sales` deixaria todo o resto desatualizado.
--
-- Tudo acontece em uma transacao. O historico do relogio recebe um registro da
-- edicao, para que a mudanca de um valor financeiro nunca seja silenciosa.

-- ---------------------------------------------------------------------------
-- Formata valor em pt-BR sem depender do locale do servidor.
--
-- `to_char` com G e D usa lc_numeric, que varia conforme a instalacao: o mesmo
-- SQL produziria "2.000,00" em um banco e "2,000.00" em outro. Usando os
-- separadores literais e trocando depois, o resultado e sempre o mesmo.
-- ---------------------------------------------------------------------------
create or replace function public.format_brl(p_valor numeric)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select translate(to_char(p_valor, 'FM999,999,990.00'), ',.', '.,');
$$;

create or replace function public.update_sale(
  p_sale_id uuid,
  p_valor_venda numeric,
  p_origem text default null,
  p_forma_pagamento text default null,
  p_data_venda date default null,
  p_client_id uuid default null
)
returns table (
  lucro_bruto numeric,
  lucro_liquido numeric,
  entrada_caixa numeric,
  repasse_ajustado numeric
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_sale public.sales%rowtype;
  v_watch public.watches%rowtype;
  v_reservation public.reservations%rowtype;
  v_payout public.consignment_payouts%rowtype;
  v_consignment public.consignments%rowtype;
  v_data date;
  v_client uuid;
  v_sinal numeric(14, 2) := 0;
  v_entrada numeric(14, 2);
  v_transaction_id uuid;
  v_repasse numeric(14, 2) := null;
  v_bruto numeric(14, 2);
  v_liquido numeric(14, 2);
begin
  if v_owner is null then
    raise exception 'Sessao invalida.' using errcode = 'insufficient_privilege';
  end if;

  if p_valor_venda is null or p_valor_venda < 0 then
    raise exception 'Informe o valor da venda.' using errcode = 'check_violation';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id and owner_id = v_owner
  for update;

  if not found then
    raise exception 'Venda nao encontrada.' using errcode = 'no_data_found';
  end if;

  select * into v_watch
  from public.watches where id = v_sale.watch_id for update;

  v_data := coalesce(p_data_venda, v_sale.data_venda);

  /*
   * Venda originada de reserva mantem o cliente da reserva: trocar aqui
   * quebraria a ligacao com o sinal ja recebido daquela pessoa.
   */
  if v_sale.reservation_id is not null then
    select * into v_reservation
    from public.reservations where id = v_sale.reservation_id;

    v_sinal := coalesce(v_reservation.valor_sinal, 0);
    v_client := v_sale.client_id;

    if p_client_id is not null and p_client_id <> v_sale.client_id then
      raise exception
        'Esta venda veio de uma reserva; o cliente nao pode ser trocado.'
        using errcode = 'check_violation';
    end if;
  else
    v_client := coalesce(p_client_id, v_sale.client_id);
  end if;

  if p_valor_venda < v_sinal then
    raise exception 'O valor da venda nao pode ser menor que o sinal ja recebido.'
      using errcode = 'check_violation';
  end if;

  -- ---------------------------------------------------------------------
  -- Repasse do consignante
  -- ---------------------------------------------------------------------
  select * into v_payout
  from public.consignment_payouts
  where sale_id = p_sale_id
  for update;

  if found then
    select * into v_consignment
    from public.consignments where id = v_payout.consignment_id;

    /*
     * Repasse ja pago e percentual sobre a venda: o dinheiro saiu no valor
     * antigo. Alterar a venda mudaria o que era devido, e o caixa passaria a
     * contar uma historia que nao aconteceu. Estornar o repasse primeiro e a
     * unica forma correta de corrigir.
     */
    if v_payout.status = 'PAID'
       and v_consignment.modalidade = 'WATA_PERCENTAGE'
       and p_valor_venda <> v_sale.valor_venda then
      raise exception
        'O repasse deste item ja foi pago e depende do valor da venda. Estorne o repasse antes de alterar o valor.'
        using errcode = 'check_violation';
    end if;
  end if;

  -- ---------------------------------------------------------------------
  -- A venda em si. O trigger da migration 00005 recalcula os lucros.
  -- ---------------------------------------------------------------------
  update public.sales
  set valor_venda = p_valor_venda,
      origem = coalesce(p_origem, origem),
      forma_pagamento = coalesce(p_forma_pagamento, forma_pagamento),
      data_venda = v_data,
      client_id = v_client
  where id = p_sale_id;

  update public.watches
  set valor_vendido = p_valor_venda
  where id = v_sale.watch_id;

  -- ---------------------------------------------------------------------
  -- Entrada no caixa: apenas o que nao veio como sinal (Secao 13.4).
  -- ---------------------------------------------------------------------
  v_entrada := p_valor_venda - v_sinal;

  select id into v_transaction_id
  from public.financial_transactions
  where sale_id = p_sale_id and categoria = 'SALE'
  for update;

  if v_entrada > 0 then
    if v_transaction_id is null then
      -- Antes o sinal cobria tudo; agora ha valor a receber.
      insert into public.financial_transactions (
        owner_id, direcao, categoria, valor, status, data, descricao,
        watch_id, sale_id, client_id, idempotency_key
      )
      values (
        v_owner, 'INCOME', 'SALE', v_entrada, 'CONFIRMED', v_data,
        format('Venda %s %s (%s)', v_watch.marca, v_watch.modelo, v_watch.wata_id),
        v_sale.watch_id, p_sale_id, v_client, 'sale:' || p_sale_id::text
      );
    else
      update public.financial_transactions
      set valor = v_entrada,
          data = v_data,
          client_id = v_client,
          status = 'CONFIRMED'
      where id = v_transaction_id;
    end if;
  elsif v_transaction_id is not null then
    /*
     * O sinal passou a cobrir a venda inteira. O lancamento nao e apagado —
     * a Secao 18 exige historico preservado —, apenas sai da conta do caixa.
     */
    update public.financial_transactions
    set status = 'CANCELLED', valor = 0
    where id = v_transaction_id;
  end if;

  -- ---------------------------------------------------------------------
  -- Repasse pendente acompanha o novo valor da venda.
  -- ---------------------------------------------------------------------
  if v_payout.id is not null and v_payout.status = 'PENDING' then
    v_repasse := public.consignment_payout_amount(p_sale_id);

    update public.consignment_payouts
    set valor = v_repasse
    where id = v_payout.id;
  end if;

  -- ---------------------------------------------------------------------
  -- Trilha de auditoria: alteracao de valor nunca e silenciosa.
  -- ---------------------------------------------------------------------
  if p_valor_venda <> v_sale.valor_venda then
    insert into public.watch_status_history (
      owner_id, watch_id, status_anterior, status_novo, motivo, actor_id
    )
    values (
      v_owner, v_sale.watch_id, 'SOLD', 'SOLD',
      format(
        'Valor da venda alterado de %s para %s',
        public.format_brl(v_sale.valor_venda),
        public.format_brl(p_valor_venda)
      ),
      v_owner
    );
  end if;

  select s.lucro_bruto, s.lucro_liquido into v_bruto, v_liquido
  from public.sales s where s.id = p_sale_id;

  return query select v_bruto, v_liquido, greatest(v_entrada, 0), v_repasse;
end;
$$;

comment on function public.update_sale(uuid, numeric, text, text, date, uuid) is
  'Edita a venda recalculando lucro, caixa, valor vendido e repasse pendente.';

revoke all on function public.format_brl(numeric) from anon;
grant execute on function public.format_brl(numeric) to authenticated;

revoke all on function public.update_sale(uuid, numeric, text, text, date, uuid)
  from anon;
grant execute on function public.update_sale(uuid, numeric, text, text, date, uuid)
  to authenticated;
