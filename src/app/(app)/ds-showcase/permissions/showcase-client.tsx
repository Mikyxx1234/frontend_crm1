"use client";

import * as React from "react";
import {
  IconEye,
  IconMessage,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { SwitchGlass } from "@/components/crm/switch-glass";
import { EmptyState } from "@/components/crm/empty-state";
import {
  CHANNEL_SCOPE_OPTIONS,
  CHANNEL_SCOPE_LEGEND,
  MODULE_SCOPE_OPTIONS,
  MODULE_SCOPE_LEGEND,
  OWNER_SCOPE_OPTIONS,
  OWNER_SCOPE_LEGEND,
  PermissionMatrix,
  PermissionRow,
  RoleChip,
  ScopeLegend,
  ScopeSelector,
  SensitiveBadge,
} from "@/components/crm/permissions";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ShowcaseClient() {
  const [moduleScope, setModuleScope] = React.useState(1);
  const [ownerScope, setOwnerScope] = React.useState("own");
  const [channelScope, setChannelScope] = React.useState("view");
  const [sw, setSw] = React.useState(true);

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />
      <main className="flex min-w-0 flex-col gap-5 overflow-y-auto pr-2">
        <PageHeader
          icon={<IconEye size={22} />}
          title="DS · Permissões (showcase)"
          description="Estados dos primitivos compartilhados — dev-only (Fase 1)"
        />

        <Section title="ScopeSelector — escalas">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="w-40 text-[12px] text-[var(--text-muted)]">
                Módulos (0–3)
              </span>
              <ScopeSelector
                options={MODULE_SCOPE_OPTIONS}
                value={moduleScope}
                onChange={setModuleScope}
                aria-label="Escopo do módulo"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-40 text-[12px] text-[var(--text-muted)]">
                Registros por dono
              </span>
              <ScopeSelector
                options={OWNER_SCOPE_OPTIONS}
                value={ownerScope}
                onChange={setOwnerScope}
                aria-label="Escopo por dono"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-40 text-[12px] text-[var(--text-muted)]">
                Canais
              </span>
              <ScopeSelector
                options={CHANNEL_SCOPE_OPTIONS}
                value={channelScope}
                onChange={setChannelScope}
                aria-label="Escopo de canal"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-40 text-[12px] text-[var(--text-muted)]">
                Disabled (todo)
              </span>
              <ScopeSelector
                options={MODULE_SCOPE_OPTIONS}
                value={0}
                onChange={() => {}}
                aria-label="Escopo desabilitado"
                disabled
              />
            </div>
          </div>
        </Section>

        <Section title="ScopeLegend">
          <div className="flex flex-col gap-2">
            <ScopeLegend items={MODULE_SCOPE_LEGEND} />
            <ScopeLegend items={OWNER_SCOPE_LEGEND} />
            <ScopeLegend items={CHANNEL_SCOPE_LEGEND} />
          </div>
        </Section>

        <Section title="SensitiveBadge">
          <div className="flex items-center gap-3">
            <SensitiveBadge />
            <SensitiveBadge withIcon />
            <SensitiveBadge tone="warn">Cuidado</SensitiveBadge>
          </div>
        </Section>

        <Section title="RoleChip">
          <div className="flex flex-wrap items-center gap-2">
            <RoleChip label="Gestor" systemPreset />
            <RoleChip label="Operador" onRemove={() => {}} />
            <RoleChip label="Removendo…" onRemove={() => {}} removing />
          </div>
        </Section>

        <Section title="PermissionMatrix + PermissionRow">
          <PermissionMatrix
            title="Vendas & CRM"
            legend={<ScopeLegend items={MODULE_SCOPE_LEGEND} />}
          >
            <PermissionRow
              icon={<IconUsers size={16} />}
              label="Contatos"
              description="Acesso ao módulo de contatos"
              control={
                <ScopeSelector
                  options={MODULE_SCOPE_OPTIONS}
                  value={moduleScope}
                  onChange={setModuleScope}
                  aria-label="Escopo de contatos"
                  size="sm"
                />
              }
            />
            <PermissionRow
              icon={<IconTrash size={16} />}
              label="Excluir funil"
              description="Ação destrutiva e irreversível"
              sensitive
              control={<SwitchGlass checked={sw} onChange={setSw} size="list" aria-label="Excluir funil" />}
            />
            <PermissionRow
              icon={<IconMessage size={16} />}
              label="Responder mensagens"
              description="Herdado das configurações da conversa"
              control={
                <ScopeSelector
                  options={CHANNEL_SCOPE_OPTIONS}
                  value={channelScope}
                  onChange={setChannelScope}
                  aria-label="Escopo de canal"
                  size="sm"
                />
              }
            />
          </PermissionMatrix>
        </Section>

        <Section title="EmptyState (padrão 'Selecione um atendente')">
          <EmptyState
            icon={<IconUsers size={22} />}
            title="Selecione um atendente"
            description="Clique em um nome na lista para configurar as permissões."
          />
        </Section>

        <Section title="Loading (skeleton glass)">
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--glass-bg-strong)]"
              />
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}
