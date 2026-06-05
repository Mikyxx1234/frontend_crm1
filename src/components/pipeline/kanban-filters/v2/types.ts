/** Props comuns a todas as variações de layout dos filtros v2. */

import type { AdvancedDealFilters, FilterOptionsResponse } from "../types";

export type VariantProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: AdvancedDealFilters;
  options: FilterOptionsResponse | null;
  optionsLoading: boolean;
  optionsError?: string | null;
  onApply: (next: AdvancedDealFilters) => void;
  onClear: () => void;
  onRequestSave?: (current: AdvancedDealFilters) => void;
};
