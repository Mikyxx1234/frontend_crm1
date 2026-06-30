"use client";

import { useState } from "react";
import { IconAntenna, IconPlus } from "@tabler/icons-react";

import OldChannelsPage from "@/features/legacy-v1/settings/channels";
import { PagePrimaryButton, PageSearchBar } from "@/components/crm/page-toolbar";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function ChannelsV2ClientPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Canais"
      description="WhatsApp, Instagram, Facebook e demais canais conectados"
      icon={<IconAntenna size={22} />}
      center={
        <PageSearchBar
          variant="compact"
          value={search}
          onChange={setSearch}
          placeholder="Buscar canais por nome, telefone..."
          aria-label="Buscar canais"
        />
      }
      actions={
        <PagePrimaryButton type="button" onClick={() => setCreateOpen(true)}>
          <IconPlus size={16} /> Novo Canal
        </PagePrimaryButton>
      }
    >
      <OldChannelsPage
        search={search}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        hideToolbar
      />
    </SettingsV2Shell>
  );
}
