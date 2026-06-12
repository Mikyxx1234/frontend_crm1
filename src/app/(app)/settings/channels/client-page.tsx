"use client";

import { useState } from "react";
import { IconAntenna, IconPlus } from "@tabler/icons-react";

import OldChannelsPage from "@/app/old/settings/channels/client-page";
import { SearchInput } from "@/components/crm/search-input";
import { SettingsV2Shell } from "../_v2-shell";

export default function ChannelsV2ClientPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <SettingsV2Shell
      title="Canais"
      description="WhatsApp, Instagram, Facebook e demais canais conectados"
      icon={<IconAntenna size={22} />}
      center={
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar canais por nome, telefone..."
        />
      }
      actions={
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--brand-primary)] px-3.5 py-1.5 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)]"
        >
          <IconPlus size={16} /> Novo Canal
        </button>
      }
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-4 shadow-[var(--glass-shadow)] backdrop-blur-md">
        <OldChannelsPage
          search={search}
          createOpen={createOpen}
          onCreateOpenChange={setCreateOpen}
          hideToolbar
        />
      </div>
    </SettingsV2Shell>
  );
}
