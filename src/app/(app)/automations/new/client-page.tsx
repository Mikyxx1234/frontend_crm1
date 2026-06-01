"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconArrowLeft, IconBolt, IconSparkles } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { GlassCard } from "@/components/crm/glass-card";
import { ButtonGlass } from "@/components/crm/button-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { useCreateAutomation } from "@/features/automations-v2/hooks";

const TRIGGER_OPTIONS = [
  { value: "CONTACT_CREATED", label: "Contato criado" },
  { value: "CONTACT_UPDATED", label: "Contato atualizado" },
  { value: "DEAL_STAGE_CHANGED", label: "Negócio mudou de estágio" },
  { value: "TAG_ADDED", label: "Tag adicionada" },
  { value: "FORM_SUBMITTED", label: "Formulário enviado" },
  { value: "MESSAGE_RECEIVED", label: "Mensagem recebida" },
  { value: "SCHEDULED", label: "Agendado (cron)" },
];

/**
 * Wizard simplificado de criação de automação (versão v2 glass).
 * Cria a automação com nome + trigger + descrição e redireciona
 * para o builder, onde o usuário monta as etapas.
 *
 * O wizard antigo (com galeria de templates e canvas integrado)
 * continua disponível em /old/automations/new. Quando o v0 portar
 * a galeria, este arquivo pode ser estendido.
 */
export default function NewAutomationClientPage() {
  const router = useRouter();
  const createMutation = useCreateAutomation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState(TRIGGER_OPTIONS[0].value);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Informe um nome para a automação");
      return;
    }
    try {
      const created = await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        triggerType,
        triggerConfig: {},
        active: false,
      });
      toast.success("Automação criada");
      router.push(`/automations/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar automação");
    }
  }

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-3.5 overflow-hidden">
        <PageHeader
          icon={<IconBolt size={22} />}
          title="Nova automação"
          description="Configure o gatilho e monte as etapas no canvas"
          actions={
            <>
              <Link href="/automations">
                <ButtonGlass variant="glass">
                  <IconArrowLeft size={16} /> Cancelar
                </ButtonGlass>
              </Link>
              <ButtonGlass
                variant="primary"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                <IconSparkles size={16} />
                {createMutation.isPending ? "Criando..." : "Criar e abrir builder"}
              </ButtonGlass>
            </>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto pr-2">
          <GlassCard className="p-5">
            <h2 className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Identificação
            </h2>
            <div className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5">
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  Nome
                </span>
                <InputGlass
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Boas-vindas no WhatsApp"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  Descrição
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="O que esta automação faz?"
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2.5 font-body text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none backdrop-blur-sm transition-all duration-150 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                />
              </label>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Gatilho
            </h2>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {TRIGGER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTriggerType(opt.value)}
                  className={
                    "flex items-center gap-3 rounded-[var(--radius-md)] border px-3.5 py-3 text-left font-body text-[13px] transition-all " +
                    (triggerType === opt.value
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--text-primary)]"
                      : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/40")
                  }
                >
                  <span
                    className={
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 " +
                      (triggerType === opt.value
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]"
                        : "border-[var(--glass-border)]")
                    }
                  >
                    {triggerType === opt.value && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-3 font-body text-[12px] text-[var(--text-muted)]">
              A configuração detalhada do gatilho (parâmetros, filtros) e as etapas
              são montadas no builder após a criação.
            </p>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
