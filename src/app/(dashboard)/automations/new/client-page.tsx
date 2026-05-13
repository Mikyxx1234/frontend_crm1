"use client";

import { apiUrl } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { TriggerConfigFields, TriggerTypeSelect } from "@/components/automations/trigger-config-fields";
import { TemplateGallery } from "@/components/automations/template-gallery";

const WorkflowCanvas = dynamic(
  () => import("@/components/automations/workflow-canvas").then((m) => m.WorkflowCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#f0f4f8]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    ),
  },
);
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageHeaderDescriptionClass, pageHeaderTitleClass } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import {
  type AutomationStep,
  defaultTriggerConfig,
  newStepId,
  workflowStepsToPayload,
} from "@/lib/automation-workflow";
import type { AutomationTemplate } from "@/lib/automation-templates";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string };
    return j.message ?? `Erro ${res.status}`;
  } catch {
    return `Erro ${res.status}`;
  }
}

/**
 * Wizard de criação de automação.
 *
 * Estrutura:
 *  0 — Galeria de templates (ou "começar do zero")
 *  1 — Nome + tipo de gatilho
 *  2 — Parâmetros do gatilho
 *  3 — Canvas do fluxo
 *
 * Quando o operador escolhe um template, todos os campos dos passos 1 e 2
 * são pré-preenchidos e o usuário pula direto para o canvas (passo 3),
 * onde ajusta IDs de tag/estágio antes de ativar. A fonte do template
 * mostra um selo no topo e permite "trocar template".
 */

type WizardStep = 0 | 1 | 2 | 3;

export default function NewAutomationPage() {
  const router = useRouter();
  const [wizard, setWizard] = useState<WizardStep>(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("contact_created");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(() =>
    defaultTriggerConfig("contact_created")
  );
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(null);

  const onTriggerTypeChange = useCallback((t: string) => {
    setTriggerType(t);
    setTriggerConfig(defaultTriggerConfig(t));
  }, []);

  const applyTemplate = useCallback((template: AutomationTemplate) => {
    setName(template.automation.name);
    setDescription(template.automation.description);
    setTriggerType(template.automation.triggerType);
    setTriggerConfig({ ...template.automation.triggerConfig });
    setSteps(
      template.automation.steps.map((s) => ({
        id: s.id || newStepId(),
        type: s.type,
        config: { ...s.config },
      })),
    );
    setAppliedTemplateId(template.id);
    setAppliedTemplateName(template.name);
    setWizard(3);
  }, []);

  const startBlank = useCallback(() => {
    setName("");
    setDescription("");
    setTriggerType("contact_created");
    setTriggerConfig(defaultTriggerConfig("contact_created"));
    setSteps([]);
    setAppliedTemplateId(null);
    setAppliedTemplateName(null);
    setWizard(1);
  }, []);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/automations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          triggerType,
          triggerConfig,
          steps: workflowStepsToPayload(steps),
        }),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return (await res.json()) as { id: string };
    },
    onSuccess: (data) => {
      router.push(`/automations/${data.id}`);
    },
  });

  const canNext1 = name.trim().length > 0;
  const stepTitle = useMemo(() => {
    if (wizard === 0) return "Escolher ponto de partida";
    if (wizard === 1) return "Nome e gatilho";
    if (wizard === 2) return "Configurar gatilho";
    return "Fluxo no canvas";
  }, [wizard]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-4">
        <Button type="button" variant="ghost" size="icon" asChild>
          <Link href="/automations" aria-label="Voltar">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className={pageHeaderTitleClass}>Nova automação</h1>
          <p className={pageHeaderDescriptionClass}>
            Passo {wizard + 1} de 4 — {stepTitle}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= wizard ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {appliedTemplateId && wizard > 0 ? (
        <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2">
          <div className="flex items-center gap-2 text-[13px]">
            <Sparkles className="size-4 text-blue-600" />
            <span className="font-semibold text-blue-900">
              {appliedTemplateName}
            </span>
            <span className="text-blue-700/80">— baseado em template</span>
          </div>
          <button
            type="button"
            onClick={() => setWizard(0)}
            className="rounded-md px-2 py-0.5 text-[12px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            Trocar template
          </button>
        </div>
      ) : null}

      {wizard === 0 ? (
        <TemplateGallery onApplyTemplate={applyTemplate} onStartBlank={startBlank} />
      ) : null}

      {wizard === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Defina o nome e o evento que inicia o fluxo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="na-name">Nome</Label>
              <Input
                id="na-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Boas-vindas ao lead"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="na-desc">Descrição (opcional)</Label>
              <Textarea
                id="na-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <TriggerTypeSelect value={triggerType} onChange={onTriggerTypeChange} />

            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm font-medium">Simular comportamento humano</p>
              <p className="text-xs text-muted-foreground">
                Faz o robô parecer uma pessoa real para o cliente no WhatsApp.
              </p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm">Marcar como lida</p>
                  <p className="text-xs text-muted-foreground">
                    Exibe ticks azuis ao receber mensagem.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={triggerConfig.markAsRead === true}
                  onClick={() =>
                    setTriggerConfig((tc) => ({ ...tc, markAsRead: !tc.markAsRead }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${triggerConfig.markAsRead ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`pointer-events-none block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform ${triggerConfig.markAsRead ? "translate-x-5" : ""}`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm">Simular digitação</p>
                  <p className="text-xs text-muted-foreground">
                    Mostra &ldquo;digitando...&rdquo; antes de cada resposta.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={triggerConfig.simulateTyping === true}
                  onClick={() =>
                    setTriggerConfig((tc) => ({ ...tc, simulateTyping: !tc.simulateTyping }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${triggerConfig.simulateTyping ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`pointer-events-none block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform ${triggerConfig.simulateTyping ? "translate-x-5" : ""}`}
                  />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {wizard === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Parâmetros do gatilho</CardTitle>
            <CardDescription>
              Ajuste os filtros para {triggerType.replace(/_/g, " ")}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TriggerConfigFields
              triggerType={triggerType}
              value={triggerConfig}
              onChange={setTriggerConfig}
            />
          </CardContent>
        </Card>
      ) : null}

      {wizard === 3 ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Construir fluxo</CardTitle>
            <CardDescription>
              {appliedTemplateId
                ? "Revise os passos do template e ajuste IDs de tag/estágio antes de salvar."
                : "Arraste blocos da paleta, conecte os nós e clique para configurar cada passo."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <WorkflowCanvas
              steps={steps}
              onStepsChange={setSteps}
              triggerType={triggerType}
              triggerConfig={triggerConfig}
            />
          </CardContent>
        </Card>
      ) : null}

      {wizard > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setWizard((w) => (Math.max(0, w - 1) as WizardStep))}
          >
            Voltar
          </Button>
          <div className="flex gap-2">
            {wizard < 3 ? (
              <Button
                type="button"
                disabled={wizard === 1 && !canNext1}
                onClick={() => setWizard((w) => ((w + 1) as WizardStep))}
                className="gap-2"
              >
                Continuar
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="gap-2"
                disabled={!canNext1 || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Criando…" : "Criar automação"}
                <Check className="size-4" />
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {createMutation.isError ? (
        <p className="text-sm text-destructive">{(createMutation.error as Error).message}</p>
      ) : null}
    </div>
  );
}
