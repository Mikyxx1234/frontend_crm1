"use client";

import { useState } from "react";
import { Hash, MessagesSquare } from "lucide-react";
import { toast } from "sonner";

import { ButtonGlass } from "@/components/crm/button-glass";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { Avatar } from "./avatar";
import { useTeamChatColleagues, useTeamChatMutations } from "./hooks";
import { toPerson } from "./helpers";
import type { TeamChatPerson, TeamChatRoom } from "./types";

function resetCompose(
  setPicked: (v: string[]) => void,
  setName: (v: string) => void,
  setQ: (v: string) => void,
) {
  setPicked([]);
  setName("");
  setQ("");
}

export function ComposeDialog({
  open,
  onOpenChange,
  meId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meId: string;
  onCreated: (roomId: string) => void;
}) {
  const { data, isLoading } = useTeamChatColleagues(open);
  const { createRoom } = useTeamChatMutations();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState("");

  const people = (data?.colleagues ?? []).filter((p) => p.id !== meId);
  const visible = people.filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const isGroup = picked.length > 1 || !!name.trim();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isGroup ? "Novo canal" : "Nova conversa"}
      description="Uma pessoa = direta. Duas ou mais = canal do time."
      icon={<MessagesSquare className="h-5 w-5" />}
      size="md"
      footer={
        <>
          <ButtonGlass type="button" variant="glass" onClick={() => onOpenChange(false)}>Cancelar</ButtonGlass>
          <ButtonGlass
            type="button"
            variant="primary"
            disabled={picked.length === 0 || (isGroup && picked.length > 1 && !name.trim()) || createRoom.isPending}
            onClick={() => {
              createRoom.mutate(
                { memberIds: picked, name: isGroup ? name.trim() || undefined : undefined },
                {
                  onSuccess: (res) => {
                    resetCompose(setPicked, setName, setQ);
                    onCreated(res.room.id);
                  },
                  onError: (e: Error) => toast.error(e.message),
                },
              );
            }}
          >
            {isGroup && picked.length > 1 ? "Criar canal" : "Conversar"}
          </ButtonGlass>
        </>
      }
    >
      {isGroup && picked.length > 1 && (
        <div className="mb-3 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Nome do canal</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: comercial, plantão, dev" />
        </div>
      )}
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar colega" className="mb-3" />
      {isLoading && visible.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-muted-foreground">Carregando o time…</p>
      ) : (
        <PeoplePicker people={visible} picked={picked} onToggle={(id) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))} />
      )}
    </FormDialog>
  );
}

export function AddMembersDialog({
  open,
  onOpenChange,
  room,
  meId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  room: TeamChatRoom;
  meId: string;
}) {
  const { data } = useTeamChatColleagues(open);
  const { addMembers } = useTeamChatMutations();
  const [picked, setPicked] = useState<string[]>([]);
  const inRoom = new Set(room.members.map((m) => m.id));
  const people = (data?.colleagues ?? []).filter(
    (p) => p.id !== meId && !inRoom.has(p.id),
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setPicked([]);
        onOpenChange(v);
      }}
      title={`#${room.name}`}
      description={`${room.memberCount} no canal · adicione colegas`}
      icon={<Hash className="h-5 w-5" />}
      size="md"
      footer={
        <>
          <ButtonGlass type="button" variant="glass" onClick={() => onOpenChange(false)}>Fechar</ButtonGlass>
          <ButtonGlass
            type="button"
            variant="primary"
            disabled={picked.length === 0 || addMembers.isPending}
            onClick={() => {
              addMembers.mutate(
                { roomId: room.id, memberIds: picked },
                {
                  onSuccess: () => {
                    setPicked([]);
                    onOpenChange(false);
                    toast.success("Membros adicionados");
                  },
                  onError: (e: Error) => toast.error(e.message),
                },
              );
            }}
          >
            Adicionar
          </ButtonGlass>
        </>
      }
    >
      <PeoplePicker people={people} picked={picked} onToggle={(id) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))} />
    </FormDialog>
  );
}

function PeoplePicker({
  people,
  picked,
  onToggle,
}: {
  people: TeamChatPerson[];
  picked: string[];
  onToggle: (id: string) => void;
}) {
  if (people.length === 0) {
    return <p className="py-6 text-center text-[12px] text-muted-foreground">Nenhum colega nesta organização além de você.</p>;
  }
  return (
    <div className="max-h-72 space-y-0.5 overflow-y-auto">
      {people.map((p) => {
        const on = picked.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            className={cn("flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left", on ? "bg-primary/10" : "hover:bg-muted")}
          >
            <Avatar person={toPerson(p)} size="sm" showPresence />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{p.name}</span>
            {on && <span className="text-[11px] font-semibold text-primary">selecionado</span>}
          </button>
        );
      })}
    </div>
  );
}
