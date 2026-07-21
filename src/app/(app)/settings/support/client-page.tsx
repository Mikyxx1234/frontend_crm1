"use client";

import {
  IconLifebuoy,
  IconMail,
  IconMessageCircle2,
} from "@tabler/icons-react";

import { GlassCard } from "@/components/crm/glass-card";
import { ButtonGlass } from "@/components/crm/button-glass";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function SupportClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Suporte"
      description="Fale com o time de suporte"
      icon={<IconLifebuoy size={22} />}
    >
      <div className="mx-auto w-full max-w-2xl min-w-0 space-y-4">
        {/* Chat interno — em breve */}
        <GlassCard variant="overlay" className="min-w-0 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]">
              <IconMessageCircle2 size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
                  Chat com o suporte
                </h2>
                <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--color-enterprise-bg)] px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-[var(--brand-primary)]">
                  Em breve
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-snug text-[var(--text-muted)]">
                Em breve você poderá conversar em tempo real com o time de
                suporte diretamente por aqui. Enquanto isso, use os canais
                abaixo.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Canais atuais */}
        <GlassCard variant="overlay" className="min-w-0 p-6 sm:p-8">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Fale com a gente
          </h3>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]/40 px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--brand-primary)]">
                <IconMail className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  E-mail
                </p>
                <p className="truncate text-[12px] text-[var(--text-muted)]">
                  suporte@eduit.com.br
                </p>
              </div>
              <a href="mailto:suporte@eduit.com.br">
                <ButtonGlass type="button" variant="primary" size="sm">
                  Enviar e-mail
                </ButtonGlass>
              </a>
            </div>
          </div>
        </GlassCard>
      </div>
    </SettingsV2Shell>
  );
}
