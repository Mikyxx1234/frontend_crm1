"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import {
  IconBuilding,
  IconPlus,
  IconTrash,
  IconAlertTriangle,
  IconPencil,
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
import { InputGlass } from "@/components/crm/input-glass";
import { BadgeGlass } from "@/components/crm/badge-glass";
import {
  GlassModal,
  GlassModalPanel,
  GlassModalHeader,
  GlassModalBody,
  GlassModalFooter,
} from "@/components/crm/glass-modal";

import {
  useCompanies,
  useCreateCompany,
  useDeleteCompany,
  useUpdateCompany,
} from "@/features/directory-v2/hooks";
import type { CompanyListItemDto } from "@/features/directory-v2/api";

const DEFAULT_PER_PAGE = 25;

/**
 * Mapeamento de campos (backend read-only, sem colunas cnpj/email):
 *   CNPJ   → coluna `size`
 *   E-mail → coluna `domain`
 * Decisão registrada em docs/design-system/DECISOES-PENDENTES.md.
 */

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

export default function V2CompaniesClientPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyListItemDto | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMut = useDeleteCompany();

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

  const query = useCompanies({
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
      toast.success(ok === 1 ? "Empresa excluída." : `${ok} empresas excluídas.`);
    } else if (ok === 0) {
      toast.error("Não foi possível excluir as empresas selecionadas.");
    } else {
      toast.error(`${ok} excluída(s), ${fail} falharam.`);
    }
  }

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconBuilding size={22} stroke={2.2} />}
          title="Empresas"
          description="Empresas cadastradas no CRM"
          center={
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome, e-mail..."
            />
          }
          actions={
            <PagePrimaryButton type="button" onClick={() => setCreateOpen(true)}>
              <IconPlus size={15} stroke={2.4} /> Nova empresa
            </PagePrimaryButton>
          }
        />

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
              icon={<IconBuilding size={28} />}
              title="Nenhuma empresa encontrada"
              description={
                debounced
                  ? `Sem resultados para "${debounced}".`
                  : "Clique em \"Nova empresa\" para cadastrar a primeira."
              }
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 backdrop-blur-md shadow-[var(--glass-shadow)]">
            <div className="grid grid-cols-[36px_2.2fr_1.3fr_1.2fr_1.5fr_1.7fr_0.8fr_38px] items-center gap-3 rounded-[var(--radius-md)] border-b border-[var(--glass-border-subtle)] bg-[color-mix(in_srgb,var(--brand-primary)_7%,transparent)] px-3 py-2 font-display text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              <span>
                <CheckboxGlass
                  checked={allChecked}
                  indeterminate={!allChecked && someChecked}
                  onChange={toggleAll}
                  aria-label="Selecionar todas"
                />
              </span>
              <span>Nome da Empresa</span>
              <span>CNPJ</span>
              <span>Telefone</span>
              <span>E-mail</span>
              <span>Endereço</span>
              <span>Contatos</span>
              <span className="text-right">Ações</span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {items.map((c) => (
                <div
                  key={c.id}
                  className={`grid grid-cols-[36px_2.2fr_1.3fr_1.2fr_1.5fr_1.7fr_0.8fr_38px] items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--glass-bg-overlay)] ${
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
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] font-display text-[11px] font-bold text-white"
                      style={{ background: avatarColor(c.id) }}
                    >
                      {initials(c.name)}
                    </span>
                    <Link
                      href={`/companies/${c.id}`}
                      className="group/name inline-flex min-w-0 items-center gap-1.5 font-display text-[14px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
                    >
                      <span className="truncate">{c.name}</span>
                      <IconPencil
                        size={13}
                        className="flex-shrink-0 opacity-0 transition-opacity group-hover/name:opacity-60"
                      />
                    </Link>
                  </div>

                  <div className="truncate font-display text-[13px] text-[var(--text-muted)]">
                    {c.size ?? "—"}
                  </div>
                  <div className="truncate font-display text-[13px] text-[var(--text-muted)]">
                    {c.phone ?? "—"}
                  </div>
                  <div className="truncate font-display text-[13px] text-[var(--text-muted)]">
                    {c.domain ?? "—"}
                  </div>
                  <div className="truncate font-display text-[13px] text-[var(--text-muted)]">
                    {c.address ?? "—"}
                  </div>

                  <div>
                    <BadgeGlass variant="enterprise">{c._count.contacts}</BadgeGlass>
                  </div>

                  <div className="flex justify-end">
                    <ButtonGlass
                      variant="icon"
                      size="icon"
                      type="button"
                      onClick={() => setEditing(c)}
                      aria-label={`Editar ${c.name}`}
                      title="Editar empresa"
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
          label={`${total.toLocaleString("pt-BR")} empresas — página ${page} de ${lastPage}`}
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

      <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditCompanyDialog company={editing} onClose={() => setEditing(null)} />
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
          title={`Excluir ${count === 1 ? "empresa" : `${count} empresas`}?`}
          icon={
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-destructive)_12%,transparent)] text-[var(--color-destructive)]">
              <IconAlertTriangle size={18} />
            </span>
          }
          description="Esta ação não pode ser desfeita. Os contatos vinculados são preservados (ficam sem empresa)."
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

function CreateCompanyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const createMut = useCreateCompany();

  useEffect(() => {
    if (!open) {
      setName("");
      setCnpj("");
      setPhone("");
      setEmail("");
      setAddress("");
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
        size: cnpj.trim() || null,
        phone: phone.trim() || null,
        domain: email.trim() || null,
        address: address.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Empresa criada.");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <GlassModal open={open} onOpenChange={onOpenChange}>
      <GlassModalPanel as="form" onSubmit={handleSubmit} className="w-[460px]">
        <GlassModalHeader title="Nova empresa" />

        <GlassModalBody>
          <FieldInput
            label="Nome da Empresa *"
            type="text"
            required
            autoFocus
            value={name}
            onChange={setName}
            placeholder="Razão social ou nome fantasia"
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="CNPJ"
              type="text"
              value={cnpj}
              onChange={setCnpj}
              placeholder="00.000.000/0000-00"
            />
            <FieldInput
              label="Telefone"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="(11) 3333-4444"
            />
          </div>
          <FieldInput
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="contato@empresa.com"
          />
          <FieldInput
            label="Endereço da Empresa"
            type="text"
            value={address}
            onChange={setAddress}
            placeholder="Rua, número, bairro, cidade — UF"
          />

          {createMut.isError ? (
            <p className="mb-3 text-[12px] text-[var(--color-danger-text)]">
              {createMut.error instanceof Error
                ? createMut.error.message
                : "Erro ao criar empresa."}
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

function EditCompanyDialog({
  company,
  onClose,
}: {
  company: CompanyListItemDto | null;
  onClose: () => void;
}) {
  const open = company !== null;
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const updateMut = useUpdateCompany();

  useEffect(() => {
    if (company) {
      setName(company.name);
      setCnpj(company.size ?? "");
      setPhone(company.phone ?? "");
      setEmail(company.domain ?? "");
      setAddress(company.address ?? "");
      updateMut.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  if (!company) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || !company) return;
    updateMut.mutate(
      {
        id: company.id,
        body: {
          name: n,
          size: cnpj.trim() || null,
          phone: phone.trim() || null,
          domain: email.trim() || null,
          address: address.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Empresa atualizada.");
          onClose();
        },
      },
    );
  }

  return (
    <GlassModal open={open} onOpenChange={(next) => !next && onClose()}>
      <GlassModalPanel as="form" onSubmit={handleSubmit} className="w-[460px]">
        <GlassModalHeader title="Editar empresa" />

        <GlassModalBody>
          <FieldInput
            label="Nome da Empresa *"
            type="text"
            required
            autoFocus
            value={name}
            onChange={setName}
            placeholder="Razão social ou nome fantasia"
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="CNPJ"
              type="text"
              value={cnpj}
              onChange={setCnpj}
              placeholder="00.000.000/0000-00"
            />
            <FieldInput
              label="Telefone"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="(11) 3333-4444"
            />
          </div>
          <FieldInput
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="contato@empresa.com"
          />
          <FieldInput
            label="Endereço da Empresa"
            type="text"
            value={address}
            onChange={setAddress}
            placeholder="Rua, número, bairro, cidade — UF"
          />

          {updateMut.isError ? (
            <p className="mb-3 text-[12px] text-[var(--color-danger-text)]">
              {updateMut.error instanceof Error
                ? updateMut.error.message
                : "Erro ao atualizar empresa."}
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

function FieldInput({
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
  autoFocus,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <InputGlass
        type={type}
        required={required}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

