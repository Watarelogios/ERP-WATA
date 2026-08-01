-- 00010_confirm_purchase_supplier_opcional.sql
-- Torna o fornecedor opcional em confirm_purchase.
--
-- Nem toda compra tem fornecedor cadastrado (particular, feira, achado). A
-- coluna watches.supplier_id ja aceita NULL; a assinatura da RPC e que exigia
-- o valor por estar posicionada antes dos parametros com DEFAULT.
--
-- `create or replace` nao altera a ordem dos parametros: criaria uma sobrecarga
-- e deixaria a chamada ambigua. Por isso a versao anterior e removida antes.

drop function if exists public.confirm_purchase(
  uuid, numeric, date, uuid, text, text, text, smallint,
  public.movement_type, numeric, text, text, numeric, numeric, text
);

create or replace function public.confirm_purchase(
  p_opportunity_id uuid,
  p_valor_fechado numeric,
  p_marca text,
  p_modelo text,
  p_data_compra date default null,
  p_supplier_id uuid default null,
  p_referencia text default null,
  p_ano smallint default null,
  p_movimento public.movement_type default null,
  p_diametro_mm numeric default null,
  p_mostrador text default null,
  p_condicao text default null,
  p_valor_minimo numeric default null,
  p_valor_anunciado numeric default null,
  p_observacoes text default null
)
returns table (
  watch_id uuid,
  wata_id text,
  expense_id uuid,
  transaction_id uuid
)
language plpgsql
-- security invoker: a funcao roda como o usuario, entao o RLS continua valendo.
security invoker
set search_path = public, pg_temp
as $$
declare
  v_owner uuid := auth.uid();
  v_opportunity public.purchase_opportunities%rowtype;
  v_data date := coalesce(p_data_compra, current_date);
  v_watch_id uuid;
  v_wata_id text;
  v_expense_id uuid;
  v_transaction_id uuid;
begin
  if v_owner is null then
    raise exception 'Sessao invalida.' using errcode = 'insufficient_privilege';
  end if;

  if p_valor_fechado is null or p_valor_fechado < 0 then
    raise exception 'Informe o valor fechado da compra.'
      using errcode = 'check_violation';
  end if;

  /*
   * FOR UPDATE trava a linha ate o fim da transacao. Sem isso, dois cliques
   * simultaneos no botao "Confirmar compra" passariam os dois pela validacao
   * de status e criariam dois relogios para a mesma oportunidade.
   */
  select * into v_opportunity
  from public.purchase_opportunities
  where id = p_opportunity_id and owner_id = v_owner
  for update;

  if not found then
    raise exception 'Oportunidade nao encontrada.'
      using errcode = 'no_data_found';
  end if;

  if v_opportunity.status <> 'NEGOTIATING' then
    raise exception 'Esta oportunidade ja foi encerrada como %.',
      v_opportunity.status
      using errcode = 'check_violation';
  end if;

  -- 1. Relogio proprio. O WATA-ID vem do DEFAULT, gerado pela sequencia.
  insert into public.watches (
    owner_id, marca, modelo, referencia, ano, movimento, diametro_mm,
    mostrador, condicao, valor_compra, valor_minimo, valor_anunciado,
    tipo, status, supplier_id, data_entrada, observacoes
  )
  values (
    v_owner, p_marca, p_modelo, p_referencia, p_ano, p_movimento, p_diametro_mm,
    p_mostrador, p_condicao, p_valor_fechado, p_valor_minimo, p_valor_anunciado,
    'OWNED', 'AVAILABLE', coalesce(p_supplier_id, v_opportunity.supplier_id),
    v_data, p_observacoes
  )
  returning id, watches.wata_id into v_watch_id, v_wata_id;

  -- 2. Saida no caixa. A chave de idempotencia amarra o lancamento a esta
  -- oportunidade: uma repeticao da operacao esbarra no indice unico.
  insert into public.financial_transactions (
    owner_id, direcao, categoria, valor, status, data, descricao,
    watch_id, idempotency_key
  )
  values (
    v_owner, 'EXPENSE', 'PURCHASE', p_valor_fechado, 'CONFIRMED', v_data,
    format('Compra %s %s (%s)', p_marca, p_modelo, v_wata_id),
    v_watch_id, 'purchase:' || p_opportunity_id::text
  )
  returning id into v_transaction_id;

  /*
   * 3. Despesa de compra, ligada ao lancamento.
   * A categoria PURCHASE e ignorada no calculo de lucro de proposito: o custo
   * ja entra como valor_compra do relogio (ver watch_linked_expenses).
   */
  insert into public.expenses (
    owner_id, watch_id, categoria, descricao, valor, data, status,
    financial_transaction_id
  )
  values (
    v_owner, v_watch_id, 'PURCHASE',
    format('Aquisicao %s %s', p_marca, p_modelo),
    p_valor_fechado, v_data, 'CONFIRMED', v_transaction_id
  )
  returning id into v_expense_id;

  -- 4. Encerra a oportunidade apontando para o relogio criado.
  update public.purchase_opportunities
  set status = 'PURCHASED',
      valor_fechado = p_valor_fechado,
      data_fechamento = v_data,
      supplier_id = coalesce(p_supplier_id, supplier_id),
      purchased_watch_id = v_watch_id
  where id = p_opportunity_id;

  -- 5. Historico de entrada do item no estoque.
  insert into public.watch_status_history (
    owner_id, watch_id, status_anterior, status_novo, motivo, actor_id
  )
  values (
    v_owner, v_watch_id, null, 'AVAILABLE',
    'Entrada por confirmacao de compra', v_owner
  );

  return query select v_watch_id, v_wata_id, v_expense_id, v_transaction_id;
end;
$$;

comment on function public.confirm_purchase(
  uuid, numeric, text, text, date, uuid, text, smallint,
  public.movement_type, numeric, text, text, numeric, numeric, text
) is
  'Converte uma oportunidade em estoque, despesa e saida de caixa, atomicamente.';

-- Assinatura explicita pelo mesmo motivo da migration 00009.
revoke all on function public.confirm_purchase(
  uuid, numeric, text, text, date, uuid, text, smallint,
  public.movement_type, numeric, text, text, numeric, numeric, text
) from anon;

grant execute on function public.confirm_purchase(
  uuid, numeric, text, text, date, uuid, text, smallint,
  public.movement_type, numeric, text, text, numeric, numeric, text
) to authenticated;
