# CRM EduIT — Frontend

Interface do CRM EduIT extraída do monólito Next.js. Este repositório contém **apenas** páginas, componentes, hooks e assets. Toda a API REST, Prisma, Redis, workers e webhooks ficam num **backend separado** (outro app no Easypanel ou o monólito original enquanto migra).

## Pré-requisitos

- Node.js 20+ (recomendado 22)
- npm 10+
- Backend acessível na URL configurada em `NEXT_PUBLIC_API_BASE_URL` (ex.: `http://localhost:3001`)

## Configuração

1. Copie o exemplo de variáveis:

   ```bash
   cp .env.example .env.local
   ```

2. Ajuste no `.env.local`:

   | Variável | Descrição |
   |----------|-----------|
   | `NEXT_PUBLIC_API_BASE_URL` | URL base do backend **sem** barra final. Ex.: `http://localhost:3001` ou `https://api.seudominio.com` |
   | `NEXTAUTH_URL` | URL pública **deste** frontend (onde o browser abre o CRM). Ex.: `http://localhost:3000` |
   | `NEXTAUTH_SECRET` | Deve ser **o mesmo** valor usado no backend que assina o JWT da sessão (Auth.js v5). |

3. Chamadas HTTP da UI usam `src/lib/api.ts` (`apiUrl()`), apontando para o backend. Rotas **NextAuth** (`/api/auth/*`), push VAPID (`/api/push/vapid-public`, subscribe/unsubscribe) e arquivos em `/uploads/*` são **reescritas** no `next.config.ts` para o mesmo `NEXT_PUBLIC_API_BASE_URL`, para o browser continuar em origem única (cookies de sessão no host do frontend).

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` (porta padrão do script). O backend deve estar em `NEXT_PUBLIC_API_BASE_URL` (ex.: porta 3001).

Build de produção:

```bash
set NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
set NEXTAUTH_SECRET=mesmo-do-backend
set NEXTAUTH_URL=http://localhost:3000
npm run build
npm start
```

(PowerShell: `$env:VAR="valor"` em vez de `set`.)

## Easypanel

1. Crie um app **Static/Node** (Docker) apontando para este repositório.
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start` (ou `node .next/standalone/server.js` se usar output standalone com cópia de `public` e `.next/static` conforme doc Next).
4. Defina as variáveis de ambiente no painel (produção):

   - `NEXT_PUBLIC_API_BASE_URL=https://api.seudominio.com`
   - `NEXTAUTH_URL=https://crm.seudominio.com`
   - `NEXTAUTH_SECRET=...` (igual ao backend)

5. No **backend**, configure CORS (`Access-Control-Allow-Origin`) para a origem do frontend se o browser chamar o backend em URLs absolutas (ex.: `EventSource` para SSE em `https://api.../api/sse/messages`). Enquanto o rewrite cobrir apenas paths listados no `next.config.ts`, o fluxo principal usa o mesmo host do frontend.

## Limitações / pendências

- **SSE (`/api/sse/messages`)**: o cliente usa `apiUrl()`, ou seja, URL absoluta do backend quando `NEXT_PUBLIC_API_BASE_URL` está definido. O backend precisa aceitar CORS + credenciais (cookies) ou expor um mecanismo de auth compatível; caso contrário use temporariamente um proxy no backend ou alinhe subdomínio + cookies.
- **Login**: depende do backend responder em `/api/auth/*` com o mesmo `NEXTAUTH_SECRET` e política de cookie compatível com `NEXTAUTH_URL` do frontend.
- Telas que chamam API retornam erro de rede até o backend estar no ar — comportamento esperado.

## Estrutura

- `src/app/` — App Router (UI); **sem** `api/`, **sem** `health` de servidor.
- `src/components/`, `src/hooks/`, `src/features/` — UI.
- `src/lib/api.ts` — base URL do backend.
- `src/lib/auth-public.ts` — NextAuth só leitura de JWT (sem Prisma).

O projeto monólito original **não** é alterado por este diretório; a cópia foi feita para `../crm-frontend` ao lado do repo `crm`.
