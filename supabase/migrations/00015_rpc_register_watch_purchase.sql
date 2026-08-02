-- 00015_rpc_register_watch_purchase.sql
-- Lanca no caixa a compra de um relogio cadastrado direto no estoque.
--
-- Cadastrar um relogio nao movimenta o caixa, e isso e correto: o estoque que
-- ja existia antes do sistema teve o dinheiro gasto antes. Mas a compra feita
-- hoje, fora do fluxo de /compras, ficava sem registro financeiro.
--
-- Esta funcao cria a despesa e a saida de caixa juntas, em uma transacao. A
-- chave de idempotencia amarra o lancamento ao relogio: chamar de novo (duplo
-- clique, retry apos falha de rede) esbarra no indice unico em vez de debitar
-- o caixa duas vezes.

create or replace function public.register_watch_purchase(
  p_watch_id uuid,
  p_data_compra date default null
)
returns table (expense_id uuid, transaction_id uuid, valor numeric)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_watch public.watches%rowtype;
  v_data date := coalesce(p_data_compra, current_date);
  v_expense_id uuid;
  v_transaction_id uuid;
begin
  if v_owner is null then
    raise exception 'Sessao invalida.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_watch
  from public.watches
  where id = p_watch_id and owner_id = v_owner and deleted_at is null
  for update;

  if not found then
    raise exception 'Relogio nao encontrado.' using errcode = 'no_data_found';
  end if;

  -- Consignado nao tem custo de aquisicao: o dinheiro e do consignante.
  if v_watch.tipo <> 'OWNED' then
    raise exception 'Somente relogio proprio tem compra a lancar no caixa.'
      using errcode = 'check_violation';
  end if;

  if v_watch.valor_compra is null or v_watch.valor_compra <= 0 then
    raise exception 'Informe o valor de compra do relogio.'
      using errcode = 'check_violation';
  end if;

  /*
   * A categoria PURCHASE fica de fora do calculo de lucro do item (ver
   * watch_linked_expenses): o custo ja entra como valor_compra. A despesa
   * existe para o extrato e para a auditoria, sem reduzir a margem duas vezes.
   */
  insert into public.financial_transactions (
    owner_id, direcao, categoria, valor, status, data, descricao,
    watch_id, idempotency_key
  )
  values (
    v_owner, 'EXPENSE', 'PURCHASE', v_watch.valor_compra, 'CONFIRMED', v_data,
    format('Compra %s %s (%s)', v_watch.marca, v_watch.modelo, v_watch.wata_id),
    p_watch_id, 'watch_purchase:' || p_watch_id::text
  )
  returning id into v_transaction_id;

  insert into public.expenses (
    owner_id, watch_id, categoria, descricao, valor, data, status,
    financial_transaction_id
  )
  values (
    v_owner, p_watch_id, 'PURCHASE',
    format('Aquisicao %s %s', v_watch.marca, v_watch.modelo),
    v_watch.valor_compra, v_data, 'CONFIRMED', v_transaction_id
  )
  returning id into v_expense_id;

  return query select v_expense_id, v_transaction_id, v_watch.valor_compra;
end;
$$;

comment on function public.register_watch_purchase(uuid, date) is
  'Lanca a compra de um relogio proprio no caixa, uma unica vez.';

revoke all on function public.register_watch_purchase(uuid, date) from anon;
grant execute on function public.register_watch_purchase(uuid, date)
  to authenticated;
