"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import {
  IconUsers,
  IconPlus,
  IconTrash,
  IconAlertTriangle,
  IconPencil,
  IconBuilding,
  IconSearch,
  IconCheck,
  IconX,
  IconPhone,
  IconMail,
  IconTable,
  IconLayoutGrid,
  IconList,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { PagePrimaryButton, PageSearchBar, PageSegmentedControl } from "@/components/crm/page-toolbar";
import { ListColumnLabel, listTableHeadRowClass } from "@/components/crm/sortable-header";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";
import { CheckboxGlass } from "@/components/crm/checkbox-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import { Chip } from "@/components/crm/chip";
import { InputGlass } from "@/components/crm/input-glass";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  useContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
  useCompanies,
} from "@/features/directory-v2/hooks";
import type { ContactListItemDto } from "@/features/directory-v2/api";

const DEFAULT_PER_PAGE = 25;
type ViewMode = "tabela" | "cartoes" | "lista";

function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

const AVATAR_COLORS = [
  "var(--brand-primary)",
  "var(--brand-secondary)",
  "var(--color-success)",
  "var(--brand-primary-light)",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const VIEW_ITEMS = [
  { value: "tabela", label: <span className="flex items-center gap-1.5"><IconTable size={14} />Tabela</span> },
  { value: "cartoes", label: <span className="flex items-center gap-1.5"><IconLayoutGrid size={14} />Cartões</span> },
  { value: "lista", label: <span className="flex items-center gap-1.5"><IconList size={14} />Lista</span> },
] as const;

export default function V2ContactsClientPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [view, setView] = useState<ViewMode>("tabela");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ContactListItemDto | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMut = useDeleteContact();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setSelected(new Set());
  }, [debounced, page]);

  const query = useContacts({
    search: debounced || undefined,
    page,
    perPage,
    enabled: isAuthenticated,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  const allChecked = items.length > 0 && items.every((c) => selected.has(c.id));
  const someChecked = items.some((c) => selected.has(c.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) items.forEach((c) => next.delete(c.id));
      else items.forEach((c) => next.add(c.id));
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirmDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await deleteMut.mutateAsync(id);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setConfirmOpen(false);
    setSelected(new Set());
    if (fail === 0) {
      toast.success(ok === 1 ? "Contato excluído." : `${ok} contatos excluídos.`);
    } else if (ok === 0) {
      toast.error("Não foi possível excluir os contatos selecionados.");
    } else {
      toast.error(`${ok} excluído(s), ${fail} falharam.`);
    }
  }

  const isLoading = query.isLoading && items.length === 0;
  const hasError = !!query.error;

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconUsers size={22} stroke={2.2} />}
          title="Contatos"
          description="Diretório de contatos vinculados ao CRM"
          center={
            <PageSearchBar
              variant="compact"
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome, e-mail..."
              aria-label="Buscar contatos"
            />
          }
          actions={
            <div className="flex items-center gap-2">
              <PageSegmentedControl
                items={VIEW_ITEMS}
                value={view}
                onChange={(v) => setView(v as ViewMode)}
                aria-label="Modo de visualização"
                size="compact"
              />
              <PagePrimaryButton type="button" onClick={() => setCreateOpen(true)}>
                <IconPlus size={15} stroke={2.4} /> Novo contato
              </PagePrimaryButton>
            </div>
          }
        />

        {/* Barra de seleção em massa */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-4 py-2.5 backdrop-blur-md">
            <span className="font-display text-[13px] font-bold text-[var(--text-primary)]">
              {selected.size} selecionado{selected.size > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <ButtonGlass
                variant="glass" size="sm" type="button"
                onClick={() => setSelected(new Set())}
                className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
              >
                Limpar
              </ButtonGlass>
              <ButtonGlass variant="danger" size="sm" type="button" onClick={() => setConfirmOpen(true)}>
                <IconTrash size={14} /> Excluir
              </ButtonGlass>
            </div>
          </div>
        )}

        {/* Estados: loading / erro / vazio */}
        {isLoading ? (
          <div className="h-[400px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
        ) : hasError ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
            {query.error instanceof Error ? query.error.message : "Erro ao carregar."}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
            <EmptyState
              icon={<IconUsers size={28} />}
              title="Nenhum contato encontrado"
              description={debounced ? `Sem resultados para "${debounced}".` : "Crie contatos no Inbox ou via API."}
            />
          </div>
        ) : view === "tabela" ? (
          <TabelaView
            items={items}
            selected={selected}
            allChecked={allChecked}
            someChecked={someChecked}
            onToggleAll={toggleAll}
            onToggleOne={toggleOne}
            onEdit={setEditing}
          />
        ) : view === "cartoes" ? (
          <CartaoView items={items} onEdit={setEditing} />
        ) : (
          <ListaView items={items} onEdit={setEditing} />
        )}

        <PaginationGlass
          label={`${total.toLocaleString("pt-BR")} contatos — página ${page} de ${lastPage}`}
          canPrev={page > 1}
          canNext={page < lastPage}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(lastPage, p + 1))}
          perPage={perPage}
          onPerPageChange={(value) => { setPerPage(value); setPage(1); }}
        />
      </main>

      <CreateContactDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditContactDialog contact={editing} onClose={() => setEditing(null)} />
      <ConfirmDeleteDialog
        open={confirmOpen} count={selected.size} pending={deleteMut.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

// ── Tabela ──────────────────────────────────────────────────────────────────

const TABELA_COLS = "grid-cols-[36px_minmax(180px,2fr)_140px_minmax(120px,1.2fr)_minmax(140px,1.4fr)_100px]";

function TabelaView({
  items, selected, allChecked, someChecked, onToggleAll, onToggleOne, onEdit,
}: {
  items: ContactListItemDto[];
  selected: Set<string>;
  allChecked: boolean;
  someChecked: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onEdit: (c: ContactListItemDto) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 backdrop-blur-md shadow-[var(--glass-shadow)]">
      <div className={listTableHeadRowClass(`grid ${TABELA_COLS} gap-3 px-3 py-2`)}>
        <span>
          <CheckboxGlass checked={allChecked} indeterminate={!allChecked && someChecked} onChange={onToggleAll} aria-label="Selecionar todos" />
        </span>
        <ListColumnLabel>Nome / E-mail</ListColumnLabel>
        <ListColumnLabel>Telefone</ListColumnLabel>
        <ListColumnLabel>Empresa</ListColumnLabel>
        <ListColumnLabel>Tags</ListColumnLabel>
        <ListColumnLabel>Criado em</ListColumnLabel>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {items.map((c) => (
          <div
            key={c.id}
            className={`grid ${TABELA_COLS} items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--glass-bg-overlay)] ${selected.has(c.id) ? "bg-[var(--color-primary-soft)]" : ""}`}
          >
            <span>
              <CheckboxGlass checked={selected.has(c.id)} onChange={() => onToggleOne(c.id)} aria-label={`Selecionar ${c.name}`} />
            </span>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white" style={{ background: avatarColor(c.id) }}>
                {initials(c.name)}
              </span>
              <div className="min-w-0 leading-tight">
                <Link href={`/contacts/${c.id}`} className="group/name inline-flex max-w-full items-center gap-1.5 font-display text-[14px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]">
                  <span className="truncate">{c.name}</span>
                  <IconPencil size={13} className="flex-shrink-0 opacity-0 transition-opacity group-hover/name:opacity-60" />
                </Link>
                <div className="truncate font-body text-[12px] text-[var(--text-muted)]">{c.email ?? "—"}</div>
              </div>
            </div>
            <div className="truncate font-display text-[13px] text-[var(--text-secondary)]">{c.phone ?? "—"}</div>
            <div className="truncate font-display text-[13px] text-[var(--text-secondary)]">{c.company?.name ?? "—"}</div>
            <div className="flex flex-wrap gap-1">
              {(c.tags ?? []).slice(0, 3).map((t) => (
                <Chip key={t.id} variant="ghost" color={t.color ?? undefined}>{t.name}</Chip>
              ))}
              {(c.tags?.length ?? 0) > 3 && (
                <span className="font-display text-[11px] text-[var(--text-muted)]">+{(c.tags?.length ?? 0) - 3}</span>
              )}
            </div>
            <div className="font-display text-[13px] text-[var(--text-muted)]">{fmtDateBR(c.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Cartões ─────────────────────────────────────────────────────────────────

function CartaoView({ items, onEdit }: { items: ContactListItemDto[]; onEdit: (c: ContactListItemDto) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-1 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((c) => (
        <div
          key={c.id}
          className="group flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-shadow hover:shadow-[var(--glass-shadow)]"
        >
          {/* Avatar + ação */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold text-white" style={{ background: avatarColor(c.id) }}>
                {initials(c.name)}
              </span>
              <div className="min-w-0">
                <Link href={`/contacts/${c.id}`} className="truncate font-display text-[14px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]">
                  {c.name}
                </Link>
                <div className="truncate font-body text-[12px] text-[var(--text-muted)]">{c.email ?? "Sem e-mail"}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onEdit(c)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
              aria-label={`Editar ${c.name}`}
            >
              <IconPencil size={14} />
            </button>
          </div>

          {/* Informações */}
          <div className="flex flex-col gap-1.5 text-[12px]">
            {c.phone && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <IconPhone size={13} className="shrink-0 text-[var(--text-muted)]" />
                <span className="truncate">{c.phone}</span>
              </div>
            )}
            {c.company && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <IconBuilding size={13} className="shrink-0 text-[var(--text-muted)]" />
                <span className="truncate">{c.company.name}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {(c.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {(c.tags ?? []).slice(0, 4).map((t) => (
                <Chip key={t.id} variant="ghost" color={t.color ?? undefined}>{t.name}</Chip>
              ))}
              {(c.tags?.length ?? 0) > 4 && (
                <span className="font-display text-[11px] text-[var(--text-muted)]">+{(c.tags?.length ?? 0) - 4}</span>
              )}
            </div>
          )}

          {/* Data */}
          <div className="mt-auto border-t border-[var(--glass-border-subtle)] pt-2.5 font-body text-[11px] text-[var(--text-muted)]">
            Criado em {fmtDateBR(c.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Lista ────────────────────────────────────────────────────────────────────

function ListaView({ items, onEdit }: { items: ContactListItemDto[]; onEdit: (c: ContactListItemDto) => void }) {
  return (
    <div className="flex flex-col gap-2 overflow-y-auto pb-1">
      {items.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-shadow hover:shadow-[var(--glass-shadow)]"
        >
          {/* Avatar */}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold text-white" style={{ background: avatarColor(c.id) }}>
            {initials(c.name)}
          </span>

          {/* Nome + email */}
          <div className="min-w-0 flex-1 leading-tight">
            <Link href={`/contacts/${c.id}`} className="block truncate font-display text-[14px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]">
              {c.name}
            </Link>
            <div className="truncate font-body text-[12px] text-[var(--text-muted)]">{c.email ?? "—"}</div>
          </div>

          {/* Telefone com ícone */}
          {c.phone && (
            <div className="hidden shrink-0 items-center gap-1.5 font-display text-[13px] text-[var(--text-muted)] sm:flex">
              <IconPhone size={14} className="shrink-0" />
              <span>{c.phone}</span>
            </div>
          )}

          {/* Data */}
          <div className="hidden w-[80px] shrink-0 text-right font-display text-[12px] text-[var(--text-muted)] md:block">
            {fmtDateBR(c.createdAt)}
          </div>

          {/* Ações rápidas */}
          <div className="flex shrink-0 items-center gap-0.5">
            <a
              href={c.phone ? `tel:${c.phone}` : undefined}
              aria-label="Ligar"
              aria-disabled={!c.phone}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
            >
              <IconPhone size={16} />
            </a>
            <a
              href={c.email ? `mailto:${c.email}` : undefined}
              aria-label="Enviar e-mail"
              aria-disabled={!c.email}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
            >
              <IconMail size={16} />
            </a>
            <button
              type="button"
              onClick={() => onEdit(c)}
              aria-label={`Editar ${c.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
            >
              <IconPencil size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dialogs (inalterados) ────────────────────────────────────────────────────

function ConfirmDeleteDialog({ open, count, pending, onCancel, onConfirm }: {
  open: boolean; count: number; pending: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent size="sm">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-destructive)_12%,transparent)] text-[var(--color-destructive)]">
              <IconAlertTriangle size={18} />
            </span>
            <DialogTitle className="text-base">{`Excluir ${count === 1 ? "contato" : `${count} contatos`}?`}</DialogTitle>
          </div>
          <DialogDescription className="text-[13px] leading-relaxed">
            Esta ação não pode ser desfeita. {count === 1 ? "O contato será removido" : "Os contatos serão removidos"} junto com as conversas, mensagens, notas e atividades vinculadas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <ButtonGlass variant="glass" size="sm" type="button" onClick={onCancel} disabled={pending} className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]">
            Cancelar
          </ButtonGlass>
          <ButtonGlass variant="danger" size="sm" type="button" onClick={onConfirm} disabled={pending}>
            <IconTrash size={14} /> {pending ? "Excluindo..." : "Excluir"}
          </ButtonGlass>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateContactDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const createMut = useCreateContact();

  useEffect(() => {
    if (!open) { setName(""); setEmail(""); setPhone(""); setCompanyId(null); setCompanyName(null); createMut.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    createMut.mutate({ name: n, email: email.trim() || null, phone: phone.trim() || null, companyId }, {
      onSuccess: () => { toast.success("Contato criado."); onOpenChange(false); },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4"><DialogTitle className="text-base">Novo contato</DialogTitle></DialogHeader>
          <div>
            <label className="mb-3 block">
              <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Nome *</span>
              <InputGlass type="text" autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Maria Silva" />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">E-mail</span>
              <InputGlass type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@empresa.com" />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Telefone</span>
              <InputGlass type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </label>
            <div className="mb-4">
              <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Empresa</span>
              <CompanyPicker valueId={companyId} valueName={companyName} onChange={(id, nm) => { setCompanyId(id); setCompanyName(nm); }} />
            </div>
            {createMut.isError && (
              <p className="mb-3 text-[12px] text-[var(--color-danger-text)]">{createMut.error instanceof Error ? createMut.error.message : "Erro ao criar contato."}</p>
            )}
          </div>
          <DialogFooter>
            <ButtonGlass variant="glass" size="sm" type="button" onClick={() => onOpenChange(false)} className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]">Cancelar</ButtonGlass>
            <ButtonGlass variant="primary" size="sm" type="submit" disabled={!name.trim() || createMut.isPending}>{createMut.isPending ? "Criando..." : "Criar"}</ButtonGlass>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditContactDialog({ contact, onClose }: { contact: ContactListItemDto | null; onClose: () => void }) {
  const open = contact !== null;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const updateMut = useUpdateContact();

  useEffect(() => {
    if (contact) { setName(contact.name); setEmail(contact.email ?? ""); setPhone(contact.phone ?? ""); setCompanyId(contact.company?.id ?? null); setCompanyName(contact.company?.name ?? null); updateMut.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id]);

  if (!contact) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || !contact) return;
    updateMut.mutate({ id: contact.id, body: { name: n, email: email.trim() || null, phone: phone.trim() || null, companyId } }, {
      onSuccess: () => { toast.success("Contato atualizado."); onClose(); },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4"><DialogTitle className="text-base">Editar contato</DialogTitle></DialogHeader>
          <div>
            <label className="mb-3 block">
              <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Nome *</span>
              <InputGlass type="text" autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Maria Silva" />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">E-mail</span>
              <InputGlass type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@empresa.com" />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Telefone</span>
              <InputGlass type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </label>
            <div className="mb-4">
              <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Empresa</span>
              <CompanyPicker valueId={companyId} valueName={companyName} onChange={(id, nm) => { setCompanyId(id); setCompanyName(nm); }} />
            </div>
            {updateMut.isError && (
              <p className="mb-3 text-[12px] text-[var(--color-danger-text)]">{updateMut.error instanceof Error ? updateMut.error.message : "Erro ao atualizar contato."}</p>
            )}
          </div>
          <DialogFooter>
            <ButtonGlass variant="glass" size="sm" type="button" onClick={onClose} className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]">Cancelar</ButtonGlass>
            <ButtonGlass variant="primary" size="sm" type="submit" disabled={!name.trim() || updateMut.isPending}>{updateMut.isPending ? "Salvando..." : "Salvar"}</ButtonGlass>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CompanyPicker({ valueId, valueName, onChange }: {
  valueId: string | null; valueName: string | null;
  onChange: (id: string | null, name: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useCompanies({ search: debounced || undefined, page: 1, perPage: 20, enabled: open });
  const options = data?.items ?? [];

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--input-border,var(--glass-border,rgba(0,0,0,0.08)))] bg-[var(--input-bg,#fff)] px-3 py-2 text-left text-[13px] outline-none focus:border-[var(--brand-primary,#5b6ff5)]">
        <span className="flex min-w-0 items-center gap-2">
          <IconBuilding size={15} className="flex-shrink-0 text-[var(--text-muted,#718096)]" />
          <span className={`truncate ${valueName ? "text-[var(--text-primary,#1a202c)]" : "text-[var(--text-muted,#718096)]"}`}>{valueName ?? "Sem empresa vinculada"}</span>
        </span>
        {valueId && (
          <span role="button" tabIndex={0} aria-label="Remover vínculo de empresa" onClick={(e) => { e.stopPropagation(); onChange(null, null); }} className="flex-shrink-0 rounded-full p-0.5 text-[var(--text-muted,#718096)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] hover:text-[var(--color-danger,#e11d48)]">
            <IconX size={14} />
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-56 overflow-hidden rounded-[var(--radius-md)] border border-[var(--glass-border,rgba(0,0,0,0.08))] bg-[var(--glass-bg-modal,#fff)] shadow-xl">
          <div className="flex items-center gap-2 border-b border-[var(--glass-border,rgba(0,0,0,0.06))] px-2.5 py-2">
            <IconSearch size={14} className="text-[var(--text-muted,#718096)]" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar empresa..." className="w-full bg-transparent text-[13px] text-[var(--text-primary,#1a202c)] outline-none" />
          </div>
          <div className="max-h-44 overflow-y-auto py-1">
            {isLoading ? (
              <div className="px-3 py-2 text-[12px] text-[var(--text-muted,#718096)]">Carregando...</div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-[var(--text-muted,#718096)]">{debounced ? "Nenhuma empresa encontrada." : "Digite para buscar."}</div>
            ) : options.map((co) => {
              const active = co.id === valueId;
              return (
                <button key={co.id} type="button" onClick={() => { onChange(co.id, co.name); setOpen(false); setQ(""); }} className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] text-[var(--text-primary,#1a202c)] hover:bg-[var(--brand-primary,#5b6ff5)]/8">
                  <span className="truncate">{co.name}</span>
                  {active && <IconCheck size={14} className="flex-shrink-0 text-[var(--brand-primary,#5b6ff5)]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
