# Decisões Estruturais — CRM EduIT (Frontend)

Registro de decisões técnicas que afetam estrutura do projeto. Cada entrada
documenta **por que** algo foi feito, não **o que**.

---

### 2026-05-14 — `apiUrl()` retorna sempre path relativo

**Decisão.** `src/lib/api.ts > apiUrl(path)` retorna sempre `path` relativo
(`/api/...`), **nunca** prefixa com a URL absoluta do backend. O proxy
acontece exclusivamente via `rewrites()` do `next.config.ts`. A função
`getApiBaseUrl()` ainda existe e expõe o backend absoluto, mas só deve ser
usada em casos pontuais que **exijam** absoluto (SSE de origem cross-site
explícita, integrações OAuth com redirect_uri, etc.) — em chamadas comuns
de cliente, é proibido.

**Contexto.** Frontend (`banco-frontend-crm.6tqx2r.easypanel.host`) e
backend (`banco-backend-crm.6tqx2r.easypanel.host`) rodam em **subdomínios
diferentes** do mesmo apex. Como os cookies do NextAuth são emitidos com
`SameSite=Lax` (default seguro), eles **não** acompanham `fetch` cross-site
disparado do navegador. Sintomas observados:

- `fetch("https://banco-backend-crm.../api/companies")` saía sem cookie
  → backend respondia `401` → UI mostrava "Failed to fetch" / dashboard
  em branco.
- O preflight CORS também batia, exigindo backend respondendo
  `Access-Control-Allow-Origin` + `Allow-Credentials` em todos os endpoints
  (manutenção custosa) e ainda assim o `Lax` matava o cookie.

Com `apiUrl()` relativo, a chamada do navegador vai pro **próprio domínio
do frontend** (`/api/companies`), o Next.js Edge proxy aplica o rewrite
de `next.config.ts` e encaminha server-to-server pro backend. Cookie do
NextAuth viaja normalmente porque é same-origin.

**Alternativas descartadas.**

- **Liberar CORS no backend + `credentials: "include"` + `SameSite=None`.**
  Funciona, mas exige cookie `SameSite=None; Secure` (mais permissivo), e
  todo endpoint do backend precisa ecoar `Access-Control-Allow-Origin`
  específico (não pode ser `*` com credentials). Mais código, mais
  superfície, e o cookie `Lax` que o NextAuth emite por padrão é mais
  resistente a CSRF.
- **Mesmo subdomínio com path-prefix (`/api` no frontend → backend).** É
  basicamente o que `rewrites()` já faz, mas exigia tirar o backend do
  Easypanel como serviço separado — perderíamos a flexibilidade de
  escalar/derrubar backend isoladamente.

**Impacto.**

- Toda chamada de cliente passa por `next.config.ts > rewrites()`. Se um
  endpoint do backend não está mapeado lá, ele não é acessível pelo
  frontend. Checar `rewrites()` ao adicionar nova rota.
- SSE/WebSocket que dependem de keep-alive longo: validar caso a caso se
  o proxy do Next.js segura sem timeout.

### 2026-05-14 — Domain do Easypanel mapeia para porta 3000 (não 80)

**Decisão.** No serviço do frontend no Easypanel, **Domain → Service
Port** deve ser `3000`. Nada de `PORT=80` no env do container.

**Contexto.** O `Dockerfile` do frontend faz `EXPOSE 3000` e o `server.js`
do Next.js standalone faz bind em `PORT || 3000`. Quando alguém setava
`PORT=80` no env do Easypanel (achando que o Traefik precisava de 80), o
Next.js subia em `http://0.0.0.0:80` dentro do container — mas o Traefik
do Easypanel encaminha para a `Service Port` configurada (3000 por
default). Resultado: HTTP 502 / "Service is not reachable", e nos logs só
aparecia `Ready in 147ms` (porque o app subiu de fato, só não na porta
certa).

**Alternativas descartadas.**

- **Trocar `EXPOSE` no Dockerfile + Service Port pra 80.** Funciona, mas
  contraria a convenção universal "container web app = porta 3000" e
  confunde quem for clonar o repo localmente.

**Impacto.** Documentado também no README do repo. Se aparecer 502 num
serviço Next no Easypanel, primeira coisa a checar é Service Port =
3000.

### 2026-05-14 — `NEXTAUTH_URL` é o domínio público do **frontend**

**Decisão.** A env `NEXTAUTH_URL` deve apontar para o domínio público
**onde o usuário digita a URL no browser** — o frontend. Tanto no
serviço do frontend **quanto** no serviço do backend.

**Contexto.** O backend separado só serve API e roda
`next-auth/middleware` em rotas `/api/auth/*`. Quando o NextAuth gera
URLs absolutas (callback, signin, signout, e os próprios cookies via
`useSecureCookies = NEXTAUTH_URL.startsWith("https://")`), ele usa
`NEXTAUTH_URL`. Se o backend tem `NEXTAUTH_URL=https://banco-backend...`,
o cookie sai com domínio errado e o redirect pós-login leva pra dentro
do backend, fora do contexto de UI. Setando ambos os serviços para
`NEXTAUTH_URL=https://banco-frontend-crm.6tqx2r.easypanel.host`, o
NextAuth do backend gera cookies/redirects coerentes com onde o usuário
está navegando — e o rewrite do frontend pro backend não muda o
`Host` header relevante para o NextAuth.

**Alternativas descartadas.**

- **`NEXTAUTH_URL` do backend = domínio do backend.** Cookie sai com
  `Set-Cookie: Domain=banco-backend-crm...`, navegador o associa a um
  origin que o middleware do frontend nunca consulta.

**Impacto.** Documentar no README. Para um cliente final que rodar em
domínio próprio (ex.: `crm.minhaescola.com.br` no front e
`api.minhaescola.com.br` no back), `NEXTAUTH_URL` continua sendo o
**frontend** em ambos os serviços.

---
