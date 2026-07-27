import { describe, expect, it } from "vitest";

import {
  isTrackableElement,
  isTrackableKey,
  matchesInteractiveSelector,
  INTERACTIVE_SELECTOR,
} from "./activity-target";

describe("activity-target — classificação", () => {
  it("isTrackableElement: controles interativos", () => {
    expect(isTrackableElement("BUTTON")).toBe(true);
    expect(isTrackableElement("A")).toBe(true);
    expect(isTrackableElement("INPUT")).toBe(true);
    expect(isTrackableElement("TEXTAREA")).toBe(true);
    expect(isTrackableElement("SELECT")).toBe(true);
    expect(isTrackableElement("LABEL")).toBe(true);
    expect(isTrackableElement("OPTION")).toBe(true);
    expect(isTrackableElement("SUMMARY")).toBe(true);
  });

  it("isTrackableElement: elementos não interativos", () => {
    expect(isTrackableElement("DIV")).toBe(false);
    expect(isTrackableElement("SPAN")).toBe(false);
    expect(isTrackableElement("SECTION")).toBe(false);
    expect(isTrackableElement("P")).toBe(false);
  });

  it("isTrackableKey: teclas que alteram conteúdo", () => {
    expect(isTrackableKey({ key: "a", ctrlKey: false, metaKey: false })).toBe(
      true,
    );
    expect(isTrackableKey({ key: "Z", ctrlKey: false, metaKey: false })).toBe(
      true,
    );
    expect(isTrackableKey({ key: "1", ctrlKey: false, metaKey: false })).toBe(
      true,
    );
    expect(
      isTrackableKey({ key: "Backspace", ctrlKey: false, metaKey: false }),
    ).toBe(true);
    expect(
      isTrackableKey({ key: "Delete", ctrlKey: false, metaKey: false }),
    ).toBe(true);
    expect(
      isTrackableKey({ key: "Enter", ctrlKey: false, metaKey: false }),
    ).toBe(true);
    expect(isTrackableKey({ key: " ", ctrlKey: false, metaKey: false })).toBe(
      true,
    );
  });

  it("isTrackableKey: teclas que NÃO alteram conteúdo", () => {
    expect(
      isTrackableKey({ key: "Shift", ctrlKey: false, metaKey: false }),
    ).toBe(false);
    expect(
      isTrackableKey({ key: "Control", ctrlKey: false, metaKey: false }),
    ).toBe(false);
    expect(isTrackableKey({ key: "Alt", ctrlKey: false, metaKey: false })).toBe(
      false,
    );
    expect(
      isTrackableKey({ key: "Meta", ctrlKey: false, metaKey: false }),
    ).toBe(false);
    expect(
      isTrackableKey({ key: "ArrowUp", ctrlKey: false, metaKey: false }),
    ).toBe(false);
    expect(
      isTrackableKey({ key: "ArrowDown", ctrlKey: false, metaKey: false }),
    ).toBe(false);
    expect(
      isTrackableKey({ key: "ArrowLeft", ctrlKey: false, metaKey: false }),
    ).toBe(false);
    expect(
      isTrackableKey({ key: "ArrowRight", ctrlKey: false, metaKey: false }),
    ).toBe(false);
    expect(isTrackableKey({ key: "Tab", ctrlKey: false, metaKey: false })).toBe(
      false,
    );
    expect(
      isTrackableKey({ key: "Escape", ctrlKey: false, metaKey: false }),
    ).toBe(false);
    expect(
      isTrackableKey({ key: "PageUp", ctrlKey: false, metaKey: false }),
    ).toBe(false);
  });

  it("isTrackableKey: ignora atalhos (ctrl/meta)", () => {
    expect(isTrackableKey({ key: "a", ctrlKey: true, metaKey: false })).toBe(
      false,
    );
    expect(isTrackableKey({ key: "s", ctrlKey: false, metaKey: true })).toBe(
      false,
    );
  });

  it("selector cobre botão, link, input, textarea, select, contenteditable", () => {
    // Sanity: garante presença dos tokens no selector consumido pelo hook.
    expect(INTERACTIVE_SELECTOR).toContain("button");
    expect(INTERACTIVE_SELECTOR).toContain("a[href]");
    expect(INTERACTIVE_SELECTOR).toContain("input");
    expect(INTERACTIVE_SELECTOR).toContain("textarea");
    expect(INTERACTIVE_SELECTOR).toContain("select");
    expect(INTERACTIVE_SELECTOR).toContain('[contenteditable="true"]');
    expect(INTERACTIVE_SELECTOR).toContain('[role="button"]');
    expect(INTERACTIVE_SELECTOR).toContain('[role="menuitem"]');
    expect(INTERACTIVE_SELECTOR).toContain('[role="tab"]');
    expect(INTERACTIVE_SELECTOR).toContain('[role="link"]');
  });

  it("matchesInteractiveSelector: aceita tokens conhecidos", () => {
    expect(matchesInteractiveSelector('button', "button")).toBe(true);
    expect(matchesInteractiveSelector('a[href]', "a[href]")).toBe(true);
    expect(matchesInteractiveSelector('foo', "button")).toBe(false);
  });
});
