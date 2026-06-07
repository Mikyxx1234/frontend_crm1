"use client";

import {
  IconLayoutDashboard,
  IconLayoutGrid,
  IconApps,
  IconAppsFilled,
  IconPuzzle,
  IconPuzzleFilled,
  IconBoxMultiple,
  IconPackages,
  IconComponents,
  IconPlugConnected,
  IconStack2,
  IconAppWindow,
  IconGridDots,
  type Icon,
} from "@tabler/icons-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Página de preview TEMPORÁRIA para escolher o ícone de "Widgets" na NavRail.
 * O ícone atual (IconLayoutGrid) colide visualmente com Dashboard
 * (IconLayoutDashboard). Aqui comparamos candidatos lado a lado.
 */

interface Candidate {
  id: string;
  label: string;
  hint: string;
  icon: Icon;
}

const CANDIDATES: Candidate[] = [
  {
    id: "apps",
    label: "Apps",
    hint: "Grade de 9 quadrados — metáfora clássica de “central de apps”.",
    icon: IconApps,
  },
  {
    id: "apps-filled",
    label: "Apps (sólido)",
    hint: "Versão preenchida, mais peso visual e contraste com Dashboard.",
    icon: IconAppsFilled,
  },
  {
    id: "puzzle",
    label: "Quebra-cabeça",
    hint: "Peça de puzzle — metáfora forte de “extensões / plugins”.",
    icon: IconPuzzle,
  },
  {
    id: "puzzle-filled",
    label: "Quebra-cabeça (sólido)",
    hint: "Peça preenchida, destaca-se bem na rail.",
    icon: IconPuzzleFilled,
  },
  {
    id: "components",
    label: "Componentes",
    hint: "Blocos modulares — ideia de peças combináveis.",
    icon: IconComponents,
  },
  {
    id: "box-multiple",
    label: "Caixas",
    hint: "Caixas empilhadas — coleção de módulos/extensões.",
    icon: IconBoxMultiple,
  },
  {
    id: "packages",
    label: "Pacotes",
    hint: "Pacotes — instaláveis, marketplace de extensões.",
    icon: IconPackages,
  },
  {
    id: "plug",
    label: "Plugue",
    hint: "Conector — integrações e extensões plugáveis.",
    icon: IconPlugConnected,
  },
  {
    id: "stack",
    label: "Camadas",
    hint: "Camadas empilhadas — agrupamento de recursos.",
    icon: IconStack2,
  },
  {
    id: "app-window",
    label: "Janela",
    hint: "Janela de app — superfície de extensão.",
    icon: IconAppWindow,
  },
  {
    id: "grid-dots",
    label: "Grade pontilhada",
    hint: "Variação de grade, ainda próxima do atual.",
    icon: IconGridDots,
  },
  {
    id: "current",
    label: "Atual (LayoutGrid)",
    hint: "O ícone em uso hoje — colide com Dashboard.",
    icon: IconLayoutGrid,
  },
];

/** Reproduz o visual de um DockButton da NavRail v2. */
function RailButton({
  icon: Icon,
  active,
}: {
  icon: Icon;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] transition-colors",
        active
          ? "bg-[var(--brand-primary)] text-white shadow-[0_6px_16px_rgba(91,111,245,0.4)]"
          : "text-[var(--text-muted)]",
      )}
    >
      <Icon size={20} />
    </div>
  );
}

/** Mini NavRail só com Dashboard + o candidato, para checar o contraste real. */
function MiniRail({ candidate }: { candidate: Icon }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] px-3 py-4 shadow-[var(--glass-shadow)] backdrop-blur-[16px]">
      <RailButton icon={IconLayoutDashboard} />
      <RailButton icon={candidate} active />
    </div>
  );
}

export default function WidgetsIconPreviewPage() {
  const [selected, setSelected] = useState<string>("apps");

  return (
    <div className="v2-screen overflow-auto p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-2 flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Ícone de Widgets — variações
          </h1>
        </header>
        <p className="mb-8 max-w-2xl font-body text-[14px] leading-relaxed text-[var(--text-secondary)]">
          O ícone atual de Widgets (grade) é quase idêntico ao do Dashboard.
          Abaixo, cada candidato aparece logo abaixo do ícone do Dashboard —
          como ficaria na NavRail — para você comparar o contraste. Clique para
          selecionar; me diga o escolhido que eu aplico no catálogo.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {CANDIDATES.map((c) => {
            const isSel = selected === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c.id)}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-[var(--radius-xl)] border bg-[var(--glass-bg-modal)] p-5 text-center transition-all",
                  isSel
                    ? "border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/30"
                    : "border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50",
                )}
              >
                <MiniRail candidate={c.icon} />
                <div>
                  <p className="font-display text-[13px] font-bold text-[var(--text-primary)]">
                    {c.label}
                  </p>
                  <p className="mt-1 font-body text-[11px] leading-snug text-[var(--text-muted)]">
                    {c.hint}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
