"use client";

import * as React from "react";
import { IconMail as Mail, IconPlus as Plus, IconTrash as Trash2, IconRefresh as RefreshCw, IconX as X } from "@tabler/icons-react";
import { toast } from "sonner";

import { TabsGlass } from "@/components/crm/tabs-glass";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";
import { ConnectEmailModal } from "@/features/email-v2";
import {
  useEmailAccounts,
  useEmailCustomFolders,
  useEmailRules,
} from "@/features/email-v2/hooks";
import type {
  EmailAccount,
  EmailRule,
  EmailRuleField,
  EmailRuleAction,
} from "@/features/email-v2/api/types";

const TABS = ["Contas", "Regras de filtro"] as const;

export default function EmailAccountsClientPage() {
  const [activeTab, setActiveTab] = React.useState(0);
  const [connectOpen, setConnectOpen] = React.useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const {
    accounts,
    loading: accountsLoading,
    reload: reloadAccounts,
    disconnect,
    sync,
  } = useEmailAccounts();

  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Contas de e-mail"
      description="Gerencie caixas IMAP/SMTP, pastas e regras de filtro"
      icon={<Mail size={22} />}
      center={
        <TabsGlass
          tabs={[...TABS]}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="max-w-md"
        />
      }
      actions={
        activeTab === 0 ? (
          <button
            onClick={() => setConnectOpen(true)}
            className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] px-4 py-2 rounded-full bg-[var(--brand-primary)] text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] hover:bg-[var(--brand-primary-dark,#3d52e8)] hover:-translate-y-px transition-all"
          >
            <Plus size={15} />
            Conectar e-mail
          </button>
        ) : null
      }
    >
      {activeTab === 0 && (
        <AccountsList
          accounts={accounts}
          loading={accountsLoading}
          onSync={sync}
          onDisconnect={disconnect}
          onConnect={() => setConnectOpen(true)}
          confirm={confirm}
        />
      )}

      {activeTab === 1 && <RulesPanel accounts={accounts} confirm={confirm} />}

      <ConnectEmailModal
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onSuccess={async () => {
          await reloadAccounts();
        }}
      />

      {confirmDialog}
    </SettingsV2Shell>
  );
}

type ConfirmFn = ReturnType<typeof useConfirm>["confirm"];

// ── Lista de contas ───────────────────────────────────────────────────────────
function AccountsList({
  accounts,
  loading,
  onSync,
  onDisconnect,
  onConnect,
  confirm,
}: {
  accounts: EmailAccount[];
  loading: boolean;
  onSync: (id: string) => Promise<unknown>;
  onDisconnect: (id: string) => Promise<void>;
  onConnect: () => void;
  confirm: ConfirmFn;
}) {
  const [syncing, setSyncing] = React.useState<string | null>(null);

  async function handleSync(id: string) {
    setSyncing(id);
    try { await onSync(id); } finally { setSyncing(null); }
  }

  async function handleDisconnect(id: string, email: string) {
    const ok = await confirm({
      title: `Desconectar "${email}"?`,
      description: "Todos os e-mails sincronizados dessa conta serão removidos do CRM. A caixa original no servidor não é afetada.",
      confirmLabel: "Desconectar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await onDisconnect(id);
      toast.success("Conta desconectada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desconectar.");
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--text-muted)]">Carregando contas…</p>;
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-overlay)]">
        <Mail size={32} className="text-[var(--text-muted)] opacity-40" />
        <p className="text-[14px] text-[var(--text-muted)]">Nenhuma conta de e-mail conectada ainda.</p>
        <button
          onClick={onConnect}
          className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] px-4 py-2 rounded-full bg-[var(--brand-primary)] text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] hover:bg-[var(--brand-primary-dark,#3d52e8)] hover:-translate-y-px transition-all"
        >
          <Plus size={15} /> Conectar primeira conta
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {accounts.map((acc) => (
        <div
          key={acc.id}
          className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)]"
        >
          <span className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--brand-primary)] text-white font-bold text-[14px] font-display shrink-0">
            {acc.email[0]?.toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-[14px] text-[var(--text-primary)] truncate">
              {acc.email}
            </p>
            <p className="text-[12px] text-[var(--text-muted)]">
              {acc.imapHost} · {acc.visibility === "PERSONAL" ? "Pessoal" : "Compartilhado"}
              {acc.lastSyncedAt && (
                <> · Sincronizado em {new Date(acc.lastSyncedAt).toLocaleString("pt-BR")}</>
              )}
            </p>
          </div>
          <button
            onClick={() => void handleSync(acc.id)}
            disabled={syncing === acc.id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors disabled:opacity-50"
          >
            <span className={syncing === acc.id ? "animate-spin inline-flex" : "inline-flex"}>
              <RefreshCw size={13} />
            </span>
            Sincronizar
          </button>
          <button
            onClick={() => void handleDisconnect(acc.id, acc.email)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-colors"
          >
            <X size={13} /> Desconectar
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Painel de regras ──────────────────────────────────────────────────────────
function RulesPanel({ accounts, confirm }: { accounts: EmailAccount[]; confirm: ConfirmFn }) {
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | undefined>(
    accounts[0]?.id,
  );

  // Atualiza accountId quando lista carrega
  React.useEffect(() => {
    if (!selectedAccountId && accounts[0]) setSelectedAccountId(accounts[0].id);
  }, [accounts, selectedAccountId]);

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-overlay)]">
        <Mail size={28} className="text-[var(--text-muted)] opacity-40" />
        <p className="text-[13px] text-[var(--text-muted)]">
          Conecte uma conta antes de criar regras.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Seletor de conta */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Conta:
        </span>
        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelectedAccountId(a.id)}
            className={[
              "px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors",
              selectedAccountId === a.id
                ? "bg-[var(--brand-primary)] text-white"
                : "bg-[var(--glass-bg-overlay)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]",
            ].join(" ")}
          >
            {a.email}
          </button>
        ))}
      </div>

      {selectedAccountId && <AccountRules accountId={selectedAccountId} confirm={confirm} />}
    </div>
  );
}

function AccountRules({ accountId, confirm }: { accountId: string; confirm: ConfirmFn }) {
  const { rules, loading, create, update, remove } = useEmailRules(accountId);
  const { folders } = useEmailCustomFolders(accountId);

  const [showForm, setShowForm] = React.useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[var(--text-muted)]">
          As regras se aplicam automaticamente a novas mensagens recebidas.
          Primeira regra que bate vence (ordem por prioridade).
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--brand-primary)] text-[var(--brand-primary)] text-[12px] font-bold hover:bg-[var(--color-enterprise-bg,rgba(91,111,245,0.12))] transition-colors"
        >
          <Plus size={13} /> Nova regra
        </button>
      </div>

      {showForm && (
        <RuleForm
          accountId={accountId}
          folders={folders}
          onCancel={() => setShowForm(false)}
          onSubmit={async (input) => {
            await create(input);
            setShowForm(false);
          }}
        />
      )}

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Carregando regras…</p>
      ) : rules.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-[var(--text-muted)] border border-dashed border-[var(--glass-border)] rounded-[var(--radius-lg)] bg-[var(--glass-bg-overlay)]">
          Nenhuma regra cadastrada.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              folders={folders}
              onToggle={(active) => void update(rule.id, { isActive: active })}
              onDelete={async () => {
                const ok = await confirm({
                  title: `Remover a regra "${rule.name}"?`,
                  description: "Mensagens já filtradas permanecem onde estão. A regra deixa de se aplicar a novas mensagens.",
                  confirmLabel: "Remover",
                  destructive: true,
                });
                if (!ok) return;
                try {
                  await remove(rule.id);
                  toast.success("Regra removida.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erro ao remover regra.");
                }
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Linha de regra ────────────────────────────────────────────────────────────
function RuleRow({
  rule,
  folders,
  onToggle,
  onDelete,
}: {
  rule: EmailRule;
  folders: { id: string; name: string }[];
  onToggle: (active: boolean) => void;
  onDelete: () => void;
}) {
  const target = folders.find((f) => f.id === rule.targetFolderId);
  const fieldLabel = FIELD_LABELS[rule.conditionField];
  const actionLabel =
    rule.action === "TRASH"
      ? "mover para Lixeira"
      : `mover para "${target?.name ?? "pasta removida"}"`;

  return (
    <li className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)]">
      <input
        type="checkbox"
        checked={rule.isActive}
        onChange={(e) => onToggle(e.target.checked)}
        className="w-4 h-4 accent-[var(--brand-primary)]"
        title="Ativar/desativar"
      />
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-[13px] text-[var(--text-primary)] truncate">
          {rule.name}
        </p>
        <p className="text-[12px] text-[var(--text-muted)] truncate">
          Se {fieldLabel} contém <strong>“{rule.conditionValue}”</strong> → {actionLabel}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="w-[30px] h-[30px] rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--color-danger)] hover:border hover:border-[var(--color-danger)] transition-colors"
        title="Remover"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

// ── Form de criação ───────────────────────────────────────────────────────────
const FIELD_LABELS: Record<EmailRuleField, string> = {
  FROM: "Enviado de",
  TO: "Enviado para",
  SUBJECT: "Assunto",
};

function RuleForm({
  accountId,
  folders,
  onCancel,
  onSubmit,
}: {
  accountId: string;
  folders: { id: string; name: string }[];
  onCancel: () => void;
  onSubmit: (input: {
    accountId: string;
    name: string;
    conditionField: EmailRuleField;
    conditionValue: string;
    action: EmailRuleAction;
    targetFolderId?: string | null;
  }) => Promise<void>;
}) {
  const [name, setName] = React.useState("");
  const [conditionField, setConditionField] = React.useState<EmailRuleField>("FROM");
  const [conditionValue, setConditionValue] = React.useState("");
  const [action, setAction] = React.useState<EmailRuleAction>("MOVE");
  const [targetFolderId, setTargetFolderId] = React.useState<string>(folders[0]?.id ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Dê um nome à regra.");
    if (!conditionValue.trim()) return setError("Informe o valor da condição.");
    if (action === "MOVE" && !targetFolderId) {
      return setError("Crie uma pasta antes de usar a ação 'Mover para'.");
    }

    setSubmitting(true);
    try {
      await onSubmit({
        accountId,
        name: name.trim(),
        conditionField,
        conditionValue: conditionValue.trim(),
        action,
        targetFolderId: action === "MOVE" ? targetFolderId : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 p-4 rounded-[var(--radius-xl)] border border-[var(--brand-primary)] bg-[var(--glass-bg-base)]"
    >
      <p className="font-display font-bold text-[13px] text-[var(--text-primary)]">Nova regra</p>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Nome
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Boletos da Receita"
          className="px-3 py-2 text-[13px] rounded-[var(--radius-md)] border border-[var(--glass-border)] focus:outline-none focus:border-[var(--brand-primary)]"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3 items-end">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Campo
          </span>
          <select
            value={conditionField}
            onChange={(e) => setConditionField(e.target.value as EmailRuleField)}
            className="px-3 py-2 text-[13px] rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] focus:outline-none focus:border-[var(--brand-primary)]"
          >
            <option value="FROM">Enviado de</option>
            <option value="TO">Enviado para</option>
            <option value="SUBJECT">Assunto</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Contém o texto
          </span>
          <input
            type="text"
            value={conditionValue}
            onChange={(e) => setConditionValue(e.target.value)}
            placeholder="ex.: receita.gov.br"
            className="px-3 py-2 text-[13px] rounded-[var(--radius-md)] border border-[var(--glass-border)] focus:outline-none focus:border-[var(--brand-primary)]"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3 items-end">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Ação
          </span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as EmailRuleAction)}
            className="px-3 py-2 text-[13px] rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] focus:outline-none focus:border-[var(--brand-primary)]"
          >
            <option value="MOVE">Mover para pasta</option>
            <option value="TRASH">Excluir (mover para lixeira)</option>
          </select>
        </label>

        {action === "MOVE" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Pasta de destino
            </span>
            <select
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
              disabled={folders.length === 0}
              className="px-3 py-2 text-[13px] rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] focus:outline-none focus:border-[var(--brand-primary)] disabled:opacity-50"
            >
              {folders.length === 0 ? (
                <option value="">Nenhuma pasta — crie no Inbox</option>
              ) : (
                folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)
              )}
            </select>
          </label>
        )}
      </div>

      {error && (
        <p className="text-[12px] text-[var(--color-danger)] font-semibold">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-black/5 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--brand-primary)] text-white text-[12px] font-bold hover:bg-[var(--brand-primary-dark,#3d52e8)] transition-colors disabled:opacity-50"
        >
          {submitting ? "Salvando…" : "Salvar regra"}
        </button>
      </div>
    </form>
  );
}
