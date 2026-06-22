import { chromium } from "playwright";

const ROUTES = [
  { id: "01-perfil", url: "/settings/profile?mock=1" },
  { id: "09-tags", url: "/settings/tags?mock=1" },
  { id: "21-seguranca", url: "/settings/security?mock=1" },
];
const BASE = process.env.CRM_BASE_URL ?? "http://localhost:3000";

async function auditDom(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const count = (sel) => main.querySelectorAll(sel).length;
    const bgWhite = count('[class*="bg-white"]');
    const bgCard = count('[class*="bg-card"]');
    const borderBorder = count('[class*="border-border"]');
    let glassNested = 0;
    main.querySelectorAll('[class*="glass-bg-panel"], [class*="glass-bg-strong"]').forEach((el) => {
      if (el.querySelector('[class*="glass-bg-panel"], [class*="glass-bg-strong"]')) glassNested++;
    });
    let score = 100;
    if (bgWhite > 0) score -= 10;
    if (bgCard > 0) score -= 10;
    if (borderBorder > 2) score -= 5;
    if (glassNested > 0) score -= 5;
    return { bgWhite, bgCard, borderBorder, glassNested, score };
  });
}

async function dismissModal(page) {
  for (let i = 0; i < 3; i++) {
    if ((await page.locator('[aria-label="Definir status"]').count()) === 0) return;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.locator('input[type="email"]').first().fill("adm@eduit.com.br");
await page.locator('input[type="password"]').first().fill("Teste@123");
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(2500);
await page.evaluate(() => {
  sessionStorage.setItem("crm:agent-status-auto-prompt", "1");
  localStorage.setItem("page-mock", "1");
});
await dismissModal(page);

for (const r of ROUTES) {
  await page.goto(`${BASE}${r.url}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4500);
  await dismissModal(page);
  const dom = await auditDom(page);
  const title = (await page.locator("h1").first().textContent().catch(() => "?"))?.trim();
  console.log(`${r.id} | ${title} | score=${dom.score} | ${JSON.stringify(dom)}`);
}

await browser.close();
