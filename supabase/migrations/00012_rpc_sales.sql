-- 00012_rpc_sales.sql
-- Concluir venda a vista e pagar consignante (Secoes 13.4 e 13.5).
--
-- O ponto mais delicado do sistema: uma venda toca watches, sales, reservations,
-- financial_transactions e consignment_payouts. O erro classico e contabilizar
-- o sinal duas vezes — na reserva e de novo na venda. Aqui a entrada de caixa
-- e sempre `valor_venda - sinal ja recebido`.

-- ---------------------------------------------------------------------------
-- Concluir venda a vista (Secao 13.4)
-- ---------------------------------------------------------------------------
create or replace function public.complete_sale(
  p_watch_id uuid,
  p_client_id uuid,
  p_valor_venda numeric,
  p_origem text default null,
  p_forma_pagamento text default null,
  p_data_venda date default null
)
returns table (
  sale_id uuid,
  lucro_bruto numeric,
  lucro_liquido numeric,
  entrada_caixa numeric,
  sinal_aproveitado numeric,
  payout_id uuid
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_watch public.watches%rowtype;
  v_reservation public.reservations%rowtype;
  v_data date := coalesce(p_data_venda, current_date);
  v_sinal numeric(14, 2) := 0;
  v_entrada numeric(14, 2);
  v_sale_id uuid;
  v_payout_id uuid := null;
  v_consignment public.consignments%rowtype;
  v_repasse numeric(14, 2);
  v_bruto numeric(14, 2);
  v_liquido numeric(14, 2);
begin
  if v_owner is null then
    raise exception 'Sessao invalida.' using errcode = 'insufficient_privilege';
  end if;

  if p_valor_venda is null or p_valor_venda < 0 then
    raise exception 'Informe o valor da venda.' using errcode = 'check_violation';
  end if;

  if p_client_id is null then
    raise exception 'Informe o cliente da venda.'
      using errcode = 'check_violation';
  end if;

  -- Trava o relogio ate o fim da transacao: duas vendas simultaneas do mesmo
  -- item nao passam as duas pela validacao de status.
  select * into v_watch
  from public.watches
  where id = p_watch_id and owner_id = v_owner and deleted_at is null
  for update;

  if not found then
    raise exception 'Relogio nao encontrado.' using errcode = 'no_data_found';
  end if;

  if v_watch.status not in ('AVAILABLE', 'RESERVED') then
    raise exception 'Este relogio esta como % e nao pode ser vendido.',
      v_watch.status
      using errcode = 'check_violation';
  end if;

  /*
   * Item reservado: a venda so vale para o cliente da reserva. Vender para
   * outra pessoa exigiria cancelar a reserva antes, decidindo o destino do
   * sinal ja recebido.
   */
  if v_watch.status = 'RESERVED' then
    select * into v_reservation
    from public.reservations
    where watch_id = p_watch_id and status = 'ACTIVE'
    for update;

    if not found then
      raise exception 'Reserva ativa nao encontrada para este relogio.'
        using errcode = 'no_data_found';
    end if;

    if v_reservation.client_id <> p_client_id then
      raise exception 'Este relogio esta reservado para outro cliente.'
        using errcode = 'check_violation';
    end if;

    v_sinal := v_reservation.valor_sinal;

    if p_valor_venda < v_sinal then
      raise exception 'O valor da venda nao pode ser menor que o sinal ja recebido.'
        using errcode = 'check_violation';
    end if;
  end if;

  -- Somente o que ainda nao entrou no caixa (Secao 13.4, passo 4).
  v_entrada := p_valor_venda - v_sinal;

  insert into public.sales (
    owner_id, watch_id, client_id, reservation_id,
    valor_venda, origem, forma_pagamento, data_venda
  )
  values (
    v_owner, p_watch_id, p_client_id, v_reservation.id,
    p_valor_venda, p_origem, p_forma_pagamento, v_data
  )
  returning id into v_sale_id;

  if v_entrada > 0 then
    insert into public.financial_transactions (
      owner_id, direcao, categoria, valor, status, data, descricao,
      watch_id, sale_id, client_id, idempotency_key
    )
    values (
      v_owner, 'INCOME', 'SALE', v_entrada, 'CONFIRMED', v_data,
      format('Venda %s %s (%s)', v_watch.marca, v_watch.modelo, v_watch.wata_id),
      p_watch_id, v_sale_id, p_client_id, 'sale:' || v_sale_id::text
    );
  end if;

  -- O relogio sai do estoque ativo, mas o registro permanece (Secao 10.4).
  update public.watches
  set status = 'SOLD', valor_vendido = p_valor_venda
  where id = p_watch_id;

  insert into public.watch_status_history (
    owner_id, watch_id, status_anterior, status_novo, motivo, actor_id
  )
  values (
    v_owner, p_watch_id, v_watch.status, 'SOLD',
    format('Venda concluida por %s', to_char(p_valor_venda, 'FM999G999G990D00')),
    v_owner
  );

  if v_reservation.id is not null then
    update public.reservations
    set status = 'COMPLETED'
    where id = v_reservation.id;
  end if;

  /*
   * Consignado: o repasse nasce PENDENTE e nao reduz o caixa agora. A saida
   * so acontece quando o consignante e efetivamente pago (Secao 13.5).
   */
  if v_watch.tipo = 'CONSIGNED' then
    select * into v_consignment
    from public.consignments
    where watch_id = p_watch_id and encerrado_em is null
    order by created_at desc
    limit 1;

    if found then
      v_repasse := public.consignment_payout_amount(v_sale_id);

      insert into public.consignment_payouts (
        owner_id, consignment_id, sale_id, supplier_id, valor, status
      )
      values (
        v_owner, v_consignment.id, v_sale_id, v_consignment.supplier_id,
        v_repasse, 'PENDING'
      )
      returning id into v_payout_id;

      -- A consignacao se encerra com a venda do item.
      update public.consignments
      set encerrado_em = now()
      where id = v_consignment.id;
    end if;
  end if;

  -- Os lucros sao escritos pelo trigger da migration 00005.
  select s.lucro_bruto, s.lucro_liquido into v_bruto, v_liquido
  from public.sales s where s.id = v_sale_id;

  return query
    select v_sale_id, v_bruto, v_liquido, v_entrada, v_sinal, v_payout_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Pagar consignante (Secao 13.5)
-- ---------------------------------------------------------------------------
create or replace function public.pay_consignment_payout(
  p_payout_id uuid,
  p_data_pagamento date default null,
  p_forma_pagamento text default null,
  p_comprovante_path text default null
)
returns table (transaction_id uuid, valor numeric)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_payout public.consignment_payouts%rowtype;
  v_supplier_nome text;
  v_data date := coalesce(p_data_pagamento, current_date);
  v_transaction_id uuid;
begin
  if v_owner is null then
    raise exception 'Sessao invalida.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_payout
  from public.consignment_payouts
  where id = p_payout_id and owner_id = v_owner
  for update;

  if not found then
    raise exception 'Repasse nao encontrado.' using errcode = 'no_data_found';
  end if;

  if v_payout.status <> 'PENDING' then
    raise exception 'Este repasse ja foi encerrado como %.', v_payout.status
      using errcode = 'check_violation';
  end if;

  select nome into v_supplier_nome
  from public.suppliers where id = v_payout.supplier_id;

  /*
   * A chave de idempotencia amarra a saida a este repasse: uma segunda
   * tentativa (duplo clique, retry apos falha de rede) esbarra no indice unico
   * em vez de debitar o caixa de novo.
   */
  insert into public.financial_transactions (
    owner_id, direcao, categoria, valor, status, data, descricao,
    sale_id, payout_id, idempotency_key
  )
  values (
    v_owner, 'EXPENSE', 'PAYOUT', v_payout.valor, 'CONFIRMED', v_data,
    format('Repasse ao consignante %s', coalesce(v_supplier_nome, '')),
    v_payout.sale_id, p_payout_id, 'payout:' || p_payout_id::text
  )
  returning id into v_transaction_id;

  update public.consignment_payouts
  set status = 'PAID',
      data_pagamento = v_data,
      forma_pagamento = coalesce(p_forma_pagamento, forma_pagamento),
      comprovante_path = coalesce(p_comprovante_path, comprovante_path)
  where id = p_payout_id;

  return query select v_transaction_id, v_payout.valor;
end;
$$;

comment on function public.complete_sale(
  uuid, uuid, numeric, text, text, date
) is 'Conclui a venda a vista sem contabilizar o sinal duas vezes.';

comment on function public.pay_consignment_payout(
  uuid, date, text, text
) is 'Paga o consignante e debita o caixa uma unica vez.';

revoke all on function public.complete_sale(
  uuid, uuid, numeric, text, text, date
) from anon;
grant execute on function public.complete_sale(
  uuid, uuid, numeric, text, text, date
) to authenticated;

revoke all on function public.pay_consignment_payout(
  uuid, date, text, text
) from anon;
grant execute on function public.pay_consignment_payout(
  uuid, date, text, text
) to authenticated;
