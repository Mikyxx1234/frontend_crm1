"use client"

import { useRouter } from "next/navigation"
import { IconBrandWhatsapp, IconMail, IconSpeakerphone } from "@tabler/icons-react"

import { EmptyState } from "@/components/crm/empty-state"
import {
  OpsNameCell,
  OpsProgress,
  OpsRowMenu,
  OpsStatusPill,
  OpsTableHead,
  OpsTableRow,
  OpsTableShell,
  type OpsStatusTone,
} from "@/components/crm/ops-data-table"

import { STATUS_META, type StatusTone } from "./constants"
import type { CampaignListItem } from "./types"
import {
  campaignSegmentLabel,
  fmtDateBR,
  fmtDateTimeBR,
  isDeletable,
  isSendingLike,
  nf,
  rate,
} from "./viz"

const GRID =
  "lg:grid-cols-[minmax(0,2fr)_minmax(120px,0.7fr)_minmax(150px,0.95fr)_minmax(120px,0.75fr)_minmax(130px,0.85fr)_40px]"

const TONE_MAP: Record<StatusTone, OpsStatusTone> = {
  success: "success",
  brand: "progress",
  info: "scheduled",
  warning: "scheduled",
  danger: "danger",
  neutral: "muted",
}

function campaignWhen(c: CampaignListItem): string {
  if (c.status === "SCHEDULED" && c.scheduledAt) return fmtDateTimeBR(c.scheduledAt)
  if (c.status === "DRAFT" && !c.scheduledAt) return "Não definida"
  if (c.startedAt) return fmtDateTimeBR(c.startedAt)
  return fmtDateBR(c.createdAt)
}

function ChannelIcon({ provider }: { provider?: string }) {
  const p = (provider ?? "").toLowerCase()
  if (p.includes("email") || p.includes("mail")) return <IconMail size={17} stroke={1.8} />
  if (p.includes("whats") || p.includes("meta")) return <IconBrandWhatsapp size={17} stroke={1.8} />
  return <IconSpeakerphone size={17} stroke={1.8} />
}

export function CampaignsTable({
  items,
  onDelete,
}: {
  items: CampaignListItem[]
  onDelete?: (campaign: CampaignListItem) => void
}) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)]">
        <EmptyState
          icon={<IconSpeakerphone size={28} />}
          title="Nenhuma campanha encontrada."
          description="Ajuste a busca ou o filtro para ver outros disparos."
        />
      </div>
    )
  }

  return (
    <OpsTableShell label="Lista de campanhas">
      <OpsTableHead
        gridClass={GRID}
        columns={["Campanha", "Status", "Alcance", "Entrega", "Quando", ""]}
      />
      <div role="rowgroup">
        {items.map((c) => {
          const href = `/campaigns/${c.number ?? c.id}`
          const sending = isSendingLike(c)
          const canDelete = isDeletable(c)
          const delivery = rate(c.readCount || 0, c.sentCount || 0)
          const meta = STATUS_META[c.status]
          const dateLabel =
            c.status === "SCHEDULED" && c.scheduledAt
              ? fmtDateBR(c.scheduledAt)
              : fmtDateBR(c.createdAt)
          return (
            <OpsTableRow
              key={c.id}
              gridClass={GRID}
              label={`Abrir ${c.name}`}
              onOpen={() => router.push(href)}
            >
              <div role="cell">
                <OpsNameCell
                  icon={<ChannelIcon provider={c.channel?.provider} />}
                  title={c.name}
                  subtitle={`${campaignSegmentLabel(c)} · ${dateLabel}`}
                />
              </div>
              <div role="cell">
                <OpsStatusPill
                  label={meta.label}
                  tone={TONE_MAP[meta.tone]}
                  pulse={sending}
                />
              </div>
              <div role="cell" className="max-lg:hidden">
                <div className="flex flex-col">
                  <span className="font-display text-[14px] font-semibold tabular-nums text-[var(--text-primary)]">
                    {nf(c.sentCount || 0)}
                  </span>
                  <span className="truncate font-body text-[12px] text-[var(--text-muted)]">
                    {nf(c.readCount || 0)} lidos · {nf(c.repliedCount || 0)} respostas
                  </span>
                </div>
              </div>
              <div role="cell" className="max-lg:hidden">
                <OpsProgress value={delivery} active={sending} />
              </div>
              <div role="cell" className="max-lg:hidden font-body text-[13px] text-[var(--text-secondary)]">
                {campaignWhen(c)}
              </div>
              <div
                role="cell"
                className="flex justify-end opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <OpsRowMenu
                  label={`Ações de ${c.name}`}
                  items={[
                    { label: "Abrir", onClick: () => router.push(href) },
                    ...(onDelete
                      ? [
                          {
                            label: "Excluir",
                            danger: true,
                            disabled: sending || !canDelete,
                            title: sending
                              ? "Campanhas em envio não podem ser excluídas"
                              : canDelete
                                ? undefined
                                : "Cancele a campanha antes de excluir",
                            onClick: () => onDelete(c),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </OpsTableRow>
          )
        })}
      </div>
    </OpsTableShell>
  )
}
