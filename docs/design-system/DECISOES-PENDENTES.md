# Decisões pendentes do Design System v2

Registro de momentos em que o token "certo" não existe ainda — usamos o mais
próximo disponível e marcamos aqui. Ninguém cria token novo no meio de uma
migração; este arquivo vira a pauta de revisão do DS.

## Como registrar

Adicione uma entrada com:

- **Data** (ISO)
- **Tela / arquivo** onde a decisão foi tomada
- **Necessidade** (qual seria o token ideal)
- **Fallback aplicado** (qual token existente foi usado)
- **Impacto** (visual, contraste, acessibilidade)
- **Sugestão de token futuro** (opcional)

## Template

```md
### YYYY-MM-DD — <tela ou módulo>

- Arquivo: `caminho/relativo.tsx`
- Necessidade: <ex.: superfície "elevada" sobre o glass-bg-strong>
- Fallback: <ex.: `bg-[var(--glass-bg-overlay)] shadow-[var(--glass-shadow)]`>
- Impacto: <ex.: contraste OK em light/dark, mas levemente fora do padrão>
- Sugestão: <ex.: `--glass-bg-elevated`>
```

## Entradas

### 2026-06-11 — Empresas: campos CNPJ e E-mail sem coluna nativa no banco

- Arquivo: `src/app/(app)/companies/client-page.tsx` e `src/app/(app)/companies/[id]/client-page.tsx`
- Necessidade: colunas `cnpj` e `email` no model `Company` (Prisma). O produto exige os campos nativos Nome, Endereço, CNPJ, Telefone e E-mail
- Fallback: mapeamento de colunas existentes — **CNPJ → `size`** e **E-mail → `domain`** (rotulados corretamente apenas na UI). `name`, `phone` e `address` são nativos
- Impacto: dados persistem normalmente e o CRUD completo funciona; porém o significado das colunas `size`/`domain` no banco diverge do rótulo exibido. Integrações externas que leiam `size`/`domain` direto verão CNPJ/e-mail
- Sugestão: na próxima janela de mudança no backend, criar migração adicionando `cnpj String?` e `email String?` ao model `Company`, atualizar rotas `/api/companies*` e migrar os dados de `size`/`domain` para as novas colunas

### 2026-06-11 — Sidebar catalog: itens novos para `/reports` e `/ai-agents`

- Arquivo: `src/lib/sidebar-catalog.ts` (frontend) e `backend/src/lib/sidebar-catalog.ts` (read-only nesta migração)
- Necessidade: expor `Relatórios` e `Agentes de IA` na NavRailV2 como itens primários, com `key` estável e validação backend
- Fallback: rotas `(app)/reports` e `(app)/ai-agents` criadas e funcionais, mas **não aparecem na NavRail**. Acesso via URL direta e via `/settings → IA & Agentes` (que aponta para `/ai-agents`)
- Impacto: descoberta reduzida — usuário precisa saber a URL. Sem regressão de permissão (telas legadas continuam no `/old/*` enquanto a Fase 6 não desibrida)
- Sugestão: na próxima janela de mudança no backend, adicionar ao `SIDEBAR_CATALOG` as keys `reports` (com `requiredPermission: "nav:reports"`) e `ai_agents` (com `requiredPermission: "nav:ai_agents"`), espelhar no frontend e criar as permissions correspondentes em `lib/authz/permissions.ts`

### Template

_(adicione novas decisões acima desta linha, em ordem cronológica decrescente)_
