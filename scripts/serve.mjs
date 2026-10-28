#!/usr/bin/env node
// Zero-dependency static file server for local development.
// Usage: npm start            (http://localhost:8080)
//        PORT=3000 npm start
// Also accepts PUT /locales/<code>.json and /locales/data/<code>.json from this machine only,
// so the translation editor (translate.html) can save catalogs straight to disk.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG } from "../src/config.js";
import { serializeCatalog } from "../src/i18n/catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 8080;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".csv": "text/csv; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".md": "text/markdown; charset=utf-8"
};

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const MAX_BODY = 1024 * 1024;

/** Save a catalog sent by the translation editor, normalized to the canonical file format. */
function saveLocale(req, res, code, isData) {
  const reply = (status, message) => res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" }).end(message);
  if (!LOOPBACK.has(req.socket.remoteAddress)) return reply(403, "Saving is only allowed from localhost");
  if (!CONFIG.locales.includes(code)) return reply(404, `Unknown locale "${code}"`);
  if (isData && code === CONFIG.sourceLocale) return reply(404, `${code} data text lives in data/*.csv`);
  let body = "";
  req.setEncoding("utf8");
  req.on("data", chunk => {
    body += chunk;
    if (body.length > MAX_BODY) { reply(413, "Too large"); req.destroy(); }
  });
  req.on("end", () => {
    let catalog;
    try { catalog = JSON.parse(body); } catch { return reply(400, "Invalid JSON"); }
    const strings = catalog?.strings;
    if ((!isData && !catalog?.meta) || !strings || typeof strings !== "object" || !Object.values(strings).every(v => typeof v === "string")) {
      return reply(400, isData ? "Expected { strings: { key: text } }" : "Expected { meta, strings: { key: text } }");
    }
    const rel = path.join(CONFIG.localesUrl, isData ? "data" : "", `${code}.json`);
    fs.writeFile(path.join(root, rel), serializeCatalog(isData ? { strings } : catalog), err => {
      if (err) return reply(500, String(err.message));
      console.log(`saved ${rel}`);
      reply(204, "");
    });
  });
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const file = path.normalize(path.join(root, urlPath === "/" ? "index.html" : urlPath));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (req.method === "PUT") {
    const match = urlPath.match(new RegExp(`^/${CONFIG.localesUrl}/(data/)?([\\w-]+)\\.json$`));
    if (match) saveLocale(req, res, match[2], Boolean(match[1]));
    else res.writeHead(405).end();
    return;
  }
  fs.readFile(file, (err, body) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" }).end(body);
  });
}).listen(port, () => console.log(`Dimensional Election → http://localhost:${port}`));
