/**
 * Auditoria visual completa — todas as rotas de /settings.
 * Light + dark, abas de modelos de mensagem, relatório DOM (legacy vs glass).
 *
 * Uso:
 *   node scripts/settings-visual-audit.mjs
 *   CRM_AUDIT_OUT=screenshots/settings-audit-v4 node scripts/settings-visual-audit.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = process.env.CRM_AUDIT_OUT
  ? path.isAbsolute(process.env.CRM_AUDIT_OUT)
    ? process.env.CRM_AUDIT_OUT
    : path.join(ROOT, process.env.CRM_AUDIT_OUT)
  : path.join(ROOT, "screenshots", "settings-audit-v4");
const BASE = process.env.CRM_BASE_URL ?? "http://localhost:3000";
const WAIT_MS = Number(process.env.CRM_AUDIT_SETTINGS_WAIT_MS ?? 4500);
const EMAIL = process.env.CRM_LOGIN_EMAIL ?? "adm@eduit.com.br";
const PASSWORD = process.env.CRM_LOGIN_PASSWORD ?? "Teste@123";

/** Rotas canônicas de settings (settings-nav.ts + hub). */
const SETTINGS_ROUTES = [
  { id: "00-hub", url: "/settings", label: "Hub configurações" },
  { id: "01-perfil", url: "/settings/profile?mock=1", label: "Perfil" },
  { id: "02-canais", url: "/settings/channels?mock=1", label: "Canais" },
  { id: "03-modelos-overview", url: "/settings/message-models?mock=1&tab=overview", label: "Modelos — visão geral" },
  { id: "03b-modelos-internos", url: "/settings/message-models?mock=1&tab=internal", label: "Modelos — internos" },
  { id: "03c-modelos-whatsapp", url: "/settings/message-models?mock=1&tab=whatsapp", label: "Modelos — WhatsApp" },
  { id: "03d-modelos-flows", url: "/settings/message-models?mock=1&tab=flows", label: "Modelos — Flows" },
  { id: "04-conversas", url: "/settings/conversations?mock=1", label: "Conversas" },
  { id: "05-notificacoes", url: "/settings/notifications?mock=1", label: "Notificações" },
  { id: "06-softphone", url: "/settings/softphone?mock=1", label: "Softphone" },
  { id: "07-contas-email", url: "/settings/email-accounts?mock=1", label: "Contas de e-mail" },
  { id: "08-campos", url: "/settings/custom-fields?mock=1", label: "Campos personalizados" },
  { id: "09-tags", url: "/settings/tags?mock=1", label: "Tags" },
  { id: "10-produtos", url: "/settings/products?mock=1", label: "Produtos" },
  { id: "11-catalogos", url: "/settings/catalogs?mock=1", label: "Catálogos" },
  { id: "12-pipeline", url: "/settings/pipeline?mock=1", label: "Pipeline (settings)" },
  { id: "13-motivos", url: "/settings/loss-reasons?mock=1", label: "Motivos de perda" },
  { id: "14-distribuicao", url: "/settings/distribution?mock=1", label: "Distribuição" },
  { id: "15-equipe", url: "/settings/team?mock=1", label: "Equipe" },
  { id: "16-horarios", url: "/settings/schedules?mock=1", label: "Horários" },
  { id: "18-ia", url: "/settings/ai?mock=1", label: "Config IA" },
  { id: "19-api", url: "/settings/api-tokens?mock=1", label: "API e Webhooks" },
  { id: "20-permissoes", url: "/settings/permissions?mock=1", label: "Permissões" },
  { id: "21-seguranca", url: "/settings/security?mock=1", label: "Segurança" },
  { id: "22-mobile", url: "/settings/mobile-layout?mock=1", label: "App Mobile" },
];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => {
    localStorage.setItem("page-mock", "1");
    localStorage.setItem("dir-mock", "1");
    localStorage.setItem("crm-v2-theme", "light");
    sessionStorage.setItem("crm:agent-status-auto-prompt", "1");
  });
  await page.waitForTimeout(2500);
  await dismissAgentStatusModal(page);
  return !page.url().includes("/login");
}

/** Fecha o modal global "Definir Status" que abre após login. */
async function dismissAgentStatusModal(page) {
  for (let i = 0; i < 3; i++) {
    const dialog = page.locator('[aria-label="Definir status"]');
    if ((await dialog.count()) === 0) return;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
}

async function setTheme(page, mode) {
  await page.evaluate((m) => {
    const root = document.documentElement;
    const isDark = m === "dark";
    root.classList.toggle("dark", isDark);
    root.classList.toggle("v2-dark", isDark);
    try {
      localStorage.setItem("crm-v2-theme", m);
    } catch {
      /* noop */
    }
  }, mode);
  await page.waitForTimeout(150);
}

async function auditDom(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const textSample = (main.innerText ?? "").slice(0, 800);
    const count = (sel) => main.querySelectorAll(sel).length;

    const bgWhite = count('[class*="bg-white"]');
    const bgCard = count('[class*="bg-card"]');
    const borderBorder = count('[class*="border-border"]');
    const shadcnCard = count('[data-slot="card"]');
    const glassPanel = count('[class*="glass-bg-panel"]');
    const glassStrong = count('[class*="glass-bg-strong"]');

    let glassNested = 0;
    main.querySelectorAll('[class*="glass-bg-panel"], [class*="glass-bg-strong"]').forEach((el) => {
      if (el.querySelector('[class*="glass-bg-panel"], [class*="glass-bg-strong"]')) glassNested++;
    });

    const hasShell = !!main.querySelector("h1");
    const hasBack = !!main.querySelector('a[aria-label*="Voltar"]');
    const hasNavRail = !!document.querySelector('[class*="nav-rail"], nav[aria-label*="Nav"]');
    const errorLike =
      /não foi possível|erro ao carregar|acesso restrito|403|404|something went wrong/i.test(textSample);

    const issues = [];
    if (bgWhite > 0) issues.push({ code: "BG_WHITE", count: bgWhite, severity: "P1" });
    if (bgCard > 0) issues.push({ code: "BG_CARD", count: bgCard, severity: "P1" });
    if (borderBorder > 2) issues.push({ code: "BORDER_BORDER", count: borderBorder, severity: "P2" });
    if (shadcnCard > 0) issues.push({ code: "SHADCN_CARD", count: shadcnCard, severity: "P0" });
    if (glassNested > 0) issues.push({ code: "GLASS_IN_GLASS", count: glassNested, severity: "P2" });
    if (errorLike) issues.push({ code: "ERROR_UI", count: 1, severity: "P0" });
    if (!hasShell && !window.location.pathname.endsWith("/settings")) {
      issues.push({ code: "NO_PAGE_HEADER", count: 1, severity: "P1" });
    }

    let score = 100;
    for (const i of issues) {
      if (i.severity === "P0") score -= 25;
      else if (i.severity === "P1") score -= 10;
      else score -= 5;
    }
    score = Math.max(0, score);

    return {
      bgWhite,
      bgCard,
      borderBorder,
      shadcnCard,
      glassPanel,
      glassStrong,
      glassNested,
      hasBack,
      hasNavRail,
      errorLike,
      issues,
      score,
      status: score >= 85 ? "conforme" : score >= 60 ? "parcial" : "legacy",
    };
  });
}

async function capture(page, route, theme) {
  const dir = path.join(OUT, theme);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${route.id}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function auditRoute(page, route, theme) {
  const url = `${BASE}${route.url}`;
  const waitMs = route.id === "21-seguranca" ? Math.max(WAIT_MS, 6000) : WAIT_MS;
  try {
    await setTheme(page, theme);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(waitMs);
    await dismissAgentStatusModal(page);
    await setTheme(page, theme);

    // Permissões — selecionar primeiro papel na lista
    if (route.id === "20-permissoes") {
      const firstRole = page.locator('[role="listitem"], [data-role-item], button').filter({ hasText: /admin|gestor|membro/i }).first();
      if (await firstRole.count()) await firstRole.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(800);
    }

    // Flow editor — abrir primeiro flow se existir link
    if (route.id === "03d-modelos-flows") {
      const flowLink = page.locator('a[href*="/settings/message-models/flows/"]').first();
      if (await flowLink.count()) {
        await flowLink.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(WAIT_MS);
        const dom = await auditDom(page);
        const shot = await capture(page, { ...route, id: "03e-flow-editor" }, theme);
        return {
          ...route,
          id: "03e-flow-editor",
          label: "Editor de Flow",
          url: page.url().replace(BASE, ""),
          theme,
          screenshot: shot,
          dom,
          ok: true,
        };
      }
    }

    const dom = await auditDom(page);
    const shot = await capture(page, route, theme);
    return { ...route, theme, screenshot: shot, dom, ok: true };
  } catch (err) {
    console.error(`  ✗ [${theme}] ${route.label}: ${err.message}`);
    return { ...route, theme, ok: false, error: err.message, dom: null };
  }
}

function buildMarkdown(report) {
  const lines = [
    "# Auditoria visual — Settings",
    "",
    `Gerado: ${report.generatedAt}`,
    `Base: ${report.baseUrl}`,
    "",
    "## Resumo",
    "",
    `| Status | Qtd |`,
    `|--------|-----|`,
    `| Conforme | ${report.summary.conforme} |`,
    `| Parcial | ${report.summary.parcial} |`,
    `| Legacy | ${report.summary.legacy} |`,
    `| Erro captura | ${report.summary.errors} |`,
    "",
    "## Detalhe (light mode)",
    "",
    "| Rota | Score | Status | Achados |",
    "|------|-------|--------|---------|",
  ];

  for (const r of report.results.filter((x) => x.theme === "light")) {
    const achados = r.dom?.issues?.map((i) => i.code).join(", ") || r.error || "—";
    lines.push(`| ${r.label} | ${r.dom?.score ?? "—"} | ${r.dom?.status ?? "erro"} | ${achados} |`);
  }

  lines.push("", "## Screenshots", "", `\`frontend/${path.relative(ROOT, OUT).replace(/\\/g, "/")}/light/\``, `\`.../dark/\``, "");
  return lines.join("\n");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`\n🔍 Auditoria Settings → ${OUT}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR",
  });
  const page = await context.newPage();

  const loggedIn = await login(page);
  console.log(loggedIn ? `✓ Login (${EMAIL})` : "⚠ Login falhou");

  const results = [];
  for (const route of SETTINGS_ROUTES) {
    console.log(`→ ${route.label}`);
    for (const theme of ["light", "dark"]) {
      const r = await auditRoute(page, route, theme);
      results.push(r);
      if (r.ok && r.dom) {
        console.log(`  ✓ ${theme} score=${r.dom.score} ${r.dom.status} ${r.dom.issues.map((i) => i.code).join(" ") || "OK"}`);
      }
    }
  }

  const lightResults = results.filter((r) => r.theme === "light" && r.dom);
  const summary = {
    conforme: lightResults.filter((r) => r.dom.status === "conforme").length,
    parcial: lightResults.filter((r) => r.dom.status === "parcial").length,
    legacy: lightResults.filter((r) => r.dom.status === "legacy").length,
    errors: results.filter((r) => !r.ok).length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    outputDir: OUT,
    summary,
    results,
  };

  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, "REPORT.md"), buildMarkdown(report));

  await browser.close();
  console.log(`\n✅ ${results.length} capturas | conforme=${summary.conforme} parcial=${summary.parcial} legacy=${summary.legacy}`);
  console.log(`   ${path.join(OUT, "REPORT.md")}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
