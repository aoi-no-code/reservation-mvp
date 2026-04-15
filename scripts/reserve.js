const path = require("path");
const dotenv = require("dotenv");
const { chromium } = require("playwright");
const { runLogin } = require("./login");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const AUTH_STATE_PATH = path.resolve(process.cwd(), ".auth", "salonboard-state.json");
const RESERVE_URL = process.env.SALONBOARD_RESERVE_URL || process.argv[2] || "";
const HEADLESS = process.env.SALONBOARD_HEADLESS === "1";
const COMMIT = process.env.SALONBOARD_RESERVE_COMMIT === "1";
const DEBUG_FIELDS = process.env.SALONBOARD_DEBUG_FIELDS === "1";

const CUSTOMER = {
  name: process.env.SALONBOARD_CUSTOMER_NAME || "",
  kana: process.env.SALONBOARD_CUSTOMER_KANA || "",
  phone: process.env.SALONBOARD_CUSTOMER_PHONE || "",
  email: process.env.SALONBOARD_CUSTOMER_EMAIL || "",
  note: process.env.SALONBOARD_CUSTOMER_NOTE || "",
};

function splitName(fullName) {
  const normalized = (fullName || "").trim().replace(/\s+/g, " ");
  if (!normalized) return { sei: "", mei: "" };
  const parts = normalized.split(" ");
  if (parts.length === 1) return { sei: normalized, mei: "" };
  return { sei: parts[0], mei: parts.slice(1).join(" ") };
}

function requireReserveUrl() {
  if (!RESERVE_URL) {
    throw new Error(
      "Missing reserve URL. Set SALONBOARD_RESERVE_URL in env or pass URL as first argument."
    );
  }
}

async function firstVisible(page, selectors, timeoutMs = 1200) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (!(await locator.count())) continue;
    try {
      if (await locator.isVisible({ timeout: timeoutMs })) return locator;
    } catch {
      // Ignore and continue.
    }
  }
  return null;
}

async function maybeFill(page, selectors, value) {
  if (!value) return false;
  for (const selector of selectors) {
    const input = page.locator(selector).first();
    if (!(await input.count())) continue;
    try {
      if (!(await input.isVisible({ timeout: 800 }))) continue;
      if (!(await input.isEditable({ timeout: 800 }))) continue;
      await input.fill(value);
      return true;
    } catch {
      // Continue to next selector when not editable.
    }
  }
  return false;
}

async function clickFirst(page, selectors) {
  const button = await firstVisible(page, selectors);
  if (!button) return false;
  await button.click();
  return true;
}

async function runReserve() {
  requireReserveUrl();

  // 先にログインを実行（有効セッションなら再ログインしない）
  await runLogin();

  const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 80 });
  const context = await browser.newContext({ storageState: AUTH_STATE_PATH });
  const page = await context.newPage();

  try {
    await page.goto(RESERVE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1500);
    if (DEBUG_FIELDS) {
      const editableFields = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll("input, textarea, select"));
        return nodes
          .filter((node) => {
            const anyNode = node;
            return !anyNode.disabled && !anyNode.readOnly;
          })
          .map((node) => ({
            tag: node.tagName.toLowerCase(),
            type: "type" in node ? (node.type || "") : "",
            name: node.getAttribute("name") || "",
            id: node.getAttribute("id") || "",
            className: node.getAttribute("class") || "",
          }));
      });
      console.log("Editable fields:", JSON.stringify(editableFields, null, 2));
    }


    if (page.url().includes("/login")) {
      throw new Error("Session expired. Login is required again.");
    }

    const filled = [];
    const name = splitName(CUSTOMER.name);
    const kana = splitName(CUSTOMER.kana);
    if (
      await maybeFill(page, [
        'input[name="customerName"]',
        'input[name="name"]',
        'input[name="sei"]',
        'input[name="mei"]',
      ], CUSTOMER.name)
    ) {
      filled.push("name");
    }
    if (await maybeFill(page, ['input[name="nmSei"]', '#nmSei'], name.sei)) {
      filled.push("nmSei");
    }
    if (await maybeFill(page, ['input[name="nmMei"]', '#nmMei'], name.mei)) {
      filled.push("nmMei");
    }
    if (
      await maybeFill(
        page,
        ['input[name="customerNameKana"]', 'input[name="kana"]', 'input[name*="kana"]'],
        CUSTOMER.kana
      )
    ) {
      filled.push("kana");
    }
    if (await maybeFill(page, ['input[name="nmSeiKana"]', '#nmSeiKana'], kana.sei)) {
      filled.push("nmSeiKana");
    }
    if (await maybeFill(page, ['input[name="nmMeiKana"]', '#nmMeiKana'], kana.mei)) {
      filled.push("nmMeiKana");
    }
    if (
      await maybeFill(page, ['input[name="tel"]', 'input[name="phone"]', 'input[type="tel"]'], CUSTOMER.phone)
    ) {
      filled.push("phone");
    }
    if (
      await maybeFill(
        page,
        ['input[name="mail"]', 'input[name="email"]', 'input[type="email"]'],
        CUSTOMER.email
      )
    ) {
      filled.push("email");
    }
    if (
      await maybeFill(
        page,
        ['textarea[name="rsvEtc"]', '#rsvEtc', 'textarea[name="memo"]', 'textarea[name="note"]', "textarea"],
        CUSTOMER.note
      )
    ) {
      filled.push("note");
    }

    console.log(`Filled fields: ${filled.join(", ") || "(none matched)"}`);

    // 確認画面へ進む
    const moved = await clickFirst(page, [
      'button:has-text("確認")',
      'button:has-text("次へ")',
      'input[type="submit"]',
      'button[type="submit"]',
    ]);
    if (moved) {
      await Promise.race([
        page.waitForLoadState("networkidle", { timeout: 15000 }),
        page.waitForTimeout(3000),
      ]);
    }

    if (!COMMIT) {
      console.log("Dry-run mode. Set SALONBOARD_RESERVE_COMMIT=1 to execute final save.");
      console.log(`Current URL: ${page.url()}`);
      return;
    }

    const saved = await clickFirst(page, [
      'button:has-text("保存")',
      'button:has-text("登録")',
      'button:has-text("予約する")',
      'button:has-text("確定")',
      'input[type="submit"]',
      'button[type="submit"]',
    ]);
    if (!saved) {
      throw new Error("Could not find final save button on reservation page.");
    }

    await Promise.race([
      page.waitForLoadState("networkidle", { timeout: 20000 }),
      page.waitForTimeout(4000),
    ]);

    console.log("Reservation save flow executed.");
    console.log(`Current URL: ${page.url()}`);
  } finally {
    await browser.close();
  }
}

runReserve().catch((error) => {
  console.error("Reserve automation failed:", error.message);
  process.exit(1);
});
