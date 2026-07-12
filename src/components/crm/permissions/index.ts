/**
 * Barrel dos primitivos compartilhados de permissão (DS v2).
 * Fonte única de UI para escopo/matriz em Permissões e Conversas.
 */
export {
  ScopeSelector,
  MODULE_SCOPE_OPTIONS,
  OWNER_SCOPE_OPTIONS,
  CHANNEL_SCOPE_OPTIONS,
  type ScopeOption,
  type ScopeTone,
} from "./scope-selector";
export {
  ScopeLegend,
  MODULE_SCOPE_LEGEND,
  OWNER_SCOPE_LEGEND,
  CHANNEL_SCOPE_LEGEND,
  type ScopeLegendItem,
} from "./scope-legend";
export { SensitiveBadge } from "./sensitive-badge";
export { RoleChip } from "./role-chip";
export { PermissionRow } from "./permission-row";
export { PermissionMatrix } from "./permission-matrix";
