"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";
import { PipelineHeader } from "@/components/crm/pipeline-header";
import type { DealDetail } from "@/components/crm/deal-detail-panel";
import type { BoardStage } from "@/components/pipeline/kanban-board";
import { SalesHubView } from "@/components/pipeline/sales-hub-view";
import type { DealQueueSortMode } from "@/components/sales-hub/deal-queue";
import { avatarInitials } from "@/features/inbox-v2/adapters";
import {
  useBoard,
  useBoardSearch,
  useDealDeepLink,
  useDealDetail,
  usePipelines,
} from "@/features/pipeline-v2/hooks";
import { PipelineSwitcher } from "@/features/pipeline-v2/extras";
import { personNameFromDealTitle, sanitizeContactName } from "@/lib/display-name";
import { PageLoading } from "@/components/crm/page-loading";

const PIPELINE_STORAGE_KEY = "crm:pipeline:last-selected:v1";
const SALESHUB_QUEUE_SORT_LS = "saleshub-queue-sort:v1";

const AVATAR_SLUGS = [
  "blue",
  "violet",
  "indigo",
  "sky",
  "cyan",
  "emerald",
  "green",
  "lime",
  "amber",
  "orange",
  "rose",
  "pink",
  "coral",
  "teal",
  "mint",
  "gray",
] as const;

function avatarColorSlugFromName(name: string | null | undefined): string {
  const safe = (name ?? "").trim();
  if (!safe) return "gray";
  let sum = 0;
  for (let i = 0; i < safe.length; i += 1) sum += safe.charCodeAt(i);
  return AVATAR_SLUGS[sum % AVATAR_SLUGS.length];
}

function readQueueSort(): DealQueueSortMode {
  if (typeof window === "undefined") return "message_new";
  try {
    const raw = localStorage.getItem(SALESHUB_QUEUE_SORT_LS);
    if (
      raw === "message_new" ||
      raw === "message_old" ||
      raw === "created_new" ||
      raw === "created_old"
    ) {
      return raw;
    }
  } catch {
    /* noop */
  }
  return "message_new";
}

export default function SalesHubClientPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [boardSearch, setBoardSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [queueSearch, setQueueSearch] = useState("");
  const [sortMode, setSortMode] = useState<DealQueueSortMode>(readQueueSort);

  const { activeDealId, setActiveDeal, normalizeDealId } = useDealDeepLink();

  const { data: pipelines } = usePipelines(isAuthenticated);

  useEffect(() => {
    if (pipelineId || !pipelines?.length) return;
    let saved: string | null = null;
    try {
      saved =
        typeof window !== "undefined"
          ? localStorage.getItem(PIPELINE_STORAGE_KEY)
          : null;
    } catch {
      saved = null;
    }
    if (saved && pipelines.some((p) => p.id === saved)) {
      setPipelineId(saved);
      return;
    }
    const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
    setPipelineId(def.id);
  }, [pipelines, pipelineId]);

  useEffect(() => {
    if (!pipelineId) return;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(PIPELINE_STORAGE_KEY, pipelineId);
      }
    } catch {
      /* localStorage indisponível */
    }
  }, [pipelineId]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(boardSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [boardSearch]);

  useEffect(() => {
    try {
      localStorage.setItem(SALESHUB_QUEUE_SORT_LS, sortMode);
    } catch {
      /* noop */
    }
  }, [sortMode]);

  const status = "OPEN" as const;
  const hasSearch = debouncedSearch.length >= 2;

  const boardNormal = useBoard({
    pipelineId,
    status,
    enabled: isAuthenticated && !hasSearch,
  });
  const boardSearchQuery = useBoardSearch({
    pipelineId,
    status,
    search: debouncedSearch,
    enabled: isAuthenticated && hasSearch,
  });

  const board = hasSearch
    ? (boardSearchQuery.data ?? boardNormal.data ?? [])
    : (boardNormal.data ?? []);

  const stages = board as BoardStage[];

  const dealById = useMemo(() => {
    const map = new Map<string, (typeof board)[number]["deals"][number]>();
    for (const s of board) {
      for (const d of s.deals) {
        map.set(d.id, d);
        if (d.number != null) map.set(String(d.number), d);
      }
    }
    return map;
  }, [board]);

  // Resolve ?deal=<número> pelo board sem esperar GET /deals/:id.
  useEffect(() => {
    if (!activeDealId || !/^\d+$/.test(activeDealId)) return;
    const hit = dealById.get(activeDealId);
    if (hit) normalizeDealId(hit.id);
  }, [activeDealId, dealById, normalizeDealId]);

  const { data: dealDetail } = useDealDetail(activeDealId);

  useEffect(() => {
    normalizeDealId(dealDetail?.id);
  }, [dealDetail?.id, normalizeDealId]);

  const boardDealSeed = useMemo(() => {
    if (!activeDealId) return null;
    return dealById.get(activeDealId) ?? null;
  }, [activeDealId, dealById]);

  /** Prefer CUID (board seed / detail) over `?deal=<número>` cru. */
  const resolvedDealId =
    dealDetail?.id ?? boardDealSeed?.id ?? activeDealId;

  const activeDealStageName = useMemo(() => {
    if (!resolvedDealId) return undefined;
    return board.find((s) =>
      s.deals.some((d) => d.id === resolvedDealId),
    )?.name;
  }, [resolvedDealId, board]);

  const detailDeal: DealDetail | null = useMemo(() => {
    if (dealDetail) {
      const contactName =
        sanitizeContactName(dealDetail.contact?.name) ||
        personNameFromDealTitle(dealDetail.title) ||
        "Sem nome";
      const ownerName = dealDetail.owner?.name?.trim() || "Sem responsavel";
      return {
        id: dealDetail.id,
        number: (dealDetail as { number?: number }).number ?? null,
        contactId: dealDetail.contact?.id ?? null,
        contactNumber:
          (dealDetail.contact as { number?: number } | null)?.number ?? null,
        name: contactName,
        initials: avatarInitials(contactName),
        avatarColor: avatarColorSlugFromName(contactName),
        phone: dealDetail.contact?.phone ?? undefined,
        email: dealDetail.contact?.email ?? null,
        whatsappUsername:
          (dealDetail.contact as { whatsappUsername?: string | null } | null)
            ?.whatsappUsername ?? null,
        contactSource:
          (dealDetail.contact as { source?: string | null } | null)?.source ??
          null,
        value: dealDetail.value ?? null,
        online: undefined,
        stage: activeDealStageName,
        pipelineName:
          (dealDetail as { stage?: { pipeline?: { name?: string } } }).stage
            ?.pipeline?.name ?? null,
        owner: {
          initials: avatarInitials(ownerName),
          name: ownerName,
          avatarColor: avatarColorSlugFromName(ownerName),
        },
        status:
          (dealDetail as { status?: "OPEN" | "WON" | "LOST" }).status ?? null,
        lostReason:
          (dealDetail as { lostReason?: string | null }).lostReason ?? null,
      };
    }

    if (!boardDealSeed) return null;
    const contactName =
      sanitizeContactName(boardDealSeed.contact?.name) ||
      personNameFromDealTitle(boardDealSeed.title) ||
      "Sem nome";
    const ownerName = boardDealSeed.owner?.name?.trim() || "Sem responsavel";
    return {
      id: boardDealSeed.id,
      number: boardDealSeed.number ?? null,
      contactId: boardDealSeed.contact?.id ?? null,
      contactNumber: boardDealSeed.contact?.number ?? null,
      name: contactName,
      initials: avatarInitials(contactName),
      avatarColor: avatarColorSlugFromName(contactName),
      phone: boardDealSeed.contact?.phone ?? undefined,
      email: boardDealSeed.contact?.email ?? null,
      whatsappUsername: null,
      contactSource: null,
      value: boardDealSeed.value ?? null,
      online: undefined,
      stage: activeDealStageName,
      pipelineName: pipelines?.find((p) => p.id === pipelineId)?.name ?? null,
      owner: {
        initials: avatarInitials(ownerName),
        name: ownerName,
        avatarColor: avatarColorSlugFromName(ownerName),
      },
      status:
        (boardDealSeed.status as "OPEN" | "WON" | "LOST" | undefined) ?? null,
      lostReason: boardDealSeed.lostReason ?? null,
    };
  }, [
    dealDetail,
    boardDealSeed,
    activeDealStageName,
    pipelines,
    pipelineId,
  ]);

  if (sessionStatus === "loading" || !pipelineId) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4"
      style={{ gridTemplateRows: "1fr" }}
    >
      <NavRailSpacer />

      <main className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
        <PipelineHeader
          tabsOverride={<></>}
          hideActions
          titleAccessory={
            <PipelineSwitcher
              variant="icon"
              selectedId={pipelineId}
              onChange={(id) => {
                setPipelineId(id);
                setActiveDeal(null);
              }}
            />
          }
          searchSlot={
            <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3">
              <input
                type="search"
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                placeholder="Buscar no funil…"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                aria-label="Buscar negócios no funil"
              />
            </div>
          }
          pipelineNameSlot={
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">
              Sales Hub
            </span>
          }
        />

        <div className="min-h-0 flex-1 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-[var(--glass-shadow)] backdrop-blur-md">
          <SalesHubView
            pipelineId={pipelineId}
            stages={stages}
            statusFilter={status}
            searchQuery={hasSearch ? "" : boardSearch}
            queueSearch={queueSearch}
            onQueueSearchChange={setQueueSearch}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            activeDealId={resolvedDealId}
            onActiveDealChange={setActiveDeal}
            detailDeal={detailDeal}
            onOpenFullDeal={(dealId) => {
              const d = dealById.get(dealId);
              const param =
                d?.number != null ? String(d.number) : dealId;
              router.push(`/pipeline?deal=${encodeURIComponent(param)}`);
            }}
          />
        </div>
      </main>
    </div>
  );
}
