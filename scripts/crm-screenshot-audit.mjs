/**
 * Auditoria visual do CRM — captura screenshots de todas as rotas NavRail + Settings.
 * Uso: node scripts/crm-screenshot-audit.mjs [--phase=1|2|all]
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_BASE = process.env.CRM_AUDIT_OUT
  ? path.isAbsolute(process.env.CRM_AUDIT_OUT)
    ? process.env.CRM_AUDIT_OUT
    : path.join(ROOT, process.env.CRM_AUDIT_OUT)
  : path.join(ROOT, "screenshots", "crm-audit");
const BASE = process.env.CRM_BASE_URL ?? "http://localhost:3000";
const DEFAULT_WAIT_MS = Number(process.env.CRM_AUDIT_WAIT_MS ?? 1200);
const SETTINGS_WAIT_MS = Number(process.env.CRM_AUDIT_SETTINGS_WAIT_MS ?? 5000);
const EMAIL = process.env.CRM_LOGIN_EMAIL ?? "adm@eduit.com.br";
const PASSWORD = process.env.CRM_LOGIN_PASSWORD ?? "Teste@123";

const phaseArg = process.argv.find((a) => a.startsWith("--phase="));
const PHASE = phaseArg ? phaseArg.split("=")[1] : "all";

function slug(s) {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

async function shot(page, dir, name) {
  const folder = path.join(OUT_BASE, dir);
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  ✓ ${dir}/${name}.png`);
  return file;
}

async function gotoAndShot(page, dir, name, url, opts = {}) {
  const { waitMs = DEFAULT_WAIT_MS, waitUntil = "domcontentloaded", actions } = opts;
  try {
    await page.goto(`${BASE}${url}`, { waitUntil, timeout: 60000 });
    await page.waitForTimeout(waitMs);
    if (actions) await actions(page);
    await page.waitForTimeout(600);
    await shot(page, dir, name);
    return true;
  } catch (err) {
    console.error(`  ✗ ${url}: ${err.message}`);
    try {
      await shot(page, dir, `${name}--error`);
    } catch {
      /* ignore */
    }
    return false;
  }
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passInput = page.locator('input[type="password"]').first();
  await emailInput.fill(EMAIL);
  await passInput.fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const ok = !page.url().includes("/login");
  console.log(ok ? `✓ Login OK (${EMAIL})` : "✗ Login falhou — continuando mesmo assim");
  return ok;
}

async function enableMocks(page) {
  await page.evaluate(() => {
    localStorage.setItem("page-mock", "1");
    localStorage.setItem("dir-mock", "1");
  });
}

async function phase1(page) {
  const dir = "fase-1-navrail";
  console.log("\n━━━ FASE 1 — NavRail (exceto Settings) ━━━\n");

  const routes = [
    ["/dashboard?mock=1", "01-dashboard"],
    ["/pipeline?mock=1", "02-pipeline-kanban"],
    ["/pipeline/list?mock=1", "03-pipeline-lista"],
    ["/contacts?mock=1", "04-contatos-lista"],
    ["/companies?mock=1", "05-empresas-lista"],
    ["/inbox?mock=1", "06-inbox"],
    ["/activities?mock=1", "07-atividades"],
    ["/automations?mock=1", "08-automacoes"],
    ["/automations/auto-1?mock=1", "09-automacao-detalhe"],
    ["/automations/new?mock=1", "10-automacao-nova"],
    ["/automations/editor?mock=1", "11-automacao-editor"],
    ["/campaigns?mock=1", "12-campanhas"],
    ["/campaigns/camp-1?mock=1", "13-campanha-detalhe"],
    ["/campaigns/new?mock=1", "14-campanha-nova"],
    ["/campaigns/segments?mock=1", "15-campanhas-segmentos"],
    ["/widgets/distribution?mock=1", "16-distribuicao"],
    ["/logs?mock=1", "17-logs"],
    ["/widgets?mock=1", "18-widgets"],
    ["/email?mock=1", "19-email"],
    ["/calls?mock=1", "20-chamadas"],
  ];

  for (const [url, name] of routes) {
    await gotoAndShot(page, dir, name, url);
  }

  // Inbox — abrir conversa
  await gotoAndShot(page, dir, "06b-inbox-conversa", "/inbox?mock=1", {
    waitMs: 2000,
    actions: async (p) => {
      const card = p.locator('[data-testid="conversation-card"], article, [class*="conversation"]').first();
      if (await card.count()) await card.click({ timeout: 3000 }).catch(() => {});
    },
  });

  // Contato — modal novo
  await gotoAndShot(page, dir, "04b-contato-modal-novo", "/contacts?mock=1", {
    waitMs: 1500,
    actions: async (p) => {
      await p.getByRole("button", { name: /novo contato/i }).click({ timeout: 5000 }).catch(() => {});
    },
  });

  // Empresa — modal novo
  await gotoAndShot(page, dir, "05b-empresa-modal-nova", "/companies?mock=1", {
    waitMs: 1500,
    actions: async (p) => {
      await p.getByRole("button", { name: /nova empresa/i }).click({ timeout: 5000 }).catch(() => {});
    },
  });

  // Contato detalhe — primeiro link da lista
  await gotoAndShot(page, dir, "04c-contato-detalhe", "/contacts?mock=1", {
    waitMs: 1500,
    actions: async (p) => {
      const link = p.locator('a[href^="/contacts/"]').first();
      if (await link.count()) {
        const href = await link.getAttribute("href");
        if (href) await p.goto(`${BASE}${href}?mock=1`);
      }
    },
  });

  // Empresa detalhe
  await gotoAndShot(page, dir, "05c-empresa-detalhe", "/companies?mock=1", {
    waitMs: 1500,
    actions: async (p) => {
      const link = p.locator('a[href^="/companies/"]').first();
      if (await link.count()) {
        const href = await link.getAttribute("href");
        if (href) await p.goto(`${BASE}${href}?mock=1`);
      }
    },
  });

  // Pipeline — tentar abrir deal
  await gotoAndShot(page, dir, "02b-pipeline-deal", "/pipeline?mock=1", {
    waitMs: 2000,
    actions: async (p) => {
      const deal = p.locator('[data-deal-id], [class*="deal-card"], article').first();
      if (await deal.count()) await deal.click({ timeout: 3000 }).catch(() => {});
    },
  });

  // Criar contato preenchido (se modal abrir)
  try {
    await page.goto(`${BASE}/contacts?mock=1`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /novo contato/i }).click({ timeout: 5000 });
    await page.waitForTimeout(500);
    const nameInput = page.locator('input[name="name"], input[placeholder*="nome" i]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill("Contato QA Playwright");
      const emailIn = page.locator('input[type="email"], input[name="email"]').first();
      if (await emailIn.isVisible().catch(() => false)) {
        await emailIn.fill(`qa.playwright.${Date.now()}@example.com`);
      }
      const phoneIn = page.locator('input[name="phone"], input[placeholder*="telefone" i]').first();
      if (await phoneIn.isVisible().catch(() => false)) {
        await phoneIn.fill("+5511999001122");
      }
      await shot(page, dir, "04d-contato-form-preenchido");
      await page.getByRole("button", { name: /salvar|criar/i }).click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(2000);
      await shot(page, dir, "04e-contato-apos-salvar");
    }
  } catch (e) {
    console.error("  ✗ fluxo criar contato:", e.message);
  }

  // Campanhas — filtros
  await gotoAndShot(page, dir, "12b-campanhas-filtro-enviando", "/campaigns?mock=1", {
    waitMs: 1500,
    actions: async (p) => {
      await p.getByRole("tab", { name: /enviando/i }).click({ timeout: 3000 }).catch(() => {});
    },
  });

  // Automações — filtro ativas
  await gotoAndShot(page, dir, "08b-automacoes-ativas", "/automations?mock=1", {
    waitMs: 1500,
    actions: async (p) => {
      await p.getByRole("button", { name: /ativas/i }).click({ timeout: 3000 }).catch(() => {});
    },
  });

  // NavRail — screenshot de cada ícone via hover (dock)
  await gotoAndShot(page, dir, "00-navrail-overview", "/dashboard?mock=1");
}

async function phase2(page) {
  const dir = "fase-2-settings";
  console.log("\n━━━ FASE 2 — Settings ━━━\n");

  const settingsRoutes = [
    ["/settings", "00-settings-root"],
    ["/settings/profile?mock=1", "01-perfil"],
    ["/settings/channels?mock=1", "02-canais"],
    ["/settings/message-models?mock=1", "03-modelos-mensagem"],
    ["/settings/conversations?mock=1", "04-conversas"],
    ["/settings/notifications?mock=1", "05-notificacoes"],
    ["/settings/softphone?mock=1", "06-softphone"],
    ["/settings/email-accounts?mock=1", "07-contas-email"],
    ["/settings/custom-fields?mock=1", "08-campos-personalizados"],
    ["/settings/tags?mock=1", "09-tags"],
    ["/settings/products?mock=1", "10-produtos"],
    ["/settings/catalogs?mock=1", "11-catalogos"],
    ["/settings/pipeline?mock=1", "12-pipeline"],
    ["/settings/loss-reasons?mock=1", "13-motivos-perda"],
    ["/settings/distribution?mock=1", "14-distribuicao"],
    ["/settings/team?mock=1", "15-equipe"],
    ["/settings/schedules?mock=1", "16-horarios"],
    ["/ai-agents?mock=1", "17-ia-agentes"],
    ["/settings/ai?mock=1", "18-config-ia"],
    ["/settings/api-tokens?mock=1", "19-api-webhooks"],
    ["/settings/permissions?mock=1", "20-permissoes"],
    ["/settings/security?mock=1", "21-seguranca"],
    ["/settings/mobile-layout?mock=1", "22-app-mobile"],
    ["/developers?mock=1", "23-developers"],
    ["/analytics?mock=1", "24-analytics"],
    ["/reports?mock=1", "25-reports"],
    ["/job-openings?mock=1", "26-vagas"],
    ["/v2-permissions?mock=1", "27-v2-permissions"],
  ];

  for (const [url, name] of settingsRoutes) {
    await gotoAndShot(page, dir, name, url, {
      waitUntil: "networkidle",
      waitMs: SETTINGS_WAIT_MS,
    });
  }

  // Settings sidebar expandido
  await gotoAndShot(page, dir, "00b-settings-sidebar", "/settings/profile?mock=1", {
    waitUntil: "networkidle",
    waitMs: SETTINGS_WAIT_MS,
    actions: async (p) => {
      const toggle = p.locator('button[aria-label*="menu" i], button[aria-label*="config" i]').first();
      if (await toggle.count()) await toggle.click().catch(() => {});
    },
  });
}

async function main() {
  fs.mkdirSync(OUT_BASE, { recursive: true });
  console.log(`Base URL: ${BASE}`);
  console.log(`Saída: ${OUT_BASE}`);
  console.log(`Fase: ${PHASE}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR",
  });
  const page = await context.newPage();

  await login(page);
  await enableMocks(page);

  if (PHASE === "1" || PHASE === "all") await phase1(page);
  if (PHASE === "2" || PHASE === "all") await phase2(page);

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    phase: PHASE,
    folders: ["fase-1-navrail", "fase-2-settings"],
  };
  fs.writeFileSync(path.join(OUT_BASE, "manifest.json"), JSON.stringify(manifest, null, 2));

  await browser.close();
  console.log(`\n✅ Concluído. Screenshots em: ${OUT_BASE}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
