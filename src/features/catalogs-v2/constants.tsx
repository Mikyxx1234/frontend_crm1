"use client";

/**
 * Metadados de apresentação por capacidade (somente UI).
 *
 * O backend é a fonte da verdade do conjunto de capacidades, seus `label`,
 * `description` e JSON Schema (`GET /api/capabilities`). Ícone e "pergunta de
 * negócio" são puramente visuais e vivem aqui. Capacidade nova sem entrada
 * aqui cai num fallback neutro — continua aparecendo no wizard.
 */
import {
  IconAdjustmentsHorizontal,
  IconCalendarEvent,
  IconRepeat,
  IconRocket,
  IconStack2,
  IconTag,
  IconTruck,
  IconUsersGroup,
  type IconProps,
} from "@tabler/icons-react";
import type * as React from "react";

export type CapabilityMeta = {
  /** Pergunta de negócio (não cita tipo de produto). */
  question: string;
  /** Rótulo curto para chips na listagem. */
  short: string;
  icon: React.ComponentType<IconProps>;
};

export const CAPABILITY_META: Record<string, CapabilityMeta> = {
  allocation: {
    question: "Tem limite de disponibilidade?",
    short: "Disponibilidade",
    icon: IconStack2,
  },
  scheduling: {
    question: "É agendado?",
    short: "Agendamento",
    icon: IconCalendarEvent,
  },
  recurrence: {
    question: "Cobra de forma recorrente?",
    short: "Recorrência",
    icon: IconRepeat,
  },
  shipping: {
    question: "Tem entrega física?",
    short: "Frete",
    icon: IconTruck,
  },
  fulfillment: {
    question: "Gera operação após a venda?",
    short: "Operação",
    icon: IconRocket,
  },
  pricing: {
    question: "O preço varia?",
    short: "Preços",
    icon: IconTag,
  },
  stakeholders: {
    question: "Tem participantes externos?",
    short: "Participantes",
    icon: IconUsersGroup,
  },
  custom_data: {
    question: "Precisa de campos personalizados?",
    short: "Campos",
    icon: IconAdjustmentsHorizontal,
  },
};

const FALLBACK: CapabilityMeta = {
  question: "",
  short: "Capacidade",
  icon: IconAdjustmentsHorizontal,
};

export function capabilityMeta(key: string): CapabilityMeta {
  return CAPABILITY_META[key] ?? FALLBACK;
}
