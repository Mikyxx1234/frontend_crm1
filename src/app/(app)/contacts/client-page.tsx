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
} from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { PagePrimaryButton } from "@/components/crm/page-toolbar";
import { SearchInput } from "@/components/crm/search-input";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";
import { CheckboxGlass } from "@/components/crm/checkbox-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import { Chip } from "@/components/crm/chip";
import { InputGlass } from "@/components/crm/input-glass";
import {
  GlassModal,
  GlassModalPanel,
  GlassModalHeader,
  GlassModalBody,
  GlassModalFooter,
} from "@/components/crm/glass-modal";

import {
  useContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
  useCompanies,
} from "@/features/directory-v2/hooks";
import type { ContactListItemDto } from "@/features/directory-v2/api";

const DEFAULT_PER_PAGE = 25;

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

export default function V2ContactsClientPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

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

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconUsers size={22} stroke={2.2} />}
          title="Contatos"
          description="Diretório de contatos vinculados ao CRM"
          center={
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome, e-mail..."
            />
          }
          actions={
            <PagePrimaryButton type="button" onClick={() => setCreateOpen(true)}>
              <IconPlus size={15} stroke={2.4} /> Novo contato
            </PagePrimaryButton>
          }
        />

        {selected.size > 0 && (
          <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-4 py-2.5 backdrop-blur-md">
            <span className="font-display text-[13px] font-bold text-[var(--text-primary)]">
              {selected.size} selecionado{selected.size > 1 ? "s" : ""}
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
              <ButtonGlass variant="danger" size="sm" type="button" onClick={() => setConfirmOpen(true)}>
                <IconTrash size={14} /> Excluir
              </ButtonGlass>
            </div>
          </div>
        )}

        {query.isLoading && items.length === 0 ? (
          <div className="h-[400px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
        ) : query.error ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
            {query.error instanceof Error ? query.error.message : "Erro ao carregar."}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
            <EmptyState
              icon={<IconUsers size={28} />}
              title="Nenhum contato encontrado"
              description={
                debounced
                  ? `Sem resultados para "${debounced}".`
                  : "Crie contatos no Inbox ao receber novas conversas, ou via API."
              }
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 backdrop-blur-md shadow-[var(--glass-shadow)]">
            <div className="grid grid-cols-[36px_2.4fr_1.3fr_1.1fr_1fr_0.9fr_38px] items-center gap-3 rounded-[var(--radius-md)] border-b border-[var(--glass-border-subtle)] bg-[color-mix(in_srgb,var(--brand-primary)_7%,transparent)] px-3 py-2 font-display text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              <span>
                <CheckboxGlass
                  checked={allChecked}
                  indeterminate={!allChecked && someChecked}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </span>
              <span>Nome / E-mail</span>
              <span>Telefone</span>
              <span>Empresa</span>
              <span>Tags</span>
              <span>Criado em</span>
              <span className="text-right">Ações</span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {items.map((c) => (
                <div
                  key={c.id}
                  className={`grid grid-cols-[36px_2.4fr_1.3fr_1.1fr_1fr_0.9fr_38px] items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--glass-bg-overlay)] ${
                    selected.has(c.id) ? "bg-[var(--color-primary-soft)]" : ""
                  }`}
                >
                  <span>
                    <CheckboxGlass
                      checked={selected.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                      aria-label={`Selecionar ${c.name}`}
                    />
                  </span>

                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white"
                      style={{ background: avatarColor(c.id) }}
                    >
                      {initials(c.name)}
                    </span>
                    <div className="min-w-0 leading-tight">
                      <Link
                        href={`/contacts/${c.id}`}
                        className="group/name inline-flex max-w-full items-center gap-1.5 font-display text-[14px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
                      >
                        <span className="truncate">{c.name}</span>
                        <IconPencil
                          size={13}
                          className="flex-shrink-0 opacity-0 transition-opacity group-hover/name:opacity-60"
                        />
                      </Link>
                      <div className="truncate font-body text-[12px] text-[var(--text-muted)]">
                        {c.email ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="truncate font-display text-[13px] text-[var(--text-secondary)]">
                    {c.phone ?? "—"}
                  </div>
                  <div className="truncate font-display text-[13px] text-[var(--text-secondary)]">
                    {c.company?.name ?? "—"}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {(c.tags ?? []).slice(0, 3).map((t) => (
                      <Chip key={t.id} variant="ghost" color={t.color ?? undefined}>
                        {t.name}
                      </Chip>
                    ))}
                    {(c.tags?.length ?? 0) > 3 && (
                      <span className="font-display text-[11px] text-[var(--text-muted)]">
                        +{(c.tags?.length ?? 0) - 3}
                      </span>
                    )}
                  </div>

                  <div className="font-display text-[13px] text-[var(--text-muted)]">
                    {fmtDateBR(c.createdAt)}
                  </div>

                  <div className="flex justify-end">
                    <ButtonGlass
                      variant="icon"
                      size="icon"
                      type="button"
                      onClick={() => setEditing(c)}
                      aria-label={`Editar ${c.name}`}
                      title="Editar contato"
                      className="h-8 w-8"
                    >
                      <IconPencil size={16} />
                    </ButtonGlass>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <PaginationGlass
          label={`${total.toLocaleString("pt-BR")} contatos — página ${page} de ${lastPage}`}
          canPrev={page > 1}
          canNext={page < lastPage}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(lastPage, p + 1))}
          perPage={perPage}
          onPerPageChange={(value) => {
            setPerPage(value);
            setPage(1);
          }}
        />
      </main>

      <CreateContactDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditContactDialog
        contact={editing}
        onClose={() => setEditing(null)}
      />
      <ConfirmDeleteDialog
        open={confirmOpen}
        count={selected.size}
        pending={deleteMut.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function ConfirmDeleteDialog({
  open,
  count,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  count: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <GlassModal open={open} onOpenChange={(next) => !next && onCancel()}>
      <GlassModalPanel className="w-[440px]">
        <GlassModalHeader
          title={`Excluir ${count === 1 ? "contato" : `${count} contatos`}?`}
          icon={
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-destructive)_12%,transparent)] text-[var(--color-destructive)]">
              <IconAlertTriangle size={18} />
            </span>
          }
          description={
            <>
              Esta ação não pode ser desfeita.{" "}
              {count === 1 ? "O contato será removido" : "Os contatos serão removidos"} junto com as
              conversas, mensagens, notas e atividades vinculadas. Negócios associados são preservados
              (ficam sem contato).
            </>
          }
        />
        <GlassModalFooter>
          <ButtonGlass
            variant="glass"
            size="sm"
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
          >
            Cancelar
          </ButtonGlass>
          <ButtonGlass variant="danger" size="sm" type="button" onClick={onConfirm} disabled={pending}>
            <IconTrash size={14} />
            {pending ? "Excluindo..." : "Excluir"}
          </ButtonGlass>
        </GlassModalFooter>
      </GlassModalPanel>
    </GlassModal>
  );
}

function CreateContactDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const createMut = useCreateContact();

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPhone("");
      setCompanyId(null);
      setCompanyName(null);
      createMut.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    createMut.mutate(
      {
        name: n,
        email: email.trim() || null,
        phone: phone.trim() || null,
        companyId: companyId,
      },
      {
        onSuccess: () => {
          toast.success("Contato criado.");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <GlassModal open={open} onOpenChange={onOpenChange}>
      <GlassModalPanel as="form" onSubmit={handleSubmit}>
        <GlassModalHeader title="Novo contato" />

        <GlassModalBody>
          <label className="mb-3 block">
            <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Nome *
            </span>
            <InputGlass
              type="text"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Maria Silva"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              E-mail
            </span>
            <InputGlass
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@empresa.com"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Telefone
            </span>
            <InputGlass
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </label>

          <div className="mb-4">
            <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Empresa
            </span>
            <CompanyPicker
              valueId={companyId}
              valueName={companyName}
              onChange={(id, nm) => {
                setCompanyId(id);
                setCompanyName(nm);
              }}
            />
          </div>

          {createMut.isError ? (
            <p className="mb-3 text-[12px] text-[var(--color-danger-text)]">
              {createMut.error instanceof Error
                ? createMut.error.message
                : "Erro ao criar contato."}
            </p>
          ) : null}
        </GlassModalBody>

        <GlassModalFooter>
          <ButtonGlass
            variant="glass"
            size="sm"
            type="button"
            onClick={() => onOpenChange(false)}
            className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
          >
            Cancelar
          </ButtonGlass>
          <ButtonGlass
            variant="primary"
            size="sm"
            type="submit"
            disabled={!name.trim() || createMut.isPending}
          >
            {createMut.isPending ? "Criando..." : "Criar"}
          </ButtonGlass>
        </GlassModalFooter>
      </GlassModalPanel>
    </GlassModal>
  );
}

function EditContactDialog({
  contact,
  onClose,
}: {
  contact: ContactListItemDto | null;
  onClose: () => void;
}) {
  const open = contact !== null;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const updateMut = useUpdateContact();

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setEmail(contact.email ?? "");
      setPhone(contact.phone ?? "");
      setCompanyId(contact.company?.id ?? null);
      setCompanyName(contact.company?.name ?? null);
      updateMut.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id]);

  if (!contact) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || !contact) return;
    updateMut.mutate(
      {
        id: contact.id,
        body: {
          name: n,
          email: email.trim() || null,
          phone: phone.trim() || null,
          companyId: companyId,
        },
      },
      {
        onSuccess: () => {
          toast.success("Contato atualizado.");
          onClose();
        },
      },
    );
  }

  return (
    <GlassModal open={open} onOpenChange={(next) => !next && onClose()}>
      <GlassModalPanel as="form" onSubmit={handleSubmit}>
        <GlassModalHeader title="Editar contato" />

        <GlassModalBody>
          <label className="mb-3 block">
            <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Nome *
            </span>
            <InputGlass
              type="text"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Maria Silva"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              E-mail
            </span>
            <InputGlass
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@empresa.com"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Telefone
            </span>
            <InputGlass
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </label>

          <div className="mb-4">
            <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Empresa
            </span>
            <CompanyPicker
              valueId={companyId}
              valueName={companyName}
              onChange={(id, nm) => {
                setCompanyId(id);
                setCompanyName(nm);
              }}
            />
          </div>

          {updateMut.isError ? (
            <p className="mb-3 text-[12px] text-[var(--color-danger-text)]">
              {updateMut.error instanceof Error
                ? updateMut.error.message
                : "Erro ao atualizar contato."}
            </p>
          ) : null}
        </GlassModalBody>

        <GlassModalFooter>
          <ButtonGlass
            variant="glass"
            size="sm"
            type="button"
            onClick={onClose}
            className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
          >
            Cancelar
          </ButtonGlass>
          <ButtonGlass
            variant="primary"
            size="sm"
            type="submit"
            disabled={!name.trim() || updateMut.isPending}
          >
            {updateMut.isPending ? "Salvando..." : "Salvar"}
          </ButtonGlass>
        </GlassModalFooter>
      </GlassModalPanel>
    </GlassModal>
  );
}

/**
 * Seletor de empresa com busca (combobox). Vincula um contato a uma empresa
 * via `companyId`. `null` = sem empresa. Lista via `useCompanies`.
 */
function CompanyPicker({
  valueId,
  valueName,
  onChange,
}: {
  valueId: string | null;
  valueName: string | null;
  onChange: (id: string | null, name: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useCompanies({
    search: debounced || undefined,
    page: 1,
    perPage: 20,
    enabled: open,
  });
  const options = data?.items ?? [];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--input-border,var(--glass-border,rgba(0,0,0,0.08)))] bg-[var(--input-bg,#fff)] px-3 py-2 text-left text-[13px] outline-none focus:border-[var(--brand-primary,#5b6ff5)]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <IconBuilding size={15} className="flex-shrink-0 text-[var(--text-muted,#718096)]" />
          <span
            className={`truncate ${valueName ? "text-[var(--text-primary,#1a202c)]" : "text-[var(--text-muted,#718096)]"}`}
          >
            {valueName ?? "Sem empresa vinculada"}
          </span>
        </span>
        {valueId ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Remover vínculo de empresa"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null, null);
            }}
            className="flex-shrink-0 rounded-full p-0.5 text-[var(--text-muted,#718096)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] hover:text-[var(--color-danger,#e11d48)]"
          >
            <IconX size={14} />
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-56 overflow-hidden rounded-[var(--radius-md)] border border-[var(--glass-border,rgba(0,0,0,0.08))] bg-[var(--glass-bg-modal,#fff)] shadow-xl">
          <div className="flex items-center gap-2 border-b border-[var(--glass-border,rgba(0,0,0,0.06))] px-2.5 py-2">
            <IconSearch size={14} className="text-[var(--text-muted,#718096)]" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar empresa..."
              className="w-full bg-transparent text-[13px] text-[var(--text-primary,#1a202c)] outline-none"
            />
          </div>
          <div className="max-h-44 overflow-y-auto py-1">
            {isLoading ? (
              <div className="px-3 py-2 text-[12px] text-[var(--text-muted,#718096)]">Carregando...</div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-[var(--text-muted,#718096)]">
                {debounced ? "Nenhuma empresa encontrada." : "Digite para buscar."}
              </div>
            ) : (
              options.map((co) => {
                const active = co.id === valueId;
                return (
                  <button
                    key={co.id}
                    type="button"
                    onClick={() => {
                      onChange(co.id, co.name);
                      setOpen(false);
                      setQ("");
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] text-[var(--text-primary,#1a202c)] hover:bg-[var(--brand-primary,#5b6ff5)]/8"
                  >
                    <span className="truncate">{co.name}</span>
                    {active ? (
                      <IconCheck size={14} className="flex-shrink-0 text-[var(--brand-primary,#5b6ff5)]" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
