import { redirect } from "next/navigation"

// O editor de fluxo virou o builder de /automations/[id]; a rota /fluxo
// deixou de existir. Redirect permanente preserva bookmarks antigos.
export default function FluxoPage() {
  redirect("/automations")
}
