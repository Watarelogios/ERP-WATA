-- 00013_rpc_reverse_transaction.sql
-- Estorno de lancamento financeiro (Secao 18).
--
-- Estornar nao apaga: a Secao 18 exige historico preservado. O lancamento
-- passa a REVERSED, sai da conta do caixa (que soma apenas CONFIRMED) e
-- continua visivel no extrato com a marcacao.
--
-- Quando o lancamento veio de uma despesa vinculada, a despesa e estornada
-- junto — senao ela continuaria reduzindo o lucro de um relogio cujo custo
-- foi desfeito.

create or replace function public.reverse_financial_transaction(
  p_transaction_id uuid,
  p_motivo text default null
)
returns table (transaction_id uuid, expense_id uuid)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_transaction public.financial_transactions%rowtype;
  v_expense_id uuid;
begin
  if v_owner is null then
    raise exception 'Sessao invalida.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_transaction
  from public.financial_transactions
  where id = p_transaction_id and owner_id = v_owner
  for update;

  if not found then
    raise exception 'Lancamento nao encontrado.' using errcode = 'no_data_found';
  end if;

  if v_transaction.status <> 'CONFIRMED' then
    raise exception 'Somente lancamento confirmado pode ser estornado (atual: %).',
      v_transaction.status
      using errcode = 'check_violation';
  end if;

  /*
   * Lancamentos gerados por operacoes compostas nao podem ser estornados
   * isoladamente: desfazer a saida de uma compra sem desfazer o relogio
   * deixaria o caixa e o estoque contando historias diferentes. Essas
   * operacoes tem fluxo proprio (cancelar reserva, por exemplo).
   */
  if v_transaction.categoria in ('SALE', 'RESERVATION_DEPOSIT', 'RETAINED_DEPOSIT')
     or v_transaction.payout_id is not null then
    raise exception
      'Este lancamento pertence a uma operacao (venda, sinal ou repasse) e deve ser desfeito por ela.'
      using errcode = 'check_violation';
  end if;

  update public.financial_transactions
  set status = 'REVERSED',
      descricao = case
        when p_motivo is null or trim(p_motivo) = '' then descricao
        else coalesce(descricao, '') || ' · Estorno: ' || p_motivo
      end
  where id = p_transaction_id;

  -- A despesa acompanha o estorno e o lucro do relogio e recalculado.
  update public.expenses
  set status = 'REVERSED'
  where financial_transaction_id = p_transaction_id
    and status = 'CONFIRMED'
  returning id into v_expense_id;

  return query select p_transaction_id, v_expense_id;
end;
$$;

comment on function public.reverse_financial_transaction(uuid, text) is
  'Marca o lancamento como estornado sem apagar o historico.';

revoke all on function public.reverse_financial_transaction(uuid, text) from anon;
grant execute on function public.reverse_financial_transaction(uuid, text)
  to authenticated;
