-- 00004_operations.sql
-- Compras, consignacoes, reservas, vendas, despesas, repasses e livro caixa.

-- ---------------------------------------------------------------------------
-- purchase_opportunities (Secao 10.4) - pipeline de negociacao.
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,

  modelo text not null
    constraint purchase_modelo_preenchido check (length(trim(modelo)) > 0),
  referencia text,
  cidade text,

  valor_pedido numeric(14, 2)
    constraint purchase_valor_pedido_nao_negativo
      check (valor_pedido is null or valor_pedido >= 0),
  minha_oferta numeric(14, 2)
    constraint purchase_minha_oferta_nao_negativa
      check (minha_oferta is null or minha_oferta >= 0),
  valor_fechado numeric(14, 2)
    constraint purchase_valor_fechado_nao_negativo
      check (valor_fechado is null or valor_fechado >= 0),

  supplier_id uuid references public.suppliers (id) on delete set null,
  status public.purchase_status not null default 'NEGOTIATING',
  notas text,

  -- Preenchido pela confirmacao da compra; garante que a conversao ocorre
  -- uma unica vez (Secao 13.1).
  purchased_watch_id uuid references public.watches (id) on delete set null,

  data_contato date not null default current_date,
  data_fechamento date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Oportunidade comprada precisa apontar para o relogio e o valor fechado.
  constraint purchase_comprada_tem_vinculo check (
    status <> 'PURCHASED'
    or (purchased_watch_id is not null and valor_fechado is not null)
  ),

  -- Relogio so pode existir se a oportunidade foi de fato comprada.
  constraint purchase_vinculo_apenas_se_comprada check (
    purchased_watch_id is null or status = 'PURCHASED'
  )
);

drop trigger if exists purchase_opportunities_set_updated_at
  on public.purchase_opportunities;
create trigger purchase_opportunities_set_updated_at
  before update on public.purchase_opportunities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- consignments (Secao 10.4)
--
-- encerrado_em null significa consignacao vigente. A unicidade de "uma ativa
-- por relogio" fica no indice parcial da migration 00008.
-- ---------------------------------------------------------------------------
create table if not exists public.consignments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,

  watch_id uuid not null references public.watches (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,

  modalidade public.consignment_mode not null,

  valor_repasse_fixo numeric(14, 2)
    constraint consignments_repasse_nao_negativo
      check (valor_repasse_fixo is null or valor_repasse_fixo >= 0),
  percentual_wata numeric(5, 2)
    constraint consignments_percentual_valido
      check (percentual_wata is null or (percentual_wata >= 0 and percentual_wata <= 100)),

  prazo date,
  notas text,

  encerrado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Cada modalidade usa exatamente um dos dois campos (Secao 12.2 e 12.3).
  constraint consignments_valor_conforme_modalidade check (
    (modalidade = 'FIXED_PAYOUT'
      and valor_repasse_fixo is not null and percentual_wata is null)
    or (modalidade = 'WATA_PERCENTAGE'
      and percentual_wata is not null and valor_repasse_fixo is null)
  )
);

drop trigger if exists consignments_set_updated_at on public.consignments;
create trigger consignments_set_updated_at
  before update on public.consignments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reservations (Secao 10.4)
-- ---------------------------------------------------------------------------
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,

  watch_id uuid not null references public.watches (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete restrict,

  valor_combinado numeric(14, 2) not null
    constraint reservations_valor_combinado_nao_negativo
      check (valor_combinado >= 0),
  validade date not null,
  status public.reservation_status not null default 'ACTIVE',

  valor_sinal numeric(14, 2) not null default 0
    constraint reservations_sinal_nao_negativo check (valor_sinal >= 0),
  data_sinal date,
  forma_pagamento text,

  -- Definido apenas no cancelamento/expiracao com sinal (Secao 13.3).
  destino_sinal public.deposit_fate,

  /*
   * Coluna derivada: a Secao 5.1 proibe total duplicado que possa divergir.
   * GENERATED garante que o saldo restante acompanhe valor e sinal sempre.
   */
  saldo_restante numeric(14, 2)
    generated always as (valor_combinado - valor_sinal) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reservations_sinal_nao_excede_combinado
    check (valor_sinal <= valor_combinado),

  -- Sinal registrado exige data; sem sinal nao ha data.
  constraint reservations_data_sinal_coerente check (
    (valor_sinal > 0 and data_sinal is not null)
    or (valor_sinal = 0 and data_sinal is null)
  ),

  -- Destino do sinal so faz sentido para reserva encerrada com sinal.
  constraint reservations_destino_sinal_coerente check (
    destino_sinal is null
    or (valor_sinal > 0 and status in ('CANCELLED', 'EXPIRED'))
  )
);

drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sales (Secao 10.4)
--
-- lucro_bruto e lucro_liquido sao mantidos pelo banco (migration 00005) para
-- que nunca divirjam das despesas vinculadas.
-- ---------------------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,

  watch_id uuid not null references public.watches (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete restrict,
  reservation_id uuid references public.reservations (id) on delete set null,

  valor_venda numeric(14, 2) not null
    constraint sales_valor_venda_nao_negativo check (valor_venda >= 0),
  origem text,
  forma_pagamento text,
  data_venda date not null default current_date,

  lucro_bruto numeric(14, 2) not null default 0,
  lucro_liquido numeric(14, 2) not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Um relogio e vendido uma unica vez (Secao 18).
  constraint sales_watch_unico unique (watch_id)
);

comment on column public.sales.lucro_liquido is
  'Recalculado por trigger a cada mudanca em despesas vinculadas.';

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- expenses (Secao 10.4)
--
-- Uma despesa generica (Meta Ads, por exemplo) afeta o caixa, mas so reduz o
-- lucro de um relogio quando watch_id ou sale_id estiverem preenchidos.
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,

  watch_id uuid references public.watches (id) on delete set null,
  sale_id uuid references public.sales (id) on delete set null,

  categoria public.expense_category not null default 'OTHER',
  descricao text,
  valor numeric(14, 2) not null
    constraint expenses_valor_nao_negativo check (valor >= 0),
  data date not null default current_date,
  status public.financial_status not null default 'CONFIRMED',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- consignment_payouts (Secao 10.4)
--
-- Repasse PENDING nao reduz o caixa; so a saida confirmada do pagamento reduz
-- (Secao 13.5).
-- ---------------------------------------------------------------------------
create table if not exists public.consignment_payouts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,

  consignment_id uuid not null references public.consignments (id) on delete restrict,
  sale_id uuid not null references public.sales (id) on delete restrict,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,

  valor numeric(14, 2) not null
    constraint payouts_valor_nao_negativo check (valor >= 0),
  status public.payout_status not null default 'PENDING',
  data_pagamento date,
  forma_pagamento text,
  comprovante_path text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Cada venda consignada gera no maximo um repasse.
  constraint payouts_sale_unico unique (sale_id),

  constraint payouts_data_conforme_status check (
    (status = 'PAID' and data_pagamento is not null)
    or (status <> 'PAID' and data_pagamento is null)
  )
);

drop trigger if exists consignment_payouts_set_updated_at
  on public.consignment_payouts;
create trigger consignment_payouts_set_updated_at
  before update on public.consignment_payouts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- financial_transactions (Secao 10.4) - livro caixa.
--
-- Toda a movimentacao de dinheiro passa por aqui. As referencias sao opcionais
-- porque existem lancamentos avulsos (Meta Ads sem vinculo, por exemplo).
-- ---------------------------------------------------------------------------
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,

  direcao public.financial_direction not null,
  categoria public.financial_category not null,
  valor numeric(14, 2) not null
    constraint financial_valor_nao_negativo check (valor >= 0),
  status public.financial_status not null default 'CONFIRMED',
  data date not null default current_date,
  descricao text,

  watch_id uuid references public.watches (id) on delete set null,
  sale_id uuid references public.sales (id) on delete set null,
  reservation_id uuid references public.reservations (id) on delete set null,
  expense_id uuid references public.expenses (id) on delete set null,
  payout_id uuid references public.consignment_payouts (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,

  /*
   * Chave de idempotencia: uma segunda tentativa da mesma operacao (rede
   * instavel, duplo clique, retry) nao lanca o valor duas vezes (Secao 18).
   */
  idempotency_key text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Categoria precisa combinar com a direcao do lancamento.
  constraint financial_categoria_conforme_direcao check (
    (direcao = 'INCOME' and categoria in (
      'SALE', 'RESERVATION_DEPOSIT', 'RETAINED_DEPOSIT', 'OTHER_INCOME'
    ))
    or (direcao = 'EXPENSE' and categoria in (
      'PURCHASE', 'SHIPPING', 'SERVICE', 'STRAP', 'PACKAGING',
      'META_ADS', 'PAYOUT', 'DEPOSIT_REFUND', 'OTHER_EXPENSE'
    ))
  )
);

comment on table public.financial_transactions is
  'Livro caixa. Caixa = saldo_inicial + entradas CONFIRMED - saidas CONFIRMED.';

drop trigger if exists financial_transactions_set_updated_at
  on public.financial_transactions;
create trigger financial_transactions_set_updated_at
  before update on public.financial_transactions
  for each row execute function public.set_updated_at();

-- Vinculo da despesa com o lancamento de caixa que ela gerou.
-- Adicionado depois porque as duas tabelas se referenciam.
alter table public.expenses
  add column if not exists financial_transaction_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'expenses_financial_transaction_fk'
  ) then
    alter table public.expenses
      add constraint expenses_financial_transaction_fk
      foreign key (financial_transaction_id)
      references public.financial_transactions (id) on delete set null;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- customer_credit_movements (Secao 10.2)
--
-- Fica nesta migration porque depende de reservations e sales. Um sinal
-- transformado em credito (Secao 13.3) nao gera nova entrada de caixa: o
-- dinheiro ja entrou; o que muda e a obrigacao com o cliente.
-- ---------------------------------------------------------------------------
create table if not exists public.customer_credit_movements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,

  client_id uuid not null references public.clients (id) on delete restrict,
  reservation_id uuid references public.reservations (id) on delete set null,
  sale_id uuid references public.sales (id) on delete set null,

  tipo public.credit_movement_type not null,
  valor numeric(14, 2) not null
    constraint credit_valor_positivo check (valor > 0),
  motivo text,

  created_at timestamptz not null default now()
);

comment on table public.customer_credit_movements is
  'Creditos do cliente. CREDIT aumenta o saldo; DEBIT consome ao comprar.';
