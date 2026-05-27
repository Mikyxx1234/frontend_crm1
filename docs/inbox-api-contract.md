# Contrato de API — `/inbox`

> **Propósito:** este documento congela **todos** os endpoints, métodos, payloads e eventos de tempo real que o `/inbox` atual consome do backend.
>
> **Regra de ouro:** a reescrita visual do `/inbox` (Fases 2-6 do plano) **DEVE** chamar exatamente os mesmos endpoints, com os mesmos métodos, query params e shape de body/response listados aqui. Se algum endpoint precisar mudar, é mudança de backend — fora do escopo da reescrita visual.
>
> **Como foi gerado:** auditoria estática de `apiUrl(...)` em `src/components/inbox/**` e `src/app/(dashboard)/inbox/**`. Linha-fonte indicada em cada item para referência cruzada.

---

## 1. Convenções

- **Base URL:** todas as chamadas usam `apiUrl(path)` de `@/lib/api`, que retorna o path relativo. O rewrite do `next.config.ts` faz o proxy `/api/*` → backend, mantendo same-origin (cookie `authjs.session-token` SameSite=Lax).
- **Auth:** cookie de sessão, sem header explícito. Falhas 401 → middleware redireciona.
- **Erros:** sempre `{ message: string }` no body. UI usa `data?.message` ou fallback PT-BR.
- **SSE:** `new EventSource("/api/sse/messages")` direto (não passa por helper).

---

## 2. Endpoints REST consumidos pelo `/inbox`

### 2.1 Página principal (`client-page.tsx`)

| # | Método | Endpoint | Query / Body | Quem usa | Fonte |
|---|---|---|---|---|---|
| 1 | GET | `/api/pipelines` | — | Dropdown de pipeline no dialog "Novo negócio" | `client-page.tsx:40` |
| 2 | GET | `/api/pipelines/:pipelineId/board` | `?status=OPEN` | Estágios para o `DealForm` | `client-page.tsx:50` |
| 3 | GET | `/api/conversations` | `?counts=1` | Badges de contagem por tab | `client-page.tsx:56` |
| 4 | GET | `/api/settings/permissions` | — | Filtrar abas visíveis por `scopeGrants` | `client-page.tsx:87` |
| 5 | GET | `/api/agents/:userId/status` | — | Status online/offline do usuário logado | `client-page.tsx:184` |
| 6 | GET | `/api/inbox/agent-capacity` | — | Card "N/M conversas" (loadPct, tone) | `client-page.tsx:201` |
| 7 | POST | `/api/conversations/bulk` | `{ ids: string[], action: "resolve"\|"reopen"\|... }` | Ações em massa quando `selectionMode` | `client-page.tsx:214` |
| 8 | GET | `/api/users` | — | Picker de atribuição (TransferControl) | `client-page.tsx:290` |
| 9 | POST | `/api/conversations/:id/actions` | `{ action: "assign", assignedToId: string \| null }` | Atribuir conversa ao agente | `client-page.tsx:307` |

### 2.2 Lista de conversas (`conversation-list.tsx`)

| # | Método | Endpoint | Query / Body | Fonte |
|---|---|---|---|---|
| 10 | GET | `/api/conversations` | `?perPage=60&tab={tab}&ownerId&channel&stageId&tagIds&sortBy&sortOrder&search` — lista paginada da aba ativa | `conversation-list.tsx:344` |
| 11 | GET | `/api/settings/self-assign` | — | Habilita botão "Pegar conversa" | `conversation-list.tsx:676` |
| 12 | POST | `/api/conversations/:id/actions` | `{ action: "assign", assignedToId }` — self-assign | `conversation-list.tsx:728` |
| 13 | POST | `/api/conversations/:id/read` | sem body | Swipe → marcar como lida | `conversation-list.tsx:752` |
| 14 | POST | `/api/conversations/:id/actions` | `{ action: "resolve" }` — swipe finalizar | `conversation-list.tsx:765` |

**Tabs (`InboxTab`):** `todos`, `entrada`, `esperando`, `respondidas`, `automacao`, `finalizados`, `erro`.

**Filtros (`InboxFilters`):** `ownerId`, `channel`, `stageId`, `tagIds[]`, `sortBy`, `sortOrder`.

**Shape esperado de `/api/conversations` (lista):**
```ts
type ListResponse = {
  items: ConversationListRow[];
  // outras métricas paginadas conforme backend já retorna
};

type ConversationListRow = {
  id: string;
  channel: "whatsapp" | "meta" | "instagram" | "email" | string;
  status: "OPEN" | "RESOLVED" | "PENDING" | "SNOOZED";
  contact: { id: string; name: string; phone: string | null };
  assignedToId: string | null;
  assignedTo: { id: string; name: string; email: string } | null;
  lastInboundAt: string | null;
  // + campos consumidos hoje pelo card (preview, unread count, tags, etc.)
};
```

**Shape de `/api/conversations?counts=1`:**
```ts
type TabCounts = Record<
  "todos" | "entrada" | "esperando" | "respondidas" | "automacao" | "finalizados" | "erro",
  number
>;
```

### 2.3 Janela de chat (`chat-window.tsx`)

| # | Método | Endpoint | Query / Body | Fonte |
|---|---|---|---|---|
| 15 | GET | `/api/conversations/:id/messages` | — | Carregar histórico da conversa selecionada | `chat-window.tsx:136` |
| 16 | POST | `/api/conversations/:id/messages` | `{ content, replyToId?, messageType?, private? }` | Enviar mensagem ou nota interna | `chat-window.tsx:161` |
| 17 | POST | `/api/conversations/:id/attachments` | `multipart/form-data` (`file`, `caption?`) | Anexo (imagem/áudio/arquivo) | `chat-window.tsx:186` |
| 18 | POST | `/api/messages/:id/reactions` | `{ emoji }` | Adicionar/alternar reação | `chat-window.tsx:202` |
| 19 | POST | `/api/conversations/:id/actions` | `{ action: "resolve" \| "reopen" }` | Finalizar/Reabrir | `chat-window.tsx:223` |
| 20 | POST | `/api/conversations/:id/forward` | `{ sourceConversationId, messageRef }` | Encaminhar mensagem | `chat-window.tsx:250` |
| 21 | POST | `/api/activities` | `{ type, title, contactId?, scheduledAt? }` | Criar tarefa/atividade do composer | `chat-window.tsx:678` |
| 22 | POST | `/api/conversations/:id/template` | `{ templateName, bodyPreview?, components?, flowToken?, flowActionData?, templateGraphId? }` | Enviar template WhatsApp | `chat-window.tsx:701` |
| 23 | GET | `/api/scheduled-messages` | `?conversationId={id}` | Lista de agendamentos pendentes | `chat-window.tsx:754` |
| 24 | POST | `/api/uploads/automation-media` | `multipart/form-data` (`file`) | Upload prévio do anexo p/ agendamento | `chat-window.tsx:798` |
| 25 | POST | `/api/scheduled-messages` | `{ conversationId, content, scheduledAt, media?, fallbackTemplate? }` | Agendar mensagem | `chat-window.tsx:834` |
| 26 | DELETE | `/api/scheduled-messages/:id` | — | Cancelar agendamento | `chat-window.tsx:864` |
| 27 | POST | `/api/conversations/:id/read` | — | Marca conversa lida ao abrir | `chat-window.tsx:905` |
| 28 | GET | `/api/conversations` | `?perPage=80&sortBy=updatedAt&sortOrder=desc` | Picker do "Encaminhar para…" | `chat-window.tsx:1161` |
| 29 | POST | `/api/conversations/:id/pin-note` | `{ messageId \| null }` | Fixar/desfixar nota | `chat-window.tsx:1198` |
| 30 | POST | `/api/conversations/:id/typing` | sem body (fire-and-forget) | Indicador "digitando…" | `chat-window.tsx:1226` |
| 31 | POST | `/api/media/transcribe` | `{ messageId } \| multipart` | Transcrever áudio | `chat-window.tsx:4766` |

### 2.4 Painel CRM direito (`contact-deal-sidebar.tsx`)

| # | Método | Endpoint | Query / Body | Fonte |
|---|---|---|---|---|
| 32 | GET | `/api/contacts/:id` | — | Card de contato (nome, foto, deals, atividades, tags, stages) | `contact-deal-sidebar.tsx:154` |

### 2.5 Componentes auxiliares (cabeçalho, popovers, ações)

| # | Método | Endpoint | Body / Query | Componente | Fonte |
|---|---|---|---|---|---|
| 33 | GET | `/api/tags` | — | `tag-popover.tsx` | linha 39 |
| 34 | POST | `/api/conversations/:id/tags` | `{ tagIds: string[] }` | `tag-popover.tsx` | linha 111 |
| 35 | POST | `/api/tags` | `{ name, color }` | criar tag inline em `tag-popover.tsx` | linha 135 |
| 36 | GET | `/api/whatsapp-template-configs/agent-enabled` | — | `template-picker.tsx` | linha 46 |
| 37 | POST | `/api/activities` | `{ type, title, contactId?, scheduledAt? }` | botão "Lembrar" — `remind-button.tsx` | linha 110 |
| 38 | GET | `/api/quick-replies` | — | `quick-replies.tsx` | linha 21 |
| 39 | GET | `/api/stages` | — | `quick-actions-panel.tsx` e `contact-info-panel.tsx` | qa:67, cip:97 |
| 40 | GET | `/api/activities` | `?contactId=:id&perPage=5` | timeline curta no `quick-actions-panel.tsx` | linha 74 |
| 41 | GET | `/api/contacts/:id` | — | `quick-actions-panel.tsx` (deal aberto) e `contact-info-panel.tsx` | qa:85, cip:81 |
| 42 | POST | `/api/deals/:id/move` | `{ stageId }` | Mover deal de estágio (atalho rápido) | qa:89, cip:219 |
| 43 | POST | `/api/contacts/:id/tags` | `{ tagId }` (POST add, DELETE remove) | `contact-info-panel.tsx` | linhas 183, 195 |
| 44 | PATCH | `/api/contacts/:id` | `{ ...partial }` | Edita nome/email/etc. inline | `contact-info-panel.tsx:207` |
| 45 | GET | `/api/channels` | — | Dropdown de canal para nova conversa | `new-conversation.tsx:33` |
| 46 | POST | `/api/conversations/create` | `{ contactId \| phone, channelId, ... }` | Criar conversa nova | `new-conversation.tsx:44` |
| 47 | GET | `/api/inbox/daily-stats` | — | Chips de estatística no header da lista | `daily-stats-chips.tsx:18` |
| 48 | GET | `/api/tags` | — | `contact-info-panel.tsx` | linha 90 |
| 49 | POST | `/api/ai-agents/drafts/:messageId/approve` | — | Aprovar rascunho da IA | `ai-draft-card.tsx:40` |
| 50 | POST | `/api/ai-agents/drafts/:messageId/discard` | — | Descartar rascunho da IA | `ai-draft-card.tsx:61` |
| 51 | POST | `/api/agents/:id/status` | `{ status: "ONLINE" \| "OFFLINE" \| "AWAY" }` | `presence-dashboard.tsx:69` |

### 2.6 Voz/Chamadas WhatsApp (`whatsapp-call-chip.tsx`)

| # | Método | Endpoint | Fonte |
|---|---|---|---|
| 52 | GET | `/api/meta/whatsapp/call-permission-templates` | linha 188 |
| 53 | GET | `/api/conversations/:id/calling-context` | linha 211 |
| 54 | GET | `/api/conversations/:id/whatsapp-calls/recent?limit=5` | linha 244 |
| 55 | POST | `/api/conversations/:id/call-permission` | linha 345 |
| 56 | POST | `/api/conversations/:id/whatsapp-calls` | linha 379 |

---

## 3. Tempo real — SSE

**Endpoint único:** `EventSource("/api/sse/messages")` (sem auth header — depende do cookie de sessão same-origin).

**Eventos consumidos hoje** (`use-sse.ts` + `chat-window.tsx` + `client-page.tsx`):

| Evento | Payload (parcial conhecido) | Ações na UI |
|---|---|---|
| `new_message` | `{ conversationId: string, ... }` | invalida `messagesKey` da conversa aberta + `inbox-conversations` + `tab-counts` |
| `message_status` | `{ conversationId, messageId, status: "sent"\|"delivered"\|"read"\|"failed" }` | invalida `messagesKey` da conversa aberta + `tab-counts` |
| `conversation_updated` | `{ conversationId, ... }` (assign/resolve/hasError) | invalida `inbox-conversations` + `tab-counts` |
| `contact_updated` | `{ contactId, ... }` | invalida `inbox-conversations` e `contact-sidebar:{id}` |
| `whatsapp_call` | `{ conversationId, ... }` | invalida `messagesKey` da conversa aberta |
| `presence_update` | `{ userId, status }` | invalida `my-agent-status` e dashboards de presença |

**Reconexão:** auto-reconnect com backoff fixo de 5s em `es.onerror`.

**Throttle de invalidação:** o `client-page.tsx` coalesca invalidações em janelas de 250ms (`scheduleInboxRefresh`). A reescrita deve manter esse comportamento — ataques de webhooks com 5+ eventos seguidos não devem virar 5 refetches.

---

## 4. React Query keys que precisam ser preservadas

Esses prefixos são compartilhados com outras páginas (Pipeline, Sales Hub, Settings). Mudar quebra invalidação cruzada.

| Key prefix | Quem invalida | Quem consome |
|---|---|---|
| `["inbox-conversations", ...]` | inbox (lista, ações), SSE | inbox list |
| `["conversations", "tab-counts"]` | SSE | counts no header |
| `["conversations"]` | resolve/reopen do chat | shared |
| `["pipeline-board", pipelineId, "OPEN"]` | criar deal no `/inbox` | `/pipeline` (Kanban/Agile/List) |
| `["pipelines"]` | criar deal | seletor de pipeline |
| `["contact-sidebar", contactId]` | edição de contato/deal | sidebar direito |
| `["contact", ...]` | criar atividade | timeline/atividades |
| `["scheduled-messages", conversationId]` | agendar/cancelar | painel de schedule |
| `["self-assign-capability"]` | settings | botão "Pegar conversa" |
| `["my-agent-status", userId]` | toggle online | header da lista |
| `["agent-capacity", userId]` | refetch 30s | card de capacidade |
| `["users", "assign-picker"]` | settings | TransferControl |
| `["settings-permissions-panel"]` | settings | filtro de abas |
| `["messages", conversationId]` (interno do chat-window) | enviar/SSE | ChatWindow |

---

## 5. Headers, cookies e contratos transversais

- **Cookies:** `authjs.session-token` (SameSite=Lax). Não precisa setar manualmente.
- **Content-Type:** `application/json` em todos os POSTs com body, exceto attachments/uploads que usam `multipart/form-data`.
- **Idempotência:** `POST /:id/read`, `POST /:id/typing` são fire-and-forget — UI ignora erro.
- **Otimismo:** `assignConversation` no `client-page.tsx` atualiza o `selected` localmente **antes** da resposta voltar (em `setSelected((s) => ...)`). A reescrita deve manter esse padrão otimista.
- **Toasts:** `sonner` é usado para erros de mutation. Mantém-se na reescrita.

---

## 6. O que **NÃO** vai mudar na reescrita visual

1. **Nenhum endpoint** desta lista (URL, método, query, body, response).
2. **Eventos SSE** e o endpoint `/api/sse/messages`.
3. **React Query keys** listadas na seção 4 (afetam invalidação cruzada).
4. **Throttle de 250ms** no fan-out de SSE → invalidação.
5. **Comportamento otimista** de assign/resolve.

## 7. O que **PODE** mudar (escopo da reescrita)

1. JSX, classes Tailwind, estrutura de DOM.
2. Organização de arquivos (`features/inbox/...` em vez de `components/inbox/...`).
3. Hooks de UI (`useChatComposer`, `useConversationFilters`, etc.) — desde que continuem chamando os mesmos endpoints.
4. Bibliotecas de UI (drop-in de componentes glass).
5. URL da página (`/inbox` pode virar `/inbox` mesmo; nenhuma mudança planejada aqui).

---

**Status:** ✅ Auditoria completa. Pronto para Fase 2 (primitivos glass) + Fase 3 (camada API/hooks que espelha este contrato).
