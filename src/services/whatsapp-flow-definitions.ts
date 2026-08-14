/**
 * Stub no frontend. Tipos para o Flow Builder visual em
 * `src/app/(dashboard)/settings/message-models/flows/[id]/client-page.tsx`.
 *
 * A persistência (CRUD + publish na Meta) vive em
 * `crm-backend/src/services/whatsapp-flow-definitions.ts` e é exposta
 * via `/api/whatsapp-flow-definitions/*`.
 */

export type FlowDefinitionInputFieldMapping = {
  targetKind: "CONTACT_NATIVE" | "DEAL_NATIVE" | "CUSTOM_FIELD";
  nativeKey?: string | null;
  customFieldId?: string | null;
};

export type FlowDefinitionInputField = {
  id?: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  options?: string[];
  required?: boolean;
  sortOrder?: number;
  mapping?: FlowDefinitionInputFieldMapping | null;
};

export type FlowDefinitionInputScreen = {
  id?: string;
  title: string;
  description?: string | null;
  sortOrder?: number;
  fields: FlowDefinitionInputField[];
};

export type FlowDefinitionUpsertInput = {
  name: string;
  flowCategory?: string;
  screens: FlowDefinitionInputScreen[];
};
