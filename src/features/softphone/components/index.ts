/**
 * Barrel apenas para o `SoftphoneWidget` global.
 *
 * Os demais componentes do softphone (DealCallButton, CallHistoryList,
 * Api4ComConnectForm, ExtensionSettingsForm, ProviderConfigForm,
 * CallHistoryFilters) são importados direto pelo subpath
 * (`@/features/softphone/components/<arquivo>`) — não passam por aqui.
 */
export { SoftphoneWidget } from "./softphone-widget";
