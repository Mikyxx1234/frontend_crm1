# Auditoria visual — Settings

Gerado: 2026-06-17T11:19:48.729Z
Base: http://localhost:3000

## Resumo

| Status | Qtd |
|--------|-----|
| Conforme | 23 |
| Parcial | 1 |
| Legacy | 0 |
| Erro captura | 2 |

## Detalhe (light mode)

| Rota | Score | Status | Achados |
|------|-------|--------|---------|
| Hub configurações | 100 | conforme | — |
| Perfil | 75 | parcial | BG_WHITE, BG_CARD, BORDER_BORDER |
| Canais | 100 | conforme | — |
| Modelos — visão geral | 100 | conforme | — |
| Modelos — internos | 90 | conforme | BG_WHITE |
| Modelos — WhatsApp | 90 | conforme | BG_WHITE |
| Modelos — Flows | 90 | conforme | BG_WHITE |
| Conversas | 90 | conforme | BG_WHITE |
| Notificações | 100 | conforme | — |
| Softphone | 100 | conforme | — |
| Contas de e-mail | 100 | conforme | — |
| Campos personalizados | 100 | conforme | — |
| Tags | 85 | conforme | BG_WHITE, GLASS_IN_GLASS |
| Produtos | 90 | conforme | BG_WHITE |
| Catálogos | 95 | conforme | GLASS_IN_GLASS |
| Pipeline (settings) | 85 | conforme | BG_WHITE, GLASS_IN_GLASS |
| Motivos de perda | 90 | conforme | BG_WHITE |
| Distribuição | 100 | conforme | — |
| Equipe | 95 | conforme | GLASS_IN_GLASS |
| Horários | 90 | conforme | BG_WHITE |
| Config IA | 90 | conforme | BG_WHITE |
| API e Webhooks | 100 | conforme | — |
| Permissões | 100 | conforme | — |
| Segurança | — | erro | page.goto: Timeout 90000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/settings/security?mock=1", waiting until "networkidle"
 |
| App Mobile | 85 | conforme | BG_WHITE, BORDER_BORDER |

## Screenshots

`frontend/screenshots/settings-audit-v4/light/`
`.../dark/`
