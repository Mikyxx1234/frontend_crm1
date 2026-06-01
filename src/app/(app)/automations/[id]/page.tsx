import V2AutomationDetailClientPage from "./client-page";

export const dynamic = "force-dynamic";

// O editor v1 reutilizado lê o id via useParams(), então não precisamos
// repassar params aqui — basta renderizar o client component.
export default function V2AutomationDetailPage() {
  return <V2AutomationDetailClientPage />;
}
