"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { IconUsers, IconPlus, IconTrash, IconAlertTriangle, IconPencil } from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { SearchInput } from "@/components/crm/search-input";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";
import { CheckboxGlass } from "@/components/crm/checkbox-glass";

import { useContacts, useCreateContact, useDeleteContact } from "@/features/directory-v2/hooks";

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
          icon={<IconUsers size={22} />}
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
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)]"
            >
              <IconPlus size={16} /> Novo contato
            </button>
          }
        />

        {selected.size > 0 && (
          <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-4 py-2.5 backdrop-blur-md">
            <span className="font-display text-[13px] font-bold text-[var(--text-primary)]">
              {selected.size} selecionado{selected.size > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded-full px-3 py-1.5 font-display text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-black/5"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-danger,#e11d48)] px-3.5 py-1.5 font-display text-[12px] font-bold text-white transition-all hover:-translate-y-px"
              >
                <IconTrash size={14} /> Excluir
              </button>
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
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-4 backdrop-blur-md shadow-[var(--glass-shadow)]">
            <div className="mb-2.5 grid grid-cols-[42px_2.4fr_1.4fr_1.1fr_1fr_1fr] items-center gap-3.5 border-b border-[var(--glass-border-subtle)] px-3.5 pb-2.5 font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
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
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
              {items.map((c) => (
                <div
                  key={c.id}
                  className={`grid grid-cols-[42px_2.4fr_1.4fr_1.1fr_1fr_1fr] items-center gap-3.5 rounded-[var(--radius-lg)] border bg-[var(--glass-bg-overlay)] px-3.5 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all duration-200 hover:bg-[var(--glass-bg-base)] ${
                    selected.has(c.id)
                      ? "border-[var(--brand-primary)]/40 bg-[var(--glass-bg-base)] shadow-[0_6px_20px_rgba(91,111,245,0.18)]"
                      : "border-[var(--glass-border-subtle)]"
                  }`}
                >
                  <span>
                    <CheckboxGlass
                      checked={selected.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                      aria-label={`Selecionar ${c.name}`}
                    />
                  </span>

                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white"
                      style={{ background: avatarColor(c.id) }}
                    >
                      {initials(c.name)}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/contacts/${c.id}`}
                        className="group/name inline-flex max-w-full items-center gap-1.5 font-display text-[13px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
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
                      <span
                        key={t.id}
                        className="inline-flex items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2 py-0.5 font-display text-[10px] font-bold"
                        style={{
                          color: t.color ?? "var(--text-muted)",
                          borderColor: `${t.color ?? "var(--glass-border)"}33`,
                        }}
                      >
                        {t.name}
                      </span>
                    ))}
                    {(c.tags?.length ?? 0) > 3 && (
                      <span className="font-display text-[10px] text-[var(--text-muted)]">
                        +{(c.tags?.length ?? 0) - 3}
                      </span>
                    )}
                  </div>

                  <div className="font-display text-[13px] text-[var(--text-muted)]">
                    {fmtDateBR(c.createdAt)}
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
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    if (open) {
      window.addEventListener("keydown", onEsc);
      return () => window.removeEventListener("keydown", onEsc);
    }
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[440px] max-w-[90vw] rounded-[var(--radius-xl)] border p-5 shadow-2xl"
        style={{
          background: "rgba(255, 255, 255, 0.98)",
          borderColor: "var(--glass-border, rgba(0,0,0,0.08))",
        }}
      >
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-danger,#e11d48)_12%,transparent)] text-[var(--color-danger,#e11d48)]">
            <IconAlertTriangle size={18} />
          </span>
          <h3 className="font-display text-base font-bold text-[var(--text-primary,#1a202c)]">
            Excluir {count === 1 ? "contato" : `${count} contatos`}?
          </h3>
        </div>
        <p className="mb-4 font-body text-[13px] leading-relaxed text-[var(--text-secondary,#4a5568)]">
          Esta ação não pode ser desfeita.{" "}
          {count === 1 ? "O contato será removido" : "Os contatos serão removidos"} junto com as
          conversas, mensagens, notas e atividades vinculadas. Negócios associados são preservados
          (ficam sem contato).
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-full px-4 py-1.5 font-display text-xs font-semibold text-[var(--text-secondary,#4a5568)] hover:bg-black/5 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--color-danger, #e11d48)" }}
          >
            <IconTrash size={14} />
            {pending ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
  const createMut = useCreateContact();

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPhone("");
      createMut.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    if (open) {
      window.addEventListener("keydown", onEsc);
      return () => window.removeEventListener("keydown", onEsc);
    }
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    createMut.mutate(
      {
        name: n,
        email: email.trim() || null,
        phone: phone.trim() || null,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-[420px] max-w-[90vw] rounded-[var(--radius-xl)] border p-5 shadow-2xl"
        style={{
          background: "rgba(255, 255, 255, 0.98)",
          borderColor: "var(--glass-border, rgba(0,0,0,0.08))",
        }}
      >
        <h3 className="mb-4 font-display text-base font-bold text-[var(--text-primary,#1a202c)]">
          Novo contato
        </h3>

        <label className="mb-3 block">
          <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted,#718096)]">
            Nome *
          </span>
          <input
            type="text"
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Maria Silva"
            className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border,rgba(0,0,0,0.08))] bg-white px-3 py-2 text-[13px] text-[var(--text-primary,#1a202c)] outline-none focus:border-[var(--brand-primary,#5b6ff5)]"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted,#718096)]">
            E-mail
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="maria@empresa.com"
            className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border,rgba(0,0,0,0.08))] bg-white px-3 py-2 text-[13px] text-[var(--text-primary,#1a202c)] outline-none focus:border-[var(--brand-primary,#5b6ff5)]"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted,#718096)]">
            Telefone
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border,rgba(0,0,0,0.08))] bg-white px-3 py-2 text-[13px] text-[var(--text-primary,#1a202c)] outline-none focus:border-[var(--brand-primary,#5b6ff5)]"
          />
        </label>

        {createMut.isError ? (
          <p className="mb-3 text-[12px] text-[var(--color-danger,#e11d48)]">
            {createMut.error instanceof Error
              ? createMut.error.message
              : "Erro ao criar contato."}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-4 py-1.5 font-display text-xs font-semibold text-[var(--text-secondary,#4a5568)] hover:bg-black/5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!name.trim() || createMut.isPending}
            className="rounded-full px-4 py-1.5 font-display text-xs font-semibold text-white disabled:opacity-60"
            style={{
              background: "var(--brand-primary, #5b6ff5)",
              boxShadow: "0 4px 14px rgba(91,111,245,0.35)",
            }}
          >
            {createMut.isPending ? "Criando..." : "Criar"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
