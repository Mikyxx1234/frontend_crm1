"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconBriefcase,
  IconCircleOff,
  IconLink,
  IconPencil,
  IconPlus,
  IconTag,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { ButtonGlass } from "@/components/crm/button-glass";
import { CheckboxGlass } from "@/components/crm/checkbox-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { KpiCard } from "@/components/crm/kpi-card";
import { PageActionsMenu } from "@/components/crm/page-toolbar";
import {
  SettingsListFilterBar,
  type SettingsFilterGroup,
} from "@/components/crm/settings-filter-bar";
import {
  ListColumnLabel,
  SortableHeader,
  listTableHeadRowClass,
  type SortDir,
} from "@/components/crm/sortable-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SETTINGS_HUB_BACK,
  SettingsV2Shell,
  useSettingsHeaderSlots,
} from "../_v2-shell";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────

type TagRow = {
  id: string;
  name: string;
  color: string;
  dealCount: number;
  contactCount: number;
};

type FilterTab = "todos" | "deals" | "contatos" | "sem-uso";
type KpiFilter = "" | "em-uso" | "sem-uso";
type SortField = "name" | "deals" | "contatos" | "total";

const TAG_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c",
  "#ca8a04", "#16a34a", "#0d9488", "#0891b2", "#4f46e5",
  "#6b7280", "#334155",
];

/** Grid: [check] | Nome | Deals | Contatos | Uso total | Ações */
const LIST_GRID = "32px minmax(0,1fr) 80px 90px 90px 84px";

// ─────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────

async function fetchTags(): Promise<TagRow[]> {
  const res = await fetch(apiUrl("/api/tags?counts=1"));
  if (!res.ok) throw new Error("Erro ao carregar tags");
  return res.json();
}

async function deleteTagRequest(id: string) {
  const res = await fetch(apiUrl(`/api/tags/${id}`), { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string })?.message ?? "Erro ao excluir tag");
  }
}

// ─────────────────────────────────────────────────────────────────
// Shell wrapper
// ─────────────────────────────────────────────────────────────────

export default function TagsV2ClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Tags"
      description="Etiquetas de classificação para contatos e negócios"
      icon={<IconTag size={22} />}
    >
      <TagsPage />
    </SettingsV2Shell>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────

function TagsPage() {
  const queryClient = useQueryClient();
  const slots = useSettingsHeaderSlots();

  const [kpiFilter, setKpiFilter] = React.useState<KpiFilter>("");
  const [filter, setFilter] = React.useState<FilterTab>("todos");
  const [search, setSearch] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState(TAG_COLORS[0]);
  const [editingTag, setEditingTag] = React.useState<TagRow | null>(null);
  const [deleting, setDeleting] = React.useState<TagRow | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortField>("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const newNameRef = React.useRef<HTMLInputElement>(null);

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["tags-settings"],
    queryFn: fetchTags,
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const res = await fetch(apiUrl("/api/tags"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Erro ao criar");
      }
    },
    onSuccess: () => {
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["tags-settings"] });
      toast.success("Tag criada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; color?: string }) => {
      const res = await fetch(apiUrl(`/api/tags/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Erro ao atualizar");
      }
    },
    onSuccess: () => {
      setEditingTag(null);
      queryClient.invalidateQueries({ queryKey: ["tags-settings"] });
      toast.success("Tag atualizada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteTagRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags-settings"] });
      toast.success("Tag excluída.");
      setDeleting(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir tag."),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      let fail = 0;
      for (const id of ids) {
        try {
          await deleteTagRequest(id);
        } catch {
          fail += 1;
        }
      }
      return { ok: ids.length - fail, fail };
    },
    onSuccess: ({ ok, fail }) => {
      queryClient.invalidateQueries({ queryKey: ["tags-settings"] });
      setSelected(new Set());
      setConfirmBulk(false);
      if (fail === 0) toast.success(ok === 1 ? "Tag removida." : `${ok} tags removidas.`);
      else if (ok === 0) toast.error("Não foi possível remover as tags selecionadas.");
      else toast.error(`${ok} removida(s), ${fail} falharam.`);
    },
  });

  const bulkDeleteUnused = useMutation({
    mutationFn: async () => {
      const unused = tags.filter((t) => t.dealCount === 0 && t.contactCount === 0);
      await Promise.all(
        unused.map((t) =>
          fetch(apiUrl(`/api/tags/${t.id}`), { method: "DELETE" }).then((r) => {
            if (!r.ok) throw new Error(`Falha ao excluir "${t.name}"`);
          }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags-settings"] });
      toast.success("Tags sem uso removidas");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unusedCount = tags.filter((t) => t.dealCount === 0 && t.contactCount === 0).length;
  const inUseCount = tags.filter((t) => t.dealCount > 0 || t.contactCount > 0).length;
  const totalDeals = React.useMemo(() => tags.reduce((s, t) => s + t.dealCount, 0), [tags]);
  const totalContacts = React.useMemo(() => tags.reduce((s, t) => s + t.contactCount, 0), [tags]);

  const filtered = React.useMemo(() => {
    let list = tags;
    if (kpiFilter === "em-uso") list = list.filter((t) => t.dealCount > 0 || t.contactCount > 0);
    else if (kpiFilter === "sem-uso") list = list.filter((t) => t.dealCount === 0 && t.contactCount === 0);
    if (filter === "deals") list = list.filter((t) => t.dealCount > 0);
    else if (filter === "contatos") list = list.filter((t) => t.contactCount > 0);
    else if (filter === "sem-uso") list = list.filter((t) => t.dealCount === 0 && t.contactCount === 0);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((t) => t.name.toLowerCase().includes(q));
    return list;
  }, [tags, kpiFilter, filter, search]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name, "pt-BR");
          break;
        case "deals":
          cmp = a.dealCount - b.dealCount;
          break;
        case "contatos":
          cmp = a.contactCount - b.contactCount;
          break;
        case "total":
          cmp = (a.dealCount + a.contactCount) - (b.dealCount + b.contactCount);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  React.useEffect(() => {
    setSelected(new Set());
  }, [search, kpiFilter, filter]);

  const allChecked = sorted.length > 0 && sorted.every((t) => selected.has(t.id));
  const someChecked = sorted.some((t) => selected.has(t.id));

  const toggleAll = React.useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (sorted.every((t) => next.has(t.id))) sorted.forEach((t) => next.delete(t.id));
      else sorted.forEach((t) => next.add(t.id));
      return next;
    });
  }, [sorted]);

  const toggleOne = React.useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSort = React.useCallback((field: SortField) => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(field === "name" ? "asc" : "desc");
      return field;
    });
  }, []);

  const dirFor = (f: SortField): SortDir => (sortBy === f ? sortDir : null);

  const focusNewTag = React.useCallback(() => {
    newNameRef.current?.focus();
    newNameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const filterGroups = React.useMemo<SettingsFilterGroup[]>(
    () => [
      {
        key: "uso",
        label: "Filtrar por uso",
        value: filter,
        onChange: (v) => setFilter(v as FilterTab),
        options: [
          { value: "todos", label: "Todos", count: tags.length },
          { value: "deals", label: "Deals", count: tags.filter((t) => t.dealCount > 0).length },
          { value: "contatos", label: "Contatos", count: tags.filter((t) => t.contactCount > 0).length },
          { value: "sem-uso", label: "Sem uso", count: unusedCount },
        ],
      },
    ],
    [filter, tags, unusedCount],
  );

  const searchNode = React.useMemo(
    () => (
      <SettingsListFilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Buscar tag…"
        ariaLabel="Buscar tags por nome"
        icon={<IconTag size={15} />}
        groups={filterGroups}
        popoverTitle="Filtrar tags"
        onClearAll={() => {
          setSearch("");
          setFilter("todos");
        }}
      />
    ),
    [search, filterGroups],
  );

  const actionsNode = React.useMemo(
    () => (
      <PageActionsMenu
        aria-label="Ações de tags"
        items={[
          {
            icon: <IconPlus size={16} />,
            label: "Nova tag",
            onClick: focusNewTag,
            primary: true,
          },
          {
            icon: <IconTrash size={16} />,
            label: `Limpar sem uso${unusedCount > 0 ? ` (${unusedCount})` : ""}`,
            onClick: () => bulkDeleteUnused.mutate(),
            disabled: unusedCount === 0 || bulkDeleteUnused.isPending,
            divider: true,
          },
        ]}
      />
    ),
    [focusNewTag, unusedCount, bulkDeleteUnused],
  );

  React.useEffect(() => {
    if (!slots) return;
    slots.setCenter(searchNode);
    slots.setActions(actionsNode);
    return () => {
      slots.setCenter(null);
      slots.setActions(null);
    };
  }, [slots, searchNode, actionsNode]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-3.5">
      {/* ── Mini-dash KPI ── */}
      <section
        className="grid shrink-0 grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-5"
        aria-label="Indicadores de tags"
      >
        <KpiCard
          label="Todas"
          value={tags.length.toLocaleString("pt-BR")}
          icon={<IconTag size={20} stroke={2.2} />}
          tone="brand"
          onClick={() => setKpiFilter("")}
        />
        <KpiCard
          label="Em uso"
          value={inUseCount.toLocaleString("pt-BR")}
          icon={<IconLink size={20} stroke={2.2} />}
          tone="success"
          active={kpiFilter === "em-uso"}
          onClick={() => setKpiFilter((prev) => (prev === "em-uso" ? "" : "em-uso"))}
        />
        <KpiCard
          label="Sem uso"
          value={unusedCount.toLocaleString("pt-BR")}
          icon={<IconCircleOff size={20} stroke={2.2} />}
          tone="warning"
          active={kpiFilter === "sem-uso"}
          onClick={() => setKpiFilter((prev) => (prev === "sem-uso" ? "" : "sem-uso"))}
        />
        <KpiCard
          label="Vínculos deals"
          value={totalDeals.toLocaleString("pt-BR")}
          icon={<IconBriefcase size={20} stroke={2.2} />}
          tone="violet"
        />
        <KpiCard
          label="Vínculos contatos"
          value={totalContacts.toLocaleString("pt-BR")}
          icon={<IconUser size={20} stroke={2.2} />}
          tone="neutral"
        />
      </section>

      {/* ── Bulk selection bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-4 py-2.5 backdrop-blur-md">
          <span className="font-display text-[13px] font-bold text-[var(--text-primary)]">
            {selected.size} selecionada{selected.size > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <ButtonGlass
              variant="glass"
              size="sm"
              type="button"
              onClick={() => setSelected(new Set())}
              className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
            >
              Limpar
            </ButtonGlass>
            <ButtonGlass variant="danger" size="sm" type="button" onClick={() => setConfirmBulk(true)}>
              <IconTrash size={14} /> Excluir
            </ButtonGlass>
          </div>
        </div>
      )}

      {/* ── Criar nova tag ── */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3 shadow-[var(--glass-shadow-sm)]">
        <p className="mb-2.5 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Nova tag
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1.5">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                aria-label={c}
                className={cn(
                  "size-5 rounded-full transition-all",
                  newColor === c
                    ? "scale-110 ring-2 ring-offset-1 ring-[var(--glass-border)]"
                    : "hover:scale-105",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <InputGlass
            ref={newNameRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da tag…"
            className="min-w-0 w-full sm:flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                e.preventDefault();
                createMutation.mutate({ name: newName.trim(), color: newColor });
              }
            }}
          />
          {newName.trim() && (
            <span
              className="max-w-full shrink-0 truncate self-start rounded-full px-2.5 py-1 font-display text-[11px] font-semibold sm:self-auto"
              style={{
                background: `${newColor}22`,
                color: newColor,
                border: `1px solid ${newColor}44`,
              }}
            >
              {newName.trim()}
            </span>
          )}
          <ButtonGlass
            variant="primary"
            onClick={() =>
              newName.trim() && createMutation.mutate({ name: newName.trim(), color: newColor })
            }
            disabled={!newName.trim() || createMutation.isPending}
            className="w-full shrink-0 sm:w-auto"
          >
            <IconPlus size={15} />
            Criar
          </ButtonGlass>
        </div>
      </div>

      {/* ── Lista ── */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[64px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)]"
            />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-base)] py-16">
          <IconTag size={40} className="text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-muted)]">Nenhuma tag encontrada.</p>
          {(kpiFilter || filter !== "todos") && (
            <ButtonGlass
              variant="glass"
              size="sm"
              onClick={() => {
                setKpiFilter("");
                setFilter("todos");
              }}
            >
              Ver todas
            </ButtonGlass>
          )}
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-2">
          {/* Cabeçalho de colunas */}
          <div
            className={listTableHeadRowClass("gap-3 border border-transparent px-4")}
            style={{ gridTemplateColumns: LIST_GRID }}
          >
            <span>
              <CheckboxGlass
                checked={allChecked}
                indeterminate={!allChecked && someChecked}
                onChange={toggleAll}
                aria-label="Selecionar todas"
              />
            </span>
            <SortableHeader label="Nome" sort={dirFor("name")} onSort={() => toggleSort("name")} />
            <SortableHeader label="Deals" sort={dirFor("deals")} onSort={() => toggleSort("deals")} />
            <SortableHeader label="Contatos" sort={dirFor("contatos")} onSort={() => toggleSort("contatos")} />
            <SortableHeader label="Uso total" sort={dirFor("total")} onSort={() => toggleSort("total")} />
            <ListColumnLabel align="right">Ações</ListColumnLabel>
          </div>

          {sorted.map((tag) => {
            const isSelected = selected.has(tag.id);
            const isUnused = tag.dealCount === 0 && tag.contactCount === 0;
            return (
              <div
                key={tag.id}
                style={{ gridTemplateColumns: LIST_GRID }}
                className={cn(
                  "group grid items-center gap-3 rounded-[var(--radius-xl)] border px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-[var(--glass-shadow)]",
                  isSelected
                    ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)]"
                    : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] hover:border-[var(--input-border-focus)]",
                )}
              >
                <span>
                  <CheckboxGlass
                    checked={isSelected}
                    onChange={() => toggleOne(tag.id)}
                    aria-label={`Selecionar ${tag.name}`}
                  />
                </span>

                {/* Nome */}
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="size-4 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                    aria-hidden
                  />
                  <div className="min-w-0 leading-tight">
                    <span className="block max-w-full truncate font-display text-[14px] font-bold text-[var(--text-primary)]">
                      {tag.name}
                    </span>
                    {isUnused && (
                      <span className="inline-flex items-center rounded-full bg-[var(--glass-bg-overlay)] px-1.5 py-px font-display text-[10px] font-semibold text-[var(--text-muted)]">
                        Sem uso
                      </span>
                    )}
                  </div>
                </div>

                {/* Deals */}
                <span className="font-display text-[13px] text-[var(--text-secondary)]">
                  {tag.dealCount.toLocaleString("pt-BR")}
                </span>

                {/* Contatos */}
                <span className="font-display text-[13px] text-[var(--text-secondary)]">
                  {tag.contactCount.toLocaleString("pt-BR")}
                </span>

                {/* Uso total */}
                <span className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
                  {(tag.dealCount + tag.contactCount).toLocaleString("pt-BR")}
                </span>

                {/* Ações */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingTag(tag)}
                    aria-label={`Editar ${tag.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--brand-primary)] transition-colors hover:bg-[var(--color-primary-soft)]"
                  >
                    <IconPencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(tag)}
                    aria-label={`Excluir ${tag.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] hover:text-[var(--color-danger)]"
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit dialog (rename + color) ── */}
      {editingTag && (
        <TagEditDialog
          tag={editingTag}
          isPending={updateMutation.isPending}
          onSave={(data) => updateMutation.mutate({ id: editingTag.id, ...data })}
          onClose={() => setEditingTag(null)}
        />
      )}

      {/* ── Delete single ── */}
      <Dialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)]">
                <IconAlertTriangle size={18} />
              </span>
              <DialogTitle className="text-base">Excluir tag?</DialogTitle>
            </div>
            <DialogDescription className="text-[13px] leading-relaxed">
              {deleting
                ? `"${deleting.name}" será removida de ${deleting.dealCount} deal(s) e ${deleting.contactCount} contato(s). Esta ação não pode ser desfeita.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ButtonGlass
              variant="glass"
              size="sm"
              type="button"
              onClick={() => setDeleting(null)}
              disabled={deleteMut.isPending}
              className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
            >
              Cancelar
            </ButtonGlass>
            <ButtonGlass
              variant="danger"
              size="sm"
              type="button"
              disabled={deleteMut.isPending}
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
            >
              <IconTrash size={14} /> {deleteMut.isPending ? "Excluindo..." : "Excluir"}
            </ButtonGlass>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk delete ── */}
      <Dialog open={confirmBulk} onOpenChange={(next) => !next && setConfirmBulk(false)}>
        <DialogContent size="sm">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)]">
                <IconAlertTriangle size={18} />
              </span>
              <DialogTitle className="text-base">
                {`Excluir ${selected.size === 1 ? "tag" : `${selected.size} tags`}?`}
              </DialogTitle>
            </div>
            <DialogDescription className="text-[13px] leading-relaxed">
              As tags selecionadas serão removidas de todos os deals e contatos vinculados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ButtonGlass
              variant="glass"
              size="sm"
              type="button"
              onClick={() => setConfirmBulk(false)}
              disabled={bulkDeleteMut.isPending}
              className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
            >
              Cancelar
            </ButtonGlass>
            <ButtonGlass
              variant="danger"
              size="sm"
              type="button"
              disabled={bulkDeleteMut.isPending}
              onClick={() => bulkDeleteMut.mutate([...selected])}
            >
              <IconTrash size={14} /> {bulkDeleteMut.isPending ? "Excluindo..." : "Excluir"}
            </ButtonGlass>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Tag Edit Dialog — rename + color picker
// ─────────────────────────────────────────────────────────────────

function TagEditDialog({
  tag,
  isPending,
  onSave,
  onClose,
}: {
  tag: TagRow;
  isPending: boolean;
  onSave: (data: { name?: string; color?: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(tag.name);
  const [color, setColor] = React.useState(tag.color);

  const handleSave = () => {
    const updates: { name?: string; color?: string } = {};
    if (name.trim() && name.trim() !== tag.name) updates.name = name.trim();
    if (color !== tag.color) updates.color = color;
    if (Object.keys(updates).length > 0) {
      onSave(updates);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="text-base">Editar tag</DialogTitle>
          <DialogDescription className="text-[13px]">
            Atualize o nome e/ou a cor da tag.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <InputGlass
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da tag…"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") onClose();
            }}
          />
          <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-2">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={cn(
                  "size-6 rounded-full transition-all hover:scale-105",
                  color === c ? "scale-110 ring-2 ring-offset-1 ring-[var(--glass-border)]" : "",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          {name.trim() && (
            <div className="flex items-center gap-2">
              <span className="font-display text-[12px] text-[var(--text-muted)]">Prévia:</span>
              <span
                className="rounded-full px-2.5 py-0.5 font-display text-[11px] font-semibold"
                style={{
                  background: `${color}22`,
                  color,
                  border: `1px solid ${color}44`,
                }}
              >
                {name.trim()}
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <ButtonGlass
            variant="glass"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
          >
            Cancelar
          </ButtonGlass>
          <ButtonGlass
            variant="primary"
            size="sm"
            type="button"
            disabled={!name.trim() || isPending}
            onClick={handleSave}
          >
            {isPending ? "Salvando..." : "Salvar"}
          </ButtonGlass>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
