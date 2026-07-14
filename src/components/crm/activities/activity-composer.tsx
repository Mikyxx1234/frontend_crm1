"use client"

import { useEffect, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { IconX } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { InputGlass } from "@/components/crm/input-glass"
import { ButtonGlass } from "@/components/crm/button-glass"
import { Textarea } from "@/components/ui/textarea"
import {
  ACTIVITY_KINDS,
  ACTIVITY_KIND_ORDER,
  dateKey,
  type Activity,
  type ActivityKind,
} from "@/lib/activities-data"

interface ActivityComposerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Data pré-selecionada (do calendário). */
  defaultDate: Date
  onCreate: (activity: Activity) => void
}

const labelCls = "font-display text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]"

export function ActivityComposer({ open, onOpenChange, defaultDate, onCreate }: ActivityComposerProps) {
  const [kind, setKind] = useState<ActivityKind>("tarefa")
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(dateKey(defaultDate))
  const [time, setTime] = useState("09:00")
  const [duration, setDuration] = useState("30")
  const [withWhom, setWithWhom] = useState("")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")

  // Sincroniza a data ao abrir
  useEffect(() => {
    if (open) {
      setDate(dateKey(defaultDate))
      setTitle("")
      setWithWhom("")
      setLocation("")
      setNotes("")
    }
  }, [open, defaultDate])

  const usesDuration = kind === "reuniao" || kind === "evento" || kind === "ligacao"
  const usesLocation = kind === "reuniao" || kind === "evento"

  const submit = () => {
    if (!title.trim()) return
    onCreate({
      id: `a-${Date.now()}`,
      kind,
      title: title.trim(),
      start: `${date}T${time}`,
      durationMin: usesDuration ? Number(duration) || undefined : undefined,
      status: "pendente",
      withWhom: withWhom.trim() || undefined,
      location: usesLocation ? location.trim() || undefined : undefined,
      notes: notes.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2",
            "max-h-[calc(100vh-3rem)] overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--glass-border)]",
            "bg-[var(--glass-bg-overlay)] p-5 shadow-[var(--glass-shadow)] backdrop-blur-2xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <Dialog.Title className="font-display text-[17px] font-bold text-[var(--text-primary)]">
                Nova tarefa
              </Dialog.Title>
              <Dialog.Description className="font-body text-[12px] text-[var(--text-muted)]">
                Agende uma tarefa, reunião, ligação ou evento.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
              >
                <IconX size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Seletor de tipo */}
          <div className="mb-4 flex flex-col gap-1.5">
            <span className={labelCls}>Tipo</span>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_KIND_ORDER.map((k) => {
                const meta = ACTIVITY_KINDS[k]
                const Icon = meta.icon
                const active = k === kind
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-semibold transition-all duration-150",
                      active
                        ? "text-white shadow-[var(--glass-shadow-sm)]"
                        : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)]",
                    )}
                    style={
                      active ? { backgroundColor: meta.color, borderColor: meta.color } : undefined
                    }
                  >
                    <Icon size={15} stroke={2} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Título */}
          <div className="mb-4 flex flex-col gap-1.5">
            <label htmlFor="ac-title" className={labelCls}>
              Título
            </label>
            <InputGlass
              id="ac-title"
              autoFocus
              placeholder="Ex.: Ligar para o cliente"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
              }}
            />
          </div>

          {/* Data / hora / duração */}
          <div className={cn("mb-4 grid gap-3", usesDuration ? "grid-cols-3" : "grid-cols-2")}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ac-date" className={labelCls}>
                Data
              </label>
              <InputGlass id="ac-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ac-time" className={labelCls}>
                Hora
              </label>
              <InputGlass id="ac-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            {usesDuration && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ac-dur" className={labelCls}>
                  Duração (min)
                </label>
                <InputGlass
                  id="ac-dur"
                  type="number"
                  min={5}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Com quem / local */}
          <div className={cn("mb-4 grid gap-3", usesLocation ? "grid-cols-2" : "grid-cols-1")}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ac-who" className={labelCls}>
                Contato
              </label>
              <InputGlass
                id="ac-who"
                placeholder="Nome do lead ou empresa"
                value={withWhom}
                onChange={(e) => setWithWhom(e.target.value)}
              />
            </div>
            {usesLocation && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ac-loc" className={labelCls}>
                  Local
                </label>
                <InputGlass
                  id="ac-loc"
                  placeholder="Endereço ou link"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="mb-5 flex flex-col gap-1.5">
            <label htmlFor="ac-notes" className={labelCls}>
              Notas
            </label>
            <Textarea
              id="ac-notes"
              rows={3}
              placeholder="Detalhes adicionais (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none"
            />
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <ButtonGlass variant="glass">Cancelar</ButtonGlass>
            </Dialog.Close>
            <ButtonGlass variant="primary" onClick={submit} disabled={!title.trim()}>
              Agendar tarefa
            </ButtonGlass>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
