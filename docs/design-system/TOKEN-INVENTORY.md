# TOKEN-INVENTORY -- Vazamentos de Token no App

**Data:** 2026-05-22  
**Escopo:** `src/**/*.tsx,*.ts` (371 arquivos)  
**Fontes canonicas comparadas:**
- `src/app/globals.css` (@theme + :root + .dark)
- `src/lib/design-tokens.ts` (helper `dt.*`)
- `src/lib/dashboard-tokens.ts` (helpers de widgets)

**Stack:** Tailwind v4 + `@theme` + glassmorphism. Arquitetura hibrida: o DS e fonte de TOKENS, nao de classes CSS. Componentes seguem em Tailwind + cva.

**Convencoes desta auditoria:**
- `[ISOLADO]` -- vazamento em 1 unico arquivo (provavelmente NAO vira token).
- `[DECISAO]` -- opcoes listadas, nao decidido. Esperando call do Opus.
- `[CANONICO]` -- token ja existe em uma das 3 fontes; usar em vez de duplicar.
- Cores de marca de terceiros (WhatsApp/Instagram/Facebook) -> Apendice B (nao se misturam com tokens semanticos).

## Resumo executivo

| Categoria | Ocorrencias | Variacoes unicas | Severidade |
|---|---:|---:|:--:|
| Hex literais arbitrarios (`bg-[#xxx]`, `text-[#xxx]`) | 178 | 65 | ALTA |
| Hex inline (em strings JSX / style) | 400 | 101 | ALTA |
| Cores Tailwind nativas (`slate-400`, `zinc-500`...) | 2875 | 391 | MEDIA |
| `bg-white/<n>` (surface glass literal) | 125 | 19 | MEDIA |
| `border-white/<n>` (border glass literal) | 69 | 7 | MEDIA |
| Spacing/sizing arbitrario (`p-[Npx]`, `h-[Npx]`...) | 299 | 162 | MEDIA |
| Radius arbitrario (`rounded-[Npx]`) | 85 | 16 | BAIXA |
| Z-index hardcoded | 30 | 3 | ALTA (lacuna conceitual) |
| Duration hardcoded (`duration-200`, ...) | 48 | 6 | MEDIA (lacuna conceitual) |
| Backdrop blur (`backdrop-blur-*`) | 95 | 5 | BAIXA |
| Style inline com hex (`style={{ ... }}`) | 14 | 9 | BAIXA |

## Progresso por lote

Varredura executada em uma unica passada via script (eficiencia: 371 arquivos, ~5s). Os totais abaixo sao a fatia de cada lote do dataset agregado.

| Lote | Features | Arquivos com vazamento | Vazamentos catalogados |
|---|---|---:|---:|
| Lote 1 (pipeline) | pipeline | 25 | 802 |
| Lote 2 (inbox) | inbox | 19 | 861 |
| Lote 3 (automations) | automations | 19 | 617 |
| Lote 4 (dashboard/analytics/ai-agents) | dashboard, analytics, ai-agents | 23 | 363 |
| Lote 5 (contacts/companies/channels/sales-hub) | contacts, companies, channels, sales-hub | 13 | 378 |
| Lote 6 (ui) | ui | 10 | 126 |
| Lote 7 (app pages) | src/app/** | 46 | 990 |
| Lote 8 (resto) | lib, hooks, layout, etc. | 13 | 301 |

```
Lote 1 concluido: 25 arquivos varridos, 802 vazamentos catalogados.
Lote 2 concluido: 19 arquivos varridos, 861 vazamentos catalogados.
Lote 3 concluido: 19 arquivos varridos, 617 vazamentos catalogados.
Lote 4 concluido: 23 arquivos varridos, 363 vazamentos catalogados.
Lote 5 concluido: 13 arquivos varridos, 378 vazamentos catalogados.
Lote 6 concluido: 10 arquivos varridos, 126 vazamentos catalogados.
Lote 7 concluido: 46 arquivos varridos, 990 vazamentos catalogados.
Lote 8 concluido: 13 arquivos varridos, 301 vazamentos catalogados.
TOTAL: 168 arquivos com >=1 vazamento, 4438 vazamentos.
```

> **Nota metodologica:** o numero "vazamentos catalogados" soma todas as 12 categorias de scan (hex, tailwind colors, white/N, blur, arbitrary spacing, radius, z, duration, ring, style inline, etc.). Cores Tailwind nativas (slate-400 e similares) contam aqui mesmo nao sendo vazamento "tecnico" -- sao vazamentos semanticos.

---

## SECAO 1 -- Vazamentos de cor

### 1.A -- Hex arbitrario em utilities Tailwind (`text-[#xxx]`, `bg-[#xxx]`, etc.)

Cada linha agrupa hex + utility (pra distinguir, ex.: `#22c55e (bg)` vs `#22c55e (text)`).

| Hex (utility) | N | Features afetadas | Token existente | Token sugerido |
|---|---:|---|---|---|
| `#e2e8f0 (border)` | 14 | inbox:14 | -- | `--color-border-slate` ou usar `--color-border` (rgba w/55) |
| `#22c55e (bg)` | 10 | channels:4, inbox:3, app:settings:2, pipeline:1 | -- (existe `--color-success #10b981`, mas tom diferente) | `--color-status-online` ja existe (`#10b981`) OU criar `--color-success-vivid` |
| `#94a3b8 (text)` | 10 | inbox:10 | `--color-status-offline` | -- (usar token existente) |
| `#1e3a8a (to)` | 9 | automations:9 | -- | `--color-primary-deep` (badge contagem em nodes) |
| `#4466d6 (bg)` | 6 | app:settings:4, pwa:2 | -- | `--color-primary-hover` ou usar `--color-primary-dark` |
| `#1e293b (text)` | 6 | inbox:6 | -- | `--color-foreground-strong` ou usar `--color-foreground` (`#1e2a3b`) |
| `#64748b (text)` | 5 | inbox:4, app:settings:1 | -- | `--color-ink-soft` (`#4a5568`) ou criar `--color-ink-medium` |
| `#00d4aa (border)` | 5 | inbox:4, app:settings:1 | -- | [ISOLADO quick-actions-panel] usar `--color-success` |
| `#f8fafc (bg)` | 5 | inbox:4, lib:1 | -- | `--color-surface-soft` ou usar `--color-bg-subtle` |
| `#22c55e (text)` | 4 | channels:4 | -- (existe `--color-success #10b981`, mas tom diferente) | `--color-status-online` ja existe (`#10b981`) OU criar `--color-success-vivid` |
| `#f59e0b (bg)` | 4 | inbox:2, app:settings:2 | `--color-warning` | -- (usar token existente) |
| `#ef4444 (bg)` | 4 | inbox:4 | `--color-destructive` | -- (usar token existente) |
| `#eef2ff (bg)` | 3 | app:settings:3 | -- | [ISOLADO] avaliar caso a caso |
| `#00d4aa (bg)` | 3 | app:settings:3 | -- | [ISOLADO quick-actions-panel] usar `--color-success` |
| `#eef4ff (bg)` | 3 | automations:3 | `--color-primary-soft` (rgba) | `--color-primary-tint` (versao solida) [DECISAO] criar? |
| `#7b9bff (to)` | 2 | automations:2 | -- | `--color-primary-light-vivid` [ISOLADO em automations] |
| `#10b981 (bg)` | 2 | inbox:2 | `--color-success` | -- (usar token existente) |
| `#3b82f6 (text)` | 2 | inbox:1, sales-hub:1 | -- | usar `--color-info` ou `--color-channel-meta` |
| `#10b981 (text)` | 2 | inbox:2 | `--color-success` | -- (usar token existente) |
| `#e2e8f0 (bg)` | 2 | inbox:1, app:settings:1 | -- | `--color-border-slate` ou usar `--color-border` (rgba w/55) |
| `#06b6d4 (bg)` | 2 | pwa:1, app:settings:1 | `--color-cyan` | -- (usar token existente) |
| `#92600a (text)` | 2 | ui:2 | -- | `--color-warning-text` (contraste AA sobre warning-soft) |
| `#1e40af (bg)` | 2 | app:settings:2 | -- | `--color-primary-text-deep` ou aliasar `--color-primary-dark` |
| `#ef4444 (text)` | 2 | inbox:2 | `--color-destructive` | -- (usar token existente) |
| `#f4f7fa (bg)` | 2 | pipeline:1, app:settings:1 | -- | `--color-surface-soft-2` [DECISAO] consolidar com `#f8fafc`? |
| `#f59e0b (text)` | 2 | inbox:2 | `--color-warning` | -- (usar token existente) |
| `#2563eb (bg)` | 2 | inbox:2 | -- | `--color-blue-vivid` (botao record audio) [ISOLADO] |
| `#fbcfe8 (from)` | 1 | app:settings:1 | -- | [ISOLADO] avaliar caso a caso |
| `#e7ffdb (bg)` | 1 | ai-agents:1 | -- | [ISOLADO] avaliar caso a caso |
| `#0a3d5e (border)` | 1 | lib:1 | -- | `--workspace-header-border` |
| `#0b1221 (bg)` | 1 | app:dashboard:1 | -- | [ISOLADO] avaliar caso a caso |
| `#94a3b8 (bg)` | 1 | app:settings:1 | `--color-status-offline` | -- (usar token existente) |
| `#5a87ff (via)` | 1 | automations:1 | -- | [ISOLADO trigger-node] |
| `#a855f7 (text)` | 1 | sales-hub:1 | -- | usar `--color-lavender` |
| `#8b5cf6 (text)` | 1 | inbox:1 | -- | usar `--color-lavender` (`#a78bfa`) -- tom muito proximo |
| `#15803d (text)` | 1 | app:settings:1 | -- | [ISOLADO] avaliar caso a caso |
| `#f9a8d4 (to)` | 1 | app:settings:1 | -- | [ISOLADO] avaliar caso a caso |
| `#3730a3 (text)` | 1 | app:settings:1 | -- | [ISOLADO] avaliar caso a caso |
| `#f8faff (to)` | 1 | automations:1 | -- | `--color-surface-primary-tint` (tint do brand) |
| `#0f766e (text)` | 1 | app:settings:1 | -- | [ISOLADO] avaliar caso a caso |
| `#f0f4f8 (bg)` | 1 | app:automations:1 | -- | `--color-surface-soft-3` [DECISAO] consolidar com `#f8fafc`? |
| `#f97316 (text)` | 1 | sales-hub:1 | -- | `--color-orange` (criar) -- usado em deal-queue file icon |
| `#22c55e (border)` | 1 | channels:1 | -- (existe `--color-success #10b981`, mas tom diferente) | `--color-status-online` ja existe (`#10b981`) OU criar `--color-success-vivid` |
| `#a78bfa (from)` | 1 | ui:1 | `--color-lavender` / `--color-accent` | -- (usar token existente) |
| `#64748b (bg)` | 1 | app:settings:1 | -- | `--color-ink-soft` (`#4a5568`) ou criar `--color-ink-medium` |
| `#6f8cf5 (to)` | 1 | automations:1 | -- | `--color-primary-light` (consolidar com `#7b8df7`) |
| `#92400e (text)` | 1 | inbox:1 | -- | `--color-warning-text-dark` ou usar `--color-warning-text` |
| `#e2e8f0 (border-l)` | 1 | lib:1 | -- | `--color-border-slate` ou usar `--color-border` (rgba w/55) |
| `#3b82f6 (bg)` | 1 | inbox:1 | -- | usar `--color-info` ou `--color-channel-meta` |
| `#8b5cf6 (bg)` | 1 | inbox:1 | -- | usar `--color-lavender` (`#a78bfa`) -- tom muito proximo |
| `#f472b6 (to)` | 1 | ui:1 | `--color-pink` | -- (usar token existente) |
| `#1e40af (text)` | 1 | inbox:1 | -- | `--color-primary-text-deep` ou aliasar `--color-primary-dark` |
| `#fef3c7 (bg)` | 1 | inbox:1 | `--color-warning-soft` (rgba) | `--color-warning-tint` (versao solida) |
| `#eef4ff (from)` | 1 | automations:1 | `--color-primary-soft` (rgba) | `--color-primary-tint` (versao solida) [DECISAO] criar? |
| `#0f4c75 (bg)` | 1 | lib:1 | -- | `--workspace-header-bg` (escopo: petroleo do DealWorkspace) |
| `#ec4899 (text)` | 1 | sales-hub:1 | `--color-pink` (`#f472b6`) | consolidar com `--color-pink` |
| `#065f46 (text)` | 1 | ui:1 | -- | `--color-success-text` (contraste AA sobre success-soft) |
| `#06b6d4 (text)` | 1 | inbox:1 | `--color-cyan` | -- (usar token existente) |

### 1.B -- Hex em strings JSX e arquivos `.ts` (style inline, classNames concatenadas, helpers)

Inclui ocorrencias em `design-tokens.ts`, `dashboard-tokens.ts`, `chat-theme.ts` (ironicamente os helpers de tokens tem hex hardcoded).

| Hex | N | Features afetadas | Observacao |
|---|---:|---|---|
| `#94a3b8` | 27 | inbox:11, dashboard:4, pipeline:3, sales-hub:3, automations:2, analytics:2, app:settings:1, layout:1 | [ISOLADO] |
| `#e2e8f0` | 19 | inbox:15, lib:2, app:settings:1, analytics:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#22c55e` | 19 | channels:8, inbox:4, app:settings:3, pipeline:2, automations:1, analytics:1 | [ISOLADO] |
| `#10b981` | 15 | inbox:4, lib:4, dashboard:3, app:analytics:2, layout:1, analytics:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#f59e0b` | 14 | inbox:5, lib:4, app:settings:2, app:analytics:1, layout:1, automations:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#2563eb` | 13 | inbox:6, pipeline:6, app:settings:1 | [ISOLADO] |
| `#6366f1` | 12 | sales-hub:4, analytics:2, app:settings:2, app:campaigns:1, pipeline:1, lib:1, dashboard:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#3b82f6` | 11 | app:analytics:3, dashboard:2, inbox:2, pipeline:1, app:developers:1, sales-hub:1, app:settings:1 | [ISOLADO] |
| `#1e3a8a` | 11 | automations:9, app:accept-invite:1, app:onboarding:1 | [ISOLADO] |
| `#ef4444` | 10 | inbox:5, pipeline:1, app:developers:1, app:analytics:1, app:settings:1, dashboard:1 | [ISOLADO] |
| `#0d1b3e` | 9 | app:manifest.ts:4, app:apple-icon.tsx:1, app:icon.tsx:1, app:icon0.tsx:1, app:icon1.tsx:1, app:icon2.tsx:1 | [ISOLADO] |
| `#ffffff` | 8 | pipeline:3, lib:3, profile:1, sales-hub:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#8b5cf6` | 8 | inbox:2, analytics:2, app:analytics:1, lib:1, app:settings:1, dashboard:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#1e293b` | 7 | inbox:6, lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#475569` | 7 | pipeline:4, lib:2, inbox:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#06b6d4` | 7 | app:settings:2, inbox:1, app:analytics:1, pwa:1, automations:1, lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#6b7280` | 7 | pipeline:2, contacts:2, app:settings:2, inbox:1 | [ISOLADO] |
| `#f97316` | 7 | pipeline:3, analytics:1, dashboard:1, sales-hub:1, app:settings:1 | [ISOLADO] |
| `#7c3aed` | 7 | pipeline:3, analytics:2, inbox:1, app:settings:1 | [ISOLADO] |
| `#64748b` | 6 | inbox:3, app:settings:1, pipeline:1, analytics:1 | [ISOLADO] |
| `#4466d6` | 6 | app:settings:4, pwa:2 | [ISOLADO] |
| `#cbd5e1` | 6 | pipeline:3, automations:2, inbox:1 | [ISOLADO] |
| `#a78bfa` | 5 | lib:3, analytics:1, ui:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#0891b2` | 5 | pipeline:3, inbox:1, app:settings:1 | [ISOLADO] |
| `#db2777` | 5 | pipeline:3, inbox:1, app:settings:1 | [ISOLADO] |
| `#dc2626` | 5 | pipeline:3, inbox:1, app:settings:1 | [ISOLADO] |
| `#ec4899` | 5 | dashboard:1, analytics:1, app:settings:1, lib:1, sales-hub:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#e5e7eb` | 4 | app:analytics:2, dashboard:2 | [ISOLADO] |
| `#818cf8` | 4 | lib:3, analytics:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#a855f7` | 4 | analytics:1, sales-hub:1, app:settings:1, dashboard:1 | [ISOLADO] |
| `#16a34a` | 4 | pipeline:3, app:settings:1 | [ISOLADO] |
| `#f8fafc` | 4 | inbox:2, lib:2 | WARN: vazamento dentro dos arquivos de tokens |
| `#f43f5e` | 4 | analytics:1, lib:1, app:settings:1, dashboard:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#eef4ff` | 4 | automations:4 | [ISOLADO] |
| `#5b6ff5` | 3 | app:login:2, app:layout.tsx:1 | [ISOLADO] |
| `#eef2ff` | 3 | app:settings:3 | [ISOLADO] |
| `#1e40af` | 3 | app:settings:2, inbox:1 | [ISOLADO] |
| `#1a2238` | 3 | pipeline:3 | [ISOLADO] |
| `#00d4aa` | 3 | app:settings:3 | [ISOLADO] |
| `#60a5fa` | 3 | lib:3 | WARN: vazamento dentro dos arquivos de tokens |
| `#fde047` | 2 | inbox:1, lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#f472b6` | 2 | inbox:1, analytics:1 | [ISOLADO] |
| `#f87171` | 2 | inbox:1, dashboard:1 | [ISOLADO] |
| `#eab308` | 2 | analytics:1, app:settings:1 | [ISOLADO] |
| `#f1f5f9` | 2 | lib:1, analytics:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#d946ef` | 2 | analytics:1, dashboard:1 | [ISOLADO] |
| `#fca5a5` | 2 | inbox:1, dashboard:1 | [ISOLADO] |
| `#92600a` | 2 | ui:2 | [ISOLADO] |
| `#f4f7fa` | 2 | pipeline:1, app:settings:1 | [ISOLADO] |
| `#14b8a6` | 2 | analytics:1, app:settings:1 | [ISOLADO] |
| `#fbbf24` | 2 | inbox:1, analytics:1 | [ISOLADO] |
| `#fbcfe8` | 1 | app:settings:1 | [ISOLADO] |
| `#93c5fd` | 1 | inbox:1 | [ISOLADO] |
| `#0f4c75` | 1 | lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#1e3a5f` | 1 | lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#6f8cf5` | 1 | automations:1 | [ISOLADO] |
| `#0d9488` | 1 | app:settings:1 | [ISOLADO] |
| `#fee2e2` | 1 | dashboard:1 | [ISOLADO] |
| `#d8b4fe` | 1 | inbox:1 | [ISOLADO] |
| `#a3a3a3` | 1 | inbox:1 | [ISOLADO] |
| `#dbeafe` | 1 | lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#f5f3ff` | 1 | lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#334155` | 1 | app:settings:1 | [ISOLADO] |
| `#059669` | 1 | inbox:1 | [ISOLADO] |
| `#efeae2` | 1 | lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#065f46` | 1 | ui:1 | [ISOLADO] |
| `#fecaca` | 1 | dashboard:1 | [ISOLADO] |
| `#0a3d5e` | 1 | lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#c4b5fd` | 1 | inbox:1 | [ISOLADO] |
| `#0f766e` | 1 | inbox:1 | [ISOLADO] |
| `#ea580c` | 1 | app:settings:1 | [ISOLADO] |
| `#bef264` | 1 | inbox:1 | [ISOLADO] |
| `#f8faff` | 1 | automations:1 | [ISOLADO] |
| `#fcd34d` | 1 | inbox:1 | [ISOLADO] |
| `#ca8a04` | 1 | app:settings:1 | [ISOLADO] |
| `#f0f4f8` | 1 | app:automations:1 | [ISOLADO] |
| `#67e8f9` | 1 | inbox:1 | [ISOLADO] |
| `#854d0e` | 1 | lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#e7ffdb` | 1 | ai-agents:1 | [ISOLADO] |
| `#5eead4` | 1 | inbox:1 | [ISOLADO] |
| `#111b21` | 1 | lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#fefce8` | 1 | lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#c9d7f5` | 1 | automations:1 | [ISOLADO] |
| `#0f172a` | 1 | pipeline:1 | [ISOLADO] |
| `#5a87ff` | 1 | automations:1 | [ISOLADO] |
| `#6d28d9` | 1 | lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#3370ff` | 1 | analytics:1 | [ISOLADO] |
| `#84cc16` | 1 | app:settings:1 | [ISOLADO] |
| `#7b9bff` | 1 | automations:1 | [ISOLADO] |
| `#4f46e5` | 1 | app:settings:1 | [ISOLADO] |
| `#d6d3d1` | 1 | inbox:1 | [ISOLADO] |
| `#a5b4fc` | 1 | inbox:1 | [ISOLADO] |
| `#86efac` | 1 | inbox:1 | [ISOLADO] |
| `#dde8f5` | 1 | app:layout.tsx:1 | [ISOLADO] |
| `#d9fdd3` | 1 | lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#fef3c7` | 1 | inbox:1 | [ISOLADO] |
| `#d97706` | 1 | inbox:1 | [ISOLADO] |
| `#e8f4f8` | 1 | lib:1 | WARN: vazamento dentro dos arquivos de tokens |
| `#0b1221` | 1 | app:dashboard:1 | [ISOLADO] |

### 1.C -- Cores Tailwind nativas (vazamento semantico)

Nao e vazamento tecnico (Tailwind oferece essas cores out-of-the-box), mas e **vazamento semantico**: o app esta pulando a camada de tokens e indo direto na paleta crua. Isso impede que mudancas de tema propaguem.

Top 30 utilities mais usadas (de **391 unicas**, **1173 ocorrencias totais**):

| Classe Tailwind | Ocorrencias | Features afetadas (top) | Token semantico sugerido |
|---|---:|---|---|
| `text-slate-500` | 179 | pipeline:48, inbox:45, automations:34, app:settings:19, analytics:8, app:tasks:4, sales-hub:4, lib:4, ui:3, pwa:3, app:developers:1, app:global-error.tsx:1, profile:1, onboarding:1, app:analytics:1, app:error.tsx:1, contacts:1 | `text-ink-soft` (token `--color-ink-soft`) |
| `border-slate-100` | 89 | automations:26, inbox:19, pipeline:15, app:settings:10, sales-hub:6, lib:5, ui:3, analytics:2, app:analytics:2, onboarding:1 | `border-border-soft` (token `--color-border-soft`) |
| `text-slate-900` | 87 | pipeline:19, automations:16, app:settings:16, inbox:11, analytics:6, lib:5, profile:3, pwa:2, ui:2, app:error.tsx:1, app:global-error.tsx:1, app:analytics:1, app:inbox:1, app:tasks:1, onboarding:1, contacts:1 | `text-foreground` (token `--color-foreground`) |
| `bg-slate-50` | 76 | inbox:59, pipeline:13, sales-hub:3, ui:1 | `bg-bg-subtle` ou usar `--color-bg-subtle` |
| `bg-slate-100` | 70 | pipeline:17, inbox:13, automations:6, ui:6, app:settings:6, lib:5, sales-hub:5, pwa:4, analytics:3, profile:1, app:pipeline:1, app:reports:1, dashboard:1, app:analytics:1 | `bg-bg-muted` ou aliasar `--color-muted` |
| `text-emerald-700` | 56 | pipeline:15, automations:11, inbox:8, contacts:5, app:settings:3, app:reports:3, ai-agents:2, app:developers:1, app:pipeline:1, app:contacts:1, app:ai-agents:1, app:dashboard:1, app:tasks:1, lib:1, dashboard:1, sales-hub:1 | `text-success` (`--color-success`) |
| `text-emerald-600` | 53 | dashboard:11, pipeline:10, app:settings:8, inbox:7, contacts:6, automations:3, app:reports:2, app:analytics:2, lib:1, app:tasks:1, app:campaigns:1, analytics:1 | `text-success` (`--color-success`) |
| `bg-emerald-50` | 51 | pipeline:13, automations:12, inbox:6, app:settings:5, contacts:3, lib:2, dashboard:2, app:reports:2, app:pipeline:1, features:1, sales-hub:1, layout:1, app:tasks:1, analytics:1 | `bg-success-soft` (`--color-success-soft`) |
| `text-slate-400` | 48 | inbox:25, sales-hub:9, ui:6, pipeline:5, lib:3 | `text-ink-muted` (token `--color-ink-muted`) |
| `text-slate-800` | 46 | pipeline:20, inbox:13, app:settings:5, automations:4, sales-hub:2, ai-agents:1, app:pipeline:1 | `text-foreground` (token `--color-foreground`) |
| `bg-amber-50` | 43 | inbox:9, app:settings:7, automations:7, pipeline:5, ai-agents:3, app:ai-agents:2, app:reports:2, lib:2, layout:2, dashboard:2, app:tasks:1, contacts:1 | `bg-warning-soft` |
| `bg-emerald-500` | 39 | dashboard:7, inbox:6, pipeline:6, automations:4, app:campaigns:3, app:settings:3, app:analytics:2, ai-agents:2, contacts:2, app:pipeline:1, app:dashboard:1, layout:1, sales-hub:1 | [DECISAO] mapear se virar familia semantica |
| `text-slate-300` | 39 | pipeline:13, inbox:9, sales-hub:7, ui:4, app:settings:3, onboarding:1, contacts:1, automations:1 | `text-ink-subtle` (token `--color-ink-subtle`) |
| `bg-slate-900` | 36 | pipeline:9, inbox:7, lib:4, automations:3, sales-hub:3, app:settings:3, onboarding:2, app:developers:1, app:global-error.tsx:1, app:error.tsx:1, dashboard:1, ui:1 | [DECISAO] mapear se virar familia semantica |
| `bg-rose-50` | 34 | automations:22, pipeline:6, lib:2, sales-hub:1, analytics:1, inbox:1, app:settings:1 | `bg-destructive-soft` |
| `bg-blue-50` | 34 | pipeline:9, inbox:4, app:settings:4, app:pipeline:4, sales-hub:3, automations:3, lib:3, channels:1, dashboard:1, contacts:1, app:automations:1 | `bg-primary-soft` (`--color-primary-soft`) |
| `bg-indigo-50` | 31 | ai-agents:15, pipeline:5, app:ai-agents:4, app:contacts:2, automations:2, inbox:1, lib:1, app:settings:1 | `bg-primary-soft` (`--color-primary-soft`) |
| `text-amber-700` | 31 | inbox:8, pipeline:5, automations:4, dashboard:4, app:settings:2, app:reports:2, app:pipeline:1, app:developers:1, contacts:1, ai-agents:1, layout:1, lib:1 | `text-warning` |
| `text-blue-700` | 30 | pipeline:10, app:pipeline:5, app:settings:3, inbox:3, app:automations:2, lib:2, sales-hub:2, app:developers:1, automations:1, contacts:1 | `text-primary` |
| `bg-blue-500` | 30 | pipeline:7, app:pipeline:6, channels:4, app:settings:3, app:analytics:2, contacts:2, inbox:2, dashboard:2, sales-hub:1, automations:1 | [DECISAO] mapear se virar familia semantica |
| `bg-red-50` | 30 | pipeline:9, app:settings:6, inbox:5, app:pipeline:3, dashboard:2, layout:1, automations:1, ai-agents:1, app:tasks:1, contacts:1 | `bg-destructive-soft` |
| `text-blue-600` | 30 | pipeline:9, inbox:7, sales-hub:4, automations:3, app:settings:2, channels:1, dashboard:1, app:reports:1, app:analytics:1, app:automations:1 | `text-primary` |
| `text-amber-600` | 29 | dashboard:6, inbox:6, channels:3, app:settings:3, app:analytics:2, pipeline:2, automations:2, app:reports:1, app:dashboard:1, lib:1, layout:1, app:campaigns:1 | `text-warning` |
| `bg-amber-500` | 27 | dashboard:7, automations:5, channels:3, pipeline:3, contacts:2, app:campaigns:2, inbox:2, app:pipeline:1, ai-agents:1, layout:1 | [DECISAO] mapear se virar familia semantica |
| `ring-indigo-500` | 26 | ai-agents:12, app:settings:4, inbox:4, contacts:2, pipeline:2, app:ai-agents:2 | [DECISAO] mapear se virar familia semantica |
| `bg-indigo-950` | 25 | ai-agents:15, app:ai-agents:5, app:contacts:2, inbox:1, pipeline:1, app:settings:1 | [DECISAO] mapear se virar familia semantica |
| `bg-emerald-100` | 25 | pipeline:6, app:settings:4, ai-agents:3, app:reports:3, inbox:3, app:ai-agents:2, sales-hub:1, contacts:1, app:developers:1, app:contacts:1 | `bg-success-soft` (`--color-success-soft`) |
| `bg-slate-800` | 24 | inbox:10, sales-hub:6, pipeline:3, app:global-error.tsx:1, lib:1, app:settings:1, app:error.tsx:1, layout:1 | [DECISAO] mapear se virar familia semantica |
| `text-indigo-600` | 24 | pipeline:8, ai-agents:6, inbox:4, app:settings:2, app:ai-agents:2, app:reports:1, lib:1 | `text-primary` |
| `text-rose-500` | 23 | automations:11, inbox:8, pipeline:2, app:settings:1, dashboard:1 | `text-destructive` |

> As 361 restantes (cores Tailwind unicas com baixo uso) estao no **Apendice A**.

---

## SECAO 2 -- Vazamentos de superficie (glass)

### 2.A -- `bg-white/<n>` (superficie glass literal)

| Classe | N | Features afetadas | Token glass equivalente |
|---|---:|---|---|
| `bg-white/40` | 17 | inbox:4, ui:4, app:layout.tsx:3, layout:3, dashboard:2, pipeline:1 | `--glass-bg-strong` (0.40) / `--color-bg-subtle` (0.35) / `--color-card` (0.40) |
| `bg-white/70` | 11 | pipeline:3, inbox:3, layout:2, ui:2, automations:1 | `--color-popover` (0.75) [DECISAO] criar `--glass-bg-overlay-strong`? |
| `bg-white/60` | 11 | automations:3, app:settings:2, layout:2, ui:2, analytics:1, inbox:1 | `--color-bg-hover` (0.55) / `--glass-bg-overlay` (0.60) |
| `bg-white/5` | 11 | inbox:4, app:dashboard:4, layout:2, automations:1 | -- |
| `bg-white/55` | 10 | inbox:5, app:login:2, pipeline:2, ui:1 | `--color-bg-hover` (0.55) / `--glass-bg-overlay` (0.60) |
| `bg-white/10` | 9 | app:dashboard:4, automations:2, app:pipeline:1, lib:1, inbox:1 | -- |
| `bg-white/20` | 8 | automations:3, app:accept-invite:2, app:onboarding:2, app:settings:1 | `--glass-bg` (0.25) |
| `bg-white/30` | 7 | pipeline:2, app:login:2, layout:2, ui:1 | `--glass-bg-strong` (0.40) / `--color-bg-subtle` (0.35) / `--color-card` (0.40) |
| `bg-white/75` | 7 | inbox:3, ui:2, layout:1, pipeline:1 | `--color-popover` (0.75) [DECISAO] criar `--glass-bg-overlay-strong`? |
| `bg-white/85` | 6 | pipeline:3, automations:2, layout:1 | [DECISAO] nao ha token >0.60; criar familia `--glass-opaque-*`? |
| `bg-white/80` | 6 | inbox:2, app:pipeline:2, automations:1, pipeline:1 | [DECISAO] nao ha token >0.60; criar familia `--glass-opaque-*`? |
| `bg-white/95` | 6 | pipeline:2, automations:2, inbox:1, app:settings:1 | usar branco solido (`bg-white`) -- opacidade tao alta perde efeito glass |
| `bg-white/45` | 5 | inbox:2, dashboard:1, pipeline:1, ui:1 | `--color-bg-muted` (0.45) |
| `bg-white/15` | 3 | automations:3 | `--glass-bg-subtle` (0.12) |
| `bg-white/90` | 2 | pipeline:1, automations:1 | [DECISAO] nao ha token >0.60; criar familia `--glass-opaque-*`? |
| `bg-white/35` | 2 | pipeline:1, ui:1 | `--glass-bg-strong` (0.40) / `--color-bg-subtle` (0.35) / `--color-card` (0.40) |
| `bg-white/65` | 2 | inbox:1, pipeline:1 | `--color-popover` (0.75) [DECISAO] criar `--glass-bg-overlay-strong`? |
| `bg-white/50` | 1 | ui:1 | `--color-bg-muted` (0.45) |
| `bg-white/8` | 1 | inbox:1 | -- |

### 2.B -- `border-white/<n>`

| Classe | N | Features afetadas | Token equivalente |
|---|---:|---|---|
| `border-white/55` | 26 | ui:9, inbox:6, pipeline:5, layout:3, app:login:2, dashboard:1 | `--color-border` (0.55) / `--glass-border` (0.55) |
| `border-white/40` | 20 | inbox:6, pipeline:4, ui:4, layout:3, dashboard:2, app:login:1 | `--color-border-soft` (0.35) / `--glass-border-subtle` (0.30) |
| `border-white/10` | 10 | inbox:4, app:dashboard:4, automations:1, lib:1 | -- |
| `border-white/60` | 5 | automations:5 | `--color-border` (0.55) / `--glass-border` (0.55) |
| `border-white/30` | 5 | pipeline:4, inbox:1 | `--glass-border-subtle` (0.30) |
| `border-white/20` | 2 | ui:1, automations:1 | `--glass-border-subtle` (0.30) |
| `border-white/5` | 1 | inbox:1 | -- |

### 2.C -- `backdrop-blur-*`

Tokens existentes (`:root`): `--glass-blur` blur(16px), `--glass-blur-strong` blur(24px), `--glass-blur-subtle` blur(8px).

| Classe | N | Features afetadas | Token equivalente |
|---|---:|---|---|
| `backdrop-blur` | 32 | inbox:9, pipeline:7, app:login:4, ui:3, analytics:2, automations:2, layout:2, app:pipeline:1, app:settings:1, lib:1 | -- |
| `backdrop-blur-md` | 23 | pipeline:7, inbox:6, automations:3, ui:3, app:pipeline:2, dashboard:1, layout:1 | `--glass-blur` (16px) |
| `backdrop-blur-xl` | 20 | layout:6, automations:6, pipeline:4, inbox:2, ui:2 | `--glass-blur-strong` (24px) |
| `backdrop-blur-sm` | 19 | pipeline:6, ui:4, automations:3, onboarding:1, layout:1, app:pipeline:1, lib:1, inbox:1, dashboard:1 | `--glass-blur-subtle` (8px) |
| `backdrop-blur-lg` | 1 | pipeline:1 | `--glass-blur` (16px) ou `--glass-blur-strong` (24px) [DECISAO] |

---

## SECAO 3 -- Vazamentos de spacing/sizing

### 3.A -- Valores arbitrarios (`p-[Npx]`, `gap-[Npx]`, `h-[Npx]`...)

Top 50 (de **162 unicos**, **486 totais**):

| Valor | N | Features afetadas | Padrao sugerido |
|---|---:|---|---|
| `size-[18px]` | 14 | layout:8, inbox:3, app:settings:2, automations:1 | [ISOLADO] |
| `size-[24px]` | 9 | automations:9 | [ISOLADO] |
| `max-w-[200px]` | 6 | pipeline:3, inbox:1, channels:1, sales-hub:1 | [ISOLADO] |
| `max-w-[160px]` | 6 | sales-hub:3, inbox:2, pipeline:1 | [ISOLADO] |
| `min-w-[16px]` | 6 | pipeline:3, inbox:2, layout:1 | [ISOLADO] |
| `w-[300px]` | 5 | inbox:2, automations:1, pipeline:1, app:pipeline:1 | [ISOLADO] |
| `max-w-[92%]` | 4 | inbox:2, automations:2 | [ISOLADO] |
| `min-w-[960px]` | 4 | app:contacts:4 | [ISOLADO] |
| `max-w-[220px]` | 4 | app:analytics:2, pipeline:2 | [ISOLADO] |
| `max-h-[280px]` | 4 | inbox:2, sales-hub:2 | [ISOLADO] |
| `min-h-[44px]` | 4 | pipeline:2, contacts:2 | `--control-h-md` (criar familia `--control-h-sm/md/lg`) |
| `w-[240px]` | 4 | sales-hub:1, inbox:1, app:contacts:1, automations:1 | [ISOLADO] |
| `max-h-[85vh]` | 4 | ui:2, ai-agents:1, layout:1 | [ISOLADO] |
| `max-w-[280px]` | 3 | automations:2, inbox:1 | [ISOLADO] |
| `min-w-[200px]` | 3 | pipeline:1, automations:1, layout:1 | [ISOLADO] |
| `px-[9px]` | 3 | inbox:2, lib:1 | [ISOLADO] |
| `max-w-[270px]` | 3 | automations:3 | [ISOLADO] |
| `max-w-[260px]` | 3 | inbox:2, automations:1 | [ISOLADO] |
| `max-w-[120px]` | 3 | pipeline:2, sales-hub:1 | [ISOLADO] |
| `left-[15px]` | 3 | contacts:2, pipeline:1 | [ISOLADO] |
| `py-[5px]` | 3 | inbox:2, lib:1 | [ISOLADO] |
| `size-[300px]` | 3 | channels:3 | [ISOLADO] |
| `h-[76px]` | 3 | app:pipeline:3 | [ISOLADO] |
| `min-w-[210px]` | 3 | automations:3 | [ISOLADO] |
| `max-h-[320px]` | 3 | pipeline:2, app:settings:1 | [ISOLADO] |
| `min-h-[120px]` | 3 | pipeline:1, app:campaigns:1, features:1 | [ISOLADO] |
| `w-[280px]` | 3 | pipeline:1, ui:1, layout:1 | [ISOLADO] |
| `min-w-[220px]` | 3 | pipeline:2, inbox:1 | [ISOLADO] |
| `min-w-[230px]` | 3 | automations:3 | [ISOLADO] |
| `top-[calc(100%+6px)]` | 3 | pipeline:2, ui:1 | [ISOLADO] |
| `max-w-[320px]` | 3 | inbox:1, automations:1, app:settings:1 | [ISOLADO] |
| `translate-x-[18px]` | 2 | inbox:1, ai-agents:1 | [ISOLADO] |
| `h-[300px]` | 2 | analytics:2 | [ISOLADO] |
| `h-[2px]` | 2 | pipeline:1, sales-hub:1 | progress bar fino -- criar `--progress-h-sm/md`? |
| `max-w-[70%]` | 2 | pipeline:2 | [ISOLADO] |
| `max-w-[80%]` | 2 | ai-agents:2 | [ISOLADO] |
| `size-[420px]` | 2 | app:layout.tsx:2 | [ISOLADO] |
| `max-w-[1100px]` | 2 | inbox:2 | [ISOLADO] |
| `h-[calc(100%-0.25rem)]` | 2 | pipeline:1, contacts:1 | [ISOLADO] |
| `max-w-[min(100%,14rem)]` | 2 | pipeline:2 | [ISOLADO] |
| `w-[75%]` | 2 | pipeline:1, contacts:1 | [ISOLADO] |
| `max-h-[420px]` | 2 | inbox:2 | [ISOLADO] |
| `max-w-[85%]` | 2 | inbox:2 | [ISOLADO] |
| `w-[40%]` | 2 | pipeline:1, contacts:1 | [ISOLADO] |
| `max-w-[240px]` | 2 | inbox:2 | [ISOLADO] |
| `max-w-[88px]` | 2 | lib:2 | [ISOLADO] |
| `w-[100px]` | 2 | app:settings:2 | [ISOLADO] |
| `min-w-[180px]` | 2 | pipeline:2 | [ISOLADO] |
| `w-[calc(100vw-60px)]` | 2 | pipeline:1, contacts:1 | [ISOLADO] |
| `min-w-[208px]` | 2 | inbox:2 | [ISOLADO] |

> 112 valores arbitrarios restantes em **Apendice C**.

### 3.B -- Radius arbitrario (`rounded-[Npx]`)

Escala canonica em `@theme`: `--radius-sm` 6px, `--radius-md` 10px, `--radius-lg` 16px, `--radius-xl` 22px, `--radius-2xl` 32px.

| Valor | N | Features afetadas | Diagnostico |
|---|---:|---|---|
| `rounded-[4px]` | 14 | inbox:6, lib:5, pipeline:3 | WARN: uso EXTENSO em pills/tags do `dt.pill.*` -- [DECISAO] criar `--radius-xs` (4px)? |
| `rounded-[28px]` | 12 | app:settings:8, pipeline:2, automations:2 | [DECISAO] |
| `rounded-[22px]` | 12 | ui:4, pipeline:3, app:login:2, inbox:1, dashboard:1, layout:1 | bate com `--radius-xl` |
| `rounded-[32px]` | 9 | layout:4, ui:2, app:login:1, app:inbox:1, lib:1 | bate com `--radius-2xl` -- pode trocar pra `rounded-2xl` |
| `rounded-[16px]` | 7 | inbox:7 | bate com `--radius-lg` |
| `rounded-[20px]` | 5 | inbox:3, pwa:2 | [DECISAO] |
| `rounded-[10px]` | 5 | lib:3, ui:2 | bate com `--radius-md` -- pode trocar pra `rounded-md` |
| `rounded-[2px]` | 4 | lib:3, inbox:1 | cantos chat-bubble (`rounded-br-[2px]`); manter ou criar `--radius-xxs`? |
| `rounded-[24px]` | 4 | analytics:2, app:analytics:1, lib:1 | WARN: bento card grande -- [DECISAO] adicionar `--radius-3xl` 24px? (entre xl=22 e 2xl=32 nao cabe) |
| `rounded-[6px]` | 3 | app:settings:2, inbox:1 | bate com `--radius-sm` |
| `rounded-[12px]` | 3 | inbox:2, app:settings:1 | [DECISAO] |
| `rounded-[1px]` | 2 | app:settings:2 | [DECISAO] |
| `rounded-[18px]` | 2 | pipeline:2 | [DECISAO] |
| `rounded-[34px]` | 1 | app:settings:1 | [DECISAO] |
| `rounded-[14px]` | 1 | inbox:1 | [DECISAO] |
| `rounded-[44px]` | 1 | app:settings:1 | [DECISAO] |

---

## SECAO 4 -- Style inline (`style={{ ... }}`) com hex

| Hex | N | Features afetadas | Pode virar classe? |
|---|---:|---|---|
| `#6b7280` | 5 | pipeline:2, contacts:2, inbox:1 | [DECISAO] caso a caso (verificar se e animacao/efeito dinamico) |
| `#94a3b8` | 2 | sales-hub:2 | [DECISAO] caso a caso (verificar se e animacao/efeito dinamico) |
| `#1877f2` | 1 | channels:1 | [DECISAO] caso a caso (verificar se e animacao/efeito dinamico) |
| `#25d366` | 1 | channels:1 | [DECISAO] caso a caso (verificar se e animacao/efeito dinamico) |
| `#c9d7f5` | 1 | automations:1 | [DECISAO] caso a caso (verificar se e animacao/efeito dinamico) |
| `#5b6ff5` | 1 | app:layout.tsx:1 | [DECISAO] caso a caso (verificar se e animacao/efeito dinamico) |
| `#2563eb` | 1 | pipeline:1 | [DECISAO] caso a caso (verificar se e animacao/efeito dinamico) |
| `#cbd5e1` | 1 | pipeline:1 | [DECISAO] caso a caso (verificar se e animacao/efeito dinamico) |
| `#0f172a` | 1 | pipeline:1 | [DECISAO] caso a caso (verificar se e animacao/efeito dinamico) |

---

## SECAO 5 -- Tokens declarados mas pouco/nada usados

Cruzamento de tokens declarados em `globals.css` (@theme + :root) contra usos no codigo (`var(--xxx)`, utilities Tailwind correspondentes).

> **Limitacao do metodo:** alguns tokens com `0 usos` na tabela abaixo SAO usados dentro do proprio `globals.css` (ex.: `--glass-bg-subtle` e consumido pela classe `.glass-subtle`; `--glass-blur*` idem). O regex exclui `globals.css` da contagem pra evitar circularidade. Itens marcados WARN merecem inspecao manual antes de remover:
> - Tokens consumidos por classes utility em `globals.css` (`--glass-bg-subtle`, `--glass-blur-*`, `--bg-gradient`).
> - Tokens consumidos pelo `dt.*` helpers em `design-tokens.ts` (ex.: `chat.dateSep` usa `--color-success`, `--color-success-soft`, `--glass-shadow-sm` via class names).
> - Tokens semanticos com 0 usos REAIS (zumbis legitimos): `--color-chart-1..5`, `--color-channel-*` (canais ja usam hex literal -- ver Apendice B), `--color-status-away`, `--color-info-foreground`, `--color-secondary*`, `--color-warning-foreground`, `--color-cyan-soft`, `--color-pink-soft`.

| Token | Usos no codigo | Decisao sugerida |
|---|---:|---|
| `--color-channel-email` | 0 | WARN: remover OU justificar |
| `--color-channel-instagram` | 0 | WARN: remover OU justificar |
| `--color-channel-meta` | 0 | WARN: remover OU justificar |
| `--color-channel-whatsapp` | 0 | WARN: remover OU justificar |
| `--color-chart-1` | 0 | WARN: remover OU justificar |
| `--color-chart-2` | 0 | WARN: remover OU justificar |
| `--color-chart-3` | 0 | WARN: remover OU justificar |
| `--color-chart-4` | 0 | WARN: remover OU justificar |
| `--color-chart-5` | 0 | WARN: remover OU justificar |
| `--color-chat-bot-border` | 0 | WARN: remover OU justificar |
| `--color-chat-received` | 0 | WARN: remover OU justificar |
| `--color-chat-received-foreground` | 0 | WARN: remover OU justificar |
| `--color-cyan-soft` | 0 | WARN: remover OU justificar |
| `--color-info-foreground` | 0 | WARN: remover OU justificar |
| `--color-secondary` | 0 | WARN: remover OU justificar |
| `--color-secondary-foreground` | 0 | WARN: remover OU justificar |
| `--color-sidebar-foreground` | 0 | WARN: remover OU justificar |
| `--color-status-away` | 0 | WARN: remover OU justificar |
| `--color-status-offline` | 0 | WARN: remover OU justificar |
| `--color-warning-foreground` | 0 | WARN: remover OU justificar |
| `--glass-bg-subtle` | 0 | WARN: remover OU justificar |
| `--glass-blur-strong` | 0 | WARN: remover OU justificar |
| `--glass-blur-subtle` | 0 | WARN: remover OU justificar |
| `--bg-gradient` | 1 | sub-utilizado -- avaliar consolidacao |
| `--chat-bubble-received-time` | 1 | sub-utilizado -- avaliar consolidacao |
| `--chat-bubble-sent-bg` | 1 | sub-utilizado -- avaliar consolidacao |
| `--color-card-foreground` | 1 | sub-utilizado -- avaliar consolidacao |
| `--color-chat-bot` | 1 | sub-utilizado -- avaliar consolidacao |
| `--color-chat-bot-foreground` | 1 | sub-utilizado -- avaliar consolidacao |
| `--color-chat-sent-foreground` | 1 | sub-utilizado -- avaliar consolidacao |
| `--color-destructive-foreground` | 1 | sub-utilizado -- avaliar consolidacao |
| `--color-lavender-foreground` | 1 | sub-utilizado -- avaliar consolidacao |
| `--color-lavender-muted` | 1 | sub-utilizado -- avaliar consolidacao |
| `--color-lavender-soft` | 1 | sub-utilizado -- avaliar consolidacao |
| `--color-pink-soft` | 1 | sub-utilizado -- avaliar consolidacao |
| `--color-success-foreground` | 1 | sub-utilizado -- avaliar consolidacao |
| `--glass-blur` | 1 | sub-utilizado -- avaliar consolidacao |
| `--chat-bubble-received-text` | 2 | sub-utilizado -- avaliar consolidacao |
| `--chat-bubble-sent-check-read` | 2 | sub-utilizado -- avaliar consolidacao |
| `--color-accent-foreground` | 2 | sub-utilizado -- avaliar consolidacao |
| `--color-destructive-soft` | 2 | sub-utilizado -- avaliar consolidacao |
| `--color-ink-subtle` | 2 | sub-utilizado -- avaliar consolidacao |
| `--color-surface-foreground` | 2 | sub-utilizado -- avaliar consolidacao |
| `--shadow-green-glow` | 2 | sub-utilizado -- avaliar consolidacao |

> Helpers em `design-tokens.ts` / `dashboard-tokens.ts` nao foram cruzados aqui (sao string-templates, dificil de medir por regex). Recomendo analise manual.

---

## SECAO 6 -- Duplicacoes de token (mesmo valor, nomes diferentes)

### Surface translucida ~0.40 (mesmo valor visual)

Nomes equivalentes:
- `bg-white/40` (literal Tailwind)
- `--color-card` (rgba(255,255,255,0.40))
- `--color-secondary` (rgba(255,255,255,0.40))
- `--color-muted` (rgba(255,255,255,0.40))
- `--glass-bg-strong` (rgba(255,255,255,0.40))

**Canonico sugerido:** `--glass-bg-strong` (mais expressivo do intent)  
**Custo de unificar:** usar `--color-card` continua valido pra `<Card>`. Convergir os demais.

### Surface translucida ~0.35

Nomes equivalentes:
- `--color-bg-subtle` (rgba w/0.35)
- `--color-surface` (rgba w/0.35)
- `--color-border-soft` (rgba w/0.35)

**Canonico sugerido:** `--color-bg-subtle` (1 surface) + `--color-border-soft` (1 border) -- nao consolidar (papeis diferentes)  
**Custo de unificar:** so aliasar se necessario

### Sombra glass small

Nomes equivalentes:
- `--shadow-card-sm` (0 4px 16px rgba(100,130,180,0.12))
- `--shadow-md` (identico)
- `--glass-shadow-sm` (identico)

**Canonico sugerido:** `--shadow-card-sm` (semantico: usado em card)  
**Custo de unificar:** aliasar `--shadow-md` e `--glass-shadow-sm` ao `--shadow-card-sm` -- 3 nomes, 1 fonte

### Sombra glass medium

Nomes equivalentes:
- `--shadow-card` (0 8px 32px rgba(100,130,180,0.18))
- `--shadow-lg` (identico)
- `--glass-shadow` (identico)

**Canonico sugerido:** `--shadow-card`  
**Custo de unificar:** mesma tecnica acima

### Sombra glass large

Nomes equivalentes:
- `--shadow-xl` (0 16px 48px rgba(100,130,180,0.24))
- `--glass-shadow-lg` (identico)

**Canonico sugerido:** `--shadow-xl`  
**Custo de unificar:** aliasar

### Cor accent -- IA (lavender)

Nomes equivalentes:
- `--color-accent` (#a78bfa)
- `--color-lavender` (#a78bfa)

**Canonico sugerido:** `--color-lavender` (mais expressivo do brand)  
**Custo de unificar:** aliasar `--color-accent = var(--color-lavender)`

### Status success

Nomes equivalentes:
- `--color-success` (#10b981)
- `--color-status-online` (#10b981)

**Canonico sugerido:** `--color-success` (canonico de status) + `--color-status-online = var(--color-success)`  
**Custo de unificar:** baixo

### Primary / info / channel-email / ring

Nomes equivalentes:
- `--color-primary` (#5b6ff5)
- `--color-info` (#5b6ff5)
- `--color-channel-email` (#5b6ff5)
- `--color-ring` (#5b6ff5)

**Canonico sugerido:** `--color-primary`  
**Custo de unificar:** aliasar os demais. ATENCAO: se algum dia info/email mudarem (ex.: email vira gradient roxo), o alias precisa ser quebrado.

### Foreground / *-foreground (todos #1e2a3b no light)

Nomes equivalentes:
- `--color-foreground`
- `--color-card-foreground`
- `--color-popover-foreground`
- `--color-sidebar-foreground`
- `--color-secondary-foreground`
- `--color-chat-sent-foreground`
- `--color-chat-received-foreground`
- `--color-chat-bot-foreground`

**Canonico sugerido:** `--color-foreground`  
**Custo de unificar:** todos os `*-foreground` podem ser aliases no light. Mantelos nominados ajuda no dark (cada um pode divergir).

### Background solido + dropdown solid bg

Nomes equivalentes:
- `--dropdown-solid-bg` (#ffffff light / #1a2238 dark)
- `bg-white` literal

**Canonico sugerido:** `--dropdown-solid-bg` (ja e semantico)  
**Custo de unificar:** baixo

### Brand glow shadows

Nomes equivalentes:
- `--shadow-indigo-glow`
- literais `shadow-[0_14px_30px_-6px_rgba(...)]`

**Canonico sugerido:** `--shadow-indigo-glow` + criar variante `--shadow-indigo-glow-lg`  
**Custo de unificar:** baixo

---

## SECAO 7 -- Lacunas conceituais (padroes >=3x sem token)

### 7.A -- Escala de Z-index

Tailwind oferece z-0/10/.../50 + z-[N] arbitrario. Nao existe escala semantica em `@theme`.

| Valor | N | Features afetadas |
|---|---:|---|
| `z-50` | 27 | inbox:6, pipeline:6, ui:6, layout:3, sales-hub:2, contacts:2, dashboard:2 |
| `z-60` | 2 | pipeline:1, app:dashboard:1 |
| `z-70` | 1 | automations:1 |

**Familia sugerida** (espelhando `design-system.css` standalone):

```
--z-base:     0
--z-dropdown: 100
--z-sticky:   200
--z-modal:    1000
--z-popover:  1100
--z-tooltip:  1200
--z-toast:    1300
```

[DECISAO] expor como utilities Tailwind via `@theme` (`--z-*` vira `z-modal`, `z-popover` etc.) ou so como CSS vars?

### 7.B -- Durations / motion easings

| Valor | N | Features afetadas |
|---|---:|---|
| `duration-200` | 26 | automations:13, app:settings:4, ui:4, pipeline:2, inbox:2, app:analytics:1 |
| `duration-300` | 8 | lib:3, channels:1, onboarding:1, app:analytics:1, ui:1, dashboard:1 |
| `duration-150` | 7 | inbox:3, layout:1, pipeline:1, automations:1, app:settings:1 |
| `duration-500` | 5 | dashboard:3, app:analytics:2 |
| `duration-1000` | 1 | channels:1 |
| `duration-75` | 1 | pipeline:1 |

Hoje existe apenas `.lumen-transition` (200ms cubic-bezier(0.4,0,0.2,1)).

**Familia sugerida:**

```
--motion-fast:       150ms
--motion-base:       200ms
--motion-slow:       300ms
--motion-deliberate: 500ms
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1)
--ease-in:     cubic-bezier(0.4, 0, 1, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
```

### 7.C -- Focus ring

Existe `--color-ring: #5b6ff5` em `@theme` (gera `ring-ring`), mas nao ha token de "anel completo" (ring-N + color + offset).

| Classe | N | Features afetadas |
|---|---:|---|
| `ring-2` | 117 | automations:24, pipeline:14, ai-agents:12, app:settings:9, inbox:9, sales-hub:8, ui:7, app:pipeline:4, app:automations:4, channels:3, contacts:3, layout:3, lib:3, app:analytics:3, app:campaigns:2, app:ai-agents:2, dashboard:2, app:login:2, app:onboarding:1, profile:1, app:landing-client.tsx:1 |
| `ring-1` | 71 | automations:38, inbox:14, app:settings:5, layout:5, app:campaigns:2, pipeline:2, app:inbox:2, onboarding:2, dashboard:1 |
| `ring-offset-2` | 15 | ui:4, channels:3, app:campaigns:2, inbox:2, pipeline:1, app:automations:1, app:settings:1, contacts:1 |
| `ring-0` | 7 | pipeline:2, app:settings:2, app:automations:1, ui:1, automations:1 |
| `ring-offset-1` | 4 | app:settings:2, inbox:1, pipeline:1 |
| `ring-4` | 4 | layout:2, app:settings:1, channels:1 |
| `ring-offset-0` | 2 | inbox:2 |

**Sugestao:** token composto `--focus-ring: 0 0 0 3px rgba(91, 111, 245, 0.30)` aplicado via utility custom `.focus-ring` (ou `@apply` global em `:focus-visible`).

### 7.D -- Tipografia / escala numerica

`@theme` define `--font-sans/display/mono` mas **nao tem escala de tamanho** (`--text-xs`, etc.). O app usa `text-[Npx]` arbitrario massivamente (estimativa via subset arbSize):

| Padrao `text-[Npx]` | Ocorrencias estimadas |
|---|---:|
| `text-[10px]` | ~80 |
| `text-[11px]` | ~120 |
| `text-[12px]` | ~90 |
| `text-[13px]` | ~95 |

Contagens exatas requerem regex `text-\[Npx\]` (nao estava no escopo deste scan). Recomendo segunda passada se familia typographic for criada.

**Familia sugerida** (ja existe na CSS standalone):

```
--text-xs:   11px
--text-sm:   12px
--text-13:   13px  (preenche gap)
--text-base: 14px
--text-md:   15px
--text-lg:   17px
--text-xl:   22px
--text-2xl:  28px
--text-3xl:  40px
```

[DECISAO] expor via `@theme` (vira `text-13`, `text-md` etc.) ou so vars? Tailwind v4 ja tem `text-xs/sm/base/lg/xl/2xl`, pode haver colisao.

### 7.E -- Cor de fundo de painel SAC/Inbox (`text-[#1e293b]`)

`text-[#1e293b]` aparece 8x em `inbox/quick-actions-panel.tsx`. `#1e293b` ~ `slate-800`, mas o token canonico `--color-foreground` e `#1e2a3b` (proximo mas diferente). [DECISAO]: unificar pra `--color-foreground` ou criar `--color-foreground-strong`?

---

## Apendice A -- Long tail de cores Tailwind (uso <= 5)

| Classe | N | Features afetadas |
|---|---:|---|
| `accent-indigo-500` | 2 | app:ai-agents:1, ai-agents:1 |
| `accent-indigo-600` | 2 | app:contacts:2 |
| `bg-amber-900` | 5 | app:settings:3, pipeline:1, contacts:1 |
| `bg-blue-400` | 2 | app:reports:2 |
| `bg-blue-700` | 2 | inbox:1, lib:1 |
| `bg-blue-900` | 3 | pipeline:1, contacts:1, app:settings:1 |
| `bg-cyan-500` | 5 | dashboard:3, automations:1, channels:1 |
| `bg-cyan-950` | 1 | pipeline:1 |
| `bg-emerald-200` | 1 | app:settings:1 |
| `bg-emerald-400` | 2 | app:dashboard:2 |
| `bg-emerald-600` | 4 | app:tasks:2, app:settings:2 |
| `bg-emerald-900` | 3 | pipeline:1, contacts:1, app:contacts:1 |
| `bg-fuchsia-50` | 3 | automations:2, pipeline:1 |
| `bg-fuchsia-500` | 1 | automations:1 |
| `bg-fuchsia-950` | 1 | pipeline:1 |
| `bg-gray-300` | 1 | app:settings:1 |
| `bg-gray-50` | 4 | app:settings:3, pipeline:1 |
| `bg-gray-600` | 1 | app:settings:1 |
| `bg-gray-900` | 4 | app:settings:3, pipeline:1 |
| `bg-gray-950` | 1 | app:settings:1 |
| `bg-green-950` | 1 | pipeline:1 |
| `bg-indigo-400` | 3 | app:reports:2, ai-agents:1 |
| `bg-indigo-700` | 4 | contacts:2, inbox:1, pipeline:1 |
| `bg-lime-50` | 2 | pipeline:2 |
| `bg-lime-950` | 2 | pipeline:2 |
| `bg-orange-100` | 3 | pipeline:1, contacts:1, dashboard:1 |
| `bg-orange-50` | 3 | automations:2, pipeline:1 |
| `bg-orange-500` | 5 | contacts:2, inbox:1, pipeline:1, automations:1 |
| `bg-orange-900` | 2 | pipeline:1, contacts:1 |
| `bg-orange-950` | 1 | pipeline:1 |
| `bg-pink-100` | 2 | pipeline:1, contacts:1 |
| `bg-pink-50` | 2 | pipeline:1, automations:1 |
| `bg-pink-500` | 5 | contacts:2, dashboard:2, pipeline:1 |
| `bg-pink-900` | 2 | pipeline:1, contacts:1 |
| `bg-pink-950` | 1 | pipeline:1 |
| `bg-purple-100` | 4 | pipeline:1, contacts:1, ai-agents:1, app:developers:1 |
| `bg-purple-50` | 2 | pipeline:1, app:settings:1 |
| `bg-purple-500` | 3 | contacts:2, pipeline:1 |
| `bg-purple-900` | 2 | pipeline:1, contacts:1 |
| `bg-purple-950` | 3 | pipeline:1, ai-agents:1, app:settings:1 |
| `bg-red-400` | 1 | dashboard:1 |
| `bg-red-600` | 2 | pipeline:1, app:settings:1 |
| `bg-red-700` | 2 | pipeline:1, app:settings:1 |
| `bg-rose-100` | 3 | pipeline:2, sales-hub:1 |
| `bg-rose-500` | 5 | automations:2, pipeline:1, sales-hub:1, dashboard:1 |
| `bg-rose-600` | 1 | pipeline:1 |
| `bg-rose-700` | 1 | pipeline:1 |
| `bg-rose-950` | 1 | pipeline:1 |
| `bg-sky-100` | 2 | inbox:2 |
| `bg-sky-200` | 3 | app:reports:2, inbox:1 |
| `bg-sky-400` | 3 | app:reports:2, lib:1 |
| `bg-sky-950` | 2 | pipeline:1, app:settings:1 |
| `bg-slate-500` | 1 | pipeline:1 |
| `bg-slate-700` | 5 | sales-hub:3, onboarding:1, app:developers:1 |
| `bg-teal-400` | 2 | app:reports:2 |
| `bg-teal-50` | 3 | pipeline:1, app:reports:1, automations:1 |
| `bg-teal-950` | 1 | pipeline:1 |
| `bg-violet-100` | 3 | pipeline:3 |
| `bg-violet-400` | 3 | app:reports:2, automations:1 |
| `bg-violet-950` | 2 | pipeline:2 |
| `bg-yellow-50` | 2 | pipeline:2 |
| `bg-yellow-950` | 2 | pipeline:2 |
| `bg-zinc-50` | 3 | app:accept-invite:2, app:onboarding:1 |
| `bg-zinc-950` | 4 | app:accept-invite:2, app:onboarding:1, app:landing-client.tsx:1 |
| `border-amber-100` | 1 | pipeline:1 |
| `border-amber-400` | 5 | automations:3, pipeline:1, ai-agents:1 |
| `border-amber-700` | 4 | app:ai-agents:2, ai-agents:2 |
| `border-amber-800` | 2 | layout:1, app:settings:1 |
| `border-amber-900` | 2 | layout:1, app:settings:1 |
| `border-blue-100` | 2 | pipeline:1, app:automations:1 |
| `border-blue-600` | 5 | sales-hub:2, channels:2, app:pipeline:1 |
| `border-blue-900` | 1 | channels:1 |
| `border-cyan-100` | 2 | automations:2 |
| `border-cyan-200` | 1 | automations:1 |
| `border-cyan-300` | 1 | automations:1 |
| `border-cyan-400` | 3 | app:settings:2, automations:1 |
| `border-cyan-500` | 2 | channels:2 |
| `border-emerald-100` | 3 | inbox:2, pipeline:1 |
| `border-emerald-300` | 2 | pipeline:1, features:1 |
| `border-emerald-400` | 5 | pipeline:3, app:settings:1, contacts:1 |
| `border-emerald-600` | 1 | app:pipeline:1 |
| `border-emerald-800` | 2 | app:settings:2 |
| `border-fuchsia-300` | 1 | automations:1 |
| `border-fuchsia-400` | 1 | automations:1 |
| `border-gray-100` | 1 | app:analytics:1 |
| `border-gray-300` | 3 | app:settings:3 |
| `border-gray-50` | 1 | app:analytics:1 |
| `border-gray-600` | 2 | app:settings:2 |
| `border-gray-700` | 3 | app:settings:3 |
| `border-indigo-100` | 1 | pipeline:1 |
| `border-indigo-200` | 4 | pipeline:1, inbox:1, app:settings:1, ai-agents:1 |
| `border-indigo-300` | 3 | inbox:1, pipeline:1, app:contacts:1 |
| `border-indigo-600` | 2 | app:settings:2 |
| `border-indigo-700` | 1 | inbox:1 |
| `border-indigo-800` | 1 | inbox:1 |
| `border-indigo-900` | 2 | ai-agents:1, app:settings:1 |
| `border-orange-300` | 2 | automations:2 |
| `border-orange-400` | 2 | automations:2 |
| `border-pink-500` | 3 | channels:2, inbox:1 |
| `border-purple-200` | 1 | app:developers:1 |
| `border-red-100` | 1 | app:settings:1 |
| `border-red-400` | 2 | pipeline:2 |
| `border-red-600` | 1 | app:pipeline:1 |
| `border-red-800` | 2 | layout:1, app:settings:1 |
| `border-red-900` | 1 | layout:1 |
| `border-rose-100` | 2 | inbox:1, automations:1 |
| `border-rose-200` | 5 | pipeline:4, automations:1 |
| `border-rose-400` | 3 | automations:2, pipeline:1 |
| `border-rose-500` | 2 | pipeline:1, dashboard:1 |
| `border-sky-100` | 1 | inbox:1 |
| `border-sky-200` | 4 | app:reports:1, inbox:1, app:settings:1, automations:1 |
| `border-sky-300` | 2 | inbox:1, automations:1 |
| `border-sky-400` | 1 | automations:1 |
| `border-sky-900` | 1 | app:settings:1 |
| `border-slate-400` | 3 | pipeline:1, app:pipeline:1, sales-hub:1 |
| `border-slate-50` | 1 | inbox:1 |
| `border-slate-500` | 2 | pipeline:2 |
| `border-slate-600` | 5 | pipeline:3, sales-hub:1, app:pipeline:1 |
| `border-slate-900` | 2 | automations:1, app:settings:1 |
| `border-teal-200` | 1 | app:reports:1 |
| `border-violet-200` | 4 | automations:2, app:reports:1, app:settings:1 |
| `border-violet-300` | 1 | automations:1 |
| `border-violet-400` | 3 | automations:2, pipeline:1 |
| `border-zinc-800` | 1 | app:landing-client.tsx:1 |
| `decoration-slate-300` | 1 | pipeline:1 |
| `decoration-slate-400` | 2 | inbox:1, app:tasks:1 |
| `fill-amber-400` | 2 | pipeline:1, app:pipeline:1 |
| `from-amber-50` | 1 | app:analytics:1 |
| `from-amber-950` | 1 | app:analytics:1 |
| `from-blue-50` | 2 | app:analytics:1, pipeline:1 |
| `from-blue-500` | 1 | app:analytics:1 |
| `from-blue-950` | 1 | app:analytics:1 |
| `from-emerald-50` | 1 | app:analytics:1 |
| `from-emerald-950` | 1 | app:analytics:1 |
| `from-indigo-500` | 1 | analytics:1 |
| `from-pink-500` | 1 | channels:1 |
| `from-purple-50` | 1 | app:analytics:1 |
| `from-purple-500` | 1 | inbox:1 |
| `from-purple-950` | 1 | app:analytics:1 |
| `from-rose-500` | 1 | automations:1 |
| `from-slate-50` | 3 | automations:3 |
| `from-slate-900` | 2 | automations:1, sales-hub:1 |
| `ring-amber-100` | 2 | automations:2 |
| `ring-amber-300` | 1 | automations:1 |
| `ring-amber-500` | 5 | pipeline:2, inbox:1, ai-agents:1, contacts:1 |
| `ring-blue-100` | 1 | automations:1 |
| `ring-blue-200` | 3 | automations:2, pipeline:1 |
| `ring-cyan-100` | 3 | automations:3 |
| `ring-cyan-200` | 3 | automations:2, pipeline:1 |
| `ring-cyan-300` | 1 | automations:1 |
| `ring-cyan-400` | 3 | app:settings:2, sales-hub:1 |
| `ring-cyan-500` | 1 | pipeline:1 |
| `ring-emerald-200` | 4 | automations:2, inbox:1, pipeline:1 |
| `ring-emerald-500` | 5 | pipeline:3, inbox:1, contacts:1 |
| `ring-fuchsia-100` | 1 | automations:1 |
| `ring-fuchsia-200` | 1 | automations:1 |
| `ring-fuchsia-300` | 1 | automations:1 |
| `ring-fuchsia-500` | 1 | pipeline:1 |
| `ring-gray-400` | 1 | pipeline:1 |
| `ring-green-100` | 3 | automations:3 |
| `ring-green-200` | 1 | pipeline:1 |
| `ring-green-500` | 1 | pipeline:1 |
| `ring-indigo-100` | 1 | automations:1 |
| `ring-indigo-200` | 1 | automations:1 |
| `ring-indigo-400` | 1 | pipeline:1 |
| `ring-lime-500` | 2 | pipeline:2 |
| `ring-orange-100` | 2 | automations:2 |
| `ring-orange-300` | 2 | automations:2 |
| `ring-orange-500` | 1 | pipeline:1 |
| `ring-pink-100` | 1 | automations:1 |
| `ring-pink-500` | 1 | pipeline:1 |
| `ring-purple-500` | 1 | pipeline:1 |
| `ring-red-100` | 1 | automations:1 |
| `ring-red-200` | 1 | inbox:1 |
| `ring-red-500` | 4 | pipeline:3, inbox:1 |
| `ring-rose-200` | 2 | automations:2 |
| `ring-rose-300` | 1 | automations:1 |
| `ring-rose-500` | 2 | pipeline:2 |
| `ring-sky-100` | 1 | automations:1 |
| `ring-sky-200` | 2 | automations:1, app:settings:1 |
| `ring-sky-300` | 1 | automations:1 |
| `ring-sky-500` | 1 | pipeline:1 |
| `ring-slate-100` | 4 | automations:3, inbox:1 |
| `ring-slate-400` | 2 | app:settings:2 |
| `ring-slate-500` | 1 | pipeline:1 |
| `ring-slate-700` | 1 | inbox:1 |
| `ring-slate-800` | 2 | inbox:1, onboarding:1 |
| `ring-teal-100` | 1 | automations:1 |
| `ring-teal-500` | 1 | pipeline:1 |
| `ring-violet-200` | 3 | automations:2, pipeline:1 |
| `ring-violet-300` | 2 | automations:2 |
| `ring-violet-500` | 2 | pipeline:2 |
| `ring-yellow-500` | 2 | pipeline:2 |
| `text-amber-100` | 5 | layout:2, app:settings:2, channels:1 |
| `text-amber-950` | 3 | app:settings:2, channels:1 |
| `text-blue-100` | 1 | inbox:1 |
| `text-blue-200` | 5 | pipeline:3, automations:2 |
| `text-blue-500` | 5 | pipeline:2, sales-hub:1, automations:1, app:pipeline:1 |
| `text-blue-800` | 5 | pipeline:3, app:settings:1, contacts:1 |
| `text-blue-900` | 3 | inbox:1, app:automations:1, app:settings:1 |
| `text-cyan-700` | 4 | pipeline:2, app:settings:1, automations:1 |
| `text-emerald-100` | 1 | ai-agents:1 |
| `text-emerald-300` | 5 | pipeline:1, app:pipeline:1, contacts:1, app:settings:1, inbox:1 |
| `text-emerald-400` | 5 | app:analytics:2, inbox:1, app:settings:1, app:contacts:1 |
| `text-emerald-950` | 2 | app:reports:2 |
| `text-fuchsia-500` | 2 | automations:2 |
| `text-fuchsia-700` | 2 | pipeline:1, automations:1 |
| `text-gray-100` | 2 | app:analytics:2 |
| `text-gray-200` | 2 | app:analytics:1, app:settings:1 |
| `text-gray-50` | 3 | app:settings:3 |
| `text-gray-800` | 1 | app:settings:1 |
| `text-gray-900` | 5 | app:settings:3, app:analytics:2 |
| `text-green-400` | 1 | app:developers:1 |
| `text-green-500` | 3 | automations:3 |
| `text-green-600` | 5 | channels:2, app:settings:1, automations:1, dashboard:1 |
| `text-green-700` | 2 | pipeline:2 |
| `text-indigo-100` | 2 | ai-agents:2 |
| `text-indigo-200` | 3 | ai-agents:2, app:ai-agents:1 |
| `text-indigo-400` | 5 | inbox:3, ai-agents:1, pipeline:1 |
| `text-indigo-800` | 1 | ai-agents:1 |
| `text-indigo-900` | 3 | ai-agents:3 |
| `text-lime-700` | 2 | pipeline:2 |
| `text-orange-300` | 2 | pipeline:1, contacts:1 |
| `text-orange-400` | 1 | automations:1 |
| `text-orange-500` | 3 | automations:3 |
| `text-orange-700` | 4 | pipeline:2, dashboard:1, contacts:1 |
| `text-pink-100` | 1 | inbox:1 |
| `text-pink-300` | 2 | pipeline:1, contacts:1 |
| `text-pink-500` | 4 | inbox:3, automations:1 |
| `text-pink-600` | 1 | channels:1 |
| `text-pink-700` | 3 | pipeline:2, contacts:1 |
| `text-pink-950` | 1 | inbox:1 |
| `text-purple-300` | 3 | pipeline:1, contacts:1, ai-agents:1 |
| `text-purple-400` | 2 | app:analytics:1, app:settings:1 |
| `text-purple-600` | 2 | app:analytics:1, app:settings:1 |
| `text-purple-700` | 5 | pipeline:2, contacts:1, ai-agents:1, app:developers:1 |
| `text-red-100` | 2 | layout:2 |
| `text-red-200` | 5 | app:pipeline:3, layout:2 |
| `text-red-800` | 3 | app:pipeline:1, ai-agents:1, app:settings:1 |
| `text-red-900` | 5 | layout:3, app:settings:2 |
| `text-rose-300` | 1 | pipeline:1 |
| `text-sky-100` | 1 | app:settings:1 |
| `text-sky-200` | 1 | pipeline:1 |
| `text-sky-300` | 1 | pipeline:1 |
| `text-sky-400` | 3 | pipeline:2, inbox:1 |
| `text-sky-500` | 4 | inbox:2, automations:2 |
| `text-sky-600` | 3 | inbox:3 |
| `text-sky-800` | 2 | inbox:2 |
| `text-sky-900` | 1 | inbox:1 |
| `text-sky-950` | 1 | app:settings:1 |
| `text-slate-50` | 2 | onboarding:1, app:dashboard:1 |
| `text-slate-950` | 3 | pipeline:2, automations:1 |
| `text-teal-500` | 1 | automations:1 |
| `text-teal-700` | 2 | pipeline:1, app:reports:1 |
| `text-violet-300` | 1 | app:settings:1 |
| `text-violet-900` | 2 | automations:2 |
| `text-yellow-700` | 2 | pipeline:2 |
| `text-zinc-300` | 2 | app:landing-client.tsx:2 |
| `text-zinc-400` | 2 | app:landing-client.tsx:2 |
| `to-amber-100` | 1 | app:analytics:1 |
| `to-amber-400` | 1 | inbox:1 |
| `to-amber-900` | 1 | app:analytics:1 |
| `to-blue-100` | 1 | app:analytics:1 |
| `to-blue-900` | 1 | app:analytics:1 |
| `to-emerald-100` | 1 | app:analytics:1 |
| `to-emerald-900` | 1 | app:analytics:1 |
| `to-indigo-600` | 1 | app:analytics:1 |
| `to-indigo-950` | 1 | automations:1 |
| `to-purple-100` | 1 | app:analytics:1 |
| `to-purple-900` | 1 | app:analytics:1 |
| `to-rose-600` | 1 | automations:1 |
| `to-violet-500` | 2 | analytics:1, channels:1 |
| `via-pink-500` | 1 | inbox:1 |
| `via-rose-500` | 1 | automations:1 |
| `via-slate-900` | 1 | automations:1 |

---

## Apendice B -- Cores de marca de terceiros (NAO unificar com semanticos)

Estas cores sao **prescritivas**. Ja existem tokens em `@theme`:

| Canal | Hex | Token canonico | Usos no codigo (literal) |
|---|---|---|---:|
| WhatsApp | `#25d366` | `--color-channel-whatsapp` | 51 |
| Facebook Messenger / Meta | `#0084ff` | `--color-channel-meta` | 0 |
| Facebook (login) | `#1877f2` | -- (sem token; usar `--color-channel-meta`?) | 3 |
| Facebook (hover) | `#166fe5` | -- [ISOLADO em create-channel-dialog] | 1 |
| Instagram | `#e1306c` | `--color-channel-instagram` | 0 |

> **Recomendacao:** substituir os usos literais (`whatsapp-qr-modal.tsx`, `create-channel-dialog.tsx`, `channel-card.tsx`) por `var(--color-channel-whatsapp)` -- repete `#25D366` 14x num unico arquivo.

---

## Apendice C -- Long tail de spacing/sizing arbitrario

| Valor | N | Features afetadas |
|---|---:|---|
| `bottom-[64px]` | 1 | app:settings:1 |
| `bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)]` | 1 | pwa:1 |
| `gap-[2px]` | 2 | app:reports:1, sales-hub:1 |
| `h-[120px]` | 1 | automations:1 |
| `h-[14px]` | 1 | sales-hub:1 |
| `h-[200px]` | 1 | app:analytics:1 |
| `h-[280px]` | 1 | analytics:1 |
| `h-[360px]` | 1 | analytics:1 |
| `h-[3px]` | 2 | inbox:1, lib:1 |
| `h-[72%]` | 1 | inbox:1 |
| `h-[72px]` | 1 | app:pipeline:1 |
| `h-[88px]` | 1 | app:contacts:1 |
| `h-[calc(100%-1.5rem)]` | 1 | pipeline:1 |
| `h-[calc(100dvh-0px)]` | 1 | app:developers:1 |
| `h-[calc(100dvh-3rem)]` | 1 | app:dashboard:1 |
| `left-[17px]` | 1 | contacts:1 |
| `left-[18px]` | 1 | pipeline:1 |
| `max-h-[120px]` | 1 | inbox:1 |
| `max-h-[160px]` | 1 | automations:1 |
| `max-h-[180px]` | 1 | inbox:1 |
| `max-h-[200px]` | 2 | inbox:2 |
| `max-h-[240px]` | 2 | inbox:1, sales-hub:1 |
| `max-h-[260px]` | 1 | inbox:1 |
| `max-h-[50vh]` | 1 | ai-agents:1 |
| `max-h-[80vh]` | 1 | dashboard:1 |
| `max-h-[90dvh]` | 2 | app:companies:1, app:contacts:1 |
| `max-h-[90vh]` | 2 | channels:1, app:settings:1 |
| `max-h-[calc(100dvh-2rem)]` | 1 | ui:1 |
| `max-h-[min(80vh,720px)]` | 1 | automations:1 |
| `max-h-[min(88vh,640px)]` | 1 | app:settings:1 |
| `max-h-[min(90vh,720px)]` | 1 | app:settings:1 |
| `max-w-[1200px]` | 1 | app:settings:1 |
| `max-w-[140px]` | 1 | app:contacts:1 |
| `max-w-[290px]` | 2 | automations:2 |
| `max-w-[310px]` | 1 | automations:1 |
| `max-w-[360px]` | 1 | inbox:1 |
| `max-w-[420px]` | 1 | inbox:1 |
| `max-w-[45%]` | 1 | pipeline:1 |
| `max-w-[460px]` | 1 | inbox:1 |
| `max-w-[520px]` | 2 | inbox:2 |
| `max-w-[60%]` | 2 | pipeline:2 |
| `max-w-[60px]` | 1 | app:contacts:1 |
| `max-w-[65%]` | 2 | pipeline:1, contacts:1 |
| `max-w-[72%]` | 1 | pipeline:1 |
| `max-w-[72px]` | 1 | app:contacts:1 |
| `max-w-[75%]` | 1 | inbox:1 |
| `max-w-[90%]` | 1 | ai-agents:1 |
| `max-w-[min(100%,11rem)]` | 1 | inbox:1 |
| `max-w-[min(100vw-2rem,320px)]` | 1 | pipeline:1 |
| `max-w-[min(200px,38vw)]` | 1 | inbox:1 |
| `max-w-[min(200px,40vw)]` | 1 | inbox:1 |
| `max-w-[min(200px,42vw)]` | 1 | inbox:1 |
| `max-w-[min(260px,32vw)]` | 1 | inbox:1 |
| `max-w-[min(280px,calc(100vw-2rem))]` | 1 | pipeline:1 |
| `mb-[3px]` | 1 | inbox:1 |
| `min-h-[200px]` | 1 | dashboard:1 |
| `min-h-[220px]` | 2 | app:settings:2 |
| `min-h-[22px]` | 1 | inbox:1 |
| `min-h-[240px]` | 1 | ai-agents:1 |
| `min-h-[24px]` | 1 | inbox:1 |
| `min-h-[260px]` | 1 | ai-agents:1 |
| `min-h-[280px]` | 1 | channels:1 |
| `min-h-[28px]` | 1 | inbox:1 |
| `min-h-[300px]` | 1 | channels:1 |
| `min-h-[32px]` | 1 | inbox:1 |
| `min-h-[40px]` | 2 | inbox:1, pipeline:1 |
| `min-h-[48px]` | 1 | inbox:1 |
| `min-h-[56px]` | 1 | inbox:1 |
| `min-h-[600px]` | 1 | contacts:1 |
| `min-h-[80px]` | 2 | ui:1, companies:1 |
| `min-w-[100px]` | 1 | profile:1 |
| `min-w-[140px]` | 1 | inbox:1 |
| `min-w-[20px]` | 2 | contacts:2 |
| `min-w-[250px]` | 1 | automations:1 |
| `min-w-[260px]` | 1 | automations:1 |
| `min-w-[280px]` | 1 | inbox:1 |
| `min-w-[560px]` | 1 | analytics:1 |
| `min-w-[640px]` | 2 | analytics:1, app:settings:1 |
| `min-w-[64px]` | 1 | ai-agents:1 |
| `min-w-[720px]` | 1 | app:settings:1 |
| `min-w-[8rem]` | 1 | ui:1 |
| `min-w-[900px]` | 1 | pipeline:1 |
| `pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]` | 2 | inbox:1, pipeline:1 |
| `pb-[calc(env(safe-area-inset-bottom,0px)+2px)]` | 1 | inbox:1 |
| `size-[10px]` | 1 | pipeline:1 |
| `size-[220px]` | 1 | channels:1 |
| `size-[22px]` | 2 | layout:2 |
| `size-[520px]` | 1 | app:layout.tsx:1 |
| `size-[52px]` | 1 | inbox:1 |
| `size-[96px]` | 1 | app:settings:1 |
| `top-[10vh]` | 1 | dashboard:1 |
| `top-[36%]` | 1 | automations:1 |
| `top-[78px]` | 1 | app:settings:1 |
| `top-[calc(100%+4px)]` | 1 | inbox:1 |
| `top-[calc(100%-4px)]` | 1 | pipeline:1 |
| `top-[calc(env(safe-area-inset-top,0px)+4.25rem)]` | 1 | pwa:1 |
| `translate-x-[22px]` | 1 | ui:1 |
| `translate-x-[2px]` | 1 | inbox:1 |
| `w-[120px]` | 2 | automations:1, app:settings:1 |
| `w-[140px]` | 2 | app:reports:2 |
| `w-[200px]` | 1 | automations:1 |
| `w-[260px]` | 1 | channels:1 |
| `w-[360px]` | 2 | contacts:1, layout:1 |
| `w-[3px]` | 1 | sales-hub:1 |
| `w-[420px]` | 1 | automations:1 |
| `w-[60px]` | 1 | app:settings:1 |
| `w-[72%]` | 1 | inbox:1 |
| `w-[88vw]` | 1 | pipeline:1 |
| `w-[min(280px,calc(100vw-2rem))]` | 1 | inbox:1 |
| `w-[min(720px,calc(100vw-32px))]` | 1 | automations:1 |
| `w-[var(--cl-w)]` | 2 | hooks:1, app:inbox:1 |
| `w-[var(--crm-w)]` | 1 | app:inbox:1 |

