# Design: Logs de distribuição — tabela operacional

**Date:** 2026-07-25  
**Status:** Approved for planning  
**Scope:** Frontend `frontend_crm1` — página `/widgets/distribution` (aba Logs)  
**Primary file:** `src/app/(app)/widgets/distribution/client-page.tsx` (`DistributionLogsList`)

## Problem

A lista atual de logs é visualmente pobre: pouco contraste de resultado, muito espaço vazio horizontal, hierarquia fraca entre telefone/responsável/horário, e o detalhe (motivo técnico, origem, conversa) não é acessível sem sair da tela.

## Goal

Refatorar a área de logs (foco principal da página, mantendo KPIs no topo) para uma **tabela operacional** com filtros locais e **linha expansível** de detalhe — sem mudar o contrato da API neste passo.

## Non-goals

- Alterar o motor de distribuição ou persistência de logs no backend
- Endpoints novos de filtro/paginação server-side (pode vir depois)
- Redesign das abas Equipe / Fila além do necessário para consistência visual
- Dark-mode exclusivo ou branding novo fora do design system existente

## Approach (chosen)

**A — Tabela operacional**

- KPIs compactos permanecem no topo
- Painel principal: toolbar de filtros + tabela densa + expand row
- Filtros aplicados no client sobre os itens já carregados (`useDistributionLogs` infinite query)
- Clique na linha expande/colapsa detalhe; no máximo uma linha expandida por vez

Descartadas nesta entrega:

- **B Timeline diária** — melhor narrativa, pior densidade
- **C Lista + painel** — melhor investigação 1:1, fraco em mobile e ocupa largura demais

## Data (existing)

`DistributionLog` (`src/features/distribution/api.ts`):

| Field | Use in UI |
|---|---|
| `contactPhone` / `contactName` | Coluna Contato |
| `success` + `reason` | Badge de resultado + labels já mapeados (`DIST_REASON_LABELS`) |
| `selectedUserName` | Coluna responsável (quando `success`) |
| `triggerSource` | Coluna Origem + detalhe |
| `createdAt` | Coluna Quando |
| `conversationId` | Ação “Abrir conversa” no expand |
| `id` | Detalhe técnico |

## UI specification

### Page composition

1. Header existente (título Distribuição + chips Equipe / Fila / Logs)
2. Grid de KPIs (inalterado em dados; pode só compactar spacing se necessário)
3. Seção Logs (refatorada)

### Filters toolbar

Client-side only:

- **Busca** — case-insensitive em `contactPhone`, `contactName`, `selectedUserName`
- **Resultado** — `Todos` | `Sucesso` (`success === true`) | `Falha` (`success === false`)
- **Período** — `Hoje` | `Últimos 7 dias` | `Tudo` (baseado em `createdAt` no timezone local)
- **Origem** — select derivado dos `triggerSource` distintos presentes na página carregada; opção “Todas”

Empty filter state = mostrar todos os itens carregados. Contagem “N resultados” opcional ao lado da toolbar.

### Table columns

| Column | Content |
|---|---|
| Contato | Telefone (mono) + nome muted abaixo; fallback “Atendimento” |
| Resultado | Badge: sucesso verde “Distribuído”; falha âmbar com label de `DIST_REASON_LABELS[reason]` |
| Responsável / motivo | Nome do agente se sucesso; senão o mesmo label de motivo |
| Origem | `triggerSource` legível (raw ok se já for curto) |
| Quando | `dd/mm/aa, HH:mm` (função `fmtDateTime` existente) |

Row hover + cursor pointer. Ícone chevron indica expand.

### Expandable detail

Ao expandir:

- Motivo técnico (`reason`)
- Trigger completo (`triggerSource`)
- IDs: log `id`, `conversationId` (se houver)
- Botão **Abrir conversa** → navega para `/inbox?c=<conversationId>` quando `conversationId` existir; oculto caso contrário

Uma linha expandida por vez (clicar outra fecha a anterior; clicar a mesma fecha).

### States

- Loading / erro / vazio: manter padrões atuais (spinner, alerta, empty state)
- “Carregar mais”: permanece; filtros aplicam-se ao conjunto acumulado após fetch

### Visual language

Reutilizar tokens do CRM (`--glass-*`, `--text-*`, `--color-success`, `--color-warn`, `font-display` / `font-body`). Sem cards genéricos no hero; tabela com header sticky opcional dentro do scroll da seção.

## Acceptance criteria

1. Em Logs, o resultado da distribuição é legível em &lt;1s (badge + coluna dedicada)
2. Busca/filtro local reduz a lista sem nova request
3. Expand revela detalhe + link de conversa quando aplicável
4. KPIs e abas Equipe/Fila continuam funcionando
5. Typecheck/lint limpos no arquivo alterado

## Risks / follow-ups

- Filtro local só cobre páginas já carregadas — documentar na UI se útil (“filtrando N carregados”)
- Server-side filter/cursor como follow-up se o volume crescer
- Mobile: tabela pode scrollar horizontalmente; aceitável nesta entrega

## Implementation notes

- Extrair `DistributionLogsList` para componente dedicado se o arquivo `client-page.tsx` já estiver grande (opcional, se o diff local ficar ilegível)
- Não alterar `fetchDistributionLogs` neste PR
