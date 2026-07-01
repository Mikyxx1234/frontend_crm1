# Plano de Correção — Busca do Funil não encontra deals fora do top 100

> Handoff para agente executor. **NÃO commitar na `main`** — trabalhar em branch separada e abrir PR.
> Mudança é **somente frontend** (`frontend_crm1`). O backend já suporta o necessário.

## Contexto / Causa raiz (confirmada por dados em produção)

O Kanban V2 (`/pipeline`) carrega **no máximo 100 cards por coluna** e a **busca é client-side**, rodando **apenas sobre os cards já carregados**. Deals em posições além do 100º na coluna nunca são baixados, então a busca nunca os encontra. Não há "Carregar mais" no V2.

Evidência (banco de produção):

- `Negócio - Ederson Fontes` #4129 — estágio "Robô / Sem resposta" (671 deals), **665º da coluna** → não carrega.
- `Negócio - Eduardo Tang` #1326 — estágio "Perdido" (1.884 deals), **912º da coluna** → não carrega.

Ambos no `Pipeline Principal` (default). Não é problema de permissão/owner/pipeline.

## Objetivo

Quando houver **texto de busca** no Kanban, a busca deve rodar **no servidor**, varrendo **todos** os deals do pipeline (não só os 100 carregados), incluindo **telefone normalizado** e **número do deal**.

## Restrições

- NÃO commitar na `main`. Branch separada + PR.
- Mudança **somente frontend** (`frontend_crm1`).
- Não alterar o comportamento quando **não há** busca (preservar cache/refetch atuais).

---

## O que já existe no backend (NÃO precisa mudar)

`POST /api/pipelines/:id/board` já aceita `filters` e faz busca server-side com telefone normalizado + número do deal:

- Rota: `backend_crm1/src/app/api/pipelines/[id]/board/route.ts:96-164` (POST chama `getBoardData(pipelineId, visibilityOwnerId, statusFilter, filters, limitOptions)`).
- Busca server-side: `backend_crm1/src/services/kanban-filters.ts:327-354` (campos: `title`, `contact.name`, `contact.email`, `contact.phone`, telefone por dígitos via `findContactIdsByPhoneDigits`, e `number` quando a busca é numérica).
- Parser do body: `parseAdvancedDealFilters(body.filters)` — o campo é `filters.search` (string).

> Confirmar com leitura rápida que `parseAdvancedDealFilters` mapeia `body.filters.search` para `AdvancedDealFilters.search` (em `backend_crm1/src/services/kanban-filters.ts`).

---

## Alterações no frontend (`frontend_crm1`)

### 1. Adicionar `getBoardFiltered` (POST) na API do board

**Arquivo:** `frontend_crm1/src/features/pipeline-v2/api/board.ts` (adicionar sem alterar `getBoard`):

```ts
import type { AdvancedDealFilters } from "@/components/pipeline/kanban-filters/types"; // confirmar caminho

/** POST /api/pipelines/:id/board — busca/filtragem server-side (varre todo o pipeline). */
export async function getBoardFiltered(
  pipelineId: string,
  opts: {
    status?: StatusFilter;
    filters?: AdvancedDealFilters;
    sort?: BoardSortParam;
    perStage?: number;
  },
): Promise<BoardStageDto[]> {
  const body: Record<string, unknown> = {};
  if (opts.status && opts.status !== "OPEN") body.status = opts.status;
  else body.status = "ALL"; // Kanban V2 usa ALL (ver BOARD_STATUS)
  if (opts.filters) body.filters = opts.filters;
  if (opts.sort) { body.sort = opts.sort.field; body.direction = opts.sort.direction; }
  if (opts.perStage) body.perStage = opts.perStage;

  const res = await fetch(apiUrl(`/api/pipelines/${pipelineId}/board`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Erro ao buscar no quadro");
  }
  if (Array.isArray(data)) return data as BoardStageDto[];
  return (Array.isArray(data.stages) ? data.stages : []) as BoardStageDto[];
}
```

Exportar em `frontend_crm1/src/features/pipeline-v2/api/index.ts`.

### 2. Hook de busca server-side

**Arquivo:** `frontend_crm1/src/features/pipeline-v2/hooks/use-board.ts`

```ts
export function useBoardSearch(params: {
  pipelineId: string | null;
  status: StatusFilter;
  search: string;            // já debounced
  sort?: BoardSortParam;
  enabled?: boolean;
}) {
  const term = params.search.trim();
  return useQuery<BoardStageDto[]>({
    queryKey: ["pipeline-board-search", params.pipelineId ?? "__none__", params.status, term, params.sort ? `${params.sort.field}:${params.sort.direction}` : "default"],
    queryFn: () => getBoardFiltered(params.pipelineId ?? "pl-1", {
      status: params.status,
      filters: { search: term },
      sort: params.sort,
      perStage: 200, // matches por coluna costumam ser poucos
    }),
    enabled: (params.enabled ?? true) && !!params.pipelineId && term.length >= 2,
    staleTime: 10_000,
  });
}
```

### 3. Usar o board do servidor quando houver busca

**Arquivo:** `frontend_crm1/src/app/(app)/pipeline/_v2-client.tsx`

Estado existente:
- `const [search, setSearch] = useState("")` (linha 188)
- `const [filters, setFilters] = useState<AdvancedDealFilters>({})` (linha 186)
- `const { data: board = [] } = useBoard({ pipelineId, status, sort: boardSort, enabled })` (linha 230)
- Filtro client-side em `filteredBoard` (linhas 316-386); haystack de texto em 341-344.

a) Termo debounced (≥300ms):

```ts
const effectiveSearch = (filters.search ?? search).trim();
const debouncedSearch = useDebouncedValue(effectiveSearch, 300); // criar hook se não existir
const hasServerSearch = debouncedSearch.length >= 2;
```

b) Escolher a fonte do board:

```ts
const boardQuery = useBoard({ pipelineId, status, sort: boardSort, enabled: isAuthenticated && !hasServerSearch });
const searchQuery = useBoardSearch({ pipelineId, status, search: debouncedSearch, sort: boardSort, enabled: isAuthenticated && hasServerSearch });

const board = hasServerSearch ? (searchQuery.data ?? []) : (boardQuery.data ?? []);
```

> `useBoard` com `enabled: !hasServerSearch` evita refetch concorrente e preserva cache do board normal. Ao limpar a busca, volta ao board paginado.

c) Evitar dupla filtragem de texto. Quando `hasServerSearch` é true, o servidor já filtrou; o bloco client-side (341-344) re-filtra sem normalizar telefone e descartaria matches por telefone/número. Ajustar:

```ts
// dentro de filteredBoard:
const hasSearch = q.length > 0 && !hasServerSearch;
```

Demais filtros client-side (owner, tag, stage, valor) permanecem.

d) Loading/empty: usar `searchQuery.isLoading` para spinner e mensagem "nenhum resultado" quando `hasServerSearch && board` vazio.

### 4. (Opcional) Indicar limite atingido

Se uma coluna retornar exatamente `perStage` (200) em modo busca, exibir aviso "refine a busca" no rodapé da coluna.

---

## Casos de borda a validar

1. Telefone formatado (`+55 (11) 99697-8282`) e dígitos (`11996978282`) → ambos acham.
2. Número do deal (`4129`) → acha.
3. Deal LOST (Eduardo Tang) → aparece na coluna "Perdido" (status=ALL) mesmo sendo 912º.
4. Limpar busca → volta ao board paginado, sem flicker nem perda de cache.
5. Filtros avançados + busca juntos → owner/tag/stage/valor aplicam client-side sobre o resultado server-side. (Futuro: mandar tudo no `filters` do POST.)
6. Visibilidade por owner (MEMBER "own") → POST já aplica `visibilityOwnerId`.
7. Drag-and-drop durante busca → garantir invalidação da key `["pipeline-board-search", ...]` em `use-deal-mutations.ts` OU desabilitar DnD no modo busca.
8. Debounce evita rajada de requests.
9. Performance: `findContactIdsByPhoneDigits` usa `regexp_replace`; comportamento já existente no caminho legado.

---

## Plano de testes (manual, staging/preview)

- Buscar `Ederson Fontes` → card #4129 aparece (antes não aparecia).
- Buscar `Eduardo Tang` → card #1326 aparece na coluna "Perdido".
- Buscar `11996978282` e `996978282` → acha Eduardo.
- Buscar `4129` → acha por número.
- Limpar a busca → board volta ao normal (100/coluna), sem erro.
- Buscar string inexistente → "nenhum resultado", sem quebrar colunas.
- Logado como MEMBER (visibilidade "próprios") → não vê deals de outros.

---

## Rollback

Mudança isolada no frontend, ativada apenas quando há texto de busca. Rollback = reverter os 3 arquivos (`board.ts`, `use-board.ts`, `_v2-client.tsx`). Sem migração de banco, sem mudança de API. Comportamento sem busca permanece idêntico.

---

## Arquivos a alterar (resumo)

| Arquivo | Mudança |
|---|---|
| `frontend_crm1/src/features/pipeline-v2/api/board.ts` | + `getBoardFiltered` (POST) |
| `frontend_crm1/src/features/pipeline-v2/api/index.ts` | exportar `getBoardFiltered` |
| `frontend_crm1/src/features/pipeline-v2/hooks/use-board.ts` | + `useBoardSearch` |
| `frontend_crm1/src/app/(app)/pipeline/_v2-client.tsx` | escolher board (normal vs busca), debounce, desligar filtro de texto client-side quando server-side ativo |

**Backend:** nenhuma alteração.

---

## Notas para o agente executor

- Confirmar caminho/forma do tipo `AdvancedDealFilters` no frontend (provável `@/components/pipeline/kanban-filters/types`) e que `filters.search` é aceito por `parseAdvancedDealFilters` no backend.
- Conferir se já existe hook de debounce antes de criar um novo.
- Rodar `npm install` + `npm run build` (ou `tsc`/lint) no `frontend_crm1` antes de abrir PR (clone pode estar sem `node_modules`).
- Branch separada, sem tocar a `main`. Abrir PR para revisão.
