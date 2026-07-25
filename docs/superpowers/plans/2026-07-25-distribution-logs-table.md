# Distribution Logs Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sparse distribution log list with an operational table, local filters, and expandable details.

**Architecture:** Keep the existing infinite-query/API contract. Add local state and memoized filtering inside `DistributionLogsList`, then render a responsive table whose rows reveal technical metadata and a conversation link.

**Tech Stack:** React 19, Next.js 15, TypeScript, Tailwind CSS, Tabler Icons.

---

### Task 1: Operational logs table

**Files:**
- Modify: `src/app/(app)/widgets/distribution/client-page.tsx`

- [ ] Add filter state for search, result, period, origin, and expanded row.
- [ ] Derive origin options and filtered rows with `useMemo`.
- [ ] Replace the simple list with toolbar, table columns, badges, and expandable detail.
- [ ] Preserve loading, error, empty, and infinite pagination states.
- [ ] Run `npx eslint "src/app/(app)/widgets/distribution/client-page.tsx"`.
- [ ] Run `git diff --check`.
- [ ] Commit the implementation.
