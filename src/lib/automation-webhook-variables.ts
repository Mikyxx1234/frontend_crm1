/**
 * Catálogo de variáveis disponíveis no body/headers do step "Webhook".
 *
 * Os tokens seguem o formato `{{caminho.aninhado}}` e são resolvidos no
 * backend (`automation-executor.ts > case "webhook"`) lendo o
 * RuntimeContext e o payload do evento. Mantenha esta lista alinhada com
 * o que o executor expõe — cada entrada nova aqui só é útil se o executor
 * souber resolver o caminho.
 *
 * Por que dotted-path em vez de chaves planas?
 *   O `interpolateVariables` legado (em `automation-context.ts` no backend)
 *   só aceita `[a-zA-Z0-9_]+` — usado em mensagens WhatsApp. Pra webhook
 *   queremos `contact.name`, `contact.adCtwaClid`, `data.referral.headline`
 *   etc. — então o executor usa um resolver dedicado de path (ver
 *   `interpolateWebhookTemplate`).
 */

export type WebhookVariableGroup =
  | "Contato"
  | "Origem do anúncio (Meta CTWA)"
  | "Negócio"
  | "Conversa"
  | "Tags"
  | "Evento";

export interface WebhookVariableOption {
  /** Token completo, ex.: `{{contact.name}}`. */
  token: string;
  /** Rótulo curto pra UI (sem o grupo). */
  label: string;
  /** Tooltip / dica. */
  hint?: string;
  /** Grupo pra renderização agrupada. */
  group: WebhookVariableGroup;
}

export const WEBHOOK_VARIABLE_OPTIONS: WebhookVariableOption[] = [
  // ─── Contato ─────────────────────────────────────────────
  { group: "Contato", token: "{{contact.id}}", label: "ID do contato" },
  { group: "Contato", token: "{{contact.name}}", label: "Nome" },
  { group: "Contato", token: "{{contact.email}}", label: "E-mail" },
  { group: "Contato", token: "{{contact.phone}}", label: "Telefone" },
  { group: "Contato", token: "{{contact.leadScore}}", label: "Lead score" },
  { group: "Contato", token: "{{contact.lifecycleStage}}", label: "Ciclo de vida" },
  { group: "Contato", token: "{{contact.source}}", label: "Origem (campo source)" },
  { group: "Contato", token: "{{contact.assignedToId}}", label: "ID do responsável" },
  { group: "Contato", token: "{{contact.companyId}}", label: "ID da empresa" },
  { group: "Contato", token: "{{contact.whatsappJid}}", label: "WhatsApp JID" },
  { group: "Contato", token: "{{contact.whatsappBsuid}}", label: "WhatsApp BSUID" },
  { group: "Contato", token: "{{contact.createdAt}}", label: "Criado em (ISO)" },

  // ─── Origem do anúncio (Meta CTWA) ───────────────────────
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adSourceId}}",
    label: "Source ID (post/ad)",
    hint: "Identificador retornado pela Meta no referral",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adSourceType}}",
    label: "Tipo da origem",
    hint: "ad | post",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adCtwaClid}}",
    label: "CTWA Click ID",
    hint: "Click identifier do Click-to-WhatsApp",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adHeadline}}",
    label: "Headline do anúncio",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adResolvedId}}",
    label: "Ad ID resolvido",
    hint: "Ad ID após resolver post→ad pela Marketing API",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adResolvedName}}",
    label: "Nome do anúncio resolvido",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adResolvedAdsetId}}",
    label: "Adset ID",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adResolvedAdsetName}}",
    label: "Adset name",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adResolvedCampaignId}}",
    label: "Campaign ID",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adResolvedCampaignName}}",
    label: "Campaign name",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adUtmSource}}",
    label: "utm_source",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adUtmMedium}}",
    label: "utm_medium",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adUtmCampaign}}",
    label: "utm_campaign",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adUtmContent}}",
    label: "utm_content",
  },
  {
    group: "Origem do anúncio (Meta CTWA)",
    token: "{{contact.adUtmTerm}}",
    label: "utm_term",
  },

  // ─── Negócio ─────────────────────────────────────────────
  { group: "Negócio", token: "{{deal.id}}", label: "ID do negócio" },
  { group: "Negócio", token: "{{deal.title}}", label: "Título" },
  { group: "Negócio", token: "{{deal.value}}", label: "Valor" },
  { group: "Negócio", token: "{{deal.status}}", label: "Status (OPEN/WON/LOST)" },
  { group: "Negócio", token: "{{deal.stageId}}", label: "ID do estágio" },
  { group: "Negócio", token: "{{deal.stageName}}", label: "Nome do estágio" },
  { group: "Negócio", token: "{{deal.pipelineId}}", label: "ID do pipeline" },
  { group: "Negócio", token: "{{deal.pipelineName}}", label: "Nome do pipeline" },
  { group: "Negócio", token: "{{deal.ownerId}}", label: "ID do responsável" },
  { group: "Negócio", token: "{{deal.createdAt}}", label: "Criado em (ISO)" },

  // ─── Conversa ────────────────────────────────────────────
  { group: "Conversa", token: "{{conversation.id}}", label: "ID da conversa" },
  { group: "Conversa", token: "{{conversation.channel}}", label: "Canal" },
  { group: "Conversa", token: "{{conversation.status}}", label: "Status" },
  {
    group: "Conversa",
    token: "{{conversation.assignedToId}}",
    label: "ID do responsável da conversa",
  },

  // ─── Tags ────────────────────────────────────────────────
  {
    group: "Tags",
    token: "{{contactTagNames}}",
    label: "Tags do contato (CSV)",
    hint: "Lista de nomes separados por vírgula",
  },
  {
    group: "Tags",
    token: "{{contactTagIds}}",
    label: "Tags do contato — IDs (CSV)",
  },
  {
    group: "Tags",
    token: "{{dealTagNames}}",
    label: "Tags do negócio (CSV)",
  },
  {
    group: "Tags",
    token: "{{dealTagIds}}",
    label: "Tags do negócio — IDs (CSV)",
  },

  // ─── Evento ──────────────────────────────────────────────
  {
    group: "Evento",
    token: "{{event}}",
    label: "Tipo do evento",
    hint: "ex.: message_received, contact_created, stage_changed",
  },
  { group: "Evento", token: "{{automationId}}", label: "ID da automação" },
  {
    group: "Evento",
    token: "{{data}}",
    label: "Payload do evento (JSON cru)",
    hint: "Útil pra debug — serializa o objeto inteiro",
  },
  {
    group: "Evento",
    token: "{{timestamp}}",
    label: "Timestamp ISO atual",
    hint: "Gerado no momento do disparo",
  },
];

export const WEBHOOK_VARIABLE_GROUPS: WebhookVariableGroup[] = [
  "Contato",
  "Origem do anúncio (Meta CTWA)",
  "Negócio",
  "Conversa",
  "Tags",
  "Evento",
];

export const DEFAULT_WEBHOOK_BODY_TEMPLATE = `{
  "event": "{{event}}",
  "contactId": "{{contact.id}}",
  "contact": {
    "name": "{{contact.name}}",
    "phone": "{{contact.phone}}",
    "email": "{{contact.email}}"
  },
  "ad": {
    "source_id": "{{contact.adSourceId}}",
    "ctwa_clid": "{{contact.adCtwaClid}}",
    "headline": "{{contact.adHeadline}}",
    "campaign_name": "{{contact.adResolvedCampaignName}}"
  },
  "dealId": "{{deal.id}}",
  "automationId": "{{automationId}}",
  "timestamp": "{{timestamp}}"
}`;
