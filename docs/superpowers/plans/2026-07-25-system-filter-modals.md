# System Filter Modals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar todas as superfícies de filtro do CRM no shell canônico do Kanban (`wide`/`compact`), mantendo busca inline e preservando campos, APIs e persistência de cada página.

**Architecture:** Extrair `FilterModalShell`, `FilterSearchTrigger` e `FilterSegmentTabs` para `src/components/crm/`. Migrar o Kanban primeiro (sem mudança funcional), depois consumidores por onda. Filtros complexos usam draft+Aplicar; filtros simples aplicam imediatamente dentro da modal.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS variables (`--glass-*`, `--brand-primary`), `createPortal`, `ModalPortalContext`, Vitest (smoke), ESLint.

**Spec:** `docs/superpowers/specs/2026-07-25-system-filter-modals-design.md`

**Branch:** trabalhar em `DEV_BRANCH`; merge na `main` só após validação visual de cada onda.

---

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/components/crm/filter-modal-shell.tsx` | Dialog compartilhado (`wide`/`compact`, footer opcional, portal) |
| `src/components/crm/filter-search-trigger.tsx` | Pill de busca + botão ajustes (não abre no focus) |
| `src/components/crm/filter-segment-tabs.tsx` | Abas internas com contador |
| `src/components/crm/filter-modal-types.ts` | Props tipadas do shell/trigger/tabs |
| `src/components/pipeline/kanban-filters/v2/variant-modal-three-col.tsx` | Passa a consumir `FilterModalShell` + tabs |
| `src/components/pipeline/kanban-filters/v2/search-filter-bar.tsx` | Passa a consumir `FilterSearchTrigger` |
| `src/components/contacts/contacts-filter-modal.tsx` | Modal wide Contatos |
| `src/components/companies/companies-filter-modal.tsx` | Modal compact Empresas |
| `src/features/inbox-v2/extras/filter-panel.tsx` | Modal wide Inbox |
| `src/features/softphone/components/calls-search-filter-bar.tsx` | Modal compact Chamadas |
| `src/app/(app)/logs/_client.tsx` | Modal compact feed + wiring |
| `src/features/dashboard-v2/components/dashboard-filters.tsx` | Modal compact Dashboard |
| `src/components/crm/settings-filter-bar.tsx` | Modal compact admin (substitui popover) |
| Demais páginas listadas nas Ondas 5–7 | Substituem popovers/KPIs de filtro pelo shell |

---

### Task 1: Tipos e `FilterModalShell`

**Files:**
- Create: `src/components/crm/filter-modal-types.ts`
- Create: `src/components/crm/filter-modal-shell.tsx`
- Test: `src/components/crm/filter-modal-shell.test.tsx`

- [ ] **Step 1: Criar tipos**

```ts
// src/components/crm/filter-modal-types.ts
import type * as React from "react";

export type FilterModalVariant = "wide" | "compact";

export type FilterModalShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  activeCount?: number;
  variant?: FilterModalVariant;
  /** Quando false, oculta footer (aplicação imediata). Default true. */
  showFooter?: boolean;
  onClear?: () => void;
  clearDisabled?: boolean;
  onApply?: () => void;
  applyLabel?: string;
  secondaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  children: React.ReactNode;
  className?: string;
};
```

- [ ] **Step 2: Implementar shell (extrair de `ModalShell` em `variant-modal-three-col.tsx`)**

Requisitos obrigatórios:
- `if (!open) return null` + `createPortal(..., document.body)`
- backdrop blur + `onMouseDown` → `onOpenChange(false)`
- `Esc` fecha
- `ModalPortalContext.Provider` no painel (dropdowns portam dentro)
- `variant="wide"` → `max-w-[1120px] h-[min(84vh,760px)]`
- `variant="compact"` → `max-w-lg` (ou `max-w-xl` se título longo)
- footer opcional com Limpar / secondary / Aplicar
- `aria-label={title}`

Referência visual: header/footer atuais em `variant-modal-three-col.tsx` linhas 331–442.

- [ ] **Step 3: Smoke test**

```tsx
// src/components/crm/filter-modal-shell.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilterModalShell } from "./filter-modal-shell";

describe("FilterModalShell", () => {
  it("não renderiza quando fechado", () => {
    render(
      <FilterModalShell open={false} onOpenChange={() => {}} title="Filtros">
        <div>conteudo</div>
      </FilterModalShell>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renderiza título e contador quando aberto", () => {
    render(
      <FilterModalShell
        open
        onOpenChange={() => {}}
        title="Filtros"
        activeCount={3}
        onApply={() => {}}
      >
        <div>conteudo</div>
      </FilterModalShell>,
    );
    expect(screen.getByRole("dialog", { name: "Filtros" })).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("omite footer quando showFooter=false", () => {
    render(
      <FilterModalShell
        open
        onOpenChange={() => {}}
        title="Filtros"
        showFooter={false}
      >
        <div>conteudo</div>
      </FilterModalShell>,
    );
    expect(screen.queryByText("Aplicar filtros")).toBeNull();
  });
});
```

- [ ] **Step 4: Rodar teste**

Run: `npx vitest run src/components/crm/filter-modal-shell.test.tsx`
Expected: PASS (se faltar `@testing-library/react`, instalar como devDep ou adaptar para smoke de export/render mínimo já usado no repo).

- [ ] **Step 5: Commit**

```bash
git add src/components/crm/filter-modal-types.ts src/components/crm/filter-modal-shell.tsx src/components/crm/filter-modal-shell.test.tsx
git commit -m "feat(crm): extrai FilterModalShell compartilhado"
```

---

### Task 2: `FilterSearchTrigger` + `FilterSegmentTabs`

**Files:**
- Create: `src/components/crm/filter-search-trigger.tsx`
- Create: `src/components/crm/filter-segment-tabs.tsx`
- Create: `src/components/crm/index-filters.ts` (reexport opcional)

- [ ] **Step 1: Implementar trigger**

API:

```ts
export type FilterSearchTriggerProps = {
  search: string;
  onSearch: (v: string) => void;
  onOpenFilters: () => void;
  filtersOpen?: boolean;
  activeCount?: number;
  placeholder?: string;
  ariaLabel?: string;
  /** Se false, renderiza só o botão de ajustes. Default true. */
  showSearch?: boolean;
  className?: string;
};
```

Regras:
- **não** chamar `onOpenFilters` em `onFocus` do input
- botão direito com `IconAdjustmentsHorizontal` + badge de contagem
- estilo alinhado a `search-filter-bar.tsx` (pill `rounded-full`)

- [ ] **Step 2: Implementar tabs**

```ts
export type FilterSegmentTab = {
  id: string;
  label: string;
  count?: number;
};

export type FilterSegmentTabsProps = {
  tabs: FilterSegmentTab[];
  value: string;
  onChange: (id: string) => void;
  "aria-label"?: string;
};
```

Visual: faixa sticky igual ao miolo do Kanban (pill ativa + badge).

- [ ] **Step 3: Commit**

```bash
git add src/components/crm/filter-search-trigger.tsx src/components/crm/filter-segment-tabs.tsx
git commit -m "feat(crm): adiciona trigger e tabs de filtros"
```

---

### Task 3: Kanban consome o shell (sem mudança funcional)

**Files:**
- Modify: `src/components/pipeline/kanban-filters/v2/variant-modal-three-col.tsx`
- Modify: `src/components/pipeline/kanban-filters/v2/search-filter-bar.tsx`

- [ ] **Step 1: Substituir `ModalShell` interno por `FilterModalShell`**

```tsx
import { FilterModalShell } from "@/components/crm/filter-modal-shell";
import { FilterSegmentTabs } from "@/components/crm/filter-segment-tabs";

// Dentro de FilterModalThreeCol, quando open:
<FilterModalShell
  open={open}
  onOpenChange={onOpenChange}
  title="Filtros do funil"
  description="Multi-seleção em responsáveis, etapas, origens e tags"
  activeCount={draftCount}
  variant="wide"
  onClear={handleClear}
  clearDisabled={isEmptyFilters(draft)}
  onApply={handleApply}
  secondaryAction={
    onRequestSave
      ? {
          label: "Salvar filtro",
          onClick: () => onRequestSave(draft),
          disabled: isEmptyFilters(draft),
        }
      : undefined
  }
>
  {/* grid 3 colunas existente */}
</FilterModalShell>
```

- [ ] **Step 2: Trocar abas internas do miolo por `FilterSegmentTabs`** (manter ids `negocio|pessoas|periodo|custom`)

- [ ] **Step 3: Em `search-filter-bar.tsx`, usar `FilterSearchTrigger`**

```tsx
<FilterSearchTrigger
  search={search}
  onSearch={onSearch}
  onOpenFilters={() => setOpen(true)}
  filtersOpen={open}
  activeCount={activeCount}
  placeholder={placeholder}
  ariaLabel="Buscar e filtrar negócios"
/>
```

Manter `FilterModalThreeCol` abaixo do trigger.

- [ ] **Step 4: Validar**

Run: `npx eslint "src/components/crm/filter-*.tsx" "src/components/pipeline/kanban-filters/v2/variant-modal-three-col.tsx" "src/components/pipeline/kanban-filters/v2/search-filter-bar.tsx"`
Manual: abrir `/pipeline`, aplicar filtros, limpar, salvar, Esc, mobile.

- [ ] **Step 5: Commit + push DEV**

```bash
git add src/components/crm src/components/pipeline/kanban-filters/v2
git commit -m "refactor(pipeline): Kanban usa shell compartilhado de filtros"
git push origin DEV_BRANCH
```

---

### Task 4: Contatos → modal wide

**Files:**
- Create: `src/components/contacts/contacts-filter-modal.tsx`
- Modify: `src/app/(app)/contacts/client-page.tsx` (remover `SearchFilterBar` inline ~L696–1125; KPIs de segmento vão para Atalhos)

- [ ] **Step 1: Extrair modal**

Props mínimas:

```ts
type ContactsFilterModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: ContactFilterDraft & { lifecycleStage?: string | null; unassigned?: boolean };
  tags: TagWithCountDto[];
  onApply: (next: ContactFilterDraft & { lifecycleStage?: string | null; unassigned?: boolean }) => void;
  onClear: () => void;
};
```

Layout wide:
- Col 1: Ordenar + Atalhos (Todos / Clientes / Leads / Sem responsável) — valores atuais dos KPIs
- Col 2: Período (criação + atualização) via presets existentes de `date-presets`
- Col 3: Tags multi-select

Draft + Aplicar. Busca permanece na página via `FilterSearchTrigger`.

- [ ] **Step 2: Wire na `client-page.tsx`**

- Remover `onFocus={() => setOpen(true)}`
- KPIs strip: se existirem só como filtros, mover para modal; se forem navegação de página, manter e espelhar estado na modal
- Preservar `useContacts({ search, page, lifecycleStage, unassigned, tagIds, createdFrom/To, updatedFrom/To, sortBy, sortOrder })`

- [ ] **Step 3: Validar paridade**

Checklist: ordenar, datas, tags, segmentos, limpar, cancelar sem aplicar, paginação reset.

- [ ] **Step 4: Commit**

```bash
git add src/components/contacts/contacts-filter-modal.tsx src/app/(app)/contacts/client-page.tsx
git commit -m "feat(contacts): migra filtros para modal canônica wide"
```

---

### Task 5: Empresas → modal compact

**Files:**
- Create: `src/components/companies/companies-filter-modal.tsx`
- Modify: `src/app/(app)/companies/client-page.tsx`

- [ ] **Step 1: Modal compact** com Ordenar, Período (criação), Local (estado/cidade/setor via `useCompanyFacets`)

- [ ] **Step 2: Wire + `FilterSearchTrigger`**; remover open-on-focus

- [ ] **Step 3: Preservar** `useCompanies`, `useCompanyFacets`, `useCompanyStats`

- [ ] **Step 4: Commit + push DEV**

```bash
git add src/components/companies src/app/(app)/companies/client-page.tsx
git commit -m "feat(companies): migra filtros para modal canônica compact"
git push origin DEV_BRANCH
```

---

### Task 6: Inbox → modal wide

**Files:**
- Modify: `src/features/inbox-v2/extras/filter-panel.tsx`
- Modify: `src/app/(app)/inbox/_v2-client.tsx` (apenas se o trigger mudar)
- Modify: `src/features/inbox-v2/extras/index.ts` se exports mudarem

- [ ] **Step 1: Substituir `createPortal` popover 380px por `FilterModalShell variant="wide"`**

Colunas:
- Ordenar (`sortBy`/`sortOrder`)
- Conversa / Negócio (responsável, canal, janela, etapa, origens)
- Tags

- [ ] **Step 2: Preservar**
  - tipo `InboxFilters` + `hasInboxServerFilters`
  - `readStoredInboxFilters` / `writeStoredInboxFilters`
  - split server vs client em `_v2-client`
  - `useTeamUsers`, `listTags`, `listChannels`, `listPipelines`, `useContactSources`, `channelGrants`
  - draft + Aplicar

- [ ] **Step 3: Validar** abas Inbox + filtros + ações em massa `serverFilters`

- [ ] **Step 4: Commit**

```bash
git add src/features/inbox-v2/extras/filter-panel.tsx src/app/(app)/inbox/_v2-client.tsx
git commit -m "feat(inbox): migra filtros para modal canônica wide"
```

---

### Task 7: Logs (feed + chamadas)

**Files:**
- Create: `src/features/activity-feed/feed-filter-modal.tsx` (ou extrair de `_client.tsx`)
- Modify: `src/features/softphone/components/calls-search-filter-bar.tsx`
- Modify: `src/app/(app)/logs/_client.tsx`

- [ ] **Step 1: Feed** — modal compact, aplicação imediata (comportamento atual): Entidade, Ator, Período, Fase. Preservar `ActivityFeedFilters` → `useActivityFeed`.

- [ ] **Step 2: Chamadas** — modal compact + draft: Direção, Status, Período. Preservar `CallsFilterState` / `listCalls` / stats query keys.

- [ ] **Step 3: Triggers** com `FilterSearchTrigger` (busca do feed permanece debounced fora).

- [ ] **Step 4: Commit + push DEV**

```bash
git add src/features/activity-feed src/features/softphone/components/calls-search-filter-bar.tsx src/app/(app)/logs/_client.tsx
git commit -m "feat(logs): padroniza filtros de feed e chamadas"
git push origin DEV_BRANCH
```

---

### Task 8: Operação (Dashboard, Distribuição, Automações, Campanhas)

**Files:**
- Modify: `src/features/dashboard-v2/components/dashboard-filters.tsx`
- Modify: `src/app/(app)/widgets/distribution/client-page.tsx`
- Modify: `src/app/(app)/automations/client-page.tsx`
- Modify: `src/app/(app)/campaigns/client-page.tsx`
- Modify (opcional alinhamento): `src/app/(app)/campaigns/new/client-page.tsx`, `src/app/(app)/campaigns/[id]/client-page.tsx`

- [ ] **Step 1: Dashboard** — modal compact para etapas/tags/origem/consultor; período/pipeline como Atalhos na modal se hoje forem filtros (não navegação). Preservar `useDashboardFilters` / URL.

- [ ] **Step 2: Distribuição** — modal compact imediata: Presença, Elegibilidade, Tipo. Preservar filtro client-side.

- [ ] **Step 3: Automações / Campanhas lista** — modal compact imediata de status. Preservar filtro client-side e contadores.

- [ ] **Step 4: Campanhas detalhe/wizard** — pills de destinatário e audiência alinhados ao shell; não forçar 3 colunas no wizard.

- [ ] **Step 5: Commit + push DEV**

```bash
git commit -m "feat: padroniza filtros de dashboard e operação"
git push origin DEV_BRANCH
```

---

### Task 9: Settings admin (`SettingsListFilterBar`)

**Files:**
- Modify: `src/components/crm/settings-filter-bar.tsx`
- Consumidores (não mudar API pública se possível):  
  `settings/team`, `DepartmentsTab`, `tags`, `tabulations`, `custom-fields`, `channels`, `schedules`, `email-accounts`, `products`, `catalogs`, `quotas`, `org-units`, `message-models`

- [ ] **Step 1: Trocar popover portal por `FilterModalShell variant="compact" showFooter={false}`**

Manter props atuais:

```ts
groups: SettingsFilterGroup[] // pills single-select, 1ª opção = default
search / onSearch / onClearAll / popoverTitle
```

- [ ] **Step 2: `FilterSearchTrigger`** no lugar do input+botão atual; **sem** open-on-focus

- [ ] **Step 3: Validar 2–3 telas representativas** (tags, custom-fields, team) + regressão visual admin

- [ ] **Step 4: Commit + push DEV**

```bash
git add src/components/crm/settings-filter-bar.tsx
git commit -m "feat(settings): SettingsListFilterBar usa modal canônica"
git push origin DEV_BRANCH
```

---

### Task 10: Superfícies restantes + limpeza

**Files:**
- Modify: `src/app/(app)/job-openings/client-page.tsx`
- Modify: `src/app/(app)/activities/client-page.tsx` (somente filtros de listagem; calendário/pasta permanecem)
- Modify: `src/features/legacy-v1/reports.tsx`, `analytics.tsx`, `analytics-inbox.tsx`
- Modify: `src/app/(app)/email/email-page.tsx` (só se houver filtros de listagem além da busca)
- Modify: `src/features/legacy-v1/automations-editor.tsx` (tabs de log)
- Modify: `src/features/legacy-v1/campaigns-segments.tsx`
- Delete (só após `rg` zero consumidores):  
  `src/components/contacts/contact-filters.tsx`,  
  `src/features/softphone/components/call-history-filters.tsx`,  
  `src/features/pipeline-v2/extras/filters-popover.tsx`,  
  `src/components/pipeline/kanban-filters/filter-panel-body.tsx` (e irmãos mortos)

- [ ] **Step 1: Migrar cada superfície restante para compact/wide conforme spec**

- [ ] **Step 2: Confirmar órfãos com**

```bash
rg -n "contact-filters|call-history-filters|FiltersPopover|FilterPanelBody|FilterDropdown" src
```

Expected: nenhum import de produção.

- [ ] **Step 3: Remover órfãos em commit separado**

```bash
git commit -m "chore: remove filtros legados órfãos"
```

- [ ] **Step 4: Checklist final de spec**
  - [ ] shell wide/compact usados em todas as rotas de filtro
  - [ ] busca inline
  - [ ] complexos = Aplicar; simples = imediato
  - [ ] APIs/persistência intactas
  - [ ] desktop + mobile + Esc + foco

- [ ] **Step 5: Push DEV e preparar merge na main após validação**

```bash
git push origin DEV_BRANCH
```

---

## Verification matrix (por onda)

| Check | Como |
|-------|------|
| Paridade de campos | Abrir UI antiga (commit pai) vs nova; listar cada controle |
| Draft vs imediato | Alterar e fechar sem Aplicar; confirmar se consulta mudou |
| Persistência | Recarregar página; checar URL/localStorage |
| API | Network tab: mesmas query keys/params |
| A11y | Tab, Esc, aria-label, retorno de foco |
| Lint | `npx eslint` nos arquivos da onda |

---

## Self-review (plan vs spec)

| Spec | Task |
|------|------|
| FilterModalShell / wide-compact | Task 1 |
| FilterSearchTrigger | Task 2 |
| FilterSegmentTabs | Task 2–3 |
| Kanban consome shell | Task 3 |
| Contatos / Empresas | Tasks 4–5 |
| Inbox | Task 6 |
| Logs | Task 7 |
| Dashboard + operação | Task 8 |
| Settings admin | Task 9 |
| Restantes + órfãos | Task 10 |
| Busca inline | Tasks 2–10 |
| Draft vs imediato | Tasks 4–9 |
| Sem mudar APIs | todas (passos Preservar) |

Sem placeholders TBD/TODO. Tipos `FilterModalShellProps` consistentes em todas as tasks.
