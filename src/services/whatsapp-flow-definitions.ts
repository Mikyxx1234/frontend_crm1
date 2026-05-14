/**
 * Stub no frontend. Tipos para o Flow Builder visual em
 * `src/app/(dashboard)/settings/message-models/flows/[id]/client-page.tsx`.
 *
 * A persistência (CRUD + publish na Meta) vive em
 * `crm-backend/src/services/whatsapp-flow-definitions.ts` e é exposta
 * via `/api/whatsapp-flow-definitions/*`.
 */

export type FlowDefinitionInputFieldMapping = {
  fieldKey: string;
  /** Caminho dentro do payload (ex: "screen_0.field_0"). */
  mapsTo?: string | null;
};

export type FlowDefinitionInputField = {
  id?: string;
  label: string;
  /** Tipo do campo (TextInput, TextArea, RadioButtonsGroup, etc.). */
  type: string;
  required?: boolean;
  config?: Record<string, unknown> | null;
  mappings?: FlowDefinitionInputFieldMapping[];
};

export type FlowDefinitionInputScreen = {
  id?: string;
  title: string;
  description?: string | null;
  fields: FlowDefinitionInputField[];
};

export type FlowDefinitionUpsertInput = {
  name: string;
  flowCategory?: string;
  screens: FlowDefinitionInputScreen[];
};
