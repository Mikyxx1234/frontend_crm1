/**
 * NextAuth sem providers de credenciais (sem Prisma).
 * Usado em `layout.tsx` e `middleware.ts` para ler JWT da sessão já emitida pelo backend.
 * Login: `next-auth/react` → `/api/auth/*` (reescrito no `next.config.ts` para o backend).
 */
import NextAuth from "next-auth";

import authConfig from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export { auth };
