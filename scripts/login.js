const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { chromium } = require("playwright");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const LOGIN_URL = "https://salonboard.com/login/";
const ID = process.env.SALONBOARD_ID;
const PASSWORD = process.env.SALONBOARD_PASSWORD;
const HEADLESS = process.env.SALONBOARD_HEADLESS === "1";
const MANUAL_WAIT_MS = Number(process.env.SALONBOARD_MANUAL_WAIT_MS || "60000");
const AUTH_DIR = path.resolve(process.cwd(), ".auth");
const STATE_PATH = path.join(AUTH_DIR, "salonboard-state.json");
const META_PATH = path.join(AUTH_DIR, "salonboard-meta.json");
const LOGIN_COOLDOWN_MINUTES = Number(process.env.SALONBOARD_LOGIN_COOLDOWN_MINUTES || "30");
const FORCE_LOGIN = process.env.SALONBOARD_FORCE_LOGIN === "1";
const TOP_URL = "https://salonboard.com/CLP/bt/top/";
const GOTO_TIMEOUT_MS = Number(process.env.SALONBOARD_GOTO_TIMEOUT_MS || "45000");
const GOTO_WAIT_UNTIL = process.env.SALONBOARD_GOTO_WAIT_UNTIL || "domcontentloaded";
const GOTO_RETRIES = Math.max(1, Number(process.env.SALONBOARD_GOTO_RETRIES || "3"));
const USER_AGENT =
  process.env.SALONBOARD_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

if (!ID || !PASSWORD) {
  console.error("Missing SALONBOARD_ID or SALONBOARD_PASSWORD in env.");
  process.exit(1);
}

async function firstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      try {
        if (await locator.isVisible({ timeout: 1000 })) {
          return locator;
        }
      } catch {
        // Keep trying other selectors.
      }
    }
  }
  return null;
}

async function safeScreenshot(page, name) {
  try {
    fs.mkdirSync(path.resolve(process.cwd(), "tmp"), { recursive: true });
    await page.screenshot({ path: path.resolve(process.cwd(), "tmp", name), fullPage: true });
  } catch {
    // Ignore screenshot errors.
  }
}

function readMeta() {
  try {
    if (!fs.existsSync(META_PATH)) return {};
    return JSON.parse(fs.readFileSync(META_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeMeta(meta) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), "utf8");
}

function isInCooldown(meta) {
  if (!meta.lastLoginAttemptAt) return false;
  const elapsedMs = Date.now() - Number(meta.lastLoginAttemptAt);
  return elapsedMs < LOGIN_COOLDOWN_MINUTES * 60 * 1000;
}

function browserContextOptions(storageStatePath) {
  return {
    userAgent: USER_AGENT,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    ...(storageStatePath ? { storageState: storageStatePath } : {}),
  };
}

async function gotoWithRetries(page, url, label) {
  let lastError;
  for (let attempt = 1; attempt <= GOTO_RETRIES; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: GOTO_WAIT_UNTIL, timeout: GOTO_TIMEOUT_MS });
      return;
    } catch (error) {
      lastError = error;
      console.error(`${label}: goto attempt ${attempt}/${GOTO_RETRIES} failed: ${error.message}`);
      if (attempt < GOTO_RETRIES) {
        const backoffMs = 2000 * attempt;
        await page.waitForTimeout(backoffMs);
      }
    }
  }
  throw lastError;
}

async function isLoggedInWithCurrentContext(context) {
  const page = await context.newPage();
  try {
    await gotoWithRetries(page, TOP_URL, "session-check");
    await page.waitForTimeout(1500);
    return !page.url().includes("/login");
  } catch {
    return false;
  } finally {
    await page.close();
  }
}

async function runLogin() {
  const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 100 });
  const meta = readMeta();
  const hasState = fs.existsSync(STATE_PATH);
  const useSavedState = hasState && !FORCE_LOGIN;

  const context = await browser.newContext(
    browserContextOptions(useSavedState ? STATE_PATH : null)
  );

  try {
    if (useSavedState) {
      const loggedIn = await isLoggedInWithCurrentContext(context);
      if (loggedIn) {
        console.log("Existing session is valid. Skip re-login.");
        console.log(`Saved storageState: ${STATE_PATH}`);
        return;
      }
      console.log("Saved session is invalid/expired. Trying fresh login.");
    }

    if (!FORCE_LOGIN && isInCooldown(meta)) {
      const last = new Date(Number(meta.lastLoginAttemptAt)).toISOString();
      throw new Error(
        `Login cooldown active. Last attempt: ${last}. Wait ${LOGIN_COOLDOWN_MINUTES} minutes or set SALONBOARD_FORCE_LOGIN=1.`
      );
    }

    writeMeta({ ...meta, lastLoginAttemptAt: Date.now() });
    const page = await context.newPage();
    await gotoWithRetries(page, LOGIN_URL, "login");
    await safeScreenshot(page, "salonboard-before-login.png");

    const idInput = await firstVisible(page, [
      'input[name="loginId"]',
      'input[name="userId"]',
      'input[name="id"]',
      'input[autocomplete="username"]',
      'input[type="text"]',
      'input[type="email"]',
    ]);

    const passInput = await firstVisible(page, [
      'input[name="password"]',
      'input[name="passwd"]',
      'input[autocomplete="current-password"]',
      'input[type="password"]',
    ]);

    if (!idInput || !passInput) {
      throw new Error("Could not find login form fields.");
    }

    await idInput.fill(ID);
    await passInput.fill(PASSWORD);

    const submitButton = await firstVisible(page, [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("ログイン")',
      'a:has-text("ログイン")',
    ]);

    if (!submitButton) {
      throw new Error("Could not find login submit button.");
    }

    const humanLikeDelayMs = 1000 + Math.floor(Math.random() * 1500);
    await page.waitForTimeout(humanLikeDelayMs);
    await submitButton.click();
    await Promise.race([
      page.waitForURL((url) => !url.toString().includes("/login"), { timeout: 20000 }),
      page.waitForLoadState("networkidle", { timeout: 20000 }),
      page.waitForTimeout(5000),
    ]);

    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      console.log("Still on login page. Waiting for manual verification/captcha completion...");
      await page.waitForTimeout(MANUAL_WAIT_MS);
    }

    await safeScreenshot(page, "salonboard-after-login.png");
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    await context.storageState({ path: STATE_PATH });
    writeMeta({ ...meta, lastLoginSuccessAt: Date.now(), lastSavedStatePath: STATE_PATH });

    console.log(`Current URL: ${page.url()}`);
    console.log(`Saved storageState: ${STATE_PATH}`);
    console.log("If login did not complete, set SALONBOARD_HEADLESS=0 and try again.");
  } finally {
    await browser.close();
  }
}

module.exports = { runLogin };

if (require.main === module) {
  runLogin().catch((error) => {
    console.error("Login automation failed:", error.message);
    process.exit(1);
  });
}
