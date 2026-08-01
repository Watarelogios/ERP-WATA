-- =============================================================================
-- SEED DE DESENVOLVIMENTO - DADOS FICTICIOS
--
-- NAO EXECUTE EM PRODUCAO. Marcas, clientes, valores e datas sao inventados
-- apenas para exercitar as telas. Nenhuma informacao aqui e real.
--
-- Uso local:  supabase db reset      (aplica migrations e depois este arquivo)
-- =============================================================================

do $$
declare
  v_owner uuid;
  v_supplier_vendedor uuid;
  v_supplier_consignante uuid;
  v_cliente_ana uuid;
  v_cliente_bruno uuid;
  v_watch_proprio uuid;
  v_watch_reservado uuid;
  v_watch_consignado uuid;
  v_watch_vendido uuid;
  v_reservation uuid;
  v_sale uuid;
  v_consignment uuid;
begin
  -- Sem usuario nao ha owner_id possivel: crie um em Authentication > Users.
  select id into v_owner from auth.users order by created_at limit 1;

  if v_owner is null then
    raise notice 'Seed ignorado: nenhum usuario em auth.users.';
    return;
  end if;

  -- Protecao contra rodar por cima de dados existentes.
  if exists (select 1 from public.watches where owner_id = v_owner) then
    raise notice 'Seed ignorado: ja existem relogios para este usuario.';
    return;
  end if;

  raise notice 'Populando dados ficticios para o usuario %', v_owner;

  -- Configuracao da loja -----------------------------------------------------
  insert into public.settings (owner_id, nome_loja, saldo_inicial, dias_estoque_parado)
  values (v_owner, 'WATA', 15000.00, 90)
  on conflict (owner_id) do nothing;

  -- Fornecedores -------------------------------------------------------------
  insert into public.suppliers (owner_id, nome, cidade, tipo_relacao, observacoes)
  values (v_owner, 'Relojoaria Central', 'Recife', 'SELLER',
          'Dado ficticio de desenvolvimento.')
  returning id into v_supplier_vendedor;

  insert into public.suppliers (owner_id, nome, cidade, tipo_relacao, observacoes)
  values (v_owner, 'Carlos Meireles', 'Olinda', 'CONSIGNOR',
          'Dado ficticio de desenvolvimento.')
  returning id into v_supplier_consignante;

  -- Clientes -----------------------------------------------------------------
  insert into public.clients (owner_id, nome, cidade, interesses)
  values (v_owner, 'Ana Figueiredo', 'Recife', 'Mergulho, aco escovado')
  returning id into v_cliente_ana;

  insert into public.clients (owner_id, nome, cidade, interesses)
  values (v_owner, 'Bruno Tavares', 'Joao Pessoa', 'Cronografos')
  returning id into v_cliente_bruno;

  -- Estoque proprio disponivel ----------------------------------------------
  insert into public.watches (
    owner_id, marca, modelo, referencia, ano, movimento, diametro_mm,
    mostrador, condicao, valor_compra, valor_minimo, valor_anunciado,
    tipo, status, supplier_id, data_entrada
  )
  values (
    v_owner, 'Seiko', 'SKX007', 'SKX007J1', 2018, 'AUTOMATIC', 42.5,
    'Preto', 'Muito bom', 1400.00, 1750.00, 1990.00,
    'OWNED', 'AVAILABLE', v_supplier_vendedor, current_date - 35
  )
  returning id into v_watch_proprio;

  insert into public.expenses (owner_id, watch_id, categoria, descricao, valor, data)
  values (v_owner, v_watch_proprio, 'SERVICE', 'Revisao completa', 180.00,
          current_date - 30);

  -- Estoque proprio reservado ------------------------------------------------
  insert into public.watches (
    owner_id, marca, modelo, referencia, ano, movimento, diametro_mm,
    mostrador, condicao, valor_compra, valor_minimo, valor_anunciado,
    tipo, status, supplier_id, data_entrada
  )
  values (
    v_owner, 'Tissot', 'PRX Powermatic 80', 'T137.407', 2022, 'AUTOMATIC', 40.0,
    'Azul', 'Excelente', 2600.00, 3100.00, 3450.00,
    'OWNED', 'RESERVED', v_supplier_vendedor, current_date - 12
  )
  returning id into v_watch_reservado;

  insert into public.reservations (
    owner_id, watch_id, client_id, valor_combinado, validade,
    valor_sinal, data_sinal, forma_pagamento, status
  )
  values (
    v_owner, v_watch_reservado, v_cliente_ana, 3300.00, current_date + 5,
    500.00, current_date - 2, 'PIX', 'ACTIVE'
  )
  returning id into v_reservation;

  -- O sinal recebido entra no caixa uma unica vez (Secao 13.2).
  insert into public.financial_transactions (
    owner_id, direcao, categoria, valor, status, data, descricao,
    watch_id, reservation_id, client_id, idempotency_key
  )
  values (
    v_owner, 'INCOME', 'RESERVATION_DEPOSIT', 500.00, 'CONFIRMED',
    current_date - 2, 'Sinal da reserva - Tissot PRX',
    v_watch_reservado, v_reservation, v_cliente_ana,
    'seed-deposit-' || v_reservation::text
  );

  insert into public.watch_status_history (
    owner_id, watch_id, status_anterior, status_novo, motivo, actor_id
  )
  values (v_owner, v_watch_reservado, 'AVAILABLE', 'RESERVED',
          'Reserva com sinal de R$ 500,00', v_owner);

  -- Estoque consignado -------------------------------------------------------
  insert into public.watches (
    owner_id, marca, modelo, referencia, ano, movimento, diametro_mm,
    mostrador, condicao, valor_minimo, valor_anunciado,
    tipo, status, supplier_id, data_entrada
  )
  values (
    v_owner, 'Omega', 'Seamaster 300M', '210.30.42', 2019, 'AUTOMATIC', 42.0,
    'Azul ondulado', 'Excelente', 32000.00, 35900.00,
    'CONSIGNED', 'AVAILABLE', v_supplier_consignante, current_date - 100
  )
  returning id into v_watch_consignado;

  insert into public.consignments (
    owner_id, watch_id, supplier_id, modalidade, percentual_wata, prazo, notas
  )
  values (
    v_owner, v_watch_consignado, v_supplier_consignante, 'WATA_PERCENTAGE',
    12.00, current_date + 20, 'Comissao de 12% para a WATA.'
  )
  returning id into v_consignment;

  -- Venda concluida ----------------------------------------------------------
  insert into public.watches (
    owner_id, marca, modelo, referencia, ano, movimento, diametro_mm,
    mostrador, condicao, valor_compra, valor_minimo, valor_anunciado,
    valor_vendido, tipo, status, supplier_id, data_entrada
  )
  values (
    v_owner, 'Casio', 'Oceanus OCW-S100', 'OCW-S100-1AJF', 2020, 'SOLAR', 39.0,
    'Prata', 'Bom', 1800.00, 2200.00, 2500.00,
    2450.00, 'OWNED', 'SOLD', v_supplier_vendedor, current_date - 60
  )
  returning id into v_watch_vendido;

  insert into public.sales (
    owner_id, watch_id, client_id, valor_venda, origem, forma_pagamento, data_venda
  )
  values (
    v_owner, v_watch_vendido, v_cliente_bruno, 2450.00, 'Instagram', 'PIX',
    current_date - 20
  )
  returning id into v_sale;

  insert into public.expenses (owner_id, watch_id, sale_id, categoria, descricao, valor, data)
  values (v_owner, v_watch_vendido, v_sale, 'SHIPPING', 'Envio com seguro',
          70.00, current_date - 20);

  insert into public.financial_transactions (
    owner_id, direcao, categoria, valor, status, data, descricao,
    watch_id, sale_id, client_id, idempotency_key
  )
  values (
    v_owner, 'INCOME', 'SALE', 2450.00, 'CONFIRMED', current_date - 20,
    'Venda - Casio Oceanus', v_watch_vendido, v_sale, v_cliente_bruno,
    'seed-sale-' || v_sale::text
  );

  insert into public.watch_status_history (
    owner_id, watch_id, status_anterior, status_novo, motivo, actor_id
  )
  values (v_owner, v_watch_vendido, 'AVAILABLE', 'SOLD',
          'Venda a vista', v_owner);

  -- Oportunidades em negociacao ---------------------------------------------
  insert into public.purchase_opportunities (
    owner_id, modelo, referencia, cidade, valor_pedido, minha_oferta,
    supplier_id, status, notas, data_contato
  )
  values (
    v_owner, 'Seiko Alpinist SPB121', 'SPB121J1', 'Recife', 3200.00, 2800.00,
    v_supplier_vendedor, 'NEGOTIATING', 'Aguardando fotos do verso.',
    current_date - 4
  );

  insert into public.purchase_opportunities (
    owner_id, modelo, referencia, cidade, valor_pedido, minha_oferta,
    status, notas, data_contato
  )
  values (
    v_owner, 'Orient Bambino V4', 'FAC08003', 'Caruaru', 950.00, 800.00,
    'LOST', 'Vendedor recusou a oferta.', current_date - 15
  );

  -- Despesa geral sem vinculo com item --------------------------------------
  insert into public.expenses (owner_id, categoria, descricao, valor, data)
  values (v_owner, 'META_ADS', 'Campanha de alcance - mes corrente', 300.00,
          current_date - 8);

  insert into public.financial_transactions (
    owner_id, direcao, categoria, valor, status, data, descricao
  )
  values (
    v_owner, 'EXPENSE', 'META_ADS', 300.00, 'CONFIRMED', current_date - 8,
    'Campanha de alcance - mes corrente'
  );

  raise notice 'Seed concluido.';
end
$$;
