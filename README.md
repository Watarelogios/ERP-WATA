# WATA ERP

Sistema privado de gestão de relógios da WATA — do cadastro de uma oportunidade
até a venda, o caixa e os indicadores.

Implementação guiada por `WATA_ERP_Especificacao.md`, que funciona como contrato:
escopo, modelo de dados, regras financeiras e critérios de aceite saem de lá.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 ·
Supabase (Postgres + Auth + Storage) · Vitest · Playwright.

---

## Estado atual

| Fase | Entrega | Situação |
|------|---------|----------|
| 1. Fundação | Projeto, dependências, design tokens, Auth SSR e AppShell | **Concluída** |
| 2. Banco | Migrations, enums, tabelas, RLS, Storage e tipos gerados | **Concluída** |
| 3. Cadastros | Configuração, clientes, fornecedores e estoque com fotos | **Concluída** |
| 4. Compras | Oportunidades e RPC de confirmação | **Concluída** |
| 5. Reservas | Sinal, validade, cancelamento e créditos | **Concluída** |
| 6. Vendas | Venda própria/consignada, custos, lucros e payout | **Concluída** |
| 7. Financeiro | Livro caixa, filtros, estornos e repasses | **Concluída** |
| 8. Dashboard | Views, métricas, gráficos e alertas | **Concluída** |
| 9. Qualidade | E2E, acessibilidade, responsividade, README e build | **Concluída** |

Todos os módulos do MVP estão implementados e persistem dados. As quatro
operações compostas da Seção 13 (confirmar compra, criar reserva, cancelar
reserva e concluir venda) rodam como funções transacionais no banco.

### O que o MVP entrega

**Autenticação** — login por e-mail e senha com sessão em cookies `httpOnly`,
recuperação de senha e proteção de rotas no `proxy.ts`, que também renova a
sessão a cada requisição.

**Cadastros** — configuração da loja com saldo inicial, clientes, fornecedores e
estoque com fotos em bucket privado. O WATA-ID é gerado por sequência no banco,
único e imutável.

**Operações** — as quatro operações compostas da Seção 13 são funções
transacionais em PostgreSQL, não sequências de chamadas do cliente:

| Operação | O que garante |
|----------|---------------|
| `confirm_purchase` | Cria relógio, despesa e saída de caixa de uma vez |
| `create_reservation` | Bloqueia o relógio e lança o sinal uma única vez |
| `cancel_reservation` | Trata sinal devolvido, retido ou virado crédito |
| `complete_sale` | Não cobra o sinal de novo; gera repasse pendente |
| `pay_consignment_payout` | Debita o caixa uma única vez |
| `reverse_financial_transaction` | Estorna sem apagar o histórico |

Cada uma trava a linha com `FOR UPDATE` antes de validar, roda como
`security invoker` (o RLS continua valendo dentro da função) e usa
`idempotency_key` nos lançamentos financeiros.

**Financeiro e dashboard** — livro caixa com filtro por período, estornos e a
composição do saldo aberta parcela por parcela. Oito indicadores lidos das views,
sem nenhum total armazenado.

---

## Qualidade

```
lint       ✓    typecheck  ✓    build  ✓
test       ✓ 207 testes (17 arquivos)
test:e2e   ✓ 28 testes (desktop e 360px)
```

Os testes de `tests/db/` sobem um Postgres real em memória (PGlite, sem Docker),
aplicam as migrations de verdade e atacam as tabelas diretamente. Rodam com o
papel `authenticated`, que não é dono das tabelas — então o RLS realmente vale.

Os cenários críticos da Seção 19.1 estão cobertos:

- [x] Usuário não autenticado não acessa `/dashboard` nem lê dados via API
- [x] Usuário autenticado não lê nem altera `owner_id` de outro usuário
- [x] Requisições simultâneas geram WATA-IDs diferentes
- [x] Duas reservas ativas para o mesmo relógio são rejeitadas
- [x] Sinal não é contabilizado de novo na conclusão da venda
- [x] Repasse pendente não reduz o caixa; pago reduz uma única vez
- [x] Falha no meio de compra/venda não deixa registros parciais
- [x] Lucros dos três modelos conferem com as fórmulas
- [x] Layout utilizável em 360 px e em desktop amplo

---

## Pré-requisitos

- Node.js 20.9 ou superior (exigência do Next.js 16)
- npm 10+
- Conta no [Supabase](https://supabase.com) com um projeto criado

## Instalação

```bash
npm install
```

```bash
cp .env.example .env.local
```

Preencha `.env.local` com os dados do seu projeto Supabase e rode:

```bash
npm run dev
```

A aplicação sobe em <http://localhost:3000>. Sem as variáveis configuradas a tela
de login abre e explica o que falta, em vez de quebrar.

## Configuração do Supabase

1. **Chaves** — em *Project Settings → API*, copie a *Project URL* para
   `NEXT_PUBLIC_SUPABASE_URL` e a *publishable key* (ou *anon key*, em projetos
   mais antigos) para `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

2. **URLs permitidas** — em *Authentication → URL Configuration*, defina o
   *Site URL* e inclua em *Redirect URLs*:

   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/confirm
   https://SEU-DOMINIO/auth/callback
   https://SEU-DOMINIO/auth/confirm
   ```

3. **Usuário administrador** — o MVP tem um único papel (`ADMIN`) e não possui
   tela de cadastro: o acesso é criado pelo painel. Em *Authentication → Users →
   Add user*, informe e-mail e senha e marque *Auto Confirm User*.

4. **Template de recuperação de senha** — em *Authentication → Email Templates →
   Reset Password*, o link deve apontar para o endpoint de confirmação:

   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nova-senha
   ```

## Aplicar as migrations

O schema vive em `supabase/migrations/`, numerado e reaplicável. As migrations
são apenas aditivas — não apagam nem reescrevem dados existentes.

Escolha **um** dos dois caminhos.

### Caminho A — Supabase CLI (recomendado)

Mantém o histórico de migrations sincronizado e habilita `supabase gen types`.

```bash
npx supabase login
```

```bash
npx supabase link --project-ref vuempwblznostdmrmouu
```

O `link` pede a **senha do banco** (a que você definiu ao criar o projeto; pode
ser redefinida em *Project Settings → Database → Reset database password*).

```bash
npx supabase db push
```

Depois disso, os tipos podem vir direto do projeto:

```bash
npx supabase gen types typescript --linked > src/lib/types/database.ts
```

### Caminho B — SQL Editor do painel

Sem CLI e sem senha do banco. Em *SQL Editor → New query*, cole e execute o
conteúdo de cada arquivo **na ordem numérica**:

```
supabase/migrations/00001_extensions_enums.sql
supabase/migrations/00002_profiles_auth.sql
supabase/migrations/00003_core_entities.sql
supabase/migrations/00004_operations.sql
supabase/migrations/00005_functions_views.sql
supabase/migrations/00006_rls.sql
supabase/migrations/00007_storage.sql
supabase/migrations/00008_indexes_constraints.sql
```

Cada arquivo pode ser executado mais de uma vez sem erro, então uma reexecução
por engano é inofensiva.

### Conferir se deu certo

Em *Table Editor* devem aparecer 15 tabelas e, em *Storage*, o bucket privado
`wata-watch-photos`. Ou rode no SQL Editor:

```sql
select count(*) as tabelas from pg_tables where schemaname = 'public';
select count(*) as views from pg_views where schemaname = 'public';
select count(*) as sem_rls from pg_tables
where schemaname = 'public' and not rowsecurity;
```

O esperado é 15 tabelas, 7 views e **zero** tabelas sem RLS.

### Dados de exemplo (opcional)

`supabase/seed.sql` cria um cenário fictício — dois fornecedores, dois clientes,
quatro relógios, uma reserva com sinal e uma venda. Não é dado real e não deve
ir para produção. Ele não faz nada se já houver relógios cadastrados.

## Comandos

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Serve o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sem emitir arquivos |
| `npm test` | Testes unitários, de componente e de banco (Vitest) |
| `npm run test:watch` | Vitest em modo observação |
| `npm run test:e2e` | Fluxos críticos no Playwright |
| `npm run db:types` | Regera `src/lib/types/database.ts` a partir das migrations |

O Playwright precisa dos navegadores instalados na primeira execução:

```bash
npx playwright install
```

## Estrutura

```
src/
  app/
    (auth)/            login, esqueci-senha, nova-senha
    (app)/             rotas autenticadas, envolvidas pelo AppShell
    auth/              route handlers de callback e confirmação
  components/
    ui/                componentes-base (Button, Input, Field, Alert...)
    layout/            AppShell, sidebar, header, navegação móvel
    domain/            componentes ligados às regras do negócio
  lib/
    supabase/          clients do browser, do servidor e do proxy
    auth/              camada de acesso a dados (DAL)
    actions/           Server Actions
    validations/       schemas Zod
    utils/             helpers puros
    types/database.ts  tipos gerados (não editar à mão)
  proxy.ts             renovação de sessão e proteção de rotas
supabase/
  migrations/          schema versionado, aplicado em ordem numérica
  seed.sql             dados fictícios, apenas para desenvolvimento
  config.toml          configuração da Supabase CLI
scripts/
  generate-database-types.mjs
tests/
  unit/                Vitest
  db/                  schema, RLS, constraints e fórmulas (Postgres em memória)
  e2e/                 Playwright
```

### Como o banco é testado

Os testes de `tests/db/` sobem um Postgres real em memória (PGlite, sem Docker),
aplicam as migrations de verdade e atacam as tabelas diretamente — ignorando
qualquer validação de interface. Rodam com o papel `authenticated`, que não é
dono das tabelas, então o RLS realmente vale: um teste que rodasse como
superusuário passaria mesmo com as políticas erradas.

Cobrem os cenários críticos da Seção 19.1: WATA-IDs distintos sob concorrência,
recusa de segunda reserva ativa, recusa de segunda venda do mesmo relógio,
repasse pendente que não mexe no caixa, idempotência do livro caixa e os três
modelos de lucro.

## Segurança

- `SUPABASE_SERVICE_ROLE_KEY` nunca é lida no cliente e não é necessária no fluxo
  normal. Quem autoriza acesso a dado é o RLS.
- Toda página autenticada chama `requireUser()`; o `proxy.ts` é apenas a primeira
  barreira. Layouts não re-renderizam a cada navegação, então a verificação fica
  junto do dado.
- Server Actions são endpoints públicos: cada uma valida sessão e entrada antes
  de tocar no banco.
- `?redirectTo=` aceita apenas caminhos internos, para não virar redirecionador
  aberto.
- Erros técnicos vão para o log do servidor; o usuário recebe mensagem objetiva.
- Falha de login não distingue senha errada de conta inexistente, e a recuperação
  de senha responde igual exista ou não a conta — evita enumerar e-mails.

## Deploy no Vercel

O repositório já está no GitHub, então o caminho mais curto é importar — sem CLI.

### 1. Importar o projeto

Em <https://vercel.com/new>, importe **`Watarelogios/ERP-WATA`**. O Vercel
detecta Next.js sozinho: não altere Build Command nem Output Directory.

### 2. Variáveis de ambiente

Ainda na tela de importação, em *Environment Variables*, adicione as três:

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | A mesma do seu `.env.local` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | A mesma do seu `.env.local` |
| `NEXT_PUBLIC_APP_URL` | `https://SEU-PROJETO.vercel.app` |

`SUPABASE_SERVICE_ROLE_KEY` **não deve ser adicionada**: o sistema opera com a
sessão do usuário e RLS, e essa chave ignora todas as políticas.

`NEXT_PUBLIC_APP_URL` precisa apontar para o domínio de produção — é ela que
monta o link dos e-mails de recuperação de senha. Apontando para `localhost`, o
e-mail chega com um link que só funciona na sua máquina.

### 3. Liberar as URLs no Supabase

Depois do primeiro deploy, com o domínio em mãos, vá em *Authentication → URL
Configuration* e:

- defina o **Site URL** como `https://SEU-PROJETO.vercel.app`;
- acrescente em **Redirect URLs**:

  ```
  https://SEU-PROJETO.vercel.app/auth/callback
  https://SEU-PROJETO.vercel.app/auth/confirm
  ```

Sem isso o login funciona, mas a recuperação de senha falha com "link inválido".

### 4. Conferir

Abra o domínio: deve cair em `/login`. Entre com o usuário criado no painel e
confirme que o dashboard carrega. Se aparecer "Configuração pendente" na tela de
login, alguma variável de ambiente não foi lida — revise o passo 2 e refaça o
deploy.

> Cada `git push` para `main` dispara um novo deploy automaticamente.

---

## Decisões técnicas

Registradas conforme a Seção 1 da especificação — pontos onde o documento deixava
espaço e uma escolha foi feita.

1. **`proxy.ts` em vez de `middleware.ts`.** O Next.js 16 renomeou a convenção; o
   runtime é sempre Node.js e não é configurável.

2. **`NEXT_PUBLIC_SUPABASE_ANON_KEY` aceita como alternativa.** A especificação
   pede `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (nomenclatura atual). Projetos
   criados antes da mudança expõem a chave como *anon key*, então ela funciona
   como fallback.

3. **shadcn/ui reimplementado, não instalado via CLI.** A especificação pede
   componentes "adaptados ao design WATA". Os componentes seguem as mesmas
   convenções (`cn`, `cva`, composição), sem trazer o tema padrão que teria de
   ser desfeito em seguida.

4. **Sem modo escuro.** A identidade é branco e grafite com destaque para as
   fotografias. O `prefers-color-scheme` do template inicial foi removido.

5. **Marca em texto, não em imagem.** Evita um asset binário antes de existir
   logo definitiva; o logo da loja é configurável na Fase 3.

6. **Barra inferior com quatro atalhos + "Mais".** Dashboard, Estoque, Vendas e
   Financeiro ficam diretos; os demais módulos abrem em painel. O botão de ação
   central entra na Fase 3, junto com `/estoque/novo`.

7. **`await cookies()` antes de validar o ambiente.** Marca a rota como dinâmica
   antes de qualquer erro possível, para que o build não tente pré-renderizar
   telas que dependem de sessão.

8. **Fuso `America/Recife` só na exibição.** A persistência continua em
   `timestamptz`.

9. **Dois enums a mais que a Seção 9.** `supplier_relation` e
   `credit_movement_type` cobrem `suppliers.tipo_relacao` e
   `customer_credit_movements.tipo`, que a Seção 10 cita sem listar valores. A
   Seção 8 proíbe texto livre para status.

10. **`financial_category` separado de `expense_category`.** O livro caixa
    também recebe entradas (venda, sinal, sinal retido) e a devolução de sinal é
    uma saída que não é despesa operacional. Um check garante que a categoria
    combine com a direção do lançamento.

11. **`next_wata_id()` fica na migration 00001.** A Seção 8.1 coloca funções na
    00005, mas `watches.wata_id` usa a função como `DEFAULT`: ela precisa existir
    antes da tabela.

12. **`saldo_restante` é coluna gerada.** A Seção 10.4 pede o campo e a Seção 5.1
    proíbe total duplicado que possa divergir. `GENERATED ALWAYS` atende aos dois.

13. **`lucro_bruto` e `lucro_liquido` são mantidos por trigger.** Mesmo conflito:
    as colunas existem como a Seção 10.4 pede, mas quem as escreve é o banco, a
    cada mudança em despesa vinculada ou no valor da venda.

14. **Despesas `PURCHASE` e `PAYOUT` não reduzem o lucro do item.** O custo de
    aquisição já entra como `valor_compra` e o repasse já está embutido no lucro
    bruto da consignação — contá-los de novo subtrairia duas vezes. Há teste
    para os dois casos.

15. **`settings.dias_estoque_parado`.** A Seção 14 fala em "itens parados acima
    do limite configurado" sem dizer onde configurar; virou coluna de settings,
    com padrão de 90 dias.

16. **Testes de banco com PGlite, não Docker.** Sobe um Postgres real em memória
    e aplica as migrations de verdade. Sem isso não haveria como verificar RLS,
    constraints e fórmulas nesta máquina.

17. **Tipos gerados a partir das migrations.** `npm run db:types` introspecta o
    schema montado pelas próprias migrations, sem precisar de credenciais. Depois
    do `supabase link`, `supabase gen types` passa a ser a fonte canônica.

## Pendências reais

- **Nenhuma tela foi aberta em navegador com dados reais durante o
  desenvolvimento.** A cobertura é forte na camada de dados — 207 testes,
  incluindo RLS, constraints e as seis operações transacionais — e o build passa,
  mas isso não substitui percorrer os fluxos na interface. O primeiro uso real é
  também a primeira validação visual.
- **E2E não cobre fluxo autenticado.** A suíte do Playwright testa proteção de
  rotas e validação de formulário sem sessão. Cobrir login, compra, reserva e
  venda exige um usuário de teste dedicado, que não foi criado para não misturar
  dado de teste com o projeto de produção.
- **`npm audit` reporta 3 vulnerabilidades altas** em `postcss` e `sharp`, ambas
  dependências transitivas do próprio Next.js 16.2.12. Não há correção sem
  esperar uma atualização do Next; nenhuma é acionável pelo código da aplicação.
- **O projeto está dentro do OneDrive.** A sincronização às vezes trava arquivos
  em `.next` e faz o build falhar com `EPERM`. `rm -rf .next` resolve.
