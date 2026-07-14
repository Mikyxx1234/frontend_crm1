import { describe, expect, it } from "vitest";

import {
  deriveModuleScope,
  scopeAllowsAdmin,
  scopeAllowsOperate,
  scopeAllowsView,
} from "../permissao-efetiva";

describe("deriveModuleScope", () => {
  it("retorna 'total' para wildcard ADMIN", () => {
    expect(deriveModuleScope("deal", ["*"])).toBe("total");
    expect(deriveModuleScope("qualquer", ["*"])).toBe("total");
  });

  it("retorna 'nenhum' quando não há key do módulo (ausência = sem acesso)", () => {
    expect(deriveModuleScope("deal", [])).toBe("nenhum");
    expect(deriveModuleScope("deal", ["contact:view", "company:view"])).toBe(
      "nenhum",
    );
  });

  it("retorna 'ver' quando só há view", () => {
    expect(deriveModuleScope("deal", ["deal:view"])).toBe("ver");
  });

  it("retorna 'operar' quando há ação de escrita", () => {
    expect(deriveModuleScope("deal", ["deal:view", "deal:create"])).toBe(
      "operar",
    );
    expect(deriveModuleScope("deal", ["deal:edit"])).toBe("operar");
    expect(deriveModuleScope("conversation", ["conversation:reply"])).toBe(
      "operar",
    );
  });

  it("retorna 'total' para ações admin/destrutivas", () => {
    expect(deriveModuleScope("deal", ["deal:view", "deal:delete"])).toBe(
      "total",
    );
    expect(deriveModuleScope("pipeline", ["pipeline:manage"])).toBe("total");
    expect(deriveModuleScope("deal", ["deal:reassign_others"])).toBe("total");
  });

  it("não confunde módulos com prefixo parecido", () => {
    // "dealitem:delete" não deve elevar "deal"
    expect(deriveModuleScope("deal", ["dealitem:delete"])).toBe("nenhum");
  });
});

describe("helpers de escopo", () => {
  it("scopeAllowsView", () => {
    expect(scopeAllowsView("nenhum")).toBe(false);
    expect(scopeAllowsView("ver")).toBe(true);
    expect(scopeAllowsView("total")).toBe(true);
  });

  it("scopeAllowsOperate", () => {
    expect(scopeAllowsOperate("ver")).toBe(false);
    expect(scopeAllowsOperate("operar")).toBe(true);
    expect(scopeAllowsOperate("total")).toBe(true);
  });

  it("scopeAllowsAdmin", () => {
    expect(scopeAllowsAdmin("operar")).toBe(false);
    expect(scopeAllowsAdmin("total")).toBe(true);
  });
});
