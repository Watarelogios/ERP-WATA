-- 00005_functions_views.sql
-- Formulas financeiras (Secao 12) e views do dashboard (Secao 14).
--
-- O dashboard nunca armazena totais: tudo aqui e derivado dos dados reais.
-- Todas as views usam security_invoker para que o RLS do usuario continue
-- valendo; sem isso a view rodaria com os privilegios de quem a criou.

-- ---------------------------------------------------------------------------
-- Despesas que reduzem o lucro de um relogio.
--
-- Exclui duas categorias de proposito:
--   PURCHASE - o custo de aquisicao ja entra como valor_compra na formula;
--              conta-lo aqui subtrairia a compra duas vezes.
--   PAYOUT   - o repasse ao consignante ja esta embutido no lucro bruto da
--              consignacao (Secao 12.2 e 12.3).
-- Considera apenas lancamentos CONFIRMED: despesa estornada nao pesa no lucro.
-- ---------------------------------------------------------------------------
create or replace function public.watch_linked_expenses(
  p_watch_id uuid,
  p_sale_id uuid default null
)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(sum(e.valor), 0)::numeric(14, 2)
  from public.expenses e
  where e.status = 'CONFIRMED'
    and e.categoria not in ('PURCHASE', 'PAYOUT')
    and (
      (p_watch_id is not null and e.watch_id = p_watch_id)
      or (p_sale_id is not null and e.sale_id = p_sale_id)
    );
$$;

comment on function public.watch_linked_expenses(uuid, uuid) is
  'Despesas vinculadas que reduzem o lucro. Ignora PURCHASE e PAYOUT.';

-- ---------------------------------------------------------------------------
-- Lucro bruto de uma venda, conforme a origem do relogio (Secao 12).
--
--   proprio                 valor_venda - valor_compra
--   consignado fixo         valor_venda - valor_repasse_fixo
--   consignado percentual   valor_venda * (percentual_wata / 100)
-- ---------------------------------------------------------------------------
create or replace function public.sale_gross_profit(p_sale_id uuid)
returns numeric
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_valor_venda numeric(14, 2);
  v_tipo public.watch_type;
  v_valor_compra numeric(14, 2);
  v_modalidade public.consignment_mode;
  v_repasse_fixo numeric(14, 2);
  v_percentual numeric(5, 2);
begin
  select s.valor_venda, w.tipo, w.valor_compra
    into v_valor_venda, v_tipo, v_valor_compra
  from public.sales s
  join public.watches w on w.id = s.watch_id
  where s.id = p_sale_id;

  if not found then
    return 0;
  end if;

  if v_tipo = 'OWNED' then
    return (v_valor_venda - coalesce(v_valor_compra, 0))::numeric(14, 2);
  end if;

  -- Consignado: a consignacao vigente do relogio define a remuneracao da WATA.
  select c.modalidade, c.valor_repasse_fixo, c.percentual_wata
    into v_modalidade, v_repasse_fixo, v_percentual
  from public.consignments c
  join public.sales s on s.watch_id = c.watch_id
  where s.id = p_sale_id
  order by c.created_at desc
  limit 1;

  if v_modalidade = 'FIXED_PAYOUT' then
    return (v_valor_venda - coalesce(v_repasse_fixo, 0))::numeric(14, 2);
  elsif v_modalidade = 'WATA_PERCENTAGE' then
    return (v_valor_venda * coalesce(v_percentual, 0) / 100)::numeric(14, 2);
  end if;

  -- Consignado sem consignacao registrada: nao ha como afirmar o lucro.
  return 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Valor devido ao consignante (Secao 12.2 e 12.3).
-- ---------------------------------------------------------------------------
create or replace function public.consignment_payout_amount(p_sale_id uuid)
returns numeric
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_valor_venda numeric(14, 2);
  v_modalidade public.consignment_mode;
  v_repasse_fixo numeric(14, 2);
  v_percentual numeric(5, 2);
begin
  select s.valor_venda into v_valor_venda
  from public.sales s where s.id = p_sale_id;

  if not found then
    return 0;
  end if;

  select c.modalidade, c.valor_repasse_fixo, c.percentual_wata
    into v_modalidade, v_repasse_fixo, v_percentual
  from public.consignments c
  join public.sales s on s.watch_id = c.watch_id
  where s.id = p_sale_id
  order by c.created_at desc
  limit 1;

  if v_modalidade = 'FIXED_PAYOUT' then
    return coalesce(v_repasse_fixo, 0)::numeric(14, 2);
  elsif v_modalidade = 'WATA_PERCENTAGE' then
    return (v_valor_venda - (v_valor_venda * coalesce(v_percentual, 0) / 100))
      ::numeric(14, 2);
  end if;

  return 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Mantem lucro_bruto e lucro_liquido da venda sempre coerentes.
--
-- A Secao 10.4 pede as colunas na tabela; a Secao 5.1 proibe total duplicado
-- que possa divergir. O banco recalcula, entao a coluna existe sem risco de
-- ficar desatualizada quando uma despesa e adicionada, estornada ou removida.
-- ---------------------------------------------------------------------------
create or replace function public.recalc_sale_profit(p_sale_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_bruto numeric(14, 2);
  v_despesas numeric(14, 2);
  v_watch_id uuid;
begin
  select s.watch_id into v_watch_id from public.sales s where s.id = p_sale_id;

  if not found then
    return;
  end if;

  v_bruto := public.sale_gross_profit(p_sale_id);
  v_despesas := public.watch_linked_expenses(v_watch_id, p_sale_id);

  update public.sales
  set lucro_bruto = v_bruto,
      lucro_liquido = v_bruto - v_despesas
  where id = p_sale_id;
end;
$$;

-- Recalcula ao criar a venda ou ao alterar o valor vendido.
create or replace function public.trg_sales_recalc_profit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform public.recalc_sale_profit(new.id);
  return null;
end;
$$;

drop trigger if exists sales_recalc_profit on public.sales;
create trigger sales_recalc_profit
  after insert or update of valor_venda, watch_id on public.sales
  for each row execute function public.trg_sales_recalc_profit();

-- Despesa vinculada mudou: o lucro da venda daquele relogio muda junto.
create or replace function public.trg_expenses_recalc_profit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_sale_id uuid;
begin
  for v_sale_id in
    select distinct s.id
    from public.sales s
    where s.id in (coalesce(new.sale_id, '00000000-0000-0000-0000-000000000000'::uuid),
                   coalesce(old.sale_id, '00000000-0000-0000-0000-000000000000'::uuid))
       or s.watch_id in (coalesce(new.watch_id, '00000000-0000-0000-0000-000000000000'::uuid),
                         coalesce(old.watch_id, '00000000-0000-0000-0000-000000000000'::uuid))
  loop
    perform public.recalc_sale_profit(v_sale_id);
  end loop;

  return null;
end;
$$;

drop trigger if exists expenses_recalc_profit on public.expenses;
create trigger expenses_recalc_profit
  after insert or update or delete on public.expenses
  for each row execute function public.trg_expenses_recalc_profit();

-- ---------------------------------------------------------------------------
-- VIEWS DO DASHBOARD (Secao 14)
-- ---------------------------------------------------------------------------

-- Base reutilizada: relogio em estoque ativo com suas despesas vinculadas.
create or replace view public.stock_valuation
with (security_invoker = true) as
select
  w.id as watch_id,
  w.owner_id,
  w.wata_id,
  w.marca,
  w.modelo,
  w.tipo,
  w.status,
  w.data_entrada,
  w.valor_compra,
  w.valor_minimo,
  w.valor_anunciado,
  public.watch_linked_expenses(w.id, null) as despesas_vinculadas
from public.watches w
where w.deleted_at is null
  and w.status in ('AVAILABLE', 'RESERVED');

comment on view public.stock_valuation is
  'Relogios em estoque ativo com as despesas ja somadas.';

-- Capital, estoque, lucros, caixa e contagens - uma linha por owner_id.
create or replace view public.dashboard_summary
with (security_invoker = true) as
select
  p.id as owner_id,

  -- Capital investido: apenas proprios; consignado nao imobiliza capital.
  coalesce((
    select sum(sv.valor_compra + sv.despesas_vinculadas)
    from public.stock_valuation sv
    where sv.owner_id = p.id and sv.tipo = 'OWNED'
  ), 0)::numeric(14, 2) as capital_investido,

  -- Valor de estoque: proprios e consignados pelo preco anunciado.
  coalesce((
    select sum(sv.valor_anunciado)
    from public.stock_valuation sv
    where sv.owner_id = p.id
  ), 0)::numeric(14, 2) as valor_estoque,

  coalesce((
    select sum(sv.valor_anunciado - sv.valor_compra - sv.despesas_vinculadas)
    from public.stock_valuation sv
    where sv.owner_id = p.id
      and sv.tipo = 'OWNED'
      and sv.valor_anunciado is not null
  ), 0)::numeric(14, 2) as lucro_potencial_proprio,

  coalesce((
    select sum(sv.valor_minimo - sv.valor_compra - sv.despesas_vinculadas)
    from public.stock_valuation sv
    where sv.owner_id = p.id
      and sv.tipo = 'OWNED'
      and sv.valor_minimo is not null
  ), 0)::numeric(14, 2) as lucro_minimo_proprio,

  coalesce((
    select sum(s.lucro_liquido)
    from public.sales s
    where s.owner_id = p.id
  ), 0)::numeric(14, 2) as lucro_realizado,

  -- Caixa = saldo inicial + entradas confirmadas - saidas confirmadas.
  (
    coalesce((
      select st.saldo_inicial from public.settings st where st.owner_id = p.id
    ), 0)
    + coalesce((
      select sum(ft.valor) from public.financial_transactions ft
      where ft.owner_id = p.id and ft.direcao = 'INCOME' and ft.status = 'CONFIRMED'
    ), 0)
    - coalesce((
      select sum(ft.valor) from public.financial_transactions ft
      where ft.owner_id = p.id and ft.direcao = 'EXPENSE' and ft.status = 'CONFIRMED'
    ), 0)
  )::numeric(14, 2) as caixa,

  (select count(*) from public.watches w
    where w.owner_id = p.id and w.deleted_at is null
      and w.status = 'AVAILABLE') as total_disponivel,

  (select count(*) from public.watches w
    where w.owner_id = p.id and w.deleted_at is null
      and w.status = 'RESERVED') as total_reservado,

  (select count(*) from public.watches w
    where w.owner_id = p.id and w.deleted_at is null
      and w.status = 'SOLD') as total_vendido,

  (select count(*) from public.consignment_payouts cp
    where cp.owner_id = p.id and cp.status = 'PENDING') as repasses_pendentes
from public.profiles p;

comment on view public.dashboard_summary is
  'Indicadores da Secao 12. Nenhum total e mantido manualmente.';

-- Vendas, receita e lucro por mes.
create or replace view public.monthly_sales_profit
with (security_invoker = true) as
select
  s.owner_id,
  date_trunc('month', s.data_venda::timestamp)::date as mes,
  count(*) as quantidade,
  sum(s.valor_venda)::numeric(14, 2) as receita,
  sum(s.lucro_liquido)::numeric(14, 2) as lucro
from public.sales s
group by s.owner_id, date_trunc('month', s.data_venda::timestamp)
order by 2 desc;

-- Quantidade e valor por canal de origem.
create or replace view public.sales_by_origin
with (security_invoker = true) as
select
  s.owner_id,
  coalesce(nullif(trim(s.origem), ''), 'Nao informado') as origem,
  count(*) as quantidade,
  sum(s.valor_venda)::numeric(14, 2) as valor
from public.sales s
group by s.owner_id, coalesce(nullif(trim(s.origem), ''), 'Nao informado');

-- Dias em estoque e sinalizacao de item parado.
create or replace view public.stock_aging
with (security_invoker = true) as
select
  w.id as watch_id,
  w.owner_id,
  w.wata_id,
  w.marca,
  w.modelo,
  w.tipo,
  w.status,
  w.valor_anunciado,
  w.data_entrada,
  (current_date - w.data_entrada) as dias_em_estoque,
  (current_date - w.data_entrada) >= coalesce(
    (select st.dias_estoque_parado from public.settings st
      where st.owner_id = w.owner_id),
    90
  ) as parado
from public.watches w
where w.deleted_at is null
  and w.status in ('AVAILABLE', 'RESERVED');

-- Reservas a vencer, consignacoes no prazo e repasses pendentes.
create or replace view public.active_alerts
with (security_invoker = true) as
select
  r.owner_id,
  'RESERVATION_DUE'::text as tipo,
  r.id as referencia_id,
  r.validade as data_referencia,
  (r.validade - current_date) as dias_restantes,
  r.valor_combinado as valor
from public.reservations r
where r.status = 'ACTIVE'

union all

select
  c.owner_id,
  'CONSIGNMENT_DUE'::text,
  c.id,
  c.prazo,
  (c.prazo - current_date),
  coalesce(c.valor_repasse_fixo, 0)
from public.consignments c
where c.encerrado_em is null and c.prazo is not null

union all

select
  cp.owner_id,
  'PAYOUT_PENDING'::text,
  cp.id,
  null::date,
  null::integer,
  cp.valor
from public.consignment_payouts cp
where cp.status = 'PENDING';

comment on view public.active_alerts is
  'dias_restantes negativo indica prazo vencido.';

-- Credito liquido disponivel por cliente.
create or replace view public.customer_credit_balances
with (security_invoker = true) as
select
  c.owner_id,
  c.id as client_id,
  c.nome,
  coalesce(sum(
    case when m.tipo = 'CREDIT' then m.valor else -m.valor end
  ), 0)::numeric(14, 2) as saldo
from public.clients c
left join public.customer_credit_movements m on m.client_id = c.id
where c.deleted_at is null
group by c.owner_id, c.id, c.nome;
