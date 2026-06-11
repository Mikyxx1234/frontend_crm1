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

### 2026-06-11 — Sidebar catalog: itens novos para `/reports` e `/ai-agents`

- Arquivo: `src/lib/sidebar-catalog.ts` (frontend) e `backend/src/lib/sidebar-catalog.ts` (read-only nesta migração)
- Necessidade: expor `Relatórios` e `Agentes de IA` na NavRailV2 como itens primários, com `key` estável e validação backend
- Fallback: rotas `(app)/reports` e `(app)/ai-agents` criadas e funcionais, mas **não aparecem na NavRail**. Acesso via URL direta e via `/settings → IA & Agentes` (que aponta para `/ai-agents`)
- Impacto: descoberta reduzida — usuário precisa saber a URL. Sem regressão de permissão (telas legadas continuam no `/old/*` enquanto a Fase 6 não desibrida)
- Sugestão: na próxima janela de mudança no backend, adicionar ao `SIDEBAR_CATALOG` as keys `reports` (com `requiredPermission: "nav:reports"`) e `ai_agents` (com `requiredPermission: "nav:ai_agents"`), espelhar no frontend e criar as permissions correspondentes em `lib/authz/permissions.ts`

### Template

_(adicione novas decisões acima desta linha, em ordem cronológica decrescente)_
