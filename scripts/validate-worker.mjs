import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
await import(pathToFileURL(resolve(root, "web", "engine.js")));
await import(pathToFileURL(resolve(root, "web", "i18n.js")));
const i18n = globalThis.FIELDWISE_I18N;
assert.equal(typeof i18n.translate, "function");
assert.notEqual(i18n.translate("Make every resource count.", "hi"), "Make every resource count.");
assert.notEqual(i18n.translate("A clear record for every rupee.", "mr"), "A clear record for every rupee.");
assert.match(i18n.translate("Today on your farm", "hi"), /आज/);
assert.match(i18n.translate("Field journal", "mr"), /शेत/);
for (const phrase of [
  "Your farm, one clear next step at a time.",
  "Choose what matters most. Each mix stays within the land, cash and water limits you entered.",
  "Know the economics.",
  "Trust starts with transparency.",
  "Decisions worth keeping.",
  "Plans for farmers",
  "A quick record for today’s costs, water and harvest.",
  "Keep this decision.",
]) {
  assert.notEqual(i18n.translate(phrase, "hi"), phrase, "Hindi page copy should cover: " + phrase);
  assert.notEqual(i18n.translate(phrase, "mr"), phrase, "Marathi page copy should cover: " + phrase);
}
assert.equal(i18n.translate("35% of the entered allowance", "hi"), "आपकी दी हुई सीमा का 35%");
assert.equal(i18n.translate("My north field", "mr"), "My north field", "Farmer-entered text remains as written.");
const demoPlan = globalThis.FW.optimize(globalThis.FW.defaults);
assert.ok(demoPlan.best, "The default demonstration context should have a feasible plan.");
assert.equal(globalThis.FW.defaults.stage, "before");
assert.equal(globalThis.FW.defaults.profileComplete, false);
for (const option of Object.values(demoPlan.alternatives)) {
  assert.equal(option.feasible, true, "Every compared option must satisfy hard constraints.");
  assert.ok(option.cost <= globalThis.FW.defaults.budget);
  assert.ok(option.water <= globalThis.FW.defaults.water);
}
assert.ok(demoPlan.alternatives.economical.cost <= demoPlan.best.cost);
assert.ok(demoPlan.alternatives.waterwise.water <= demoPlan.best.water);
assert.ok(demoPlan.alternatives.returnFocused.mean >= demoPlan.best.mean);
assert.equal(globalThis.FW.optimize({ ...globalThis.FW.defaults, budget: 0, water: 0 }).best, null);
const workerPath = resolve(root, "dist", "server", "index.js");
const manifest = JSON.parse(await readFile(resolve(root, "dist", ".openai", "hosting.json"), "utf8"));
assert.equal(manifest.d1, "DB");
const source = await readFile(workerPath, "utf8");
const worker = (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)).default;
assert.equal(typeof worker.fetch, "function");

const dbRows = new Map();
const db = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async all() {
            const [userId] = args;
            return { results: [...dbRows.values()].filter(row => row.user_id === userId) };
          },
          async run() {
            const [userId, recordKey, payload] = args;
            dbRows.set(`${userId}:${recordKey}`, { user_id: userId, record_key: recordKey, payload_json: payload });
            return { success: true };
          },
        };
      },
    };
  },
};
const call = (path, { method = "GET", user = "farmer-a", body, dbBinding = db } = {}) => worker.fetch(
  new Request(`https://fieldwise.test${path}`, {
    method,
    headers: {
      ...(user ? { "oai-authenticated-user-id": user } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }),
  { DB: dbBinding, FIELDWISE_OWNER_USER_ID: "operator-account" },
);

const home = await worker.fetch(new Request("https://fieldwise.test/"), {});
assert.equal(home.status, 200);
assert.match(await home.text(), /Fieldwise/);
const appAsset = await worker.fetch(new Request("https://fieldwise.test/app.js"), {});
assert.equal(appAsset.status, 200);
assert.match(appAsset.headers.get("content-type"), /javascript/);
const appCode = await appAsset.text();
assert.match(appCode, /syncBackend/);
assert.match(appCode, /function journal\(/);
assert.match(appCode, /data-action-status/);
assert.match(appCode, /form.id==='journal-form'/);
assert.match(appCode, /Field journal/);
assert.match(appCode, /applyLanguage\(d\);d\.showModal\(\)/);
assert.match(appCode, /FIELDWISE_I18N\.translate/);
assert.match(await readFile(resolve(root, "web", "index.html"), "utf8"), /i18n\.js/);
const languageAsset = await worker.fetch(new Request("https://fieldwise.test/i18n.js"), {});
assert.equal(languageAsset.status, 200);
assert.match(languageAsset.headers.get("content-type"), /javascript/);
assert.match(await languageAsset.text(), /FIELDWISE_I18N/);
const serviceWorker = await readFile(resolve(root, "web", "sw.js"), "utf8");
assert.match(serviceWorker, /pathname\.startsWith\('\/api\/'\)/);
assert.equal((await worker.fetch(new Request("https://fieldwise.test/api/records"), { DB: db })).status, 401);
assert.equal((await call("/api/records", { user: null })).status, 401);
assert.deepEqual(await (await call("/api/session", { user: "operator-account" })).json(), { role: "operator" });
assert.deepEqual(await (await call("/api/session", { user: "farmer-a" })).json(), { role: "farmer" });
assert.equal((await call("/api/session", { user: null })).status, 401);
assert.equal((await call("/api/session", { method: "POST" })).status, 405);
assert.equal((await call("/api/records", { dbBinding: null })).status, 503);
assert.equal((await call("/api/records", { method: "POST" })).status, 405);
assert.equal((await call("/api/records", { method: "PUT", body: { key: "unknown", value: {} } })).status, 400);

const value = { name: "Test farm", area: 2 };
assert.equal((await call("/api/records", { method: "PUT", body: { key: "fw-context", value } })).status, 200);
assert.deepEqual((await (await call("/api/records")).json()).records["fw-context"], value);
assert.deepEqual((await (await call("/api/records", { user: "farmer-b" })).json()).records, {});
const fieldEntries = [{ id: "L-1", date: "2026-10-14", stage: "growing", water: 40, cost: 250 }];
assert.equal((await call("/api/records", { method: "PUT", body: { key: "fw-field-log", value: fieldEntries } })).status, 200);
assert.deepEqual((await (await call("/api/records")).json()).records["fw-field-log"], fieldEntries);
assert.deepEqual((await (await call("/api/records", { user: "farmer-b" })).json()).records, {});
const actionStatus = { moisture: { status: "done", at: "2026-10-14" } };
assert.equal((await call("/api/records", { method: "PUT", body: { key: "fw-action-status", value: actionStatus } })).status, 200);
assert.deepEqual((await (await call("/api/records")).json()).records["fw-action-status"], actionStatus);
const oversized = { key: "fw-context", value: { name: "x".repeat(270000) } };
assert.equal((await call("/api/records", { method: "PUT", body: oversized })).status, 413);
const migrationsPath = resolve(root, "dist", ".openai", "drizzle");
const migrationName = (await readdir(migrationsPath)).find(name => name.endsWith(".sql"));
assert.ok(migrationName, "A D1 schema migration must be packaged.");
const migration = await readFile(resolve(migrationsPath, migrationName), "utf8");
assert.match(migration, /CREATE TABLE `fieldwise_records`/);
const journal = JSON.parse(await readFile(resolve(migrationsPath, "meta", "_journal.json"), "utf8"));
assert.equal(journal.entries.length, 1);
assert.equal(journal.entries[0].tag, migrationName.replace(/\.sql$/, ""));
await readFile(resolve(migrationsPath, "meta", `${String(journal.entries[0].idx).padStart(4, "0")}_snapshot.json`), "utf8");
console.log("Worker/API checks passed: static assets, identity gate, user isolation, validation, size bound, and D1 migration.");
