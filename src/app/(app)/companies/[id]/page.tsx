import CompanyDetailClientPage from "./client-page";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompanyDetailClientPage id={id} />;
}
