"use client";

/*
 * Seletor de pipeline — usa o mesmo DropdownGlass do FilterBar do dashboard
 * para manter visual consistente em toda a V2.
 *
 * Envolto em <ClientOnly> porque o `DropdownMenu` do Radix usa `useId()`
 * internamente e a contagem de chamadas estava divergindo entre SSR e
 * CSR (irmaos lazy-mounted entre o trigger e a posicao na arvore),
 * gerando hydration mismatch ("id=radix-_R_1... vs _R_5..."). O fallback
 * preserva exatamente o footprint do trigger (h-10, min-w-180px) — sem
 * layout shift no mount.
 */

import { IconFilter } from "@tabler/icons-react";

import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { ClientOnly } from "@/components/util/client-only";
import { usePipelines } from "@/features/pipeline-v2/hooks";

interface PipelineSwitcherProps {
  selectedId: string | null;
  onChange: (id: string) => void;
}

export function PipelineSwitcher({ selectedId, onChange }: PipelineSwitcherProps) {
  const { data: pipelines = [] } = usePipelines();

  const options = pipelines.map((p) => ({
    value: p.id,
    label: p.name,
    icon: <IconFilter size={15} />,
  }));

  return (
    <ClientOnly
      fallback={
        <div
          aria-hidden
          className="inline-flex h-10 min-w-[180px] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 shadow-[var(--glass-shadow-sm)]"
        >
          <span className="font-display text-[13px] font-semibold text-[var(--text-muted)]">
            Pipeline
          </span>
        </div>
      }
    >
      <DropdownGlass
        options={options}
        value={selectedId ?? undefined}
        onValueChange={onChange}
        placeholder="Pipeline"
        menuLabel="Pipeline"
        triggerClassName="min-w-[180px]"
      />
    </ClientOnly>
  );
}
