const FIELDWISE_ASSETS = __FIELDWISE_ASSET_MAP__;

const recordKeys = new Set([
  "fw-context",
  "fw-plans",
  "fw-tasks",
  "fw-bills",
  "fw-subscription",
  "fw-field-log",
  "fw-action-status",
]);
const maxRecordBytes = 262144;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function validValue(key, value) {
  if (key === "fw-context" || key === "fw-subscription" || key === "fw-action-status") {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  return Array.isArray(value);
}

async function handleRecords(request, env) {
  const userId = request.headers.get("oai-authenticated-user-id");
  if (!userId || userId.length > 255) {
    return json({ error: "Sign in to sync your farm records." }, 401);
  }
  if (!env.DB) return json({ error: "Farm record storage is unavailable." }, 503);

  if (request.method === "GET") {
    try {
      const result = await env.DB
        .prepare("SELECT record_key, payload_json FROM fieldwise_records WHERE user_id = ?")
        .bind(userId)
        .all();
      const records = {};
      for (const row of result.results || []) {
        if (recordKeys.has(row.record_key)) records[row.record_key] = JSON.parse(row.payload_json);
      }
      return json({ records });
    } catch {
      return json({ error: "Could not load farm records." }, 500);
    }
  }

  if (request.method !== "PUT") {
    return json({ error: "Method not allowed." }, 405);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Send a JSON record." }, 415);
  }
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > maxRecordBytes) return json({ error: "Record is too large." }, 413);

  let input;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxRecordBytes) {
      return json({ error: "Record is too large." }, 413);
    }
    input = JSON.parse(text);
  } catch {
    return json({ error: "Send a valid JSON record." }, 400);
  }
  if (!recordKeys.has(input.key) || !validValue(input.key, input.value)) {
    return json({ error: "This farm record is not supported." }, 400);
  }
  const payload = JSON.stringify(input.value);
  try {
    await env.DB
      .prepare("INSERT INTO fieldwise_records (user_id, record_key, payload_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id, record_key) DO UPDATE SET payload_json = excluded.payload_json, updated_at = CURRENT_TIMESTAMP")
      .bind(userId, input.key, payload)
      .run();
    return json({ saved: true });
  } catch {
    return json({ error: "Could not save this farm record." }, 500);
  }
}

function handleSession(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  const userId = request.headers.get("oai-authenticated-user-id");
  if (!userId || userId.length > 255) return json({ error: "Sign in to use account features." }, 401);
  const isOwner = Boolean(env.FIELDWISE_OWNER_USER_ID) && userId === env.FIELDWISE_OWNER_USER_ID;
  return json({ role: isOwner ? "operator" : "farmer" });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/records") return handleRecords(request, env);
    if (url.pathname === "/api/session") return handleSession(request, env);
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);

    const assetPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const asset = FIELDWISE_ASSETS[assetPath];
    if (!asset) return new Response("Not found", { status: 404 });
    const headers = {
      "content-type": asset.type,
      "cache-control": assetPath === "/index.html" || assetPath === "/sw.js"
        ? "no-cache"
        : "public, max-age=300",
      "x-content-type-options": "nosniff",
    };
    if (assetPath === "/sw.js") headers["service-worker-allowed"] = "/";
    return new Response(asset.body, { headers });
  },
};
