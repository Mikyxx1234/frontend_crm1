"use client";

/*
 * Seletor de pipeline — usa o mesmo DropdownGlass do FilterBar do dashboard
 * para manter visual consistente em toda a V2.
 */

import { IconFilter } from "@tabler/icons-react";

import { DropdownGlass } from "@/components/crm/dropdown-glass";
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
    <DropdownGlass
      options={options}
      value={selectedId ?? undefined}
      onValueChange={onChange}
      placeholder="Pipeline"
      menuLabel="Pipeline"
      triggerClassName="min-w-[180px]"
    />
  );
}
