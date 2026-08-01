-- 00014_grants_authenticated.sql
-- Privilegios explicitos de tabela para o papel `authenticated`.
--
-- POR QUE ISSO E NECESSARIO
--
-- No Postgres, RLS filtra LINHAS, mas so depois que o papel tem privilegio na
-- TABELA. Sem GRANT, a consulta morre antes com "permission denied for table
-- x" — mesmo com as politicas corretas.
--
-- O Supabase configura default privileges que concedem acesso automatico a
-- anon/authenticated, porem elas valem para objetos criados pelo papel
-- `postgres`. O `supabase db push` conecta com um login role temporario, entao
-- as tabelas criadas pelas migrations podem nascer sem grant nenhum.
--
-- Depender de default privileges e fragil justamente por isso: o resultado
-- muda conforme quem aplicou a migration. Aqui os privilegios sao declarados,
-- e o comportamento passa a ser o mesmo em qualquer banco.
--
-- O acesso anonimo continua revogado: quem le e escreve e sempre um usuario
-- autenticado, limitado pelo RLS as proprias linhas.

-- ---------------------------------------------------------------------------
-- Tabelas de dominio: CRUD completo, com o RLS restringindo as linhas.
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
      'grant select, insert, update, delete on public.%I to authenticated',
      v_table
    );
    execute format('revoke all on public.%I from anon', v_table);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Tabelas de historico: leitura e insercao apenas.
--
-- Espelha as politicas da migration 00006. Trilha de auditoria que pode ser
-- reescrita nao e trilha de auditoria.
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
      'grant select, insert on public.%I to authenticated', v_table
    );
    execute format('revoke all on public.%I from anon', v_table);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- profiles: sem DELETE — o perfil sai em cascata junto com a conta.
-- ---------------------------------------------------------------------------
grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from anon;

-- ---------------------------------------------------------------------------
-- Views do dashboard: apenas leitura.
--
-- Criadas com security_invoker, entao o RLS das tabelas de origem continua
-- valendo para quem consulta.
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
    execute format('grant select on public.%I to authenticated', v_view);
    execute format('revoke all on public.%I from anon', v_view);
  end loop;
end
$$;
