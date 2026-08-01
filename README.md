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
| 3. Cadastros | Configuração, clientes, fornecedores e estoque com fotos | Próxima |
| 4. Compras | Oportunidades e RPC de confirmação | Pendente |
| 5. Reservas | Sinal, validade, cancelamento e créditos | Pendente |
| 6. Vendas | Venda própria/consignada, custos, lucros e payout | Pendente |
| 7. Financeiro | Livro caixa, filtros, estornos e repasses | Pendente |
| 8. Dashboard | Views, métricas, gráficos e alertas | Pendente |
| 9. Qualidade | E2E, acessibilidade, responsividade, README e build | Pendente |

As rotas de todos os módulos já existem e já estão protegidas. Cada uma informa
na tela em qual fase passa a persistir dados — nenhuma simula funcionalidade que
ainda não existe.

### O que a Fase 1 entregou

- Login por e-mail e senha com sessão em cookies `httpOnly` (Supabase Auth + SSR).
- Recuperação de senha: solicitação por e-mail, confirmação do link e nova senha.
- Proteção de rotas no `proxy.ts` com renovação de sessão a cada requisição.
- Camada de acesso a dados (`requireUser`) usada em toda página autenticada.
- AppShell: sidebar fixa no desktop, header e barra inferior no celular.
- Design tokens branco/grafite, fonte Inter e estados de carregamento/erro/vazio.
- 20 testes unitários e de componente; suíte E2E de proteção de rotas.

### O que a Fase 2 entregou

- 8 migrations SQL versionadas: 15 tabelas, 15 enums, 7 views, funções e índices.
- RLS ativo em toda tabela, com política `owner_id = auth.uid()` e `WITH CHECK`.
- Bucket privado `wata-watch-photos` com políticas por pasta do usuário.
- WATA-ID gerado no banco, único e imutável.
- Fórmulas de lucro dos três modelos (próprio, consignado fixo, percentual),
  mantidas por trigger para não divergirem das despesas.
- Tipos TypeScript gerados a partir das próprias migrations (`npm run db:types`).
- Seed opcional com dados fictícios, separado de produção.
- 75 testes de banco rodando contra um Postgres real em memória.

> **As migrations ainda não foram aplicadas ao seu projeto Supabase.**
> Veja [Aplicar as migrations](#aplicar-as-migrations).

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

## Deploy

Qualquer plataforma compatível com Next.js 16. Configure as variáveis de ambiente
do `.env.example` (sem `SUPABASE_SERVICE_ROLE_KEY`, salvo necessidade real),
aponte `NEXT_PUBLIC_APP_URL` para o domínio de produção e inclua as URLs de
callback nas *Redirect URLs* do Supabase.

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

- **As migrations ainda não foram aplicadas ao projeto hospedado.** O schema está
  pronto e testado, mas depende de uma ação manual — veja
  [Aplicar as migrations](#aplicar-as-migrations).
- **RPCs transacionais ainda não existem.** Confirmar compra, criar reserva,
  concluir venda e pagar repasse (Seção 13) entram nas Fases 4, 5 e 6, cada uma
  como migration adicional. O schema já tem as constraints que essas operações
  vão precisar.
- **E2E não cobre login autenticado.** Falta um usuário de teste; entra quando as
  migrations estiverem aplicadas. Hoje cobre proteção de rotas e validação.
- **`npm audit` reporta 3 vulnerabilidades altas** em `postcss` e `sharp`, ambas
  dependências transitivas do próprio Next.js 16.2.12. Não há correção sem
  esperar uma atualização do Next; nenhuma é acionável pelo código da aplicação.
