"use client";

import * as React from "react";
import { IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { useCan } from "@/hooks/use-my-permissions";

import {
  useContactsSearch,
  useProductStakeholders,
  useStakeholderMutations,
} from "./hooks";
import type { StakeholderChannel } from "./types";

export function StakeholdersSection({ productId }: { productId: string }) {
  const { data: stakeholders = [] } = useProductStakeholders(productId);
  const { create, update, remove } = useStakeholderMutations(productId);
  const canManage = useCan("product:manage_stakeholders");

  const [search, setSearch] = React.useState("");
  const { data: contacts = [] } = useContactsSearch(search);
  const [picked, setPicked] = React.useState<{ id: string; name: string } | null>(null);
  const [role, setRole] = React.useState("");
  const [channel, setChannel] = React.useState<StakeholderChannel>("WHATSAPP");

  const handleAdd = async () => {
    if (!picked) {
      toast.error("Selecione um contato.");
      return;
    }
    if (!role.trim()) {
      toast.error("Informe o papel do stakeholder.");
      return;
    }
    try {
      await create.mutateAsync({
        contactId: picked.id,
        role: role.trim(),
        channelPreference: channel,
        notifyOnSend: false,
        notifyForFeedback: false,
      });
      setPicked(null);
      setSearch("");
      setRole("");
      toast.success("Stakeholder vinculado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao vincular");
    }
  };

  return (
    <div>
      {stakeholders.length === 0 ? (
        <p className="text-[11px] text-[var(--text-secondary)]">
          Nenhum stakeholder. Vincule contatos que devem ser notificados ou dar feedback.
        </p>
      ) : (
        <div className="space-y-2">
          {stakeholders.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {s.contact.name}
                </p>
                <p className="truncate text-[11px] text-[var(--text-secondary)]">
                  {s.role} · {s.contact.email ?? s.contact.phone ?? "sem contato"}
                </p>
              </div>
              <label className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={s.notifyOnSend}
                  disabled={!canManage}
                  onChange={(e) =>
                    update.mutate({ sid: s.id, body: { notifyOnSend: e.target.checked } })
                  }
                  className="size-3.5 rounded accent-[var(--brand-primary)]"
                />
                Notificar
              </label>
              <label className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={s.notifyForFeedback}
                  disabled={!canManage}
                  onChange={(e) =>
                    update.mutate({ sid: s.id, body: { notifyForFeedback: e.target.checked } })
                  }
                  className="size-3.5 rounded accent-[var(--brand-primary)]"
                />
                Feedback
              </label>
              {canManage && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => remove.mutate(s.id)}
                >
                  <IconTrash size={14} className="text-[var(--color-danger)]" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-3">
          <div className="grid gap-2 sm:grid-cols-12">
            <div className="relative sm:col-span-5">
              <Label className="text-[11px]">Contato</Label>
              <div className="relative mt-1">
                <IconSearch
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                />
                <Input
                  value={picked ? picked.name : search}
                  onChange={(e) => {
                    setPicked(null);
                    setSearch(e.target.value);
                  }}
                  placeholder="Buscar contato…"
                  className="h-9 pl-8"
                />
              </div>
              {!picked && contacts.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-44 w-full overflow-y-auto rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] shadow-[var(--glass-shadow)]">
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setPicked({ id: c.id, name: c.name });
                        setSearch("");
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--glass-bg-subtle)]"
                    >
                      {c.name}
                      {c.email && (
                        <span className="ml-1 text-[11px] text-[var(--text-secondary)]">
                          {c.email}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="sm:col-span-3">
              <Label className="text-[11px]">Papel</Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="ex.: Gestor"
                className="mt-1 h-9"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px]">Canal</Label>
              <SelectNative
                value={channel}
                onChange={(e) => setChannel(e.target.value as StakeholderChannel)}
                className="mt-1 h-9"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">E-mail</option>
              </SelectNative>
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={create.isPending}
                onClick={handleAdd}
              >
                <IconPlus size={14} /> Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
