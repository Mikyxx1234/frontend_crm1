# Decisões Estruturais — CRM EduIT (Frontend)

Registro de decisões técnicas que afetam estrutura do projeto. Cada entrada
documenta **por que** algo foi feito, não **o que**.

---

### 2026-05-27 — Exclusão em massa na lista de leads

**Decisão.** Adicionada barra flutuante de ações em massa em
`(dashboard)/contacts/client-page.tsx`. Quando `selected.size > 0`,
aparece no rodapé com "N selecionado(s)" + botões "Limpar" e
"Excluir". A mutation `bulkDeleteMutation` dispara DELETEs em
paralelo com concorrência limitada (5 workers) e agrega
sucesso/falha por id pra feedback diferenciado (`toast.success`
quando todos OK, `toast.warning` quando parcial, `toast.error`
quando nenhum saiu).

**Contexto.** Operador relatou: "essa página de contacts precisa
ter opção de excluir em massa, não tem essa opção". A
infraestrutura de seleção múltipla (checkbox no header + linha,
estado `selected: Set<string>`) já existia mas era usada só pra
destaque visual — não tinha botão pra agir nos selecionados.

**Alternativas descartadas.**

- **Endpoint `DELETE /api/contacts?ids=...` em massa no backend.**
  Mais eficiente (1 request, transação no banco), mas envolve
  endpoint novo e mudança no service. Como o caso de uso é
  pontual (operador limpando 10-50 leads de cada vez) e o DELETE
  individual já funciona, paralelizar 5x no front é suficiente.
- **Barra de ações no header em vez de flutuante.** Quebra menos
  o layout mas força scroll-pra-cima quando o operador seleciona
  itens da última página. Flutuante (`fixed bottom`) fica sempre
  visível, padrão de UX comum em listas (Gmail, Notion, Linear).

**Impacto.** Operador agora seleciona múltiplos leads e excluí
de uma vez com 1 confirmação. O endpoint individual continua
sendo a fonte da verdade — bulk delete só orquestra. Falhas
parciais ficam visíveis no toast (com contagem). Backend não
mudou.

---

### 2026-05-27 — Exclusão de contato sem bloqueio por `dealCount`

**Decisão.** Em `app/(dashboard)/contacts/client-page.tsx`, removido o
early-return com `toast.warning` quando `c.dealCount > 0`. O confirm
dialog agora avisa explicitamente que "os N negócios vinculados
permanecerão no kanban, porém sem contato associado" — operador segue
confirmando uma vez e a exclusão prossegue.

**Contexto.** Operador pediu: "quero excluir o lead independente se
tem lead ou não". Backend foi ajustado em paralelo (ver AGENT.md
backend). O bloqueio era frontal — frontend não chegava nem a chamar
o DELETE, mostrava warning amarelo. UX ficava confusa: operador via
"tem N negócios" mas não tinha caminho pra resolver na própria tela
de contatos.

**Alternativas descartadas.**

- Botão "Excluir + transferir negócios pra outro contato": resolve mas
  exige fluxo de seleção. Operador não pediu isso.
- Confirmar duas vezes (1ª: aviso, 2ª: confirma): atrito sem benefício
  prático — a confirmação já está sendo destrutiva ("Excluir" em
  vermelho).

**Impacto.** Operador consegue limpar leads imediatamente. Quem clica
"Excluir" no confirm agora vê os deals sumirem do contato (mas
permanecerem no kanban como "contato removido").

---

### 2026-05-27 — Condição "Tem a tag" + lista de automações em tabela

**Decisão.** Dois ajustes coordenados em automações:

1. **Condição de tag.** `automation-condition.ts` ganhou os ops
   `has_tag` / `not_has_tag` (espelhados do backend). Em
   `step-config-panel.tsx`: novos campos `contact.tags` / `deal.tags`
   nos `CONDITION_FIELD_GROUPS`, helper `opsForField` que filtra os
   operadores válidos pro campo selecionado (campos de tag → só
   `has_tag` / `not_has_tag` / `empty` / `not_empty`; demais campos
   escondem os ops de tag), e `TagPickerValue` puxando `/api/tags` pra
   listar as tags da org num dropdown. Trocar de campo dentro de uma
   rule reseta o op e o value se o op anterior não for válido pro
   novo campo (evita configs inválidas tipo "tags eq 5"). O resumo
   do nó (`summarizeConditionConfig`) ganhou formatação amigável pros
   ops de tag — "tem tag X" em vez de "contact.tags has_tag X".
2. **Lista de automações em tabela.** `automations/client-page.tsx`
   trocou o grid de Cards (2 colunas) por uma `Table` com colunas
   Automação / Gatilho / Passos / Atualizada / Status. O
   `ActiveSwitch` ficou na coluna Status pra toggle in-place sem
   abrir o detalhe — comportamento idêntico ao card anterior. Indicador
   de estado virou uma "bolinha" colorida ao lado do nome (verde =
   ativa, cinza = inativa).

**Contexto.** O operador pediu textualmente duas coisas:
- "Se tem TAG x adicionada ou não" como condição.
- "As automações ficarem em lista, estão em cards" (cards são pouco
  densos quando passam de ~6 automações).

**Alternativas descartadas.**

- **Filtragem por tag dentro do ConditionFieldPicker em vez de
  `opsForField`.** Manteria os 11 ops genéricos visíveis sempre e o
  usuário tentaria coisas como `tags = "VIP"` que silenciosamente não
  funcionariam (o evaluator espera array no left). Filtrar os ops no
  select é proteção UX direta.
- **Salvar o array completo de tags como rule.value.** Permitiria "tem
  qualquer uma destas tags" (OR), mas adiciona complexidade tanto no
  picker (multi-select) quanto no evaluator. Mantemos 1 tag por rule;
  pra "OU" o operador adiciona outra branch (o engine já suporta
  multi-branch nativamente).
- **DataTable virtualizada (TanStack Table) em vez da `Table`
  semântica.** Overkill — 100 automações por org no caso de uso real;
  paginação no servidor (já existente, `perPage=12`) resolve.

**Impacto.** Configurações de condition antigas funcionam intactas; o
novo op `has_tag` aparece nas opções, mas só dispara filtragem ativa
quando o campo selecionado é `contact.tags` ou `deal.tags`. A lista
em tabela é puramente cosmética — mesmas queries, mesmos endpoints.

---

### 2026-05-27 — Gatilhos de automação editáveis + filtros de pipeline/estágio

**Decisão.** Três mudanças coordenadas na parte de automações
(`src/components/automations/`):

1. **`trigger-config-fields.tsx` reescrito** com dropdowns reais de
   pipeline/estágio (puxando `/api/pipelines` via react-query) ao invés
   dos inputs de texto livre antigos. Os dropdowns são compartilhados
   por `stage_changed`, `deal_created`/`won`/`lost`, `contact_created` e
   `message_received`/`message_sent`. Quando o operador escolhe um
   estágio, o `pipelineId` correspondente é preenchido automaticamente
   pra manter os filtros consistentes.
2. **Nó do gatilho clicável** no canvas (`workflow-canvas.tsx` +
   `trigger-node.tsx`). Antes o `onNodeClick` filtrava o
   `TRIGGER_ID` e ficava inerte — o operador não descobria que dava pra
   editar. Agora dispara `onTriggerClick` (callback prop): no
   `/automations/new` volta pro passo 2 do wizard, no
   `/automations/[id]` abre o Config dialog (que já existia mas só era
   acessível via ícone de engrenagem). Pílula "Editar" visível no
   hover reforça a descoberta.
3. **`automation-workflow.ts`**: `defaultTriggerConfig` agora inclui
   `stageId` nos gatilhos suportados e `summarizeTriggerConfig` mostra
   o nome do estágio/pipeline (via lookup) no resumo do nó.
   `workflow-canvas.tsx` foi ajustado pra incluir nomes de pipelines
   no `stageNameLookup` (antes só tinha nomes de estágios).

**Contexto.** O operador relatou:
- "Não consigo editar depois de colocar o fluxo." Era falsa percepção:
  o `[id]` page já tinha um Config dialog (gear icon), mas o nó do
  gatilho no canvas era inerte, induzindo a achar que estava bloqueado.
- "Precisava ter gatilho de mensagem recebida em X estágio, quando lead
  e/ou contato for criado em X estágio." O backend já enriquecia o
  contexto, mas a UI só expunha um campo de canal. Os inputs de
  estágio existentes (em `stage_changed`) eram free-text — o operador
  precisava copiar UUIDs do banco.

**Alternativas descartadas.**

- **Página dedicada `/automations/[id]/edit` separada do detail.** Mais
  consistente com o resto do app mas exige duplicar o canvas + form +
  toda a lógica de save. O Config dialog atual já cobre os campos e
  evita esse retrabalho — só faltava torná-lo descobrível.
- **Inputs de UUID em todos os triggers (sem dropdown).** Mantém
  consistência com a UX antiga mas é hostil — UUIDs não são
  memorizáveis. Reutilizamos o padrão de dropdown que já existe no
  `step-config-panel.tsx` pra `move_stage`/`create_deal` (mesma query
  key `pipelines-for-trigger` pra aproveitar o cache do react-query).
- **Fetch de pipelines no parent e drilldown via prop.** Mais
  performático em teoria, mas o overhead extra é mínimo (cache de 60s)
  e o componente fica auto-contido — qualquer page nova que use
  `TriggerConfigFields` funciona sem setup adicional.

**Impacto.** Automações antigas continuam funcionando: os campos
`pipelineId`/`stageId` em `contact_created` e `message_*` são
opcionais (default `""` = não filtra). O canvas continua usando o
`stageNameLookup` legado pros nodes existentes (`move_stage`, etc.) —
só ganhou pipelines no mapa.

---

### 2026-05-22 — Seleção em massa no Kanban (compartilhada com a Lista)

**Decisão.** A seleção múltipla de deals e a `BulkActionsBar` que antes
existiam só na view Lista agora funcionam também no Kanban. O estado de
seleção (`selectedDeals: Set<string>` no `client-page.tsx`) é o MESMO
para ambas as views — seleções persistem ao alternar Lista ↔ Kanban. A
`BulkActionsBar` flutuante já era montada globalmente; só falta UI de
seleção no card do Kanban, que foi adicionada via checkbox `hover-only`
no canto superior esquerdo.

**Contexto.** Toda a infraestrutura assíncrona (BullMQ + `BulkOperation`
+ `BulkOperationProgressDialog`) já estava ligada à `BulkActionsBar` da
Lista. Restringir bulk operations à Lista era artificial — o Kanban é a
view mais usada do CRM e o usuário precisava trocar de view só pra
mover/etiquetar 50+ deals de uma vez. Mantemos drag-and-drop individual
intacto (uma das principais affordances do Kanban) e adicionamos
seleção como camada **aditiva**, não substitutiva.

**Como ficou estruturado.**

- `src/components/pipeline/kanban-card.tsx` — recebe `isSelected` +
  `onToggleSelect` opcionais. Adiciona `<input type="checkbox">` à
  esquerda do grip de drag (ocupa largura fixa pra evitar layout shift
  em hover). Visual: `opacity-0 group-hover:opacity-100` quando não
  selecionado, `opacity-100` permanente quando selecionado. Card
  selecionado ganha borda primary + ring sutil + bg `primary/5` (DNA
  visual consistente). `stopPropagation` em `onMouseDown` + `onClick`
  do checkbox/label garante que o evento não vaza pro card (abriria o
  `DealWorkspace`) nem interfere no `@hello-pangea/dnd`.
- `src/components/pipeline/kanban-column.tsx` — recebe `selectedDeals`
  + `onSelectionChange`. Calcula `selectedInColumnCount` (intersecção
  com os deals CARREGADOS na coluna). Header da coluna ganha um
  botão-ícone discreto à esquerda do nome da etapa: `Square` quando
  nenhum selecionado, `CheckSquare` quando todos da coluna marcados,
  toggle "selecionar todos N visíveis ↔ limpar todos da etapa". Quando
  há seleção parcial, um pill `primary/15` ao lado do contador total
  mostra `N selecionados` — feedback claro sem invadir layout.
- `src/components/pipeline/kanban-board.tsx` — passthrough de
  `selectedDeals` + `onSelectionChange` pras colunas. Zero alteração
  na lógica de DnD (drag individual + drag-to-delete intactos).
- `src/app/(dashboard)/pipeline/client-page.tsx` — REMOVIDO o
  `setSelectedDeals(new Set())` que limpava a seleção ao trocar pra
  Kanban (era workaround pra view sem suporte). Mantido o reset ao
  trocar pra Pipeline Ágil (saleshub), que é fila de atendimento e
  não tem checkbox.

**Alternativas descartadas.**

- **Modo "seleção" toggle global (estilo Trello).** Botão na toolbar
  ativa modo seleção; checkboxes aparecem em todos os cards; drag
  desabilita. Mais explícito mas com 2 cliques a mais (ativar +
  selecionar). Optei por `hover-only` (decisão do usuário) — mais
  enxuto pra o caso comum.
- **Shift+click pra range-select.** Recurso power-user clássico, mas
  como o Kanban tem deals em colunas distintas, "range" entre colunas
  ficaria ambíguo. Adiável.
- **Drag em massa (arrastar vários cards juntos).** `@hello-pangea/dnd`
  não suporta nativamente. Implementar exigiria custom drag preview +
  bloqueio do `Draggable` original em "ghost". Fora de escopo:
  bulk-move via `BulkActionsBar` cobre o mesmo caso de uso (mover N
  deals pra outra etapa) com fluxo assíncrono já testado.
- **Persistir seleção entre sessões (localStorage).** Inicialmente
  considerei. Mas como a seleção é volátil por natureza (depende dos
  deals visíveis no momento), persistir só geraria confusão com deals
  apagados/movidos. Sessão > sessão é o padrão correto.

**Impacto em outras telas.** Nenhum. A `BulkActionsBar` já estava
montada globalmente no `client-page` e agora atende as duas views
sem condicional adicional. O hook `useBulkOperation` e o
`BulkOperationProgressDialog` continuam idênticos.

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
