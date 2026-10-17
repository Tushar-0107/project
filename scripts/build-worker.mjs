import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = resolve(root, "dist");
const files = ["index.html", "app.js", "engine.js", "i18n.js", "style.css", "sw.js"];
const types = {
  "index.html": "text/html; charset=utf-8",
  "app.js": "text/javascript; charset=utf-8",
  "engine.js": "text/javascript; charset=utf-8",
  "i18n.js": "text/javascript; charset=utf-8",
  "style.css": "text/css; charset=utf-8",
  "sw.js": "text/javascript; charset=utf-8",
};
const assets = {};
for (const name of files) {
  assets[`/${name}`] = {
    type: types[name],
    body: await readFile(resolve(root, "web", name), "utf8"),
  };
}

const template = await readFile(resolve(root, "worker", "index.js"), "utf8");
const marker = "__FIELDWISE_ASSET_MAP__";
if (template.split(marker).length !== 2) throw new Error("Worker asset marker is missing or repeated.");
await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, "server"), { recursive: true });
await mkdir(resolve(dist, ".openai"), { recursive: true });
await writeFile(resolve(dist, "server", "index.js"), template.replace(marker, JSON.stringify(assets)));
await cp(resolve(root, ".openai", "hosting.json"), resolve(dist, ".openai", "hosting.json"));
await cp(resolve(root, "drizzle"), resolve(dist, ".openai", "drizzle"), { recursive: true });
console.log("Built Fieldwise Worker, embedded UI assets, D1 binding, and migrations.");
