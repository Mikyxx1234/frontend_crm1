/**
 * NextAuth sem providers de credenciais (sem Prisma).
 * Usado em `layout.tsx` e páginas RSC para ler JWT da sessão já emitida pelo backend.
 * Login: `next-auth/react` → `/api/auth/*` (reescrito no `next.config.ts` para o backend).
 */
import NextAuth from "next-auth";
import type { Session } from "next-auth";

import authConfig from "@/lib/auth.config";

const { auth: baseAuth } = NextAuth(authConfig);

/**
 * Wrapper resiliente do `auth()` para Server Components.
 *
 * O Auth.js v5 lança `JWTSessionError` ("no matching decryption secret")
 * quando o cookie de sessão foi cifrado com um `AUTH_SECRET`/`NEXTAUTH_SECRET`
 * diferente do atual (cookie antigo após troca de segredo, ou de outra
 * instância). Sem tratamento, isso derruba o `layout.tsx`/`page.tsx` inteiros.
 * Aqui tratamos como "sem sessão" — o middleware (que já usa `getToken` com
 * try/catch) e os redirects levam pro /login, onde um novo login sobrescreve
 * o cookie inválido. Mesma resiliência do middleware, agora também no RSC.
 */
export async function auth(): Promise<Session | null> {
  try {
    return await baseAuth();
  } catch {
    return null;
  }
}
