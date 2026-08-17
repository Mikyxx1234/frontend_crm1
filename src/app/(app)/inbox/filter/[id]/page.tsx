import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface InboxFilterPageProps {
  params: Promise<{ id: string }>;
}

/**
 * `/inbox/filter/<id>` → `/inbox?filter=<id>`.
 *
 * Formato de link antigo/curto. O Inbox ainda não tem filtros salvos (só o
 * Pipeline tem), então um id desconhecido cai na visão padrão em vez de 404 —
 * a visão compartilhável do Inbox são os params legíveis (`?tab=&q=&owner=…`).
 */
export default async function InboxFilterPage({ params }: InboxFilterPageProps) {
  const { id } = await params;
  redirect(`/inbox?filter=${encodeURIComponent(id)}`);
}
