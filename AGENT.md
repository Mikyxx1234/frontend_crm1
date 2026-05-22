# Decisões Estruturais — CRM EduIT (Frontend)

Registro de decisões técnicas que afetam estrutura do projeto. Cada entrada
documenta **por que** algo foi feito, não **o que**.

---

### 2026-05-22 — UI de progresso de operações em massa (BulkOperation)

**Decisão.** Quando o backend de `POST /api/deals/bulk` (ação
`move_stage`) responde **202** com `{ operationId, total }`, o frontend
abre um `BulkOperationProgressDialog` que faz polling em
`GET /api/bulk-operations/[id]` via o hook `useBulkOperation` até o
status terminal (COMPLETED/PARTIAL/FAILED/CANCELLED). Para 200 (sync)
mantemos o toast original `"X negócios atualizados"`. Nenhum endpoint
do backend mudou de URL; apenas observamos o `res.status` para
discriminar `sync` vs `async`.

**Contexto.** O backend introduziu um worker dedicado (`leads-worker`)
que processa lotes grandes (>50 deals ou `async: true` explícito) em
segundo plano com persistência de progresso em Postgres
(`BulkOperation`). Sem UI, o usuário não tem retorno visual: o `fetch`
retorna 202 quase imediatamente e o board não muda até o worker
terminar (segundos a minutos). O polling no Postgres é mais simples
que SSE/WebSocket pra esse caso porque já temos `react-query`
configurado globalmente, a frequência (2s) é baixa, e o status fica
disponível mesmo se o user fechar a aba e voltar.

**Como ficou estruturado.**

- `src/hooks/use-bulk-operation.ts` — hook único, polling 2s com
  `refetchInterval` que se desliga automaticamente em status terminal.
  Reaproveita cache do react-query por `operationId`. Exporta os types
  canônicos (`BulkOperationStatus`, `BulkOperationStatusResponse`)
  alinhados ao shape do backend (não importa Prisma client no frontend).
- `src/components/pipeline/bulk-operation-progress-dialog.tsx` —
  componente glass reutilizável (qualquer feature que enfileire
  `BulkOperation` pode usá-lo). Recebe `operationId | null`, dispara
  `onFinished(data)` UMA vez ao terminar, e gera toasts apropriados
  (success/warning/error/info) conforme status final. Se o user fechar
  antes de terminar, mostra toast `"continua em segundo plano"`.
- `src/components/pipeline/bulk-actions-bar.tsx` — único ponto que
  consome o dialog hoje. A função `bulkAction()` agora retorna um
  union discriminado `{ kind: 'sync' | 'async' }` e o
  `onSuccess` da mutation decide entre toast direto ou abrir o modal.
  Caso 503 (Redis offline mas BulkOperation criada) também abre o
  modal — o primeiro poll já vai mostrar FAILED + razão.

**Alternativas descartadas.**

- **SSE/WebSocket pra progresso.** Mais reativo, mas exige novo
  endpoint no backend + tratamento de reconexão + `eventsource` lib.
  Polling de 2s é "good enough" pro caso de uso (operações típicas
  duram poucos segundos) e o React Query já cuida de pausar em
  background tab, cache, retry e dedup.
- **Componente "global" tipo `<BackgroundJobsProvider>` montado no
  layout do dashboard com lista persistente de jobs.** Plano legítimo
  pra fase 2 (centro de notificações, histórico de jobs), mas hoje só
  temos UM consumidor (a `BulkActionsBar`) e MUITAS feature flags
  ainda não decididas (mostra jobs de outros usuários? agrupar por
  tipo? push notification?). Manter o dialog local evita over-engineering.
- **Misturar progresso na `BulkActionsBar` existente (sem modal).**
  Conflita com seleção (a barra some quando `selectedCount=0` —
  isso acontece imediatamente no `onSuccess` async, então a barra
  desapareceria carregando o progresso "no nada"). Modal separado é
  mais limpo: a barra some, o user vê o modal acompanhando o trabalho.
- **Forçar `async: true` em TODOS os bulks (uniformizar fluxo).**
  Quebraria UX pra ações pequenas (3-5 deals) que hoje retornam em
  <200ms — pra elas o roundtrip extra do polling é pior que o toast
  direto. O threshold (>50 deals) do backend respeita isso.

**Impacto.**

- Zero mudança em `next.config.ts` (catch-all `/api/:path*` já cobre
  `/api/bulk-operations/[id]` e `/api/deals/bulk/custom-fields`).
- Zero mudança em `providers.tsx` (`QueryClient` global já existente
  serve o hook).
- O hook e o dialog estão prontos pra serem reusados quando a UI de
  bulk de campos personalizados (`POST /api/deals/bulk/custom-fields`)
  for implementada — basta `setProgressOperationId(resp.operationId)`.
- Operações de move_stage com até 50 deals continuam síncronas (toast
  imediato). Acima de 50, modal abre automaticamente.

---

### 2026-05-19 — Visual refresh glassmorphism via remap de tokens

**Decisão.** Reskin completo do CRM seguindo o design system
`design-system-crm.html` (glassmorphism-first, brand `#5b6ff5`, mesh
`#dde8f5 → #b8cfec → #e8d5f0`, Plus Jakarta Sans + DM Sans). O caminho
foi **trocar o conteúdo dos tokens** do `@theme` em
`src/app/globals.css` em vez de reescrever componentes. Como o app já
estava todo em Tailwind v4 + tokens semânticos (`bg-card`,
`bg-sidebar`, `border-border`, `--color-primary`, etc.), mudar o valor
das variáveis cascateou automaticamente para os 25+ primitivos em
`src/components/ui/` e para o resto do app sem tocar em lógica.

Mudanças concretas:
- Remap completo do `@theme` (brand, surfaces, borders, radius,
  sombras) + adição de tokens glass (`--glass-bg*`, `--glass-blur*`,
  `--glass-shadow*`) e utilities `.glass-strong`, `.glass-overlay`,
  `.glass-subtle`.
- `body { background: linear-gradient(...) ; background-attachment: fixed }`
  com o mesh — todo o app passa a ter o fundo glass por padrão.
- Polimento manual em ~8 componentes de alto impacto visual:
  `dashboard-shell` (aside, mobile bars, popovers), `Button`,
  `Card`, `Input`, `Badge`, `Dialog`, `PageHeader`, `Tabs`,
  `widget-card`, `kanban-column`, `kanban-card`, `conversation-list`,
  `conversation-header`. O `chat-window` se atualiza sozinho via
  `--chat-bubble-sent-bg` (gradient brand).
- `src/app/layout.tsx`: troca de `Outfit` (next/font) por
  `Plus_Jakarta_Sans` + `DM_Sans`. `themeColor` ajustado para
  `#dde8f5` para combinar com a barra de URL do Chrome Android.

**Contexto.** O usuário pediu uma grande atualização visual com a
restrição absoluta de "não mexer em endpoints, payloads, autenticação,
rewrites ou nada do backend". O projeto já tinha um design system
"Lumen" funcional baseado em tokens — reaproveitar essa infraestrutura
deu ~60% do impacto visual mudando 1 arquivo (`globals.css`) e os
outros 40% vieram de polimentos pontuais nos componentes mais
visíveis. Sem dependências novas (fontes via `next/font/google`,
zero pacote adicionado em `package.json`).

**Alternativas descartadas.**

- **Reescrever os componentes de UI usando classes Tailwind explícitas
  glass (ex.: `bg-white/40 backdrop-blur`).** Funcionaria, mas
  duplicaria informação que já mora nos tokens — qualquer ajuste
  futuro (ex.: trocar opacidade de 40% para 35%) viraria
  find-and-replace por dezenas de arquivos. Manter os tokens como
  fonte única significa que ajustes finos são one-liners.
- **Criar componentes novos (`GlassCard`, `MetricCard`, `LeadCard`).**
  O plano original sugeria, mas o sistema atual já tem `<Card>`,
  `<WidgetCard>`, `<KanbanCard>` etc. cumprindo esses papéis. Criar
  paralelos duplicaria abstrações e exigiria refatorar todos os
  consumidores. Polimos os existentes em vez disso.
- **Aplicar dark mode redesenhado com a mesma intensidade.** O design
  system fornecido é light-first. Mantivemos dark mode funcional (com
  remap dos tokens e gradient mesh escuro próprio) mas não há a mesma
  fidelidade visual — trade-off explícito documentado no plano.
- **Importar fontes só via `@import url(...)` em `globals.css`.**
  Funciona mas tem FOUT (Flash of Unstyled Text) em SSR. Usar
  `next/font/google` faz bundling local + preload + zero FOUT no
  primeiro paint. O `@import` ficou como fallback.

**Impacto.**

- Zero alteração em `next.config.ts`, `middleware.ts`, `src/lib/api.ts`,
  `src/lib/auth-public.ts`, `src/services/**`, providers, queries
  do react-query, payloads, ou qualquer chamada de rede. Verificado
  com `git diff` (mudanças concentradas em CSS + props de className).
- Build passou (`next build`) em 54 rotas com exit code 0; sem novos
  erros de TS/Tailwind. Warnings de `jose/CompressionStream` em Edge
  Runtime são pré-existentes (origem em `next-auth/jose`).
- Para introduzir novas telas: usar `<Card>`, `<Button variant="glass">`,
  `<Badge variant="lead">`, ou as utilities `.glass`, `.glass-strong`,
  `.glass-overlay`, `.glass-subtle` em vez de classes Tailwind brutas.
- Para alinhar telas legadas que ainda não foram polidas: trocar
  `bg-white` por `bg-white/40 backdrop-blur` + `border-white/55`, e
  `rounded-xl` por `rounded-[22px]`. Os tokens `bg-card`,
  `border-border`, `text-foreground` já apontam para os valores glass.

---

### 2026-05-14 — `apiUrl()` retorna sempre path relativo

**Decisão.** `src/lib/api.ts > apiUrl(path)` retorna sempre `path` relativo
(`/api/...`), **nunca** prefixa com a URL absoluta do backend. O proxy
acontece exclusivamente via `rewrites()` do `next.config.ts`. A função
`getApiBaseUrl()` ainda existe e expõe o backend absoluto, mas só deve ser
usada em casos pontuais que **exijam** absoluto (SSE de origem cross-site
explícita, integrações OAuth com redirect_uri, etc.) — em chamadas comuns
de cliente, é proibido.

**Contexto.** Frontend (`banco-frontend-crm.6tqx2r.easypanel.host`) e
backend (`banco-backend-crm.6tqx2r.easypanel.host`) rodam em **subdomínios
diferentes** do mesmo apex. Como os cookies do NextAuth são emitidos com
`SameSite=Lax` (default seguro), eles **não** acompanham `fetch` cross-site
disparado do navegador. Sintomas observados:

- `fetch("https://banco-backend-crm.../api/companies")` saía sem cookie
  → backend respondia `401` → UI mostrava "Failed to fetch" / dashboard
  em branco.
- O preflight CORS também batia, exigindo backend respondendo
  `Access-Control-Allow-Origin` + `Allow-Credentials` em todos os endpoints
  (manutenção custosa) e ainda assim o `Lax` matava o cookie.

Com `apiUrl()` relativo, a chamada do navegador vai pro **próprio domínio
do frontend** (`/api/companies`), o Next.js Edge proxy aplica o rewrite
de `next.config.ts` e encaminha server-to-server pro backend. Cookie do
NextAuth viaja normalmente porque é same-origin.

**Alternativas descartadas.**

- **Liberar CORS no backend + `credentials: "include"` + `SameSite=None`.**
  Funciona, mas exige cookie `SameSite=None; Secure` (mais permissivo), e
  todo endpoint do backend precisa ecoar `Access-Control-Allow-Origin`
  específico (não pode ser `*` com credentials). Mais código, mais
  superfície, e o cookie `Lax` que o NextAuth emite por padrão é mais
  resistente a CSRF.
- **Mesmo subdomínio com path-prefix (`/api` no frontend → backend).** É
  basicamente o que `rewrites()` já faz, mas exigia tirar o backend do
  Easypanel como serviço separado — perderíamos a flexibilidade de
  escalar/derrubar backend isoladamente.

**Impacto.**

- Toda chamada de cliente passa por `next.config.ts > rewrites()`. Se um
  endpoint do backend não está mapeado lá, ele não é acessível pelo
  frontend. Checar `rewrites()` ao adicionar nova rota.
- SSE/WebSocket que dependem de keep-alive longo: validar caso a caso se
  o proxy do Next.js segura sem timeout.

### 2026-05-14 — Domain do Easypanel mapeia para porta 3000 (não 80)

**Decisão.** No serviço do frontend no Easypanel, **Domain → Service
Port** deve ser `3000`. Nada de `PORT=80` no env do container.

**Contexto.** O `Dockerfile` do frontend faz `EXPOSE 3000` e o `server.js`
do Next.js standalone faz bind em `PORT || 3000`. Quando alguém setava
`PORT=80` no env do Easypanel (achando que o Traefik precisava de 80), o
Next.js subia em `http://0.0.0.0:80` dentro do container — mas o Traefik
do Easypanel encaminha para a `Service Port` configurada (3000 por
default). Resultado: HTTP 502 / "Service is not reachable", e nos logs só
aparecia `Ready in 147ms` (porque o app subiu de fato, só não na porta
certa).

**Alternativas descartadas.**

- **Trocar `EXPOSE` no Dockerfile + Service Port pra 80.** Funciona, mas
  contraria a convenção universal "container web app = porta 3000" e
  confunde quem for clonar o repo localmente.

**Impacto.** Documentado também no README do repo. Se aparecer 502 num
serviço Next no Easypanel, primeira coisa a checar é Service Port =
3000.

### 2026-05-14 — `NEXTAUTH_URL` é o domínio público do **frontend**

**Decisão.** A env `NEXTAUTH_URL` deve apontar para o domínio público
**onde o usuário digita a URL no browser** — o frontend. Tanto no
serviço do frontend **quanto** no serviço do backend.

**Contexto.** O backend separado só serve API e roda
`next-auth/middleware` em rotas `/api/auth/*`. Quando o NextAuth gera
URLs absolutas (callback, signin, signout, e os próprios cookies via
`useSecureCookies = NEXTAUTH_URL.startsWith("https://")`), ele usa
`NEXTAUTH_URL`. Se o backend tem `NEXTAUTH_URL=https://banco-backend...`,
o cookie sai com domínio errado e o redirect pós-login leva pra dentro
do backend, fora do contexto de UI. Setando ambos os serviços para
`NEXTAUTH_URL=https://banco-frontend-crm.6tqx2r.easypanel.host`, o
NextAuth do backend gera cookies/redirects coerentes com onde o usuário
está navegando — e o rewrite do frontend pro backend não muda o
`Host` header relevante para o NextAuth.

**Alternativas descartadas.**

- **`NEXTAUTH_URL` do backend = domínio do backend.** Cookie sai com
  `Set-Cookie: Domain=banco-backend-crm...`, navegador o associa a um
  origin que o middleware do frontend nunca consulta.

**Impacto.** Documentar no README. Para um cliente final que rodar em
domínio próprio (ex.: `crm.minhaescola.com.br` no front e
`api.minhaescola.com.br` no back), `NEXTAUTH_URL` continua sendo o
**frontend** em ambos os serviços.

---
