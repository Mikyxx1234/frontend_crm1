import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import ProfileClientPage from "@/app/(dashboard)/settings/profile/client-page";
import { UserCircle2 } from "lucide-react";

export default function ProfileV2Page() {
  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />
      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          title="Meu Perfil"
          description="Gerencie seus dados pessoais, foto e configurações da conta."
          icon={<UserCircle2 size={22} />}
        />
        <div className="overflow-auto px-4 pb-6">
          <ProfileClientPage />
        </div>
      </main>
    </div>
  );
}
