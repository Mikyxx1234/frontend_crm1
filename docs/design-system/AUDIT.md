# Auditoria Comparativa — Design System

**Data:** 2026-05-22
**Fonte 1:** `design-system.css` (1065 linhas, CSS puro)
**Fonte 2:** `showcase.html` (625 linhas)
**Fonte 3:** `docs/design-system/INVENTORY.md` (inventário do app React/Tailwind)

> **Nota de escopo:** o `INVENTORY.md` cataloga o app real (React + Tailwind v4 + cva).
> O `design-system.css` é um DS **standalone em CSS puro** (pra showcase HTML estático).
> A comparação aqui é **conceitual** — pra cada primitivo do React, existe equivalente visual no DS atual?

---

## 1. Componentes presentes em `design-system.css`

Organizado por bloco, com a classe-raiz de cada componente:

### 1.1 Layout / chrome do showcase
| Classe | Função |
|---|---|
| `.ds-page` | container max-width 1100px |
| `.ds-section` + `.ds-section-title` | seção do showcase com header divisor |
| `.ds-title-hero` + `.ds-subtitle-hero` | título principal da página |
| `.ds-hero` | bloco hero glass com glow decorativo (`::before`/`::after`) |
| `.version-tag` | pill "v2.0" no hero |

### 1.2 Superfícies glass (primitivo base)
| Classe | Função |
|---|---|
| `.glass` | superfície glass padrão (radius lg, shadow normal) |
| `.glass-strong` | mais opaca + shadow lg |
| `.glass-subtle` | menos opaca, blur menor |
| `.glass-overlay` | overlay (radius xl, blur strong, opacidade .60) |

### 1.3 Tipografia (escala)
| Classe | Spec |
|---|---|
| `.t-hero` | display 40/700/-0.02em |
| `.t-h1` | display 28/700/-0.015em |
| `.t-h2` | display 22/600 |
| `.t-h3` | display 17/600 |
| `.t-h4` | display 14/600 |
| `.t-body-lg` | body 16/400 line-height 1.7 |
| `.t-body` | body 14/400 line-height 1.6 |
| `.t-small` | body 12/400 muted |
| `.t-label` | body 11/600 uppercase 0.08em muted |

### 1.4 Botões
| Classe | Variante |
|---|---|
| `.btn` | base (radius-full, font-display, peso 600) |
| `.btn-primary` | CTA brand (sólido + glow) |
| `.btn-glass` | glass translúcido |
| `.btn-outline` | borda brand, fundo transparente |
| `.btn-ghost` | borda fantasma |
| `.btn-danger` | destructive sólido |
| `.btn-sm` / `.btn-lg` | tamanhos |
| `.btn-icon` | quadrado 36×36, radius md |
| `.btn-group` | container flex-wrap |

### 1.5 Ícones (helpers)
`.icon` (16px) · `.icon-md` (18) · `.icon-lg` (20) — apenas dimensionamento de `<svg>`

### 1.6 Badges / Tags
| Classe | Variante |
|---|---|
| `.badge` | base (radius-full, font-display 11/600) |
| `.badge-enterprise` | brand soft |
| `.badge-lead` | amber soft |
| `.badge-success` | green soft |
| `.badge-danger` | red soft |
| `.badge-muted` | slate soft |
| `.badge-glass` | superfície glass |
| `.badge-dot` | modificador que injeta bolinha `::before` |

### 1.7 Avatares
| Classe | Função |
|---|---|
| `.avatar` | base circular |
| `.avatar-sm/md/lg/xl` | 28 / 36 / 44 / 56 px |
| `.avatar-online` / `.avatar-offline` | indicador via `::after` |
| `.avatar-group` | overlap horizontal |

### 1.8 Cards (3 tipos especializados)
| Classe | Função |
|---|---|
| `.cards-grid` | grid auto-fill 260px |
| `.conversation-card` + `.conv-header/name/time/preview` | preview de conversa do inbox |
| `.contact-card` + `.contact-card-header/id/detail-row/-label/-value` | painel CRM do contato |
| `.metric-card` + `.metric-label/value/trend` (`.up`/`.down`) | KPI tile |

### 1.9 Chat / Bubbles
| Classe | Função |
|---|---|
| `.chat-demo` | container thread |
| `.bubble-row` + `.outgoing` | row flip pra mensagem própria |
| `.bubble` | bolha base |
| `.bubble-incoming` / `.bubble-outgoing` | sentido (gradient brand no outgoing) |
| `.bubble-time` | timestamp |
| `.bubble-session-alert` | aviso de sessão expirada (red glass) |

### 1.10 Inputs / Formulários
| Classe | Função |
|---|---|
| `.form-group` + `.form-label` | wrapper de campo |
| `.input-glass` | input padrão (states: hover, focus) |
| `.input-search` | modificador com ícone SVG inline (data-uri) |
| `.select-glass` | `<select>` nativo estilizado |
| `.chat-input-bar` | composer do chat (radius 2xl, com slot pra ícones) |

### 1.11 Sidebar / Navegação
| Classe | Função |
|---|---|
| `.sidebar-demo` | sidebar vertical 72px |
| `.nav-item` + `.active` | ícone de nav, com estado ativo |
| `.nav-badge` | contador absoluto top-right |

### 1.12 Status pill
| Classe | Função |
|---|---|
| `.status-pill` + `.status-pill-dot` | base |
| `.status-online` / `.status-offline` | variantes |

### 1.13 Tabs (2 estilos)
| Classe | Estilo |
|---|---|
| `.tabs` + `.tab` + `.tab.active` | **pills** dentro de container glass |
| `.tabs-underline` + `.tab-underline` + `.tab-underline.active` | **underline** estilo HubSpot |

### 1.14 Outros
| Classe | Função |
|---|---|
| `.note-card` | nota amarela (border-left warning) |
| `.tooltip-demo` + `.tooltip` | tooltip CSS puro (hover-only, sem JS) |
| `.divider` | linha gradient horizontal |
| `.code-block` + `.code-comment/key/value/string` | preview de código no showcase |

### 1.15 Layout utilities (Tailwind-lite)
`.flex` · `.flex-col` · `.items-center` · `.justify-between` · `.gap-2/3/4` · `.grid-2/3/4` · `.p-4/5/6` · `.mt-2/3/4`

### 1.16 Showcase-only (meta, não-componente)
`.color-grid` + `.color-swatch*` · `.type-specimen` + `.type-row/meta*` · `.vars-grid` + `.var-block/-title/-item/-name/-preview/-swatch`

---

## 2. Tokens / variáveis CSS já definidos

### 2.1 Surfaces base
```
--color-bg-base       #dde8f5
--color-bg-mid        #c8d9ef
--color-bg-mesh-1     #b8cfec
--color-bg-mesh-2     #e8d5f0
```

### 2.2 Glassmorphism
```
--glass-bg            rgba(255,255,255,0.25)
--glass-bg-strong     rgba(255,255,255,0.40)
--glass-bg-subtle     rgba(255,255,255,0.12)
--glass-bg-overlay    rgba(255,255,255,0.60)
--glass-border        rgba(255,255,255,0.55)
--glass-border-subtle rgba(255,255,255,0.30)
--glass-shadow        0 8px 32px rgba(100,130,180,0.18)
--glass-shadow-lg     0 16px 48px rgba(100,130,180,0.24)
--glass-shadow-sm     0 4px 16px rgba(100,130,180,0.12)
--glass-blur          blur(16px)
--glass-blur-strong   blur(24px)
--glass-blur-subtle   blur(8px)
```

### 2.3 Brand
```
--brand-primary        #5b6ff5
--brand-primary-light  #7b8df7
--brand-primary-dark   #3d52e8
--brand-secondary      #a78bfa  (lavanda / IA)
--brand-accent         #f472b6  (pink)
```

### 2.4 Semânticas
```
--color-enterprise    #5b6ff5  + -bg (alpha .15)
--color-lead          #f59e0b  + -bg (alpha .15)
--color-success       #10b981  + -bg (alpha .12)
--color-danger        #ef4444  + -bg (alpha .12)
--color-warning       #f59e0b  + -bg (alpha .12)   ← mesmo valor de --color-lead
--color-offline       #94a3b8
--color-online        #10b981                     ← mesmo valor de --color-success
```

### 2.5 Texto
```
--text-primary    #1e2a3b
--text-secondary  #4a5568
--text-muted      #718096
--text-on-glass   #2d3748
--text-on-dark    #ffffff
```

### 2.6 Tipografia
```
--font-display  'Plus Jakarta Sans', sans-serif
--font-body     'DM Sans', sans-serif
```

### 2.7 Espaçamentos (escala custom — não-octave)
```
--space-1   4px
--space-2   8px
--space-3   12px
--space-4   16px
--space-5   20px
--space-6   24px
--space-8   32px
--space-10  40px
--space-12  48px
```

### 2.8 Radius
```
--radius-sm    6px
--radius-md    10px
--radius-lg    16px
--radius-xl    22px
--radius-2xl   32px
--radius-full  9999px
```

### 2.9 Transição
```
--transition-fast  150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base  250ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow  400ms cubic-bezier(0.4, 0, 0.2, 1)
```

### 2.10 Helpers compostos
```
--border-glass         1px solid var(--glass-border)
--border-glass-subtle  1px solid var(--glass-border-subtle)
```

---

## 3. Comparativo com `INVENTORY.md`

> Como o INVENTORY descreve o **app React/Tailwind real** (26 primitivos `src/components/ui/*` + componentes de domínio em `pipeline/`, `inbox/`, `automations/`, etc), o mapeamento é **conceitual**.

### 3.1 ✅ JÁ EXISTEM no `design-system.css`

| Conceito (INVENTORY) | Classe no DS | Observação |
|---|---|---|
| Button | `.btn` + 5 variantes + 3 sizes | 5 das 8 variantes do React (faltam `link`, `ai`, `secondary`-glass duplicado) |
| Badge | `.badge` + 6 variantes + `.badge-dot` | 6 das 12 variantes (faltam `outline`, `indigo`, `pink`, `ai`, `warning`-dedicado, `lead` duplicado) |
| Card básico glass | `.glass`/`.glass-strong`/`.glass-subtle`/`.glass-overlay` | superfície genérica, sem header/title/footer slots |
| Card de domínio | `.conversation-card`, `.contact-card`, `.metric-card` | 3 cards específicos (inbox, CRM, dashboard) já modelados |
| Input | `.input-glass` + `.input-search` | falta state `error`/`disabled` explícito |
| Select | `.select-glass` | `<select>` nativo estilizado (sem dropdown custom) |
| Tabs | `.tabs` (pill) + `.tabs-underline` | 2 estilos completos com `.active` |
| Tooltip | `.tooltip` | CSS puro hover — sem `[role=tooltip]`, sem ARIA, sem positioning JS |
| Avatar | `.avatar` + 4 sizes + online/offline + group | completo |
| Sidebar | `.sidebar-demo` + `.nav-item` + `.nav-badge` | nome com `-demo` sugere que ainda é exemplo, não primitivo |
| Status pill (online/offline) | `.status-pill` + variantes | completo |
| Divider | `.divider` | gradient horizontal |
| Chat bubble | `.bubble-incoming`/`.bubble-outgoing` + session alert | falta voice/audio bubble, reply preview, date separator, system message, attachment, typing indicator |
| Page header / hero | `.ds-hero`, `.ds-title-hero`, `.ds-subtitle-hero` | da página do DS — não é primitivo reusável da app |
| Form label | `.form-label` + `.form-group` | mínimo |
| Note card | `.note-card` | callout amarelo |
| Typography scale | `.t-hero/h1-h4/body*/small/label` | completo (display + body) |

### 3.2 ❌ FALTAM CRIAR

Mapeamento direto dos primitivos do React que **não têm equivalente** no DS atual:

**Primitivos de formulário**
- [ ] **Checkbox** (radio também) — não há nenhum
- [ ] **Switch / Toggle** — não há
- [ ] **Radio Group** — não há
- [ ] **Textarea** — não há (input-glass não cobre multiline)
- [ ] **Input com erro / disabled** — falta `:disabled`, `[aria-invalid]`
- [ ] **Input com ícone left/right** — só search tem (e via background-image)
- [ ] **Field helper text** — não há "small abaixo do label"
- [ ] **Combobox / Autocomplete** — não há
- [ ] **Date Picker** — não há (calendário visual)

**Primitivos de overlay**
- [ ] **Dialog / Modal** — `.glass-overlay` é só superfície; falta header/body/footer + backdrop + close button
- [ ] **Drawer / Sheet** — não há
- [ ] **Dropdown menu** — não há (menu com items, divider, danger item)
- [ ] **Popover** — não há (não é tooltip; tem clique e conteúdo rico)
- [ ] **Context Menu** — não há
- [ ] **Toast / Notification** — não há (visual de "X minutos atrás")

**Feedback / loading**
- [ ] **Skeleton loader** — não há
- [ ] **Spinner** — não há
- [ ] **Progress bar** (linear + circular) — não há
- [ ] **Empty state** — não há padrão visual (ilustração + texto + CTA)
- [ ] **Loading button** (spinner dentro) — não há

**Dados / lista**
- [ ] **Table** — não há (header, row, cell, sort indicator, sticky header)
- [ ] **Pagination** — não há
- [ ] **List item** genérico (com avatar/title/subtitle/meta/action) — não há
- [ ] **Accordion / Collapsible** — não há

**Domínio (segundo INVENTORY)**
- [ ] **Kanban board** — não há (3 colunas horizontais, scroll, header da coluna com cor)
- [ ] **Kanban column** — não há
- [ ] **Kanban card** (deal card) — `.contact-card` é parecido mas é p/ CRM; falta variante "deal" com valor + estágio + avatar do owner + tags
- [ ] **Stage header** (faixa colorida com nome+contagem) — não há
- [ ] **Workflow node** (automação React Flow): trigger / action / condition / delay / wait — não há
- [ ] **Animated edge** (linha pontilhada animada) — não há (mas tem `@keyframes flow-dash` no globals.css real)
- [ ] **Dashboard widget card** — `.metric-card` é embrião; falta widget com header + chart + footer
- [ ] **Conversation list item** (com unread badge, time, preview, channel icon) — `.conversation-card` cobre 60%

### 3.3 ⚠️ AMBÍGUOS / PARCIAIS / RENOMEAR

| Conceito (INVENTORY) | Estado no DS | Decisão pendente |
|---|---|---|
| `<Card>` (React) | 3 cards específicos + 4 surfaces glass — **não há um `<Card>` genérico** com Header/Title/Content/Footer | Criar `.card` + `.card-header` + `.card-title` + `.card-content` + `.card-footer` como primitivo? Ou manter só especializações? |
| `<Sheet>` vs `<Dialog>` vs Drawer | nenhum dos 3 existe ainda | Definir nomes: `.sheet` (lateral) vs `.dialog` (centro) vs `.drawer` (bottom mobile)? |
| Tooltip vs Popover | só `.tooltip` (hover, CSS puro) | Faltam ambos os outros: `.popover` (clique, conteúdo rico) e tooltip a11y |
| `.sidebar-demo` | nome sugere demo, não primitivo | Renomear pra `.sidebar` + `.sidebar-item` + `.sidebar-badge` antes de virar API pública |
| `.btn-glass` vs `.glass` botão | `.btn-glass` (componente) + `.glass` (utility) — duplicação de fato | OK como está, mas documentar |
| `.color-warning` vs `.color-lead` | mesmo valor `#f59e0b` | Decidir se `lead` deve usar `--color-warning` (DRY) ou ser semanticamente independente |
| `.color-online` vs `.color-success` | mesmo valor `#10b981` | Idem acima |
| `.status-pill` vs `.badge` | dois jeitos de fazer pill — `status-pill` tem dot + cores `online/offline`; `badge` cobre `success/danger/lead/etc.` | Sobreposição clara. Unificar como `.badge-with-dot`? Ou manter especialização semântica? |
| `.t-h4` (14px/600) ≈ `.btn` text (13px/600) | similar mas não igual | Documentar quando usar cada |
| Cores hex em badges (`#92600a`, `#065f46`, `#991b1b`) | hardcoded no CSS, não viraram token | Promover pra `--badge-text-warning`, `--badge-text-success`, `--badge-text-danger`? |
| `.btn-icon` (36×36) vs `.nav-item` (44×44) vs `.avatar-md` (36×36) | 3 tamanhos próximos pra hit-area circular | Avaliar se precisa de tokens `--size-touch-sm/md/lg` |

---

## 4. Convenções detectadas no CSS atual

### 4.1 Nomenclatura
- **kebab-case** em todas as classes
- **Prefixo de tipo** quando aplicável:
  - `.ds-*` → meta/showcase (não vai pro app)
  - `.t-*` → tipografia
  - `.btn-*`, `.badge-*`, `.avatar-*` → variantes do componente raiz
- **Componente raiz sem prefixo**: `.btn`, `.badge`, `.avatar`, `.card` (potencial)
- **Sub-elementos via hífen**: `.contact-card-header`, `.metric-trend`, `.bubble-time`, `.tab-underline`
  - ❌ NÃO usa BEM (`block__element--modifier`)
  - ❌ NÃO usa kebab com `__` ou `--`
  - ✅ Usa kebab-case "encadeado por hífen"

### 4.2 Variantes
- **Modifier class concatenada no HTML**:
  ```html
  <button class="btn btn-primary btn-sm">…</button>
  <span class="badge badge-success badge-dot">…</span>
  <div class="avatar avatar-lg avatar-online">…</div>
  ```
- Cada variante é uma classe separada que adiciona/sobrescreve propriedades.
- **NÃO usa** `data-variant=`, `data-size=`, `[data-*]` attribute selectors.

### 4.3 Estados

| Estado | Convenção |
|---|---|
| Hover | `:hover` pseudo-class |
| Focus | `:focus` (mas `.input-glass:focus` foi visto — `focus-visible` **não** aparece) |
| Active (interação) | `:active` (mouse pressed) |
| Placeholder | `::placeholder` |
| Disabled | **AUSENTE** — não há `[disabled]` ou `:disabled` em nenhum lugar |
| Estado "selecionado / ativo" (UI) | **modifier class `.active`** (não `[aria-selected]`, não `.is-active`) — ex.: `.nav-item.active`, `.tab.active`, `.tab-underline.active` |
| Estado de valor (`.up`/`.down`) | modifier class direto — ex.: `.metric-trend.up`, `.metric-trend.down` |
| Indicador visual gráfico | `::before` / `::after` — ex.: `.avatar-online::after`, `.badge-dot::before`, `.ds-hero::before` |

→ **Padrão geral: pseudo-classes pra estados nativos + modifier class `.active` pra estados de UI**.

### 4.4 Outras convenções
- **Glassmorphism inline**: cada componente glass repete `backdrop-filter`/`background`/`border` direto (não há `@apply` em CSS puro). Aceitável, mas significa que mudança em "como é vidro" exige tocar em ~15 lugares.
- **Hover micro-interaction padrão**: `transform: translateY(-1px ou -2px)` + shadow stronger. Aplicado consistentemente em `.btn-primary`, `.btn-glass`, `.conversation-card`.
- **Cores compostas**: tokens `--*-bg` sempre são o mesmo hex base com alpha (`.12` ou `.15`). Padrão consistente.
- **Variáveis CSS são a fonte única**: nenhum componente importa de outro arquivo; tudo via `:root`.
- **Sem dark mode**: o CSS atual não tem bloco `.dark` ou `@media (prefers-color-scheme: dark)`.
- **Sem responsive design tokens**: o único `@media` é o de mobile (`max-width: 768px`) e ajusta apenas grids + padding do hero.
- **Sem motion tokens explícitos** além das 3 transições. Os `@keyframes` da app real (do `globals.css`) **não** estão aqui.

---

## 5. Resumo executivo

| Eixo | Estado |
|---|---|
| **Cobertura conceitual** | ~17 de ~40 primitivos pedidos (≈ 42%, consistente com sua estimativa de "40-45%") |
| **Tokens** | base sólida — cores, radius, spacing, transição já cobrem 80% dos casos. **Falta:** z-index, motion (além das 3 durations), breakpoints, font-size scale, font-weight scale |
| **Convenções** | claras e consistentes (kebab + modifier class + pseudo-classes). Fácil de seguir |
| **Risco maior** | falta de `:disabled`, `:focus-visible` e ARIA — **a11y precisa ser endereçada na expansão** |
| **Duplicações de token** | `--color-lead`==`--color-warning`, `--color-online`==`--color-success`, cores hex em badges (`#92600a`, `#065f46`, `#991b1b`) não viraram token |
| **Componentes mais críticos faltando** | Dialog, Dropdown, Checkbox/Radio/Switch, Skeleton/Spinner, Toast, Table, Pagination, Kanban (board/column/card) |
| **Decisões pendentes antes da expansão** | (a) criar `<Card>` genérico ou manter só especializações? (b) renomear `.sidebar-demo` → `.sidebar`? (c) unificar `status-pill` com `badge`? (d) cores hex de badge viram token? |

---

## 6. Para a Etapa 2 (expansão)

Quando você pedir o CSS novo, eu vou seguir:

1. **Naming**: `.componente`, `.componente-variante`, `.componente-sub`
2. **Variantes**: classe extra concatenada (`class="btn btn-primary"`)
3. **Estados de UI**: modifier class `.active` (não `.is-active` nem `[aria-current]`)
4. **Estados nativos**: `:hover`, `:focus-visible` (vou **adicionar `focus-visible`** porque a11y), `:active`, `:disabled`, `::placeholder`
5. **A11y**: adicionar `[role=…]`, `[aria-*]` nos seletores apenas onde a semântica HTML não basta. Sem mudar a convenção de variant.
6. **Tokens novos**: só se justificável. Documentar com `/* novo token: motivo */`
7. **Ordem do arquivo**: tokens → reset/base → layout helpers → componentes → utilities (mantém a ordem atual)

### Decisões que preciso da sua confirmação antes de expandir

1. ❓ Criar `.card` genérico (`.card`+`.card-header`+`.card-title`+`.card-content`+`.card-footer`) ou só especializações?
2. ❓ Renomear `.sidebar-demo` → `.sidebar` (e a `-demo` fica só no showcase)?
3. ❓ Unificar `.status-pill` dentro de `.badge` (com `.badge-with-dot` modifier) ou manter dois?
4. ❓ Cores hex hardcoded de badge (`#92600a`, `#065f46`, `#991b1b`) viram `--badge-text-warning/success/danger`?
5. ❓ `--color-lead` (==warning) e `--color-online` (==success) viram aliases (`var(--color-warning)`) ou seguem independentes?
6. ❓ Adicionar dark mode agora ou deixar pra Fase 3?
7. ❓ Cobrir Kanban (board+column+card+stage-header) ou ficar só nos primitivos genéricos?
