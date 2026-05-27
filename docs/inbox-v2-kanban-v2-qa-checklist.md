# QA Paridade — `/inbox-v2` e `/pipeline/kanban-v2`

Checklist gerado ao final do plano "Reconstrução Inbox + Kanban com v0".
Use em paralelo com `frontend/docs/inbox-api-contract.md` como referência
de quais endpoints devem aparecer no Network tab.

## Bootstrap do ambiente

```powershell
cd C:\CRM\frontend
npm run dev   # Next 15 + Turbopack — `npm run dev:webpack` se preferir
```

Acesse:

- `http://localhost:3000/inbox-v2`
- `http://localhost:3000/pipeline/kanban-v2`

## Inbox v2

| # | Caso | Esperado |
| - | ---- | -------- |
| 1 | Acessar `/inbox-v2` | Renderiza NavRail + lista de conversas + estado vazio do chat |
| 2 | Clicar em uma conversa | Carrega mensagens (`GET /api/conversations/:id/messages`), sidebar (`GET /api/contacts/:id`) e marca como lida (`POST /api/conversations/:id/read`) |
| 3 | Enviar texto | `POST /api/conversations/:id/messages` com `content`; bolha aparece na timeline |
| 4 | Anexar arquivo | Menu de anexos > "Anexar arquivo" abre file picker; `POST /api/conversations/:id/attachments` multipart; toast de sucesso |
| 5 | Resposta rápida | Menu de anexos > "Respostas rápidas" lista de `/api/quick-replies`; clique insere no draft |
| 6 | Template WhatsApp | Menu de anexos > "Templates" lista `/api/whatsapp-template-configs/agent-enabled`; clique dispara `POST /api/conversations/:id/template` |
| 7 | Gravar áudio | Botão microfone: permissão → grava → "stop" envia via `/attachments`; "trash" descarta |
| 8 | SSE realtime | Backend manda `new_message` (use `curl` ou outra conversa); lista refaz fetch em <1s e mensagem aparece na conversa ativa |
| 9 | Sessão expirada | Conversa sem inbound há >24h mostra `SessionAlert` e desabilita o input |

## Kanban v2

| # | Caso | Esperado |
| - | ---- | -------- |
| 1 | Acessar `/pipeline/kanban-v2` | Header com tabs + colunas do pipeline default (`/api/pipelines` + `/api/pipelines/:id/board?status=OPEN`) |
| 2 | Trocar tab "Ganhos" / "Perdidos" | Refaz GET com `?status=WON` / `?status=LOST` |
| 3 | Arrastar um card entre colunas | Atualização otimista no UI + `POST /api/deals/:id/move` com `{ stageId, position }`; em erro reverte ao snapshot |
| 4 | Clicar num card | Abre `DealDetailPanel` com dados de `/api/deals/:id` |
| 5 | Fechar painel | `X` ou backdrop fecham; nenhum estado fica preso |

## Verificação de paridade

Abra o DevTools > Network e confirme que as URLs disparadas pelo
`/inbox-v2` e `/pipeline/kanban-v2` são **IDÊNTICAS** às chamadas
pelo legado (`/inbox` e `/pipeline/[view]`). Diferenças aceitas:

- React Query keys podem ter sufixo `-v2` (ex.: `pipelines-v2`,
  `deal-detail-v2`). É proposital — não compartilha cache com a tela
  legada para evitar interferência. As **URLs HTTP** são as mesmas.

## Riscos conhecidos / próximos passos

- **Filtros do `PipelineHeader`** (Filtros / Salvos / Meus / Urgentes /
  Novo) ainda são botões sem handlers. Adicionar na Fase 11+ (após
  aprovação visual).
- **Search da `ConversationColumn`** é client-side só. Para usar o
  backend, estender o componente v0 com `onSearchChange` / `value`.
- **Stage pills no header do chat** estão vazios. Conectar com
  `getPipelineBoard(defaultPipelineId)` + `deriveStagePills` quando o
  contato/conversa tiver `stageId`.
- **Novo deal** no Kanban (`onAddDeal`) ainda é `TODO`. Reaproveitar
  o `DealForm` legado quando promover para rota oficial.
- **Permissions / scopeGrants**: hooks (`usePermissionsPanel`,
  `useSelfAssignCapability`) já existem mas ainda não filtram a UI.
  Aplicar quando promover.

## Promoção (Fase 12)

Após aprovação visual:

1. Mover `(v2)/inbox-v2` para `(dashboard)/inbox` (e renomear o atual
   para `_inbox-legacy`).
2. Mover `(v2)/pipeline/kanban-v2` para `(dashboard)/pipeline/[view]`
   (route `kanban`).
3. PR separado: remover `components/inbox/*` (chat-window.tsx 5044
   linhas, conversation-list.tsx, contact-deal-sidebar.tsx) e
   `components/pipeline/kanban-*` legados.
