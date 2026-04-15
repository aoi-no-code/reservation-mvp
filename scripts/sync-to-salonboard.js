const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUTH_DIR = path.resolve(process.cwd(), ".auth");
const STATE_PATH = path.join(AUTH_DIR, "salonboard-sync-state.json");
const STYLIST_MAP = JSON.parse(process.env.SALONBOARD_STYLIST_MAP_JSON || "{}");
const COMMIT = process.env.SALONBOARD_RESERVE_COMMIT === "1";
const LOOKBACK_HOURS = Number(process.env.SALONBOARD_SYNC_LOOKBACK_HOURS || "72");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

function readState() {
  try {
    if (!fs.existsSync(STATE_PATH)) return { syncedReservationIds: [] };
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { syncedReservationIds: [] };
  }
}

function writeState(state) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function jstDateTimeParts(isoString) {
  const date = new Date(isoString);
  const fmt = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return {
    date: `${parts.year}${parts.month}${parts.day}`,
    time: `${parts.hour}${parts.minute}`,
    timestamp: `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`,
  };
}

function buildReserveUrl(baseTemplate, slotStartAt, externalStylistId) {
  const dt = jstDateTimeParts(slotStartAt);
  return baseTemplate
    .replace("{date}", dt.date)
    .replace("{time}", dt.time)
    .replace("{stylistId}", externalStylistId)
    .replace("{rlastupdate}", dt.timestamp);
}

function runReserveJob(job) {
  const env = {
    ...process.env,
    SALONBOARD_RESERVE_URL: job.reserveUrl,
    SALONBOARD_CUSTOMER_NAME: job.name || "",
    SALONBOARD_CUSTOMER_PHONE: job.phone || "",
    SALONBOARD_CUSTOMER_NOTE: job.note || "",
    SALONBOARD_RESERVE_COMMIT: COMMIT ? "1" : "0",
  };
  const result = spawnSync("node", ["scripts/reserve.js"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env,
  });
  return result.status === 0;
}

async function main() {
  const urlTemplate = process.env.SALONBOARD_RESERVE_URL_TEMPLATE;
  if (!urlTemplate) {
    throw new Error("Missing SALONBOARD_RESERVE_URL_TEMPLATE in env.");
  }

  const lookbackDate = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("reservations")
    .select("id,name,phone,menu_note,confirmed_at,slot_id,slots!inner(start_at,stylist_id)")
    .not("confirmed_at", "is", null)
    .gte("confirmed_at", lookbackDate)
    .order("confirmed_at", { ascending: true })
    .limit(50);

  if (error) throw error;

  const state = readState();
  const done = new Set(state.syncedReservationIds || []);
  const rows = data || [];

  let syncedCount = 0;
  for (const row of rows) {
    if (done.has(row.id)) continue;
    const slot = Array.isArray(row.slots) ? row.slots[0] : row.slots;
    const internalStylistId = slot?.stylist_id;
    const externalStylistId = STYLIST_MAP[internalStylistId];
    if (!externalStylistId) {
      console.log(`Skip ${row.id}: stylist mapping missing (${internalStylistId})`);
      continue;
    }

    const reserveUrl = buildReserveUrl(urlTemplate, slot.start_at, externalStylistId);
    console.log(`Sync reservation ${row.id} -> ${reserveUrl}`);
    const ok = runReserveJob({
      reserveUrl,
      name: row.name,
      phone: row.phone,
      note: row.menu_note || "",
    });
    if (!ok) {
      console.log(`Failed reservation sync: ${row.id}`);
      continue;
    }

    done.add(row.id);
    syncedCount += 1;
    writeState({ syncedReservationIds: Array.from(done) });
  }

  console.log(`Sync finished. success=${syncedCount}`);
}

main().catch((error) => {
  console.error("Sync failed:", error.message);
  process.exit(1);
});
