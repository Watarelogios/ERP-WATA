-- 00001_extensions_enums.sql
-- Extensoes, sequencia do WATA-ID e enums do dominio (Secao 9).
--
-- Todos os blocos sao reaplicaveis: a migration pode rodar novamente em um
-- banco limpo ou parcialmente aplicado sem erro.

create extension if not exists pgcrypto with schema extensions;

-- Busca por marca, modelo e referencia usa ILIKE parcial (Secao 15.1);
-- sem trigramas isso vira varredura completa da tabela.
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Sequencia do codigo publico WATA-0001 (Secao 11).
-- A geracao fica no banco para evitar concorrencia e duplicidade; o proximo
-- codigo nunca vem de contagem de registros.
-- ---------------------------------------------------------------------------
create sequence if not exists public.wata_watch_seq start 1;

-- A funcao acompanha a sequencia (e nao a migration 00005) porque
-- watches.wata_id a usa como DEFAULT: precisa existir antes da tabela.
create or replace function public.next_wata_id()
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select 'WATA-' || lpad(nextval('public.wata_watch_seq')::text, 4, '0');
$$;

comment on function public.next_wata_id() is
  'Codigo publico sequencial do relogio. Codigos nunca sao reutilizados.';

-- ---------------------------------------------------------------------------
-- Enums.
-- Valores persistidos em ingles; os rotulos em portugues ficam na interface,
-- centralizados em um unico modulo.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'role_type') then
    create type public.role_type as enum ('ADMIN');
  end if;

  if not exists (select 1 from pg_type where typname = 'watch_type') then
    create type public.watch_type as enum ('OWNED', 'CONSIGNED');
  end if;

  if not exists (select 1 from pg_type where typname = 'watch_status') then
    create type public.watch_status as enum ('AVAILABLE', 'RESERVED', 'SOLD');
  end if;

  if not exists (select 1 from pg_type where typname = 'movement_type') then
    create type public.movement_type as enum (
      'MANUAL', 'AUTOMATIC', 'QUARTZ', 'SOLAR', 'OTHER'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'purchase_status') then
    create type public.purchase_status as enum (
      'NEGOTIATING', 'PURCHASED', 'LOST'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'reservation_status') then
    create type public.reservation_status as enum (
      'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'deposit_fate') then
    create type public.deposit_fate as enum (
      'REFUNDED', 'RETAINED', 'CUSTOMER_CREDIT'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'consignment_mode') then
    create type public.consignment_mode as enum (
      'FIXED_PAYOUT', 'WATA_PERCENTAGE'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'payout_status') then
    create type public.payout_status as enum ('PENDING', 'PAID', 'CANCELLED');
  end if;

  if not exists (select 1 from pg_type where typname = 'financial_direction') then
    create type public.financial_direction as enum ('INCOME', 'EXPENSE');
  end if;

  if not exists (select 1 from pg_type where typname = 'financial_status') then
    create type public.financial_status as enum (
      'PENDING', 'CONFIRMED', 'REVERSED', 'CANCELLED'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'expense_category') then
    create type public.expense_category as enum (
      'PURCHASE', 'SHIPPING', 'SERVICE', 'STRAP',
      'PACKAGING', 'META_ADS', 'PAYOUT', 'OTHER'
    );
  end if;

  -- Nao consta explicitamente na Secao 9, mas suppliers.tipo_relacao nao pode
  -- ser texto livre (Secao 8): fornecedor vende, consigna ou faz os dois.
  if not exists (select 1 from pg_type where typname = 'supplier_relation') then
    create type public.supplier_relation as enum (
      'SELLER', 'CONSIGNOR', 'BOTH'
    );
  end if;

  -- Categoria do livro caixa. expense_category cobre apenas saidas; o caixa
  -- tambem recebe entradas (venda, sinal, sinal retido), e a devolucao de
  -- sinal e uma saida que nao e despesa operacional.
  if not exists (select 1 from pg_type where typname = 'financial_category') then
    create type public.financial_category as enum (
      -- entradas
      'SALE', 'RESERVATION_DEPOSIT', 'RETAINED_DEPOSIT', 'OTHER_INCOME',
      -- saidas
      'PURCHASE', 'SHIPPING', 'SERVICE', 'STRAP', 'PACKAGING',
      'META_ADS', 'PAYOUT', 'DEPOSIT_REFUND', 'OTHER_EXPENSE'
    );
  end if;

  -- Idem para customer_credit_movements.tipo (Secao 10.2).
  if not exists (select 1 from pg_type where typname = 'credit_movement_type') then
    create type public.credit_movement_type as enum ('CREDIT', 'DEBIT');
  end if;
end
$$;
