-- 00003_core_entities.sql
-- Configuracoes da loja, clientes, fornecedores, relogios, fotos e historico.
--
-- Convencoes (Secao 8):
--   moeda      numeric(14,2) com check >= 0
--   percentual numeric(5,2) entre 0 e 100
--   datas      timestamptz; exibicao em pt-BR/America-Recife fica na aplicacao
--   exclusao   deleted_at (logica); historico financeiro nunca e apagado

-- ---------------------------------------------------------------------------
-- settings (Secao 10.1) - uma linha por usuario.
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,

  nome_loja text not null default 'WATA',
  logo_url text,

  -- Ponto de partida do caixa: caixa = saldo_inicial + entradas - saidas.
  saldo_inicial numeric(14, 2) not null default 0
    constraint settings_saldo_inicial_nao_negativo check (saldo_inicial >= 0),

  timezone text not null default 'America/Recife',

  -- Listas configuraveis; o dashboard agrupa vendas por estes canais.
  canais_venda jsonb not null default
    '["Instagram", "WhatsApp", "OLX", "Indicacao", "Outros"]'::jsonb,
  categorias jsonb not null default '[]'::jsonb,

  -- Limite de "item parado" usado pela view stock_aging (Secao 14).
  dias_estoque_parado integer not null default 90
    constraint settings_dias_estoque_parado_positivo
      check (dias_estoque_parado > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint settings_owner_unico unique (owner_id)
);

comment on table public.settings is
  'Configuracao da loja por usuario: saldo inicial, canais e categorias.';

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- clients (Secao 10.2)
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,

  nome text not null
    constraint clients_nome_preenchido check (length(trim(nome)) > 0),
  cidade text,
  telefone text,
  instagram text,
  interesses text,
  observacoes text,

  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.clients is
  'Clientes. O historico e derivado de reservas, vendas e creditos.';

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- suppliers (Secao 10.2) - vendedores e consignantes.
-- ---------------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,

  nome text not null
    constraint suppliers_nome_preenchido check (length(trim(nome)) > 0),
  cidade text,
  telefone text,
  instagram text,
  tipo_relacao public.supplier_relation not null default 'SELLER',
  observacoes text,

  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.suppliers is
  'Fornecedores. tipo_relacao distingue quem vende de quem consigna.';

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- watches (Secao 10.3)
--
-- Uma venda concluida nao apaga o relogio: o registro continua ligado a fotos,
-- cliente, despesas, transacoes, historico e eventual repasse.
-- ---------------------------------------------------------------------------
create table if not exists public.watches (
  id uuid primary key default gen_random_uuid(),

  -- Codigo publico imutavel, gerado no banco (Secao 11).
  wata_id text not null default public.next_wata_id(),

  owner_id uuid not null references auth.users (id) on delete cascade,

  marca text not null
    constraint watches_marca_preenchida check (length(trim(marca)) > 0),
  modelo text not null
    constraint watches_modelo_preenchido check (length(trim(modelo)) > 0),
  referencia text,

  ano smallint
    constraint watches_ano_plausivel check (ano is null or ano between 1800 and 2200),
  movimento public.movement_type,
  diametro_mm numeric(5, 1)
    constraint watches_diametro_positivo
      check (diametro_mm is null or diametro_mm > 0),
  mostrador text,
  condicao text,

  valor_compra numeric(14, 2)
    constraint watches_valor_compra_nao_negativo
      check (valor_compra is null or valor_compra >= 0),
  valor_minimo numeric(14, 2)
    constraint watches_valor_minimo_nao_negativo
      check (valor_minimo is null or valor_minimo >= 0),
  valor_anunciado numeric(14, 2)
    constraint watches_valor_anunciado_nao_negativo
      check (valor_anunciado is null or valor_anunciado >= 0),
  valor_vendido numeric(14, 2)
    constraint watches_valor_vendido_nao_negativo
      check (valor_vendido is null or valor_vendido >= 0),

  tipo public.watch_type not null,
  status public.watch_status not null default 'AVAILABLE',

  supplier_id uuid references public.suppliers (id) on delete set null,
  data_entrada date not null default current_date,
  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- Proprio exige valor de compra; consignado nao tem custo de aquisicao.
  constraint watches_custo_conforme_tipo check (
    (tipo = 'OWNED' and valor_compra is not null)
    or (tipo = 'CONSIGNED' and valor_compra is null)
  ),

  -- valor_vendido so existe depois da venda concluida.
  constraint watches_valor_vendido_apenas_se_vendido check (
    valor_vendido is null or status = 'SOLD'
  )
);

comment on table public.watches is
  'Relogios proprios e consignados. Venda nao remove o registro.';
comment on column public.watches.wata_id is
  'Codigo publico WATA-0001. Unico, imutavel e nunca reutilizado.';

drop trigger if exists watches_set_updated_at on public.watches;
create trigger watches_set_updated_at
  before update on public.watches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- watch_photos (Secao 10.3)
--
-- storage_path aponta para o bucket privado; o arquivo em si nunca fica no
-- banco. Caminho: <auth.uid()>/<watch_id>/<uuid>.<ext> (Secao 17.1).
-- ---------------------------------------------------------------------------
create table if not exists public.watch_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  watch_id uuid not null references public.watches (id) on delete cascade,

  storage_path text not null
    constraint watch_photos_path_preenchido check (length(trim(storage_path)) > 0),
  ordem smallint not null default 0
    constraint watch_photos_ordem_nao_negativa check (ordem >= 0),
  is_cover boolean not null default false,
  alt_text text,

  created_at timestamptz not null default now()
);

comment on column public.watch_photos.alt_text is
  'Formato "Marca Modelo - WATA-0001" (Secao 16.2).';

-- ---------------------------------------------------------------------------
-- watch_status_history (Secao 10.3)
--
-- Trilha de auditoria: quem mudou o status, quando e por que.
-- ---------------------------------------------------------------------------
create table if not exists public.watch_status_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  watch_id uuid not null references public.watches (id) on delete cascade,

  status_anterior public.watch_status,
  status_novo public.watch_status not null,
  motivo text,
  actor_id uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now()
);

comment on table public.watch_status_history is
  'Historico de status do relogio. Somente insercao; nunca reescrito.';
