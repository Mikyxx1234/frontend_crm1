import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://frontend-front.v74knz.easypanel.host";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "perf-deal-open-report.json");

function short(u) {
  try {
    const x = new URL(u);
    return x.pathname + x.search;
  } catch {
    return String(u).slice(0, 160);
  }
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill("teste@cursor.com.br");
  await page.locator('input[type="password"]').first().fill("123456@");
  await page.locator('button[type="submit"]').first().click();
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(800);
    if (!page.url().includes("/login")) break;
  }
  if (page.url().includes("/login")) throw new Error("login failed");
  console.log("in", page.url());
}

async function capture(page, label, url, entries) {
  entries.length = 0;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(10000);

  const cardSel = 'a[aria-label^="Abrir negócio"]';
  const hrefSel = 'a[href*="deal="]';
  let cards = await page.locator(cardSel).count();
  console.log(label, "cards", cards, "hrefs", await page.locator(hrefSel).count());

  const t0 = Date.now();
  if (cards > 0) {
    await page.locator(cardSel).first().click();
  } else if ((await page.locator(hrefSel).count()) > 0) {
    await page.locator(hrefSel).first().click();
  } else {
    // Flow queue: click first deal-looking block by text pattern #NNNNN
    const hit = page.getByText(/#\d{4,}/).first();
    if ((await hit.count()) > 0) await hit.click();
    else return { label, error: "no click target", waterfall: [] };
  }
  await page.waitForTimeout(10000);
  const openMs = Date.now() - t0;
  const apis = entries
    .filter((e) => e.t >= t0 - 30)
    .sort((a, b) => a.t - b.t)
    .map((e) => ({
      ms: e.ms,
      bytes: e.bytes,
      status: e.status,
      method: e.method,
      url: e.url,
      tRel: e.t - t0,
    }));
  return {
    label,
    openMs,
    apiCount: apis.length,
    deals: apis.filter((e) => /\/api\/deals\/[^/?]+/.test(e.url) && !e.url.includes("board")),
    contacts: apis.filter((e) => e.url.includes("/api/contacts/")),
    conversations: apis.filter((e) => e.url.includes("/conversations")),
    messages: apis.filter((e) => e.url.includes("/messages")),
    slowest: [...apis].sort((a, b) => b.ms - a.ms).slice(0, 15),
    heaviest: [...apis].sort((a, b) => b.bytes - a.bytes).slice(0, 10),
    dupes: Object.entries(
      apis.reduce((acc, e) => {
        const k = `${e.method} ${e.url.split("?")[0]}`;
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {}),
    )
      .filter(([, c]) => c > 1)
      .map(([k, c]) => ({ key: k, count: c })),
    waterfall: apis,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const entries = [];
  const pending = new Map();
  page.on("request", (req) => {
    if (!req.url().includes("/api/")) return;
    pending.set(req, Date.now());
  });
  page.on("response", async (res) => {
    const req = res.request();
    const start = pending.get(req);
    if (start == null) return;
    pending.delete(req);
    let size = Number(res.headers()["content-length"] || 0);
    if (!size) {
      try {
        size = (await res.body())?.length ?? 0;
      } catch {
        /* */
      }
    }
    entries.push({
      method: req.method(),
      url: short(req.url()),
      status: res.status(),
      ms: Date.now() - start,
      bytes: size,
      t: Date.now(),
    });
  });

  await login(page);
  const kanban = await capture(page, "kanban", `${BASE}/pipeline`, entries);
  console.log("kanban", kanban.openMs, "apis", kanban.apiCount, "msgs", kanban.messages?.map((m) => `${m.ms}ms ${m.bytes}b ${m.url}`));
  const flow = await capture(page, "flow", `${BASE}/pipeline/flow`, entries);
  console.log("flow", flow.openMs, "apis", flow.apiCount, "convs", flow.conversations, "msgs", flow.messages?.map((m) => `${m.ms}ms ${m.bytes}b`));
  const list = await capture(page, "list", `${BASE}/pipeline/list`, entries);
  console.log("list", list.openMs, "apis", list.apiCount);

  writeFileSync(OUT, JSON.stringify({ capturedAt: new Date().toISOString(), note: "Baseline CURRENT prod", kanban, flow, list }, null, 2));
  console.log("Wrote", OUT);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
