"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type AgentWithPermissions = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  isOnline: boolean;
  permissions: AgentPermissions | null;
};

export type AgentPermissions = {
  canViewOtherAgentsConversations: boolean;
  disableConversationsWithoutAgent: boolean;
  canTransferConversation: boolean;
  canCloseConversation: boolean;
  canDeleteConversation: boolean;
  canManageQuickMessages: boolean;
  allowedConnectionIds: string[];
  allowedDepartmentIds: string[];
};

export const DEFAULT_PERMISSIONS: AgentPermissions = {
  canViewOtherAgentsConversations: false,
  disableConversationsWithoutAgent: false,
  canTransferConversation: true,
  canCloseConversation: true,
  canDeleteConversation: false,
  canManageQuickMessages: false,
  allowedConnectionIds: [],
  allowedDepartmentIds: [],
};

const LIST_QK = ["settings", "agent-permissions", "list"];

export function useAgentList() {
  return useQuery<AgentWithPermissions[]>({
    queryKey: LIST_QK,
    queryFn: async () => {
      const res = await fetch("/api/settings/agent-permissions", { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar atendentes");
      return res.json();
    },
  });
}

export function useSaveAgentPermissions(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (perms: Partial<AgentPermissions>) => {
      const res = await fetch(`/api/settings/agent-permissions/${userId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(perms),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Erro ao salvar");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_QK });
      toast.success("Permissões atualizadas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
