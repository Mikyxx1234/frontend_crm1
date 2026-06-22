"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconBuilding,
  IconDeviceFloppy,
  IconHandStop,
  IconMail,
  IconPhone,
  IconPlus,
  IconTrash,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { GlassCard } from "@/components/crm/glass-card";
import { ButtonGlass } from "@/components/crm/button-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { EmptyState } from "@/components/crm/empty-state";
import {
  useAddContactNote,
  useContact,
  useDeleteContact,
  useUpdateContact,
} from "@/features/directory-v2/hooks";
import { useConfirm } from "@/hooks/use-confirm";

/**
 * /contacts/[id] — Detalhe + edição inline + delete.
 * Versão glassmorphism. Para ports avançados (custom fields, UTM,
 * timeline), use o v0 partindo deste arquivo.
 */
const LIFECYCLE_OPTIONS = [
  { value: "SUBSCRIBER", label: "Assinante" },
  { value: "LEAD", label: "Lead" },
  { value: "MQL", label: "MQL" },
  { value: "SQL", label: "SQL" },
  { value: "OPPORTUNITY", label: "Oportunidade" },
  { value: "CUSTOMER", label: "Cliente" },
  { value: "EVANGELIST", label: "Evangelista" },
  { value: "OTHER", label: "Outro" },
] as const;

type EditState = {
  name: string;
  email: string;
  phone: string;
  lifecycleStage: string;
  source: string;
};

const EMPTY_EDIT: EditState = {
  name: "",
  email: "",
  phone: "",
  lifecycleStage: "LEAD",
  source: "",
};

export default function ContactDetailClientPage({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();

  const query = useContact(id);
  const updateMutation = useUpdateContact();
  const deleteMutation = useDeleteContact();
  const addNoteMutation = useAddContactNote();

  const [edit, setEdit] = useState<EditState>(EMPTY_EDIT);
  const [dirty, setDirty] = useState(false);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    if (!query.data) return;
    setEdit({
      name: query.data.name ?? "",
      email: query.data.email ?? "",
      phone: query.data.phone ?? "",
      lifecycleStage: query.data.lifecycleStage ?? "LEAD",
      source: query.data.source ?? "",
    });
    setDirty(false);
  }, [query.data]);

  function set<K extends keyof EditState>(k: K, v: EditState[K]) {
    setEdit((e) => ({ ...e, [k]: v }));
    setDirty(true);
  }

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({
        id,
        body: {
          name: edit.name,
          email: edit.email || null,
          phone: edit.phone || null,
          lifecycleStage: edit.lifecycleStage || null,
          source: edit.source || null,
        },
      });
      toast.success("Contato atualizado");
      setDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Excluir contato?",
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Contato excluído");
      router.push("/contacts");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    }
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;
    try {
      await addNoteMutation.mutateAsync({ id, content: newNote });
      setNewNote("");
      toast.success("Nota adicionada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar nota");
    }
  }

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-3.5 overflow-hidden">
        <PageHeader
          back={{ href: "/contacts", label: "Contatos" }}
          icon={<IconUserCircle size={22} />}
          title={query.data?.name ?? "Contato"}
          description={
            query.data
              ? `Contatos · ${query.data.email ?? "sem email"}`
              : "Carregando..."
          }
          actions={
            <>
              {dirty && (
                <ButtonGlass
                  variant="primary"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  <IconDeviceFloppy size={16} />
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </ButtonGlass>
              )}
              <ButtonGlass
                variant="glass"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <IconTrash size={16} /> Excluir
              </ButtonGlass>
            </>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto pr-2">
          {query.isLoading && (
            <GlassCard className="p-8 text-center text-[13px] text-[var(--text-muted)]">
              Carregando contato...
            </GlassCard>
          )}

          {query.isError && (
            <GlassCard className="p-6">
              <EmptyState
                icon={<IconHandStop size={28} />}
                title="Contato não encontrado"
                description={query.error?.message ?? "Verifique o id ou volte para a lista."}
              />
            </GlassCard>
          )}

          {query.data && (
            <>
              {/* Informações principais */}
              <GlassCard className="p-5">
                <SectionTitle>Informações</SectionTitle>
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                  <Field label="Nome">
                    <InputGlass
                      value={edit.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Nome completo"
                    />
                  </Field>
                  <Field label="Email" icon={<IconMail size={14} />}>
                    <InputGlass
                      type="email"
                      value={edit.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="email@empresa.com"
                    />
                  </Field>
                  <Field label="Telefone" icon={<IconPhone size={14} />}>
                    <InputGlass
                      value={edit.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+55 11 99999-9999"
                    />
                  </Field>
                  <Field label="Origem">
                    <InputGlass
                      value={edit.source}
                      onChange={(e) => set("source", e.target.value)}
                      placeholder="Ex.: Site, Indicação, Meta Ads"
                    />
                  </Field>
                  <Field label="Estágio do ciclo de vida">
                    <select
                      value={edit.lifecycleStage}
                      onChange={(e) => set("lifecycleStage", e.target.value)}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2.5 font-body text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                    >
                      {LIFECYCLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Empresa" icon={<IconBuilding size={14} />}>
                    <div className="flex items-center gap-2 px-1 py-2.5 font-body text-[13px] text-[var(--text-secondary)]">
                      {query.data.company ? (
                        <Link
                          href={`/companies/${query.data.company.id}`}
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          {query.data.company.name}
                        </Link>
                      ) : (
                        <span className="text-[var(--text-muted)]">Sem empresa vinculada</span>
                      )}
                    </div>
                  </Field>
                </div>
              </GlassCard>

              {/* Tags */}
              <GlassCard className="p-5">
                <SectionTitle>Tags</SectionTitle>
                {query.data.tags.length === 0 ? (
                  <p className="text-[12px] text-[var(--text-muted)]">
                    Nenhuma tag. Adicione tags pela página de contatos em{" "}
                    <Link href={`/contacts/${id}`} className="underline">
                      /contacts/{id}
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {query.data.tags.map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-display text-[11px] font-semibold"
                        style={{
                          backgroundColor: (tag.color ?? "#5b6ff5") + "22",
                          color: tag.color ?? "#5b6ff5",
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Notas */}
              <GlassCard className="p-5">
                <SectionTitle>Notas</SectionTitle>
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-2">
                    <InputGlass
                      placeholder="Adicionar nota..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddNote();
                      }}
                    />
                    <ButtonGlass
                      variant="primary"
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || addNoteMutation.isPending}
                    >
                      <IconPlus size={15} />
                      Adicionar
                    </ButtonGlass>
                  </div>
                  {query.data.notes.length === 0 ? (
                    <p className="text-[12px] text-[var(--text-muted)]">
                      Nenhuma nota ainda.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {query.data.notes.map((n) => (
                        <li
                          key={n.id}
                          className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2"
                        >
                          <p className="font-body text-[13px] text-[var(--text-primary)]">
                            {n.content}
                          </p>
                          <p className="mt-1 font-display text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                            {n.user.name} ·{" "}
                            {new Date(n.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </GlassCard>

              {/* Deals vinculados */}
              <GlassCard className="p-5">
                <SectionTitle>
                  Negócios vinculados ({query.data.deals.length})
                </SectionTitle>
                {query.data.deals.length === 0 ? (
                  <p className="text-[12px] text-[var(--text-muted)]">
                    Sem negócios.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {query.data.deals.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2"
                      >
                        <Link
                          href={`/pipeline/${d.id}`}
                          className="min-w-0 flex-1 truncate font-body text-[13px] text-[var(--text-primary)] hover:underline"
                        >
                          {d.title}
                        </Link>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 font-display text-[10px] font-semibold"
                          style={{
                            backgroundColor: (d.stage.color ?? "#5b6ff5") + "22",
                            color: d.stage.color ?? "#5b6ff5",
                          }}
                        >
                          {d.stage.name}
                        </span>
                        <span className="font-display text-[12px] font-semibold text-[var(--text-primary)]">
                          {typeof d.value === "number"
                            ? d.value.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })
                            : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
      {children}
    </h2>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

// Suprime warning de import não usado se IconX não for usado em build
void IconX;
