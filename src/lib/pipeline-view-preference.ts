/**
 * Última visualização do funil (Kanban / Lista / Flow).
 * Persistida em localStorage — usada ao abrir Pipeline pela nav.
 */

export type PipelineViewPreference = "kanban" | "list" | "flow";

export const PIPELINE_VIEW_STORAGE_KEY = "crm:pipeline:last-view:v1";

export function readPipelineViewPreference(): PipelineViewPreference {
  if (typeof window === "undefined") return "kanban";
  try {
    const v = localStorage.getItem(PIPELINE_VIEW_STORAGE_KEY);
    if (v === "list" || v === "flow" || v === "kanban") return v;
  } catch {
    /* private mode / quota */
  }
  return "kanban";
}

export function writePipelineViewPreference(view: PipelineViewPreference): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PIPELINE_VIEW_STORAGE_KEY, view);
  } catch {
    /* ignore */
  }
}

export function pathForPipelineView(view: PipelineViewPreference): string {
  if (view === "list") return "/pipeline/list";
  if (view === "flow") return "/pipeline/flow";
  return "/pipeline";
}
