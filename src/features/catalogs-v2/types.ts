/**
 * Tipos do Catálogo Universal por Capacidades (frontend).
 *
 * O conjunto de capacidades e o schema de cada `config` vêm do backend
 * (`GET /api/capabilities`) — o wizard monta as sub-perguntas a partir do
 * JSON Schema servido, sem hardcode de campos por capacidade.
 */

/** Política de override catálogo → produto (Fase 1 do backend). */
export type OverridePolicy = "LOCKED" | "DEFAULT" | "OPEN";

/** Propriedade de um JSON Schema (subset que o wizard renderiza). */
export interface JsonSchemaProperty {
  type?: string | string[];
  title?: string;
  description?: string;
  enum?: (string | number)[];
  /** Discriminante literal (ex.: `mode`) — gerado por z.literal. */
  const?: string | number;
  default?: unknown;
  minimum?: number;
  maximum?: number;
}

export interface JsonSchemaObject {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  /**
   * Discriminated union por `mode` (Fase 2). `z.toJSONSchema` serializa
   * `z.discriminatedUnion` como `oneOf`, cada branch um objeto cujo campo
   * `mode` tem `const`.
   */
  oneOf?: JsonSchemaObject[];
  [key: string]: unknown;
}

/** Capacidade disponível (registro de código serializado). */
export interface SerializedCapability {
  key: string;
  label: string;
  description: string;
  configSchema: JsonSchemaObject;
}

/** Capacidade ligada a um catálogo (junction). */
export interface CatalogCapabilityView {
  id: string;
  capabilityKey: string;
  mode: string;
  config: Record<string, unknown>;
  overridePolicy: OverridePolicy;
  enabled: boolean;
}

export interface CatalogView {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isTemplate: boolean;
  templateKey: string | null;
  capabilities: CatalogCapabilityView[];
  _count?: { products: number };
}

export interface CatalogTemplate {
  id: string;
  name: string;
  description: string | null;
  templateKey: string | null;
  capabilities: CatalogCapabilityView[];
}

/** Payload de uma capacidade ao criar/atualizar catálogo. */
export interface CapabilityPayload {
  capabilityKey: string;
  mode: string;
  config: Record<string, unknown>;
  overridePolicy: OverridePolicy;
  enabled: boolean;
}
