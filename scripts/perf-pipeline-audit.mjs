/**
 * Live prod audit: pipeline views + deal card open network waterfall.
 * Usage: node scripts/perf-pipeline-audit.mjs
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = "https://frontend-front.v74knz.easypanel.host";
const EMAIL = "teste@cursor.com.br";
const PASSWORD = "123456@";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "perf-pipeline-audit-report.json");

function shortUrl(u) {
  try {
    const x = new URL(u);
    return x.pathname + x.search;
  } catch {
    return u.slice(0, 120);
  }
}

function isApi(url) {
  return /\/api\//.test(url) || /easypanel\.host/.test(url);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  // Try common selectors
  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]').first();
  const pass = page.locator('input[type="password"]').first();
  await email.waitFor({ timeout: 30000 });
  await email.fill(EMAIL);
  await pass.fill(PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 60000 }).catch(() => null),
    page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first().click(),
  ]);
  await page.waitForTimeout(2000);
}

function attachNetwork(page, bucket) {
  const pending = new Map();
  page.on("request", (req) => {
    const url = req.url();
    if (!isApi(url) && !url.includes("/_next/")) return;
    pending.set(req, { url, method: req.method(), start: Date.now(), resourceType: req.resourceType() });
  });
  page.on("response", async (res) => {
    const req = res.request();
    const meta = pending.get(req);
    if (!meta) return;
    pending.delete(req);
    let size = 0;
    try {
      const cl = res.headers()["content-length"];
      if (cl) size = Number(cl);
      else {
        const buf = await res.body().catch(() => null);
        if (buf) size = buf.length;
      }
    } catch {
      /* ignore */
    }
    bucket.push({
      url: shortUrl(meta.url),
      fullUrl: meta.url,
      method: meta.method,
      status: res.status(),
      durationMs: Date.now() - meta.start,
      sizeBytes: size,
      resourceType: meta.resourceType,
      timing: Date.now(),
    });
  });
  page.on("requestfailed", (req) => {
    const meta = pending.get(req);
    if (!meta) return;
    pending.delete(req);
    bucket.push({
      url: shortUrl(meta.url),
      method: meta.method,
      status: 0,
      durationMs: Date.now() - meta.start,
      sizeBytes: 0,
      failed: true,
      error: req.failure()?.errorText,
    });
  });
}

function summarize(entries) {
  const apis = entries.filter((e) => e.url.includes("/api/") || e.fullUrl?.includes("/api/"));
  const byPath = new Map();
  for (const e of apis) {
    const key = `${e.method} ${e.url.split("?")[0]}`;
    const prev = byPath.get(key) || { count: 0, totalMs: 0, maxMs: 0, totalBytes: 0, samples: [] };
    prev.count += 1;
    prev.totalMs += e.durationMs;
    prev.maxMs = Math.max(prev.maxMs, e.durationMs);
    prev.totalBytes += e.sizeBytes || 0;
    if (prev.samples.length < 5) prev.samples.push({ ms: e.durationMs, bytes: e.sizeBytes, url: e.url, status: e.status });
    byPath.set(key, prev);
  }
  const dupes = [...byPath.entries()]
    .filter(([, v]) => v.count > 1)
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.count - a.count);
  const slowest = [...apis].sort((a, b) => b.durationMs - a.durationMs).slice(0, 25);
  const heaviest = [...apis].sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0)).slice(0, 15);
  return { apiCount: apis.length, dupes, slowest, heaviest, apis };
}

async function measureRoute(page, path, label, consoleLogs) {
  const net = [];
  const onConsole = (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleLogs.push({ route: label, type: msg.type(), text: msg.text().slice(0, 300) });
    }
  };
  page.on("console", onConsole);
  attachNetwork(page, net);
  const t0 = Date.now();
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120000 }).catch(async () => {
    await page.waitForTimeout(8000);
  });
  await page.waitForTimeout(2500);
  const loadMs = Date.now() - t0;
  page.off("console", onConsole);
  return { label, path, loadMs, ...summarize(net), raw: net };
}

async function measureDealOpen(page, consoleLogs) {
  // Assume already on /pipeline
  const net = [];
  attachNetwork(page, net);
  const onConsole = (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleLogs.push({ route: "deal-open", type: msg.type(), text: msg.text().slice(0, 300) });
    }
  };
  page.on("console", onConsole);

  // Click first deal card
  const card = page.locator('[data-deal-id], [data-rbd-draggable-id], .deal-card, [class*="DealCard"]').first();
  // Fallback: click something that looks like a kanban card with a name
  let clicked = false;
  const selectors = [
    "[data-deal-id]",
    "[data-rbd-draggable-id]",
    '[class*="kanban"] [class*="card"]',
    'article',
  ];
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) > 0) {
      const t0 = Date.now();
      await loc.click({ timeout: 5000 }).catch(() => null);
      clicked = true;
      // Wait for panel APIs
      await page.waitForTimeout(8000);
      const openMs = Date.now() - t0;
      page.off("console", onConsole);
      const summary = summarize(net);
      // Focus on deal-panel related
      const panelRelevant = summary.apis.filter((e) =>
        /\/api\/(deals|contacts|conversations|messages|users|tags|channels|settings|sse)/i.test(e.url) ||
        /\/api\/conversations\//i.test(e.fullUrl || e.url),
      );
      return {
        label: "deal-open",
        selector: sel,
        openMs,
        clicked,
        panelRelevant: panelRelevant.sort((a, b) => a.timing - b.timing),
        ...summary,
        waterfall: panelRelevant.map((e) => ({
          tRel: e.timing,
          ms: e.durationMs,
          bytes: e.sizeBytes,
          method: e.method,
          url: e.url,
          status: e.status,
        })),
      };
    }
  }
  page.off("console", onConsole);
  return { label: "deal-open", clicked: false, error: "no deal card found", ...summarize(net) };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  const consoleLogs = [];

  console.log("Logging in...");
  await login(page);
  console.log("Logged in, URL:", page.url());

  // Cold loads
  const coldKanban = await measureRoute(page, "/pipeline", "cold-kanban", consoleLogs);
  console.log("cold-kanban", coldKanban.loadMs, "ms", coldKanban.apiCount, "apis");

  const dealOpen = await measureDealOpen(page, consoleLogs);
  console.log("deal-open", dealOpen.openMs, "ms", "apis", dealOpen.apiCount);

  // Warm kanban
  const warmKanban = await measureRoute(page, "/pipeline", "warm-kanban", consoleLogs);
  console.log("warm-kanban", warmKanban.loadMs, "ms");

  const coldFlow = await measureRoute(page, "/pipeline/flow", "cold-flow", consoleLogs);
  console.log("cold-flow", coldFlow.loadMs, "ms", coldFlow.apiCount, "apis");

  const coldList = await measureRoute(page, "/pipeline/list", "cold-list", consoleLogs);
  console.log("cold-list", coldList.loadMs, "ms", coldList.apiCount, "apis");

  // Second deal open from list if possible
  const dealOpen2Net = [];
  attachNetwork(page, dealOpen2Net);
  const row = page.locator("table tbody tr, [data-deal-id]").first();
  let dealOpenList = null;
  if ((await row.count()) > 0) {
    const t0 = Date.now();
    await row.click().catch(() => null);
    await page.waitForTimeout(7000);
    dealOpenList = { label: "deal-open-from-list", openMs: Date.now() - t0, ...summarize(dealOpen2Net) };
    console.log("deal-open-list", dealOpenList.openMs, "ms");
  }

  const report = {
    capturedAt: new Date().toISOString(),
    base: BASE,
    consoleLogs,
    coldKanban: stripRaw(coldKanban),
    warmKanban: stripRaw(warmKanban),
    coldFlow: stripRaw(coldFlow),
    coldList: stripRaw(coldList),
    dealOpen: stripRaw(dealOpen),
    dealOpenList: dealOpenList ? stripRaw(dealOpenList) : null,
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log("Wrote", OUT);
  await browser.close();
}

function stripRaw(obj) {
  if (!obj) return obj;
  const { raw, ...rest } = obj;
  // keep only API entries in a compact form
  if (raw) {
    rest.apiTimeline = summarize(raw).apis
      .sort((a, b) => (a.timing || 0) - (b.timing || 0))
      .map((e) => ({
        ms: e.durationMs,
        bytes: e.sizeBytes,
        method: e.method,
        status: e.status,
        url: e.url,
      }));
  }
  return rest;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
