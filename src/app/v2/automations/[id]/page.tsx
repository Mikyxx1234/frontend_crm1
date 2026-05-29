import V2AutomationDetailClientPage from "./client-page";

export const dynamic = "force-dynamic";

interface V2AutomationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function V2AutomationDetailPage({
  params,
}: V2AutomationDetailPageProps) {
  const { id } = await params;
  return <V2AutomationDetailClientPage automationId={id} />;
}
