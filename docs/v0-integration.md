# Contrato de integração com o V0 (MCP)

Documento curto que governa como pedimos UI ao V0 e como integramos no projeto.
Vale para qualquer tela nova v2.

## Princípios

1. **V0 entrega só apresentação.** Componente controlado, sem `useQuery`/fetch,
   sem `useEffect` que toca rede, sem mock interno. Recebe **dados prontos** e
   **callbacks** via props.
2. **Cursor faz a fiação.** Hooks TanStack Query, schemas Zod (se necessário),
   normalização do output do V0 para tokens DS v2, integração com a rota
   `(app)/...`, guarda de acesso (`useUserRole`/`RestrictedScreen`).
3. **Backend é inquilino contratual.** Endpoints listados na fase JÁ existem em
   `backend_crm1`. Nada de inventar rota ou alterar contrato.

## Contrato de prop do componente V0

- Tipos vêm de `src/features/<feature>-v2/types.ts` (definidos por nós,
  espelhando a API). Nunca o V0 inventa tipo "loose".
- Estados obrigatórios: `loading`, `error`, `empty`, `data`.
- Callbacks tipados (`onCreate`, `onUpdate`, `onDelete`, `onReorder`...),
  retornando `Promise<void>` para suportar `pending` no botão chamador.
- Sem `as` em prop ou `any`. `unknown` aceitável quando vier de input externo.

## Estilo (DS v2)

- Apenas tokens existentes (`--glass-*`, `--brand-*`, `--text-*`, `--radius-*`,
  `font-display`, helpers `dt.*` de `src/lib/design-tokens.ts`).
- Proibido: hex em className/style, cores Tailwind nativas (`red-500`,
  `emerald-400`...), `bg-white/N`, `border-white/N`, `rounded-[Npx]`.
- Ícones: `@tabler/icons-react` (NavRailV2/PageHeader são canônicos).
- Quando o token "ideal" não existe, use o mais próximo e registre em
  `docs/design-system/DECISOES-PENDENTES.md`. Nunca crie token novo no PR.

## Estrutura de pasta esperada

```
src/features/<feature>-v2/
  api.ts          # fetchers (apiFetch/apiUrl)
  hooks.ts        # useQuery/useMutation, invalidações
  types.ts        # DTOs e ViewModels
  components/     # apresentação (V0 + normalizado)
  index.ts        # barrel se útil
src/app/(app)/<rota>/
  page.tsx        # server entry fino
  client-page.tsx # 'use client' que casa hooks com componente V0
```

Páginas dentro de `settings/` usam `SettingsV2Shell`
(`src/app/(app)/settings/_v2-shell.tsx`).

## Checklist por tela (antes de commit)

- [ ] Componente do V0 é controlado e sem fetch
- [ ] Hooks invalidam queries relacionadas após mutação
- [ ] Estados loading/error/empty implementados
- [ ] Guarda de acesso aplicada (gate de permissão correto)
- [ ] `settings-nav.ts` aponta para a rota nova (se for settings)
- [ ] `sidebar-catalog.ts` atualizado (se entrar na NavRail)
- [ ] `npm run lint` verde (inclui `ds-scan`)
- [ ] `npm run build` verde
- [ ] Diff pequeno e revisável; commit por tela
