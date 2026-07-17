"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import {
  IconBuilding,
  IconPlus,
  IconPencil,
  IconPhone,
  IconMail,
  IconUsers,
  IconLayoutGrid,
  IconList,
  IconMenu2,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { PageSearchBar, PageSegmentedControl } from "@/components/crm/page-toolbar";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";
import { ButtonGlass } from "@/components/crm/button-glass";
import { BadgeGlass } from "@/components/crm/badge-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { cn } from "@/lib/utils";
import { FormSheet } from "@/components/ui/form-sheet";

import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
} from "@/features/directory-v2/hooks";
import type { CompanyListItemDto } from "@/features/directory-v2/api";

const DEFAULT_PER_PAGE = 25;
type ViewMode = "cartoes" | "lista";

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
  { value: "cartoes", label: <span className="flex items-center gap-1.5"><IconLayoutGrid size={14} />Cartões</span> },
  { value: "lista", label: <span className="flex items-center gap-1.5"><IconList size={14} />Lista</span> },
] as const;

export default function V2CompaniesClientPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [view, setView] = useState<ViewMode>("cartoes");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyListItemDto | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = useCompanies({ search: debounced || undefined, page, perPage, enabled: isAuthenticated });
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  const isLoading = query.isLoading && items.length === 0;

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconBuilding size={22} stroke={2.2} />}
          title="Empresas"
          center={
            <PageSearchBar variant="compact" value={search} onChange={setSearch} placeholder="Buscar por nome, e-mail..." aria-label="Buscar empresas" />
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
              <ActionsMenu onAdd={() => setCreateOpen(true)} />
            </div>
          }
        />

        {isLoading ? (
          <div className="h-[400px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
        ) : query.error ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
            {query.error instanceof Error ? query.error.message : "Erro ao carregar."}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
            <EmptyState
              icon={<IconBuilding size={28} />}
              title="Nenhuma empresa encontrada"
              description={debounced ? `Sem resultados para "${debounced}".` : "Use o menu de ações para cadastrar a primeira empresa."}
            />
          </div>
        ) : view === "cartoes" ? (
          <CartaoView items={items} onEdit={setEditing} />
        ) : (
          <ListaView items={items} onEdit={setEditing} />
        )}

        <PaginationGlass
          label={`${total.toLocaleString("pt-BR")} empresas — página ${page} de ${lastPage}`}
          canPrev={page > 1} canNext={page < lastPage}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(lastPage, p + 1))}
          perPage={perPage}
          onPerPageChange={(value) => { setPerPage(value); setPage(1); }}
        />
      </main>

      <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditCompanyDialog company={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

// ── Menu de ações (hambúrguer — espelha Contatos) ────────────────────────────

function ActionsMenu({ onAdd }: { onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ações"
        aria-expanded={open}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          open
            ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
            : "text-[var(--brand-primary)] hover:bg-[var(--color-primary-soft)]",
        )}
      >
        <IconMenu2 size={18} stroke={2.2} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] p-1 shadow-[var(--glass-shadow)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => { setOpen(false); onAdd(); }}
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left font-display text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
          >
            <span className="text-[var(--text-muted)]"><IconPlus size={16} /></span>
            Adicionar empresa
          </button>
        </div>
      )}
    </div>
  );
}

// ── Cartões ─────────────────────────────────────────────────────────────────

function CartaoView({ items, onEdit }: { items: CompanyListItemDto[]; onEdit: (c: CompanyListItemDto) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-1 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((c) => (
        <div
          key={c.id}
          role="button"
          tabIndex={0}
          onClick={() => onEdit(c)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEdit(c); } }}
          className="group flex cursor-pointer flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-shadow hover:shadow-[var(--glass-shadow)]"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] font-display text-[13px] font-bold text-white" style={{ background: avatarColor(c.id) }}>
                {initials(c.name)}
              </span>
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit(c); }}
                  className="truncate text-left font-display text-[14px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
                >
                  {c.name}
                </button>
                <div className="truncate font-body text-[12px] text-[var(--text-muted)]">{c.domain ?? c.industry ?? "Sem e-mail"}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(c); }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
              aria-label={`Editar ${c.name}`}
            >
              <IconPencil size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 text-[12px]">
            {c.phone && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <IconPhone size={13} className="shrink-0 text-[var(--text-muted)]" />
                <span className="truncate">{c.phone}</span>
              </div>
            )}
            {c.address && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <IconBuilding size={13} className="shrink-0 text-[var(--text-muted)]" />
                <span className="truncate">{c.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <IconUsers size={13} className="shrink-0 text-[var(--text-muted)]" />
              <span>{c._count.contacts} contato{c._count.contacts !== 1 ? "s" : ""}</span>
            </div>
          </div>

          <div className="mt-auto border-t border-[var(--glass-border-subtle)] pt-2.5 font-body text-[11px] text-[var(--text-muted)]">
            Criado em {fmtDateBR(c.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Lista ────────────────────────────────────────────────────────────────────

function ListaView({ items, onEdit }: { items: CompanyListItemDto[]; onEdit: (c: CompanyListItemDto) => void }) {
  return (
    <div className="flex flex-col gap-2 overflow-y-auto pb-1">
      {items.map((c) => (
        <div
          key={c.id}
          role="button"
          tabIndex={0}
          onClick={() => onEdit(c)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEdit(c); } }}
          className="flex cursor-pointer items-center gap-4 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-shadow hover:shadow-[var(--glass-shadow)]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] font-display text-[12px] font-bold text-white" style={{ background: avatarColor(c.id) }}>
            {initials(c.name)}
          </span>

          <div className="min-w-0 flex-1 leading-tight">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(c); }}
              className="block w-full truncate text-left font-display text-[14px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
            >
              {c.name}
            </button>
            <div className="truncate font-body text-[12px] text-[var(--text-muted)]">{c.domain ?? "—"}</div>
          </div>

          {c.phone && (
            <div className="hidden shrink-0 items-center gap-1.5 font-display text-[13px] text-[var(--text-muted)] sm:flex">
              <IconPhone size={14} className="shrink-0" />
              <span>{c.phone}</span>
            </div>
          )}

          <div className="hidden shrink-0 md:block">
            <BadgeGlass variant="enterprise">{c._count.contacts}</BadgeGlass>
          </div>

          <div className="hidden w-[80px] shrink-0 text-right font-display text-[12px] text-[var(--text-muted)] lg:block">
            {fmtDateBR(c.createdAt)}
          </div>

          <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <a
              href={c.phone ? `tel:${c.phone}` : undefined}
              aria-label="Ligar"
              aria-disabled={!c.phone}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
            >
              <IconPhone size={16} />
            </a>
            <a
              href={c.domain ? `mailto:${c.domain}` : undefined}
              aria-label="Enviar e-mail"
              aria-disabled={!c.domain}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
            >
              <IconMail size={16} />
            </a>
            <button
              type="button"
              onClick={() => onEdit(c)}
              aria-label={`Editar ${c.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--brand-primary)] transition-colors hover:bg-[var(--color-primary-soft)]"
            >
              <IconPencil size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dialogs ──────────────────────────────────────────────────────────────────

function CreateCompanyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const createMut = useCreateCompany();

  useEffect(() => {
    if (!open) { setName(""); setCnpj(""); setPhone(""); setEmail(""); setAddress(""); createMut.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    createMut.mutate({ name: n, size: cnpj.trim() || null, phone: phone.trim() || null, domain: email.trim() || null, address: address.trim() || null }, {
      onSuccess: () => { toast.success("Empresa criada."); onOpenChange(false); },
    });
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Nova empresa"
      footer={
        <>
          <ButtonGlass variant="glass" size="sm" type="button" onClick={() => onOpenChange(false)}>Cancelar</ButtonGlass>
          <ButtonGlass variant="primary" size="sm" type="submit" form="new-company-form" disabled={!name.trim() || createMut.isPending}>{createMut.isPending ? "Criando..." : "Criar"}</ButtonGlass>
        </>
      }
    >
      <form id="new-company-form" onSubmit={handleSubmit} className="flex flex-col">
        <FieldInput label="Nome da Empresa *" type="text" required autoFocus value={name} onChange={setName} placeholder="Razão social ou nome fantasia" />
        <div className="grid grid-cols-2 gap-3">
          <FieldInput label="CNPJ" type="text" value={cnpj} onChange={setCnpj} placeholder="00.000.000/0000-00" />
          <FieldInput label="Telefone" type="tel" value={phone} onChange={setPhone} placeholder="(11) 3333-4444" />
        </div>
        <FieldInput label="E-mail" type="email" value={email} onChange={setEmail} placeholder="contato@empresa.com" />
        <FieldInput label="Endereço da Empresa" type="text" value={address} onChange={setAddress} placeholder="Rua, número, bairro, cidade — UF" />
        {createMut.isError && (
          <p className="text-[12px] text-[var(--color-danger-text)]">{createMut.error instanceof Error ? createMut.error.message : "Erro ao criar empresa."}</p>
        )}
      </form>
    </FormSheet>
  );
}

function EditCompanyDialog({ company, onClose }: { company: CompanyListItemDto | null; onClose: () => void }) {
  const open = company !== null;
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const updateMut = useUpdateCompany();

  useEffect(() => {
    if (company) { setName(company.name); setCnpj(company.size ?? ""); setPhone(company.phone ?? ""); setEmail(company.domain ?? ""); setAddress(company.address ?? ""); updateMut.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  // Sempre monta o FormSheet — evitar return null com open=true (showModal se perde).

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || !company) return;
    updateMut.mutate({ id: company.id, body: { name: n, size: cnpj.trim() || null, phone: phone.trim() || null, domain: email.trim() || null, address: address.trim() || null } }, {
      onSuccess: () => { toast.success("Empresa atualizada."); onClose(); },
    });
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Editar empresa"
      footer={
        <>
          <ButtonGlass variant="glass" size="sm" type="button" onClick={onClose}>Cancelar</ButtonGlass>
          <ButtonGlass variant="primary" size="sm" type="submit" form="edit-company-form" disabled={!name.trim() || updateMut.isPending}>{updateMut.isPending ? "Salvando..." : "Salvar"}</ButtonGlass>
        </>
      }
    >
      <form id="edit-company-form" onSubmit={handleSubmit} className="flex flex-col">
        <FieldInput label="Nome da Empresa *" type="text" required autoFocus value={name} onChange={setName} placeholder="Razão social ou nome fantasia" />
        <div className="grid grid-cols-2 gap-3">
          <FieldInput label="CNPJ" type="text" value={cnpj} onChange={setCnpj} placeholder="00.000.000/0000-00" />
          <FieldInput label="Telefone" type="tel" value={phone} onChange={setPhone} placeholder="(11) 3333-4444" />
        </div>
        <FieldInput label="E-mail" type="email" value={email} onChange={setEmail} placeholder="contato@empresa.com" />
        <FieldInput label="Endereço da Empresa" type="text" value={address} onChange={setAddress} placeholder="Rua, número, bairro, cidade — UF" />
        {updateMut.isError && (
          <p className="text-[12px] text-[var(--color-danger-text)]">{updateMut.error instanceof Error ? updateMut.error.message : "Erro ao atualizar empresa."}</p>
        )}
      </form>
    </FormSheet>
  );
}

function FieldInput({ label, type, value, onChange, placeholder, required, autoFocus }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; autoFocus?: boolean;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
      <InputGlass type={type} required={required} autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
