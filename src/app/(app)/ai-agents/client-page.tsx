"use client";

import { useCallback, useMemo, useState } from "react";
import { IconAlertTriangle, IconLoader2, IconRobot } from "@tabler/icons-react";

import { TabsGlass } from "@/components/crm/tabs-glass";
import OldAIAgentsPage from "@/features/legacy-v1/ai-agents";
import { CockpitFrame } from "@/features/ai-agents/cockpit-frame";
import {
  getCockpitUrl,
  resolveCockpitApiBase,
  type CockpitNavGroup,
} from "@/features/ai-agents/cockpit-api";
import { useCockpitEmbedToken, useCockpitNav } from "@/features/ai-agents/hooks";
import { useThemeV2 } from "@/hooks/use-theme-v2";
import { AppV2PageShell } from "../_v2-page-shell";

/**
 * Fase 3 (migração v1→v2): rota canônica `/ai-agents` no shell v2.
 *
 * Mesma observação de `/reports`: não há item correspondente no
 * `SIDEBAR_CATALOG` backend — registrado em DECISOES-PENDENTES. A rota fica
 * acessível por URL direta. A v1 já cobre lista, editor e fila de rascunhos;
 * a reskin V0 entra na Fase 5/6.
 *
 * Cockpit IA: quando `NEXT_PUBLIC_COCKPIT_URL` está definida, a página ganha
 * uma barra de abas — "Agentes" (conteúdo de sempre) + as abas publicadas
 * pelo próprio serviço do cockpit. Sem a env, renderiza exatamente como antes.
 */
export default function AIAgentsV2ClientPage() {
  const cockpitUrl = getCockpitUrl();
  return (
    <AppV2PageShell title="Agentes de IA" icon={<IconRobot size={22} />}>
      {cockpitUrl ? <AIAgentsWithCockpit cockpitUrl={cockpitUrl} /> : <AgentsPanel />}
    </AppV2PageShell>
  );
}

function AgentsPanel() {
  return (
    <div className="min-w-0 overflow-x-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-3 backdrop-blur-md sm:p-4">
      <OldAIAgentsPage embedded />
    </div>
  );
}

/** Aba usada só quando o `nav.json` não pôde ser lido. Não tem `data-stage`
 *  correspondente: montamos o iframe sem enviar `cockpit:stage` e deixamos o
 *  cockpit abrir na aba padrão dele. O `cockpit:ready` corrige a lista. */
const UNKNOWN_TAB_ID = "__cockpit__";

interface CockpitTab {
  id: string;
  label: string;
  group: string;
}

function flattenNav(nav: CockpitNavGroup[]): CockpitTab[] {
  return nav.flatMap((g) => g.items.map((i) => ({ id: i.id, label: i.label, group: g.group })));
}

function AIAgentsWithCockpit({ cockpitUrl }: { cockpitUrl: string }) {
  const { theme } = useThemeV2();
  const navQuery = useCockpitNav(cockpitUrl);

  const [navFromFrame, setNavFromFrame] = useState<CockpitNavGroup[] | null>(null);
  // "Agentes" e a aba do cockpit são estados independentes: assim voltar para
  // Agentes não perde a aba escolhida no cockpit, e a aba do cockpit sobrevive
  // à troca da lista de abas (nav.json → cockpit:ready) sem efeito de sync.
  const [onAgentsTab, setOnAgentsTab] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  // Lazy loading real: o iframe só entra no DOM depois que o usuário sai da
  // aba "Agentes". Voltando para ela, ele fica montado e só pausa o polling.
  const [frameMounted, setFrameMounted] = useState(false);

  const apiBase = useMemo(() => resolveCockpitApiBase(), []);

  // `cockpit:ready` é autoritativo; o nav.json é só o atalho que evita montar
  // o iframe para descobrir as abas.
  const cockpitTabs = useMemo<CockpitTab[]>(() => {
    const nav = navFromFrame ?? navQuery.data;
    if (nav?.length) return flattenNav(nav);
    if (navQuery.isError) return [{ id: UNKNOWN_TAB_ID, label: "Cockpit IA", group: "" }];
    return [];
  }, [navFromFrame, navQuery.data, navQuery.isError]);

  // Derivado (não sincronizado): se a aba escolhida deixou de existir, cai na
  // primeira disponível.
  const activeStage =
    selectedStage && cockpitTabs.some((t) => t.id === selectedStage)
      ? selectedStage
      : (cockpitTabs[0]?.id ?? null);
  // A aba de fallback não corresponde a nenhum `data-stage` — não mandamos
  // `cockpit:stage` e deixamos o cockpit abrir na aba padrão dele.
  const stageForFrame = activeStage === UNKNOWN_TAB_ID ? null : activeStage;

  const tokenQuery = useCockpitEmbedToken(frameMounted);
  const token = tokenQuery.data?.token ?? null;
  const refetchToken = tokenQuery.refetch;
  // Estável: o `CockpitFrame` usa esta referência nas dependências do listener
  // de `postMessage`.
  const handleAuthError = useCallback(() => {
    void refetchToken();
  }, [refetchToken]);

  const tabs = useMemo(
    () => [{ label: "Agentes" }, ...cockpitTabs.map((t) => ({ label: t.label }))],
    [cockpitTabs],
  );
  const activeIndex = onAgentsTab
    ? 0
    : Math.max(0, cockpitTabs.findIndex((t) => t.id === activeStage) + 1);

  const activeGroup = onAgentsTab
    ? null
    : (cockpitTabs.find((t) => t.id === activeStage)?.group || null);

  function handleTabChange(index: number) {
    if (index === 0) {
      setOnAgentsTab(true);
      return;
    }
    const tab = cockpitTabs[index - 1];
    if (!tab) return;
    setFrameMounted(true);
    setOnAgentsTab(false);
    setSelectedStage(tab.id);
  }

  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      {cockpitTabs.length > 0 && (
        <TabsGlass tabs={tabs} activeTab={activeIndex} onChange={handleTabChange} scrollable />
      )}

      <div className={onAgentsTab ? "contents" : "hidden"}>
        <AgentsPanel />
      </div>

      {frameMounted && (
        <div className={onAgentsTab ? "hidden" : "flex min-w-0 flex-col gap-2"}>
          {activeGroup && (
            <p className="px-0.5 font-display text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {activeGroup}
            </p>
          )}

          {token ? (
            <CockpitFrame
              cockpitUrl={cockpitUrl}
              apiBase={apiBase}
              token={token}
              theme={theme}
              stage={stageForFrame}
              visible={!onAgentsTab}
              onNav={setNavFromFrame}
              onStageChange={setSelectedStage}
              onAuthError={handleAuthError}
            />
          ) : (
            <CockpitPlaceholder
              error={tokenQuery.error?.message ?? null}
              onRetry={handleAuthError}
            />
          )}
        </div>
      )}
    </div>
  );
}

function CockpitPlaceholder({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-8 text-center">
      {error ? (
        <>
          <IconAlertTriangle className="size-6 text-[var(--color-danger-text)]" />
          <p className="font-body text-[13px] text-[var(--text-muted)]">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="font-display text-[12.5px] font-semibold text-[var(--brand-primary)] hover:underline"
          >
            Tentar novamente
          </button>
        </>
      ) : (
        <>
          <IconLoader2 className="size-6 animate-spin text-[var(--text-muted)]" />
          <p className="font-body text-[13px] text-[var(--text-muted)]">
            Preparando contexto seguro…
          </p>
        </>
      )}
    </div>
  );
}
