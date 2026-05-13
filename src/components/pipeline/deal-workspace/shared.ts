// Re-exporta tipos do <DealDetail> antigo pra evitar duplicacao.
// O workspace e visual; tipos sao os mesmos contratos da API.

export type {
  DealDetailUser,
  DealDetailNote,
  DealDetailActivity,
  DealDetailData,
  DealTimelineEvent,
  ConversationRow,
  ContactDetail,
  UserOption,
  DealProductItem,
  CatalogProduct,
} from "@/components/pipeline/deal-detail/shared";

export {
  ACTIVITY_TYPES,
  LIFECYCLE_OPTIONS,
  LIFECYCLE_COLORS,
  STATUS_LABEL,
  ContactInfoRows,
} from "@/components/pipeline/deal-detail/shared";
