/**
 * Ponte leve entre a UI lateral (ex.: Enviar produto do curso) e o
 * Composer do chat — sem prop-drilling pelo ContactAside.
 */

export const COMPOSER_INSERT_EVENT = "crm:composer-insert";

export function insertComposerText(text: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMPOSER_INSERT_EVENT, { detail: { text } }),
  );
}
