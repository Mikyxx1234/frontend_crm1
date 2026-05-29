import V2DealDetailClientPage from "./client-page";

export const dynamic = "force-dynamic";

interface V2DealDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function V2DealDetailPage({ params }: V2DealDetailPageProps) {
  const { id } = await params;
  return <V2DealDetailClientPage dealId={id} />;
}
