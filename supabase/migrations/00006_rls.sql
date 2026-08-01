-- 00006_rls.sql
-- Row Level Security em toda tabela exposta pela Data API (Secao 17).
--
-- Regra unica: cada usuario enxerga e altera apenas as proprias linhas.
-- INSERT e UPDATE tambem exigem WITH CHECK, senao seria possivel gravar
-- registros em nome de outro usuario.

-- ---------------------------------------------------------------------------
-- profiles - a chave e o proprio id (espelha auth.users.id).
--
-- Sem politica de DELETE: o perfil e removido em cascata com a conta.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profile proprio: ler" on public.profiles;
create policy "profile proprio: ler"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profile proprio: criar" on public.profiles;
create policy "profile proprio: criar"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profile proprio: atualizar" on public.profiles;
create policy "profile proprio: atualizar"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Tabelas de dominio com owner_id.
--
-- O laco garante que nenhuma tabela fique sem politica por esquecimento.
-- (select auth.uid()) e avaliado uma vez por consulta, e nao por linha.
-- ---------------------------------------------------------------------------
do $$
declare
  v_table text;
  v_tables text[] := array[
    'settings',
    'clients',
    'suppliers',
    'watches',
    'watch_photos',
    'purchase_opportunities',
    'consignments',
    'reservations',
    'sales',
    'expenses',
    'consignment_payouts',
    'financial_transactions'
  ];
begin
  foreach v_table in array v_tables loop
    execute format(
      'alter table public.%I enable row level security', v_table
    );

    execute format(
      'drop policy if exists "owner: ler" on public.%I', v_table
    );
    execute format(
      'create policy "owner: ler" on public.%I for select to authenticated '
      || 'using (owner_id = (select auth.uid()))', v_table
    );

    execute format(
      'drop policy if exists "owner: criar" on public.%I', v_table
    );
    execute format(
      'create policy "owner: criar" on public.%I for insert to authenticated '
      || 'with check (owner_id = (select auth.uid()))', v_table
    );

    execute format(
      'drop policy if exists "owner: atualizar" on public.%I', v_table
    );
    execute format(
      'create policy "owner: atualizar" on public.%I for update to authenticated '
      || 'using (owner_id = (select auth.uid())) '
      || 'with check (owner_id = (select auth.uid()))', v_table
    );

    execute format(
      'drop policy if exists "owner: remover" on public.%I', v_table
    );
    execute format(
      'create policy "owner: remover" on public.%I for delete to authenticated '
      || 'using (owner_id = (select auth.uid()))', v_table
    );

    -- Nenhuma tabela de dominio e legivel sem autenticacao.
    execute format('revoke all on public.%I from anon', v_table);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Tabelas de historico: leitura e insercao apenas.
--
-- Trilha de auditoria que pode ser reescrita nao e trilha de auditoria. Sem
-- politica de UPDATE/DELETE, o RLS bloqueia essas operacoes por padrao.
-- ---------------------------------------------------------------------------
do $$
declare
  v_table text;
  v_tables text[] := array[
    'watch_status_history',
    'customer_credit_movements'
  ];
begin
  foreach v_table in array v_tables loop
    execute format(
      'alter table public.%I enable row level security', v_table
    );

    execute format(
      'drop policy if exists "owner: ler" on public.%I', v_table
    );
    execute format(
      'create policy "owner: ler" on public.%I for select to authenticated '
      || 'using (owner_id = (select auth.uid()))', v_table
    );

    execute format(
      'drop policy if exists "owner: criar" on public.%I', v_table
    );
    execute format(
      'create policy "owner: criar" on public.%I for insert to authenticated '
      || 'with check (owner_id = (select auth.uid()))', v_table
    );

    execute format('revoke all on public.%I from anon', v_table);
  end loop;
end
$$;

revoke all on public.profiles from anon;

-- ---------------------------------------------------------------------------
-- As views herdam o RLS das tabelas de origem porque foram criadas com
-- security_invoker. Ainda assim, o acesso anonimo e revogado explicitamente.
-- ---------------------------------------------------------------------------
do $$
declare
  v_view text;
  v_views text[] := array[
    'stock_valuation',
    'dashboard_summary',
    'monthly_sales_profit',
    'sales_by_origin',
    'stock_aging',
    'active_alerts',
    'customer_credit_balances'
  ];
begin
  foreach v_view in array v_views loop
    execute format('revoke all on public.%I from anon', v_view);
    execute format('grant select on public.%I to authenticated', v_view);
  end loop;
end
$$;
