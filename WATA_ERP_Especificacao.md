**WATA**

**WATA ERP**

Especificação de implementação para IA de desenvolvimento

*MVP web completo · Next.js + React + Supabase*

| **Finalidade** | Documento operacional para orientar uma IA a construir o sistema |
|----------------|------------------------------------------------------------------|
| **Status**     | Escopo do MVP fechado e pronto para implementação                |
| **Identidade** | Branco e grafite; interface responsiva e centrada em fotografias |
| **Data**       | 31 de julho de 2026                                              |

**A IA deve entregar software funcional, não apenas um plano.**

# 1. Como usar este documento

Envie este arquivo integralmente para a IA que desenvolverá o projeto. O documento funciona como contrato de implementação: descreve o produto, a arquitetura, o banco, os fluxos, a interface, a segurança, os testes e a ordem de entrega.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>INSTRUÇÃO PRINCIPAL</strong></p>
<p>A IA deve primeiro ler todo o documento, depois inspecionar o repositório disponível e só então implementar. Se o repositório estiver vazio, deve inicializar o projeto. Se já houver código, deve preservar o que estiver correto e evoluir a base existente.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

- Não reduzir o trabalho a wireframes, protótipos estáticos ou telas sem persistência.

- Não inventar credenciais, chaves ou dados reais; criar apenas .env.example.

- Não executar migrações destrutivas em banco com dados sem confirmação explícita.

- Tomar decisões razoáveis quando faltar um detalhe não bloqueante e registrá-las no README.

- Fazer perguntas somente quando uma escolha alterar materialmente segurança, dados ou escopo.

- Ao fim de cada fase, executar lint, verificação de tipos, testes aplicáveis e build.

# 2. Prompt mestre para a IA

**COPIAR COMO INSTRUÇÃO INICIAL**

Você é uma IA engenheira de software sênior responsável por construir o WATA ERP.  
  
Leia este documento inteiro antes de editar arquivos. Implemente o MVP funcional no repositório fornecido usando Next.js com App Router, React, TypeScript e Supabase. A aplicação deve ter autenticação privada, banco PostgreSQL, RLS, armazenamento protegido de fotos, interface responsiva e os módulos descritos neste documento.  
  
Sua tarefa é escrever o código, criar as migrations, configurar os testes e deixar o sistema pronto para execução local e publicação. Não entregue apenas um plano. Trabalhe em fases pequenas e verificáveis. Preserve alterações válidas já existentes. Nunca coloque service role key, senhas ou segredos no navegador ou no repositório.  
  
Antes de começar:  
1. Inspecione a estrutura e os arquivos existentes.  
2. Registre um plano curto de implementação.  
3. Identifique bloqueios reais; não pergunte sobre detalhes que este documento já resolve.  
  
Durante a implementação:  
- use migrations versionadas e idempotentes quando aplicável;  
- mantenha regras financeiras críticas no servidor ou no banco;  
- use transações atômicas nas operações compostas;  
- implemente loading, vazio, erro e sucesso nas telas;  
- respeite rigorosamente a identidade branco/grafite e os requisitos de acessibilidade;  
- crie dados fictícios apenas em seed separado e opcional.  
  
Ao concluir, entregue:  
- resumo do que foi implementado;  
- migrations e instruções para aplicá-las;  
- .env.example e README de instalação;  
- comandos de lint, typecheck, testes e build executados;  
- pendências reais, se houver, sem esconder falhas.

# 3. Resultado obrigatório e definição de pronto

O resultado esperado é uma aplicação privada que permita operar a WATA desde o cadastro de uma oportunidade até a venda, o caixa e os indicadores. Uma funcionalidade só é considerada pronta quando interface, persistência, regras, autorização, feedback de estado e testes essenciais estiverem conectados.

- \[ \] Login por e-mail e senha com sessão segura.

- \[ \] Primeiro acesso com configuração da WATA e saldo inicial.

- \[ \] Estoque próprio e consignado com fotos e WATA-ID automático.

- \[ \] Compras convertidas em estoque e saída financeira sem duplicidade.

- \[ \] Reservas com sinal opcional e tratamento de cancelamento.

- \[ \] Venda à vista com lucro, financeiro, histórico e repasse consignado.

- \[ \] Dashboard calculado a partir de dados reais do banco.

- \[ \] Clientes, fornecedores e consignantes com histórico.

- \[ \] Responsividade completa em desktop e celular.

- \[ \] RLS e políticas de Storage validadas com usuário autenticado e não autenticado.

- \[ \] README, .env.example, migrations e comandos de qualidade funcionando.

# 4. Escopo funcional do MVP

| **Módulo**   | **Entrega funcional**                                          |
|--------------|----------------------------------------------------------------|
| Autenticação | Login, logout, recuperação de senha e proteção de rotas.       |
| Configuração | Dados básicos da WATA, saldo inicial, canais e categorias.     |
| Dashboard    | Indicadores, alertas, vendas/lucro por mês e itens parados.    |
| Estoque      | Cadastro, fotos, filtros, detalhe, reserva, venda e histórico. |
| Compras      | Pipeline de oportunidades e conversão atômica em compra.       |
| Reservas     | Validade, sinal, saldo restante e cancelamento.                |
| Vendas       | Venda à vista, custos, lucro, origem e repasse consignado.     |
| Financeiro   | Entradas, saídas, pendências, estornos, filtros e saldo.       |
| Clientes     | Contato, interesses, reservas, créditos e compras.             |
| Fornecedores | Vendedores, consignantes, itens e repasses.                    |

## 4.1 Fora do MVP

- Parcelamento, contas a receber ou cobrança recorrente.

- Emissão de nota fiscal e integrações fiscais.

- Publicação automática em OLX, Instagram, WhatsApp ou marketplaces.

- Aplicativo nativo, multiloja, múltiplos caixas e contabilidade completa.

- Permissões avançadas para equipes; o MVP possui apenas Administrador WATA.

# 5. Stack e decisões arquiteturais

| **Camada**  | **Decisão obrigatória**                                                            |
|-------------|------------------------------------------------------------------------------------|
| Frontend    | Next.js App Router, React e TypeScript em modo strict.                             |
| Estilo      | Tailwind CSS e componentes shadcn/ui adaptados ao design WATA.                     |
| Formulários | Validação tipada com Zod e integração adequada ao padrão do projeto.               |
| Backend     | Server Actions e/ou Route Handlers; regras críticas nunca apenas no cliente.       |
| Banco       | Supabase PostgreSQL com migrations SQL versionadas.                                |
| Auth        | Supabase Auth com SSR e sessão em cookies via @supabase/ssr.                       |
| Fotos       | Supabase Storage em bucket privado com políticas RLS.                              |
| Qualidade   | ESLint, TypeScript, testes unitários/integrados e Playwright para fluxos críticos. |
| Publicação  | Plataforma compatível com Next.js, com variáveis de ambiente protegidas.           |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>VERSÕES</strong></p>
<p>Use versões estáveis e compatíveis no momento da criação do projeto. Não fixe versões antigas apenas por memória. Registre as versões escolhidas no package.json e no README.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 5.1 Princípios técnicos

- Server Components por padrão; Client Components somente quando houver interação necessária.

- Consultas de leitura no servidor sempre que isso reduzir exposição e bundle do cliente.

- Tipos do banco gerados pelo Supabase e utilizados no TypeScript.

- Valores monetários como numeric/decimal no banco e centavos/Decimal em cálculos controlados; nunca float.

- Datas armazenadas em timestamptz; exibição em pt-BR e fuso America/Recife.

- Todas as operações compostas executadas em função SQL/RPC transacional ou transação server-side confiável.

- Totais derivados calculados por views/funções, evitando colunas duplicadas que possam divergir.

# 6. Estrutura sugerida do projeto

**ESTRUTURA DE REFERÊNCIA**

src/  
app/  
(auth)/login/page.tsx  
(app)/layout.tsx  
(app)/dashboard/page.tsx  
(app)/estoque/page.tsx  
(app)/estoque/novo/page.tsx  
(app)/estoque/\[id\]/page.tsx  
(app)/compras/page.tsx  
(app)/reservas/page.tsx  
(app)/vendas/page.tsx  
(app)/financeiro/page.tsx  
(app)/clientes/page.tsx  
(app)/fornecedores/page.tsx  
(app)/configuracoes/page.tsx  
components/  
ui/ \# componentes-base  
layout/ \# sidebar, header e navegação móvel  
domain/ \# cards, tabelas, status e resumos  
forms/ \# formulários por entidade  
lib/  
supabase/client.ts  
supabase/server.ts  
supabase/session.ts  
actions/ \# operações server-side  
queries/ \# consultas e mapeamento de views  
validations/ \# schemas Zod  
money/ \# cálculo e formatação monetária  
types/database.ts  
supabase/  
migrations/  
seed.sql \# opcional e somente com dados fictícios  
tests/  
unit/  
e2e/  
.env.example  
README.md

A IA pode ajustar nomes e agrupamentos quando o repositório existente exigir, mas deve manter separação clara entre UI, validação, consulta, regra de negócio e acesso ao Supabase.

# 7. Variáveis de ambiente e configuração

**.ENV.EXAMPLE**

NEXT_PUBLIC_SUPABASE_URL=  
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  
\# Use apenas no servidor e somente se uma operação administrativa realmente exigir:  
SUPABASE_SERVICE_ROLE_KEY=  
NEXT_PUBLIC_APP_URL=http://localhost:3000  
APP_TIMEZONE=America/Recife

- Nunca expor SUPABASE_SERVICE_ROLE_KEY em variável NEXT_PUBLIC, Client Component ou resposta HTTP.

- O sistema normal deve operar com a sessão do usuário e RLS; service role não pode substituir políticas corretas.

- Configurar callback e URLs permitidas do Supabase Auth para ambiente local e produção.

- Criar mecanismo de atualização da sessão conforme a orientação atual de SSR do Next.js/Supabase.

# 8. Convenções do banco

| **Tema**    | **Convenção**                                                                      |
|-------------|------------------------------------------------------------------------------------|
| Chaves      | UUID com gen_random_uuid(), exceto a sequência interna do WATA-ID.                 |
| Propriedade | owner_id UUID obrigatório nas tabelas de domínio, ligado a auth.users.             |
| Auditoria   | created_at, updated_at e created_by/updated_by quando aplicável.                   |
| Exclusão    | Preferir deleted_at/inativação; nunca apagar histórico financeiro automaticamente. |
| Moeda       | numeric(14,2), constraint valor \>= 0 e formatação BRL somente na apresentação.    |
| Percentual  | numeric(5,2), entre 0 e 100.                                                       |
| Enums       | Enums PostgreSQL ou constraints explícitas; não usar texto livre para status.      |
| Índices     | owner_id, status, datas, chaves estrangeiras e campos usados em filtros/RLS.       |

## 8.1 Ordem das migrations

1.  00001_extensions_enums.sql - extensões, sequência e enums.

2.  00002_profiles_auth.sql - profiles, trigger de novo usuário e função updated_at.

3.  00003_core_entities.sql - clientes, fornecedores, relógios, fotos e configurações.

4.  00004_operations.sql - compras, reservas, vendas, despesas, financeiro e repasses.

5.  00005_functions_views.sql - RPCs transacionais, fórmulas e views do dashboard.

6.  00006_rls.sql - habilitação de RLS e políticas por owner_id.

7.  00007_storage.sql - bucket privado e políticas para fotografias.

8.  00008_indexes_constraints.sql - índices, unicidade, checks e proteção do WATA-ID.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>SEGURANÇA DE MIGRATIONS</strong></p>
<p>Cada migration deve ser revisável, versionada e reaplicável em um banco limpo. Operações destrutivas precisam estar isoladas e claramente justificadas.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 9. Enums e estados

| **Domínio**         | **Valores**                                                            |
|---------------------|------------------------------------------------------------------------|
| role_type           | ADMIN                                                                  |
| watch_type          | OWNED, CONSIGNED                                                       |
| watch_status        | AVAILABLE, RESERVED, SOLD                                              |
| movement_type       | MANUAL, AUTOMATIC, QUARTZ, SOLAR, OTHER                                |
| purchase_status     | NEGOTIATING, PURCHASED, LOST                                           |
| reservation_status  | ACTIVE, COMPLETED, CANCELLED, EXPIRED                                  |
| deposit_fate        | REFUNDED, RETAINED, CUSTOMER_CREDIT                                    |
| consignment_mode    | FIXED_PAYOUT, WATA_PERCENTAGE                                          |
| payout_status       | PENDING, PAID, CANCELLED                                               |
| financial_direction | INCOME, EXPENSE                                                        |
| financial_status    | PENDING, CONFIRMED, REVERSED, CANCELLED                                |
| expense_category    | PURCHASE, SHIPPING, SERVICE, STRAP, PACKAGING, META_ADS, PAYOUT, OTHER |

Os rótulos da interface devem aparecer em português, mas os valores persistidos podem permanecer em inglês para padronização técnica. Centralize o mapeamento enum → rótulo/cor em um único módulo.

# 10. Modelo de dados detalhado

## 10.1 Perfis e configurações

| **Tabela** | **Campos essenciais**                                                                          |
|------------|------------------------------------------------------------------------------------------------|
| profiles   | id/auth user, nome, role, ativo, created_at, updated_at.                                       |
| settings   | owner_id, nome da loja, logo_url, saldo_inicial, timezone, canais_venda JSON, categorias JSON. |

## 10.2 Clientes e fornecedores

| **Tabela**                | **Campos essenciais**                                                                           |
|---------------------------|-------------------------------------------------------------------------------------------------|
| clients                   | id, owner_id, nome, cidade, telefone, instagram, interesses, observacoes, ativo, timestamps.    |
| suppliers                 | id, owner_id, nome, cidade, telefone, instagram, tipo_relacao, observacoes, ativo, timestamps.  |
| customer_credit_movements | id, owner_id, client_id, reservation_id, sale_id, tipo CREDIT/DEBIT, valor, motivo, created_at. |

## 10.3 Relógios e fotos

| **Campo de watches**                 | **Regra**                                                             |
|--------------------------------------|-----------------------------------------------------------------------|
| id / wata_id                         | UUID técnico e código público sequencial WATA-0001, único e imutável. |
| owner_id                             | Usuário proprietário do registro; base das políticas RLS.             |
| marca / modelo / referencia          | Marca e modelo obrigatórios; referência opcional e pesquisável.       |
| ano / movimento / diametro_mm        | Especificações opcionais; diâmetro decimal positivo.                  |
| mostrador / condicao                 | Textos curtos; condição pode usar lista configurável.                 |
| valor_compra                         | Obrigatório para próprio; nulo para consignado.                       |
| valor_minimo / valor_anunciado       | Não negativos; mínimo acima do anunciado exige confirmação explícita. |
| valor_vendido                        | Preenchido somente após venda concluída.                              |
| tipo / status                        | OWNED ou CONSIGNED; AVAILABLE, RESERVED ou SOLD.                      |
| supplier_id / data_entrada           | Origem e data; fornecedor obrigatório quando disponível.              |
| observacoes                          | Texto livre e sanitizado.                                             |
| created_at / updated_at / deleted_at | Auditoria e exclusão lógica.                                          |

| **Tabela**           | **Campos essenciais**                                                               |
|----------------------|-------------------------------------------------------------------------------------|
| watch_photos         | id, owner_id, watch_id, storage_path, ordem, is_cover, alt_text, created_at.        |
| watch_status_history | id, owner_id, watch_id, status_anterior, status_novo, motivo, actor_id, created_at. |

## 10.4 Operações comerciais

| **Tabela**             | **Campos essenciais**                                                                                                             |
|------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| purchase_opportunities | modelo, referencia, valor_pedido, minha_oferta, valor_fechado, supplier_id, cidade, status, notas, purchased_watch_id, datas.     |
| consignments           | watch_id único ativo, supplier_id, modalidade, valor_repasse_fixo ou percentual_wata, prazo, notas, timestamps.                   |
| reservations           | watch_id, client_id, valor_combinado, validade, status, valor_sinal, data_sinal, forma_pagamento, destino_sinal, saldo_restante.  |
| sales                  | watch_id único, client_id, valor_venda, origem, forma_pagamento, data_venda, lucro_bruto, lucro_liquido, reservation_id opcional. |
| expenses               | watch_id/sale_id opcionais, categoria, descricao, valor, data, status e vínculo financeiro.                                       |
| consignment_payouts    | consignment_id, sale_id, supplier_id, valor, status, data_pagamento, comprovante_path.                                            |
| financial_transactions | direção, categoria, valor, status, data, descricao, referências opcionais e idempotency_key única.                                |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>INTEGRIDADE RELACIONAL</strong></p>
<p>Uma venda concluída não apaga o relógio. O registro vendido continua ligado a fotos, cliente, despesas, transações, histórico e eventual repasse.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 11. Geração do WATA-ID

**REFERÊNCIA SQL**

create sequence if not exists public.wata_watch_seq start 1;  
  
create or replace function public.next_wata_id()  
returns text  
language sql  
security definer  
set search_path = public  
as \$\$  
select 'WATA-' \|\| lpad(nextval('public.wata_watch_seq')::text, 4, '0');  
\$\$;  
  
-- watches.wata_id deve usar default public.next_wata_id()  
-- Criar unique constraint e trigger que impeça alteração posterior.

- O primeiro item deve receber WATA-0001.

- Códigos nunca são reutilizados, mesmo após inativação ou cancelamento.

- A geração ocorre no banco para evitar concorrência e duplicidade.

- Não calcular o próximo ID contando registros existentes.

# 12. Regras financeiras e fórmulas

| **Indicador**           | **Fórmula**                                                              |
|-------------------------|--------------------------------------------------------------------------|
| Capital investido       | Soma valor_compra + despesas vinculadas dos próprios AVAILABLE/RESERVED. |
| Valor do estoque        | Soma valor_anunciado de próprios e consignados AVAILABLE/RESERVED.       |
| Lucro potencial próprio | valor_anunciado - valor_compra - despesas estimadas/vinculadas.          |
| Lucro mínimo próprio    | valor_minimo - valor_compra - despesas estimadas/vinculadas.             |
| Lucro realizado         | Soma lucro_liquido das vendas concluídas.                                |
| Caixa                   | saldo_inicial + entradas CONFIRMED - saídas CONFIRMED.                   |

## 12.1 Venda própria

lucro_bruto = valor_venda - valor_compra  
lucro_liquido = valor_venda - valor_compra - despesas_vinculadas

## 12.2 Consignação com repasse fixo

repasse_proprietario = valor_repasse_fixo  
lucro_liquido_wata = valor_venda - valor_repasse_fixo - despesas_wata

## 12.3 Consignação com comissão percentual

comissao_wata = valor_venda \* (percentual_wata / 100)  
repasse_proprietario = valor_venda - comissao_wata  
lucro_liquido_wata = comissao_wata - despesas_wata

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>META ADS</strong></p>
<p>Uma despesa genérica de Meta Ads afeta o caixa, mas só reduz o lucro de um relógio quando estiver explicitamente vinculada ao item ou à venda.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 13. Operações transacionais obrigatórias

## 13.1 Confirmar compra

1.  Bloquear a oportunidade e validar status NEGOTIATING.

2.  Confirmar valor fechado, data e fornecedor.

3.  Criar relógio OWNED e gerar WATA-ID no banco.

4.  Criar despesa de compra e transação financeira EXPENSE/CONFIRMED.

5.  Marcar oportunidade PURCHASED e salvar purchased_watch_id.

6.  Confirmar tudo em uma única transação; em erro, não persistir parcialmente.

## 13.2 Criar reserva

1.  Validar relógio AVAILABLE e ausência de outra reserva ativa.

2.  Criar reserva ACTIVE com validade e valor combinado.

3.  Alterar relógio para RESERVED e registrar histórico.

4.  Se houver sinal, criar entrada financeira CONFIRMED uma única vez.

5.  Retornar reserva, novo status e saldo restante.

## 13.3 Cancelar ou expirar reserva

| **Destino do sinal** | **Efeito**                                                                  |
|----------------------|-----------------------------------------------------------------------------|
| Sem sinal            | Encerrar reserva e devolver relógio para AVAILABLE.                         |
| REFUNDED             | Criar saída confirmada equivalente ao sinal; não apagar a entrada original. |
| RETAINED             | Manter o dinheiro no caixa e reclassificar como receita de sinal retido.    |
| CUSTOMER_CREDIT      | Criar crédito do cliente sem nova entrada de caixa.                         |

## 13.4 Concluir venda à vista

1.  Validar relógio AVAILABLE ou RESERVED; se reservado, validar o cliente.

2.  Validar pagamento integral. Em reserva, sinal + pagamento restante deve equivaler ao valor final.

3.  Criar sale com valores e lucros calculados no servidor/banco.

4.  Criar entrada financeira somente do valor ainda não contabilizado; não duplicar o sinal.

5.  Alterar relógio para SOLD, preencher valor_vendido e registrar histórico.

6.  Concluir a reserva associada, quando existir.

7.  Se consignado, criar payout PENDING sem reduzir o caixa.

8.  Retornar venda e resumo dos módulos atualizados em uma única transação.

## 13.5 Pagar consignante

1.  Validar payout PENDING e valor calculado da venda.

2.  Registrar data, forma e comprovante opcional.

3.  Criar saída financeira CONFIRMED com idempotency_key única.

4.  Marcar payout PAID na mesma transação.

# 14. Views e consultas do dashboard

| **View/consulta**        | **Conteúdo**                                                           |
|--------------------------|------------------------------------------------------------------------|
| dashboard_summary        | Capital, estoque, lucros, caixa e contagens em uma linha por owner_id. |
| monthly_sales_profit     | Vendas, receita e lucro por mês.                                       |
| sales_by_origin          | Quantidade e valor por Instagram, WhatsApp, OLX e outros.              |
| stock_aging              | Dias em estoque e itens parados acima do limite configurado.           |
| active_alerts            | Reservas a vencer, consignações no prazo e repasses pendentes.         |
| customer_credit_balances | Crédito líquido disponível por cliente.                                |

- Dashboard não deve armazenar totais manualmente.

- Invalidar/revalidar dados após operações relevantes.

- Exibir skeletons durante carregamento e estado vazio orientando o primeiro cadastro.

- Datas e valores devem ser filtráveis por período sem recalcular no navegador todos os registros.

# 15. Rotas, telas e comportamento

| **Rota**        | **Tela / responsabilidade**                                              |
|-----------------|--------------------------------------------------------------------------|
| /login          | Login, recuperação e ausência de dados comerciais antes da autenticação. |
| /dashboard      | Indicadores, alertas, gráficos e atalhos.                                |
| /estoque        | Busca, filtros, tabela/cards e ações rápidas.                            |
| /estoque/novo   | Cadastro dividido em etapas lógicas e upload de fotos.                   |
| /estoque/\[id\] | Galeria, resumo, abas, histórico, reservar e vender.                     |
| /compras        | Lista ou kanban simples de oportunidades.                                |
| /reservas       | Ativas, próximas do vencimento e histórico.                              |
| /vendas         | Histórico com cliente, valor, lucro e origem.                            |
| /financeiro     | Saldo, totais, transações, pendências e filtros.                         |
| /clientes       | Lista, cadastro, interesses, créditos e histórico.                       |
| /fornecedores   | Lista, consignantes, itens e repasses.                                   |
| /configuracoes  | Dados da loja, saldo inicial, canais e categorias.                       |

## 15.1 Estoque: tela principal

- Busca por WATA-ID, marca, modelo e referência.

- Filtros por status, tipo, marca, fornecedor e faixa de valor.

- Ordenação por entrada, preço, marca e dias em estoque.

- Desktop em tabela configurável; celular em cards com foto 4:3.

- Ações contextuais Visualizar, Editar, Reservar e Vender.

- Status e tipo sempre comunicados por texto + ícone/ponto, nunca apenas por cor.

## 15.2 Formulários

- Rótulos permanentes, mensagens junto ao campo e foco no primeiro erro.

- Máscara BRL sem perder precisão; salvar valor numérico normalizado.

- Campos de consignação aparecem apenas quando tipo = CONSIGNED.

- Upload com progresso, reordenação, capa e remoção segura.

- Rascunho local opcional em cadastros longos; operações financeiras exigem confirmação explícita.

- Botão final descreve a ação: Confirmar compra, Criar reserva, Confirmar venda e pagamento ou Pagar repasse.

# 16. Design system e UI/UX

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>DIREÇÃO VISUAL</strong></p>
<p>Minimalista, premium e funcional. Branco e grafite formam a base; as fotografias dos relógios recebem o maior destaque. Dourado não faz parte da identidade.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **Token**     | **Valor** | **Uso**                                   |
|---------------|-----------|-------------------------------------------|
| graphite      | \#303236  | Navegação, botões primários e títulos.    |
| graphite-dark | \#202124  | Texto principal e alto contraste.         |
| white         | \#FFFFFF  | Fundo principal, formulários e cards.     |
| surface       | \#F4F5F6  | Fundos secundários e grupos de campos.    |
| border        | \#D0D5DD  | Divisões, inputs e tabelas.               |
| success       | \#2E7D32  | Disponível, concluído e entrada.          |
| warning       | \#A86500  | Reservado, negociando e pendente.         |
| danger        | \#B42318  | Erro, vencido, estorno e ação destrutiva. |
| info          | \#175CD3  | Links, informação e foco.                 |

- Fonte Inter; valores financeiros com algarismos tabulares.

- Grid de 8 px e espaçamentos consistentes.

- Cards com raio moderado, borda discreta e sombra mínima ou inexistente.

- Uma ação primária clara por tela; ações secundárias visualmente discretas.

- Desktop com sidebar fixa; celular com barra inferior e botão de ação central quando útil.

- Não esconder funções essenciais em menus no desktop.

## 16.1 Componentes obrigatórios

| **Componente** | **Comportamento mínimo**                                  |
|----------------|-----------------------------------------------------------|
| AppShell       | Sidebar desktop, header e navegação inferior móvel.       |
| MetricCard     | Rótulo, valor, contexto/variação e navegação opcional.    |
| WatchCard      | Foto, WATA-ID, marca/modelo, preço, tipo, status e ações. |
| DataTable      | Busca, ordenação, filtros, paginação e estado vazio.      |
| StatusChip     | Texto + ícone/ponto com contraste suficiente.             |
| MoneyInput     | BRL, teclado numérico móvel, precisão e validação.        |
| PhotoUploader  | Progresso, capa, ordenação, limite e erros.               |
| ConfirmDialog  | Objeto, consequência, valores e ação inequívoca.          |
| EmptyState     | Explicação objetiva e ação para começar.                  |
| Toast/Alert    | Sucesso ou erro sem esconder informação crítica.          |

## 16.2 Estados e acessibilidade

- Skeletons no formato do conteúdo; evitar bloquear a tela inteira.

- Erro recuperável em linguagem simples com opção Tentar novamente.

- Sem conexão: impedir confirmações críticas e avisar sobre dados possivelmente desatualizados.

- Alvos de toque de pelo menos 44 × 44 px.

- Contraste WCAG AA, foco visível e navegação completa por teclado.

- Mensagens de erro anunciáveis; inputs com label e descrição ligados semanticamente.

- Fotos com alt text no formato “Marca Modelo - WATA-0001”.

- Tabelas transformadas em cards no celular, evitando rolagem horizontal excessiva.

# 17. Autenticação, RLS e Storage

- Criar profile automaticamente após inclusão em auth.users, com tratamento seguro de metadata opcional.

- Proteger todas as rotas do aplicativo; /login e callbacks são públicas.

- Ativar RLS em toda tabela exposta pela Data API.

- Políticas SELECT/INSERT/UPDATE/DELETE exigem owner_id = auth.uid().

- INSERT também exige WITH CHECK para impedir criação em nome de outro usuário.

- Não conceder acesso anon às tabelas de domínio.

- Service role pode existir apenas em código server-only e não deve ser necessária no fluxo normal.

**PADRÃO DE POLÍTICA**

alter table public.watches enable row level security;  
  
create policy "owner can read watches"  
on public.watches for select  
to authenticated  
using (owner_id = auth.uid());  
  
create policy "owner can insert watches"  
on public.watches for insert  
to authenticated  
with check (owner_id = auth.uid());  
  
create policy "owner can update watches"  
on public.watches for update  
to authenticated  
using (owner_id = auth.uid())  
with check (owner_id = auth.uid());

## 17.1 Fotos

- Bucket privado wata-watch-photos.

- Caminho: \<auth.uid()\>/\<watch_id\>/\<uuid\>.\<ext\>.

- Aceitar JPEG, PNG e WebP; validar MIME, tamanho e quantidade no cliente e servidor.

- Upload, remoção e listagem via Storage API; nunca alterar storage.objects diretamente.

- Criar signed URLs de curta duração para exibição quando necessário.

- Políticas do Storage verificam o primeiro segmento do caminho contra auth.uid().

# 18. Validação, erros e idempotência

| **Situação**        | **Comportamento obrigatório**                                                  |
|---------------------|--------------------------------------------------------------------------------|
| Venda duplicada     | Constraint/lock impede segunda venda e retorna mensagem clara.                 |
| Reserva concorrente | Índice parcial ou lógica transacional permite somente uma ativa por relógio.   |
| Pagamento repetido  | idempotency_key evita lançamento financeiro duplicado.                         |
| Falha no upload     | Cadastro permanece editável e permite tentar novamente sem duplicar fotos.     |
| Falha de rede       | Não presumir sucesso; reconsultar estado antes de repetir operação crítica.    |
| Valor inválido      | Bloquear negativos, NaN, precisão indevida e percentual fora de 0–100.         |
| Registro excluído   | Soft delete e histórico preservado; referências financeiras continuam válidas. |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>MENSAGENS</strong></p>
<p>Não exibir erros técnicos crus do PostgreSQL ao usuário. Registrar detalhes no servidor e apresentar uma mensagem objetiva com ação possível.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 19. Estratégia de testes

| **Nível**   | **Cobertura esperada**                                                                 |
|-------------|----------------------------------------------------------------------------------------|
| Unitário    | Fórmulas, dinheiro, datas, mapeamento de status e validações Zod.                      |
| Banco       | Constraints, RLS, WATA-ID, views e RPCs transacionais.                                 |
| Integração  | Server Actions/handlers com Supabase local ou ambiente de teste.                       |
| Componentes | Formulários, estados, diálogos e acessibilidade básica.                                |
| E2E         | Login, compra, reserva, cancelamento, venda própria e consignada, repasse e dashboard. |

## 19.1 Cenários críticos

- \[ \] Usuário não autenticado não acessa /dashboard nem lê dados via API.

- \[ \] Usuário autenticado não consegue ler ou alterar owner_id de outro usuário.

- \[ \] Duas requisições simultâneas geram WATA-IDs diferentes.

- \[ \] Duas reservas ativas para o mesmo relógio são rejeitadas.

- \[ \] Sinal não é contabilizado novamente na conclusão da venda.

- \[ \] Repasse pendente não reduz o caixa; pago reduz uma única vez.

- \[ \] Falha no meio de compra/venda não deixa registros parciais.

- \[ \] Lucros dos três modelos conferem com os valores esperados.

- \[ \] Layout é utilizável em 360 px e em desktop amplo.

# 20. Fases de implementação

| **Fase**       | **Entregas**                                               | **Checkpoint**                |
|----------------|------------------------------------------------------------|-------------------------------|
| 1\. Fundação   | Projeto, dependências, design tokens, Auth SSR e AppShell. | Login e rotas protegidas.     |
| 2\. Banco      | Migrations, enums, tabelas, RLS, Storage e tipos gerados.  | Banco limpo sobe sem erro.    |
| 3\. Cadastros  | Configuração, clientes, fornecedores e estoque com fotos.  | WATA-0001 e busca funcionam.  |
| 4\. Compras    | Oportunidades e RPC de confirmação.                        | Compra cria estoque e saída.  |
| 5\. Reservas   | Sinal, validade, cancelamento e créditos.                  | Sem duplicar status ou caixa. |
| 6\. Vendas     | Venda própria/consignada, custos, lucros e payout.         | Operação atômica validada.    |
| 7\. Financeiro | Livro caixa, filtros, estornos e repasses.                 | Saldo explicável.             |
| 8\. Dashboard  | Views, métricas, gráficos e alertas.                       | Totais conferidos.            |
| 9\. Qualidade  | E2E, acessibilidade, responsividade, README e build.       | MVP pronto para uso.          |

A IA deve concluir e verificar uma fase antes de avançar. Se precisar interromper, deve deixar o repositório em estado executável e registrar o próximo passo objetivo.

# 21. Critérios de aceite do MVP

- \[ \] Login e logout funcionam, e sessão é mantida corretamente.

- \[ \] O primeiro relógio recebe WATA-0001 automaticamente.

- \[ \] Itens próprios e consignados podem ser cadastrados com múltiplas fotos.

- \[ \] Oportunidade PURCHASED cria relógio e saída financeira uma única vez.

- \[ \] Reserva muda o relógio para RESERVED e registra sinal opcional.

- \[ \] Cancelamento trata sinal como devolvido, retido ou crédito.

- \[ \] Venda à vista remove o item do estoque ativo e preserva o histórico.

- \[ \] Lucro próprio, consignado fixo e percentual conferem com as fórmulas.

- \[ \] Repasse pendente e pago afetam dashboard e caixa corretamente.

- \[ \] Dashboard reflete alterações sem manutenção manual de totais.

- \[ \] Interface funciona no celular e desktop com estados completos.

- \[ \] RLS, Storage, lint, typecheck, testes e build passam.

# 22. Entregáveis finais da IA

- \[ \] Código-fonte completo e organizado.

- \[ \] Todas as migrations SQL em ordem e sem segredos.

- \[ \] Seed opcional claramente separado de produção.

- \[ \] .env.example sem valores confidenciais.

- \[ \] README com pré-requisitos, instalação, Supabase, usuário administrador e deploy.

- \[ \] Comandos npm para dev, lint, typecheck, test e build.

- \[ \] Tipos do Supabase atualizados.

- \[ \] Testes dos fluxos críticos.

- \[ \] Lista curta de decisões técnicas e pendências reais.

**GATE DE ENTREGA**

Antes de declarar o projeto concluído, execute e informe o resultado:  
  
npm run lint  
npm run typecheck  
npm test  
npm run build  
  
\# Se houver E2E configurado:  
npm run test:e2e

# 23. Referências técnicas oficiais

[<u>Next.js - documentação e App Router</u>](https://nextjs.org/docs)

[<u>Supabase Auth com Next.js</u>](https://supabase.com/docs/guides/auth/quickstarts/nextjs)

[<u>Supabase SSR e criação de clientes</u>](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

[<u>Supabase Row Level Security</u>](https://supabase.com/docs/guides/database/postgres/row-level-security)

[<u>Supabase Storage - controle de acesso</u>](https://supabase.com/docs/guides/storage/security/access-control)

[<u>shadcn/ui para Next.js</u>](https://ui.shadcn.com/docs/installation/next)

# 24. Instrução final

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>CONSTRUIR O MVP</strong></p>
<p>Implemente o sistema seguindo este documento, preserve a integridade financeira e trate a qualidade de UI/UX como requisito funcional. Não substitua o desenvolvimento por um protótipo visual ou por uma lista de tarefas.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>
