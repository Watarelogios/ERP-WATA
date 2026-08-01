-- 00011_rpc_reservations.sql
-- Criar e encerrar reservas (Secoes 13.2 e 13.3).
--
-- Checkpoint da fase: "sem duplicar status ou caixa". Duas defesas cuidam
-- disso e nenhuma depende da interface:
--   - indice parcial `reservations_uma_ativa_por_watch` (migration 00008);
--   - idempotency_key nos lancamentos financeiros (migration 00004).

-- ---------------------------------------------------------------------------
-- Criar reserva (Secao 13.2)
-- ---------------------------------------------------------------------------
create or replace function public.create_reservation(
  p_watch_id uuid,
  p_client_id uuid,
  p_valor_combinado numeric,
  p_validade date,
  p_valor_sinal numeric default 0,
  p_data_sinal date default null,
  p_forma_pagamento text default null
)
returns table (
  reservation_id uuid,
  watch_status public.watch_status,
  saldo_restante numeric
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_watch public.watches%rowtype;
  v_sinal numeric(14, 2) := coalesce(p_valor_sinal, 0);
  v_reservation_id uuid;
  v_saldo numeric(14, 2);
begin
  if v_owner is null then
    raise exception 'Sessao invalida.' using errcode = 'insufficient_privilege';
  end if;

  if p_valor_combinado is null or p_valor_combinado < 0 then
    raise exception 'Informe o valor combinado da reserva.'
      using errcode = 'check_violation';
  end if;

  if v_sinal > p_valor_combinado then
    raise exception 'O sinal nao pode ser maior que o valor combinado.'
      using errcode = 'check_violation';
  end if;

  if p_validade is null then
    raise exception 'Informe a validade da reserva.'
      using errcode = 'check_violation';
  end if;

  -- Trava o relogio: sem isso, dois pedidos simultaneos passariam os dois pela
  -- validacao de status antes de qualquer um gravar.
  select * into v_watch
  from public.watches
  where id = p_watch_id and owner_id = v_owner and deleted_at is null
  for update;

  if not found then
    raise exception 'Relogio nao encontrado.' using errcode = 'no_data_found';
  end if;

  if v_watch.status <> 'AVAILABLE' then
    raise exception 'Este relogio esta como % e nao pode ser reservado.',
      v_watch.status
      using errcode = 'check_violation';
  end if;

  insert into public.reservations (
    owner_id, watch_id, client_id, valor_combinado, validade, status,
    valor_sinal, data_sinal, forma_pagamento
  )
  values (
    v_owner, p_watch_id, p_client_id, p_valor_combinado, p_validade, 'ACTIVE',
    v_sinal,
    case when v_sinal > 0 then coalesce(p_data_sinal, current_date) end,
    p_forma_pagamento
  )
  returning id, reservations.saldo_restante into v_reservation_id, v_saldo;

  update public.watches set status = 'RESERVED' where id = p_watch_id;

  insert into public.watch_status_history (
    owner_id, watch_id, status_anterior, status_novo, motivo, actor_id
  )
  values (
    v_owner, p_watch_id, 'AVAILABLE', 'RESERVED',
    'Reserva criada', v_owner
  );

  /*
   * O sinal entra no caixa uma unica vez. A chave amarra o lancamento a esta
   * reserva; na conclusao da venda ele nao e contabilizado de novo (Secao 13.4).
   */
  if v_sinal > 0 then
    insert into public.financial_transactions (
      owner_id, direcao, categoria, valor, status, data, descricao,
      watch_id, reservation_id, client_id, idempotency_key
    )
    values (
      v_owner, 'INCOME', 'RESERVATION_DEPOSIT', v_sinal, 'CONFIRMED',
      coalesce(p_data_sinal, current_date),
      format('Sinal de reserva - %s %s', v_watch.marca, v_watch.modelo),
      p_watch_id, v_reservation_id, p_client_id,
      'reservation_deposit:' || v_reservation_id::text
    );
  end if;

  return query select v_reservation_id, 'RESERVED'::public.watch_status, v_saldo;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancelar ou expirar reserva (Secao 13.3)
--
-- Destino do sinal:
--   sem sinal        encerra e devolve o relogio para AVAILABLE
--   REFUNDED         saida confirmada equivalente; a entrada original fica
--   RETAINED         dinheiro permanece no caixa, reclassificado
--   CUSTOMER_CREDIT  vira credito do cliente, sem nova entrada de caixa
-- ---------------------------------------------------------------------------
create or replace function public.cancel_reservation(
  p_reservation_id uuid,
  p_status public.reservation_status default 'CANCELLED',
  p_destino_sinal public.deposit_fate default null,
  p_motivo text default null
)
returns table (
  watch_status public.watch_status,
  transaction_id uuid,
  credit_movement_id uuid
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_reservation public.reservations%rowtype;
  v_watch public.watches%rowtype;
  v_transaction_id uuid;
  v_credit_id uuid;
begin
  if v_owner is null then
    raise exception 'Sessao invalida.' using errcode = 'insufficient_privilege';
  end if;

  if p_status not in ('CANCELLED', 'EXPIRED') then
    raise exception 'Encerramento invalido para uma reserva.'
      using errcode = 'check_violation';
  end if;

  select * into v_reservation
  from public.reservations
  where id = p_reservation_id and owner_id = v_owner
  for update;

  if not found then
    raise exception 'Reserva nao encontrada.' using errcode = 'no_data_found';
  end if;

  if v_reservation.status <> 'ACTIVE' then
    raise exception 'Esta reserva ja foi encerrada como %.',
      v_reservation.status
      using errcode = 'check_violation';
  end if;

  if v_reservation.valor_sinal > 0 and p_destino_sinal is null then
    raise exception 'Informe o destino do sinal recebido.'
      using errcode = 'check_violation';
  end if;

  select * into v_watch
  from public.watches where id = v_reservation.watch_id for update;

  update public.reservations
  set status = p_status,
      destino_sinal = case when v_reservation.valor_sinal > 0
                           then p_destino_sinal end
  where id = p_reservation_id;

  -- O relogio volta a ficar disponivel para venda.
  update public.watches
  set status = 'AVAILABLE'
  where id = v_reservation.watch_id;

  insert into public.watch_status_history (
    owner_id, watch_id, status_anterior, status_novo, motivo, actor_id
  )
  values (
    v_owner, v_reservation.watch_id, 'RESERVED', 'AVAILABLE',
    coalesce(
      p_motivo,
      case when p_status = 'EXPIRED' then 'Reserva vencida'
           else 'Reserva cancelada' end
    ),
    v_owner
  );

  if v_reservation.valor_sinal > 0 then
    if p_destino_sinal = 'REFUNDED' then
      /*
       * Saida equivalente ao sinal. A entrada original nao e apagada: o
       * dinheiro entrou e saiu de fato, e o extrato precisa mostrar os dois
       * movimentos.
       */
      insert into public.financial_transactions (
        owner_id, direcao, categoria, valor, status, data, descricao,
        watch_id, reservation_id, client_id, idempotency_key
      )
      values (
        v_owner, 'EXPENSE', 'DEPOSIT_REFUND', v_reservation.valor_sinal,
        'CONFIRMED', current_date,
        format('Devolucao de sinal - %s %s', v_watch.marca, v_watch.modelo),
        v_reservation.watch_id, p_reservation_id, v_reservation.client_id,
        'deposit_refund:' || p_reservation_id::text
      )
      returning id into v_transaction_id;

    elsif p_destino_sinal = 'RETAINED' then
      /*
       * O dinheiro fica. Nao ha lancamento novo — isso somaria duas vezes no
       * caixa. A entrada existente e reclassificada como sinal retido.
       */
      update public.financial_transactions
      set categoria = 'RETAINED_DEPOSIT',
          descricao = format('Sinal retido - %s %s', v_watch.marca, v_watch.modelo)
      where reservation_id = p_reservation_id
        and categoria = 'RESERVATION_DEPOSIT'
      returning id into v_transaction_id;

    elsif p_destino_sinal = 'CUSTOMER_CREDIT' then
      -- Credito do cliente: o caixa nao muda, muda a obrigacao com ele.
      insert into public.customer_credit_movements (
        owner_id, client_id, reservation_id, tipo, valor, motivo
      )
      values (
        v_owner, v_reservation.client_id, p_reservation_id, 'CREDIT',
        v_reservation.valor_sinal,
        'Sinal convertido em credito no cancelamento da reserva'
      )
      returning id into v_credit_id;
    end if;
  end if;

  return query
    select 'AVAILABLE'::public.watch_status, v_transaction_id, v_credit_id;
end;
$$;

comment on function public.create_reservation(
  uuid, uuid, numeric, date, numeric, date, text
) is 'Reserva um relogio disponivel e lanca o sinal uma unica vez.';

comment on function public.cancel_reservation(
  uuid, public.reservation_status, public.deposit_fate, text
) is 'Encerra a reserva e trata o sinal conforme o destino escolhido.';

revoke all on function public.create_reservation(
  uuid, uuid, numeric, date, numeric, date, text
) from anon;
grant execute on function public.create_reservation(
  uuid, uuid, numeric, date, numeric, date, text
) to authenticated;

revoke all on function public.cancel_reservation(
  uuid, public.reservation_status, public.deposit_fate, text
) from anon;
grant execute on function public.cancel_reservation(
  uuid, public.reservation_status, public.deposit_fate, text
) to authenticated;
