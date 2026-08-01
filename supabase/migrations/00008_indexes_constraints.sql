-- 00008_indexes_constraints.sql
-- Indices, unicidade, protecao do WATA-ID e regras de concorrencia (Secao 8 e 18).

-- ---------------------------------------------------------------------------
-- WATA-ID: unico e imutavel.
--
-- Codigos nunca sao reutilizados, mesmo apos inativacao ou cancelamento
-- (Secao 11). Um UPDATE que tente reescrever o codigo e rejeitado.
-- ---------------------------------------------------------------------------
create unique index if not exists watches_wata_id_unico
  on public.watches (wata_id);

create or replace function public.prevent_wata_id_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.wata_id is distinct from old.wata_id then
    raise exception 'O codigo WATA-ID e imutavel (% -> %).',
      old.wata_id, new.wata_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists watches_wata_id_imutavel on public.watches;
create trigger watches_wata_id_imutavel
  before update on public.watches
  for each row execute function public.prevent_wata_id_change();

-- ---------------------------------------------------------------------------
-- Concorrencia: estados que so podem existir uma vez por relogio (Secao 18).
--
-- Indice parcial e a defesa no banco. Duas requisicoes simultaneas nao criam
-- duas reservas ativas, independentemente do que a aplicacao tentar.
-- ---------------------------------------------------------------------------
create unique index if not exists reservations_uma_ativa_por_watch
  on public.reservations (watch_id)
  where status = 'ACTIVE';

create unique index if not exists consignments_uma_ativa_por_watch
  on public.consignments (watch_id)
  where encerrado_em is null;

-- Apenas uma foto de capa por relogio.
create unique index if not exists watch_photos_uma_capa
  on public.watch_photos (watch_id)
  where is_cover;

-- Idempotencia do livro caixa: a mesma operacao nao lanca duas vezes.
create unique index if not exists financial_idempotency_unica
  on public.financial_transactions (owner_id, idempotency_key)
  where idempotency_key is not null;

-- Uma oportunidade gera no maximo um relogio.
create unique index if not exists purchase_watch_unico
  on public.purchase_opportunities (purchased_watch_id)
  where purchased_watch_id is not null;

-- ---------------------------------------------------------------------------
-- Indices de owner_id.
--
-- Toda politica de RLS filtra por owner_id: sem indice, cada consulta varre a
-- tabela inteira antes de descartar as linhas dos outros usuarios.
-- ---------------------------------------------------------------------------
create index if not exists settings_owner_idx on public.settings (owner_id);
create index if not exists clients_owner_idx on public.clients (owner_id);
create index if not exists suppliers_owner_idx on public.suppliers (owner_id);
create index if not exists watches_owner_idx on public.watches (owner_id);
create index if not exists watch_photos_owner_idx on public.watch_photos (owner_id);
create index if not exists watch_status_history_owner_idx
  on public.watch_status_history (owner_id);
create index if not exists purchase_owner_idx
  on public.purchase_opportunities (owner_id);
create index if not exists consignments_owner_idx on public.consignments (owner_id);
create index if not exists reservations_owner_idx on public.reservations (owner_id);
create index if not exists sales_owner_idx on public.sales (owner_id);
create index if not exists expenses_owner_idx on public.expenses (owner_id);
create index if not exists payouts_owner_idx
  on public.consignment_payouts (owner_id);
create index if not exists financial_owner_idx
  on public.financial_transactions (owner_id);
create index if not exists credit_owner_idx
  on public.customer_credit_movements (owner_id);

-- ---------------------------------------------------------------------------
-- Indices de filtro, ordenacao e chaves estrangeiras.
-- ---------------------------------------------------------------------------

-- Estoque: filtros por status, tipo, marca e fornecedor (Secao 15.1).
create index if not exists watches_status_idx
  on public.watches (owner_id, status) where deleted_at is null;
create index if not exists watches_tipo_idx
  on public.watches (owner_id, tipo) where deleted_at is null;
create index if not exists watches_marca_idx
  on public.watches (owner_id, marca) where deleted_at is null;
create index if not exists watches_supplier_idx on public.watches (supplier_id);
create index if not exists watches_data_entrada_idx
  on public.watches (owner_id, data_entrada desc) where deleted_at is null;

-- Busca textual parcial por WATA-ID, marca, modelo e referencia.
create index if not exists watches_busca_trgm_idx
  on public.watches using gin (
    (coalesce(wata_id, '') || ' ' ||
     coalesce(marca, '') || ' ' ||
     coalesce(modelo, '') || ' ' ||
     coalesce(referencia, '')) extensions.gin_trgm_ops
  );

create index if not exists watch_photos_watch_idx
  on public.watch_photos (watch_id, ordem);
create index if not exists watch_status_history_watch_idx
  on public.watch_status_history (watch_id, created_at desc);

create index if not exists purchase_status_idx
  on public.purchase_opportunities (owner_id, status);
create index if not exists purchase_supplier_idx
  on public.purchase_opportunities (supplier_id);

create index if not exists consignments_watch_idx on public.consignments (watch_id);
create index if not exists consignments_supplier_idx
  on public.consignments (supplier_id);
create index if not exists consignments_prazo_idx
  on public.consignments (owner_id, prazo) where encerrado_em is null;

create index if not exists reservations_watch_idx on public.reservations (watch_id);
create index if not exists reservations_client_idx on public.reservations (client_id);
-- Alerta de reserva a vencer (view active_alerts).
create index if not exists reservations_validade_idx
  on public.reservations (owner_id, validade) where status = 'ACTIVE';

create index if not exists sales_client_idx on public.sales (client_id);
create index if not exists sales_reservation_idx on public.sales (reservation_id);
create index if not exists sales_data_idx on public.sales (owner_id, data_venda desc);
create index if not exists sales_origem_idx on public.sales (owner_id, origem);

create index if not exists expenses_watch_idx on public.expenses (watch_id);
create index if not exists expenses_sale_idx on public.expenses (sale_id);
create index if not exists expenses_data_idx on public.expenses (owner_id, data desc);
create index if not exists expenses_categoria_idx
  on public.expenses (owner_id, categoria);
create index if not exists expenses_transaction_idx
  on public.expenses (financial_transaction_id);

create index if not exists payouts_consignment_idx
  on public.consignment_payouts (consignment_id);
create index if not exists payouts_supplier_idx
  on public.consignment_payouts (supplier_id);
create index if not exists payouts_status_idx
  on public.consignment_payouts (owner_id, status);

-- Livro caixa: filtro por periodo, direcao e status.
create index if not exists financial_data_idx
  on public.financial_transactions (owner_id, data desc);
create index if not exists financial_direcao_status_idx
  on public.financial_transactions (owner_id, direcao, status);
create index if not exists financial_watch_idx
  on public.financial_transactions (watch_id);
create index if not exists financial_sale_idx
  on public.financial_transactions (sale_id);
create index if not exists financial_reservation_idx
  on public.financial_transactions (reservation_id);
create index if not exists financial_expense_idx
  on public.financial_transactions (expense_id);
create index if not exists financial_payout_idx
  on public.financial_transactions (payout_id);
create index if not exists financial_client_idx
  on public.financial_transactions (client_id);

create index if not exists credit_client_idx
  on public.customer_credit_movements (client_id);
create index if not exists credit_reservation_idx
  on public.customer_credit_movements (reservation_id);
create index if not exists credit_sale_idx
  on public.customer_credit_movements (sale_id);
