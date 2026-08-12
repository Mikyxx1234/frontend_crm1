# Auditoria de rede — CRM prod (12/ago/2026)

Base: https://frontend-front.v74knz.easypanel.host — Playwright headless, viewport 1600×950.
Evidência bruta: `perf-network-report.json` (fluxos principais), `perf-network-report-inbox.json` (tabs/loop), `perf-network-report-conv.json` (abrir conversa), probe SSE de 20s.

## Totais por fluxo (somente /api/)

| Fluxo | Reqs | Janela | Bytes aprox. | Achados |
|---|---|---|---|---|
| Login | 4 | 1.2s | — | ok |
| Inbox (carga fria) | 28 | 15s | ~450KB | 5× counts, 4× lista, 2× SSE, 2× preferences, 2× settings/org, 404 sip |
| Abrir conversa (SPA) | 52 | 6s | **~9,6MB** | mídia histórica baixada em massa; áudios 3-5× |
| Troca de aba | 6–12 | 6s | ~150KB | lista da aba em ~170ms, mas loop SSE continua (5× lista+counts/6s) |
| Pipeline kanban (carga fria) | 27 | 15s | **~3MB** | board 887KB ×3, 2× SSE, 2× preferences, 2× settings/org |
| Abrir deal (kanban) | 14 | 12s | **~2,7MB** | board 887KB ×3, +2 SSE (4 total), POST create 2s, messages 4.4s |
| Flow (carga fria) | 56 | 15s | ~2,5MB | 3× SSE, ~20 mídias 1,9MB, deal auto-aberto |
| Abrir deal (flow) | 25 | 12s | ~3,5MB | board ×3, mesma mídia 2-3× (206) |

---

## P0-1 — Loop de invalidação SSE refaz lista+counts do inbox a cada ~1,5s

**Evidência:** 10× `GET /api/conversations?perPage=60&tab=esperando` (~35KB) + 10× `GET /api/conversations?counts=1` em 24s parado numa conversa; 5× lista + 5× counts por janela de 6s após troca de aba. Probe SSE: 6 `new_message` + 4 `automation_state` em 20s (org com bots/tráfego real). Cada `new_message`/`conversation_updated` de QUALQUER conversa da org dispara `scheduleInboxRefresh` → invalida `["inbox-conversations"]` + `["conversations","tab-counts"]` com debounce de apenas 1000ms (`src/features/inbox-v2/hooks/use-realtime.ts:95-102,133,215-217`). Em rajada, isso satura: ~1,4MB/min/agente só de lista.

**Causa raiz:** invalidação em escopo de org, sem checar se o evento afeta a lista visível; debounce de 1s é o único freio. O cache Redis de 45s do counts (backend `src/services/conversations.ts:22,848`) torna o counts barato no servidor, mas a lista (35KB, sem cache) recomputa a cada chamada e ambos consomem round-trips e conexões.

**Correção (1 linha):** aplicar patch in-place do card da conversa no cache via payload do SSE (ou `refetchType:"none"` quando a conversa não está na primeira página visível) e subir o debounce para 5–10s.

## P0-2 — Board de 887KB refetchado 3× por navegação/abertura de deal

**Evidência:** `GET /api/pipelines/:id/board?status=ALL` = 887KB por chamada; 3× no load do kanban (15s), 3× ao abrir um deal (uma delas com 5,5s), 3× ao abrir deal no flow — ~2,6MB por gesto. O invalidador é `usePipelineRealtime`: qualquer `new_message`/`conversation_updated` da org invalida TODAS as variantes do board com debounce de 800ms (`src/features/pipeline-v2/hooks/use-pipeline-realtime.ts:136-144`). O payload é grande porque `status=ALL` + 100 deals/estágio (backend `src/services/deals.ts:1267-1269`); o cache-aside de 30s (`deals.ts:1537-1571`) protege o servidor, mas não o fio nem o `JSON.parse` de 887KB no cliente.

**Causa raiz:** invalidação coarse-grained do board inteiro para eventos que só mudam `lastMessage` de 1 card; o patch otimista já existe para `sendStatus` (`patchBoardLastMessageStatus`) mas não para preview/awaiting.

**Correção (1 linha):** estender o patch in-place do SSE para `lastMessage`/preview do card afetado e só invalidar o board em mudanças estruturais (deal criado/movido/encerrado); a médio prazo, trocar `status=ALL` por `OPEN` + colunas lazy.

## P0-3 — Abrir conversa baixa TODA a mídia do histórico (~9,6MB num caso real)

**Evidência:** ao abrir 1 conversa: 52 requests em 6s, sendo ~25 de mídia — 6 JPGs (~470KB), ~15 áudios e 1 MP4 de **8.175KB** (via ranges 206). O mesmo `.webm` chega a ser baixado 5× em 4s (ex.: `att_1786568241046` 412KB→220KB→92KB→412KB→316KB). Causa: cada bolha de áudio monta `<audio src preload="metadata">` imediatamente (`src/components/crm/message-bubble.tsx:609`) e vídeo idem (`message-bubble.tsx:747-752`); remounts das bolhas re-emitem range requests (storage responde `Cache-Control: private, max-age=300`, mas 206/range não é bem aproveitado). Imagens usam `loading="lazy"` (`:866`) mas o scroll-to-bottom as dispara mesmo assim.

**Correção (1 linha):** montar o elemento `<audio>`/`<video>` só no primeiro play (ou `preload="none"` + duração vinda do backend) e renderizar mídia fora do viewport sob demanda.

---

## P1-1 — 4 conexões SSE simultâneas com o deal aberto (pool HTTP/1.1 estrangulado)

**Evidência:** 2× `GET /api/sse/messages` no load de cada página + mais 2× ao abrir o deal. Origens: `useSystemPresenceSync` no layout (`src/hooks/use-system-presence-sync.ts:33`), `usePipelineRealtime` (`use-pipeline-realtime.ts:148`) ou `useInboxRealtime` no inbox (`use-realtime.ts:108`), `useEntityViewers` ao abrir deal (`use-entity-viewers.ts:68`) e `useInboxRealtime` de novo dentro do chat do deal (`src/features/pipeline-v2/extras/deal-chat-binding.tsx:247-251`). Evidência de estrangulamento: no deal open, 6 requests disparadas juntas em t=3,7s TODAS com duração idêntica de 4,4s (fila no pool de 6 conexões/host, 4 ocupadas por SSE). Cada conexão também é um subscriber a mais no sse-bus do backend.

**Correção (1 linha):** EventSource singleton por página (um `useSSE` compartilhado com multiplexação de handlers, como já existe parcialmente em `use-sse.ts`).

## P1-2 — Mesmo endpoint baixado 2× por query keys divergentes

**Evidência e causas:**
- `GET /api/settings/org?prefix=conversation.` 2× em toda página: keys `["org-settings","conversation"]` (`src/features/inbox-v2/hooks/use-conversation-features.ts:20-27`) vs `["org-settings","inbox"]` (`src/features/conversations-settings/hooks/use-inbox-settings.ts:38-41`).
- `GET /api/kanban/filter-options` (21KB) 2×: keys `["kanban-filter-options"]` (`src/app/(app)/pipeline/_v2-client.tsx:418-425`) vs `["contact-sources"]` (`src/hooks/use-contact-sources.ts:8-16`) — a 2ª dispara ao abrir conversa/deal (ContactAside), mesmo com cache de 5min na 1ª.
- `GET /api/profile/preferences` 2× por carga fria: fetch cru do tema (`src/hooks/use-theme-v2.ts:107`) fora do React Query vs `["sidebar-preferences"]` (`src/features/sidebar/api.ts:39-44`).

**Correção (1 linha):** unificar para uma query key/hook por endpoint (ex.: `useContactSources` derivar de `["kanban-filter-options"]` via `select`; tema ler do cache RQ).

## P2-1 — 404 repetido de `/api/sip-extensions/me/credentials` em toda navegação fria

**Evidência:** 404 em inbox_load, pipeline_load e flow_load (SoftphoneWidget monta no layout e tenta as credenciais sempre — `src/features/softphone/api/extensions.ts:25-30`). Usuário sem ramal SIP = 404 permanente.

**Correção (1 linha):** cachear o 404 (staleTime longo) ou feature-flag de softphone por org antes de montar o widget.

## P2-2 — Heartbeats/telemetria em segundo plano (esperado, mas soma)

`POST /api/presence/heartbeat` a cada 15s por deal aberto (`use-entity-viewers.ts:65-66`), `POST /api/agents/me/activity` a cada 30s sob interação + 1 por mudança de rota (`src/features/system-usage/use-system-activity.ts`), `POST /api/agents/me/ping` a cada 90s + foco (`src/hooks/use-presence-heartbeat.ts`). Individualmente ok; juntos ~6 POSTs/min. Revisar se heartbeat de viewers pode ser só via SSE.

---

## Waterfalls sequenciais observados

- **Abrir deal sem conversa vinculada:** `deals/:id` + `contacts/:id?view=inbox` (paralelos, ok) → `POST /api/conversations/create` (2,0s) → `messages?history=1` (4,4s) = ~8s até o chat. A cadeia create→messages é inerente ao auto-ensure (`deal-chat-binding.tsx:147-184`); o agravante é a fila de conexões (P1-1) deixando tudo em 4,4s.
- **Inbox:** lista (4,9s no cold) e counts disparam juntos — sem waterfall relevante; o custo é o loop (P0-1).

## Validação das otimizações prévias (não reportadas como achado)

- ✅ `getTabCounts` com cache Redis 45s (backend `conversations.ts:22,848`) — counts repetidos são baratos no servidor.
- ✅ realtime/counts só após hidratação (`_v2-client.tsx:668-672`) — sem fetch com tab default errada.
- ✅ `message_status` não invalida lista (`use-realtime.ts:139-213`) — confirmado; só `new_message`/`conversation_updated` dirigem o loop.
- ✅ `markConversationRead` otimista (`use-conversation-actions.ts:209-246`) — POST /read sem invalidação em cascata.
- ✅ Composer/painel reusam `contact-sidebar` (deal panel usa `useContactSidebar`).
- ✅ `useBoard` com staleTime 45s/refetch 60s/placeholderData (`use-board.ts:60-76`); `usePipelines` leve (4KB); loss-reasons 1×; filter-options com staleTime 5min (mas ver P1-2 — a key divergente fura o cache).
- ⚠️ Debounce SSE de 1000ms existe, mas é insuficiente sob tráfego real (P0-1/P0-2).

## Scripts gerados

- `scripts/_perf-network-audit.mjs` → `perf-network-report.json` (fluxos a–e)
- `scripts/_perf-inbox-conv-audit.mjs` → `perf-network-report-inbox.json` (tabs + loop)
- `scripts/_perf-conv-open-audit.mjs` → `perf-network-report-conv.json` (abrir conversa SPA + deep-link)
- `scripts/_perf-sse-probe.mjs` — contagem de eventos SSE/20s
- `scripts/_perf-network-analyze.mjs` — timelines por fase
