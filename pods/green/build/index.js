// @bun
// src/index.ts
var {postgres } = globalThis.Bun;
import { compress } from "snappy";
var port = process.env.PORT ?? 6767;
var version = process.env.VERSION ?? "0.6.388";
var dbUrl = process.env.DB_URL ?? "postgresql://root@host.docker.internal:26257/defaultdb?sslmode=disable";
var extraOptions = JSON.parse(process.env.DB_OPTIONS ?? "{}");
var authToken = process.env.AUTH_TOKEN ?? "secret";
var tickTimeout = 5000;
console.log("Green service: v4 " + version, " on port " + port);
var sql = new postgres(dbUrl, {
  ...extraOptions
});
async function toResponse(url, data) {
  if (url.searchParams.get("compress") === "snappy") {
    return new Response(await compress(JSON.stringify(data)), {
      headers: {
        "Content-Type": "application/json",
        compress: "snappy"
      }
    });
  }
  return Response.json(data);
}
var activeQueries = new Map;
setInterval(() => {
  for (const [k, v] of activeQueries.entries()) {
    if (Date.now() - v.time > tickTimeout) {
      console.log("query hang", k, v);
      v.cancel();
      activeQueries.delete(k);
    }
  }
}, tickTimeout);
var queryId = 0;
async function handleSQLFind(url, req) {
  const json = await req.json();
  const qid = ++queryId;
  try {
    const lq = json.query.toLowerCase();
    if (lq.includes("begin") || lq.includes("commit") || lq.includes("rollback")) {
      console.error("not allowed", json.query);
      return new Response("Not allowed", { status: 403 });
    }
    const st = Date.now();
    const query = sql(json.query, ...json.params ?? []);
    activeQueries.set(qid, { time: Date.now(), cancel: () => query.cancel(), query: json.query });
    const result = await query;
    console.log("query", json.query, Date.now() - st, result.length);
    return await toResponse(url, result);
  } catch (err) {
    console.error("failed to execute sql", json.query, json.params, err.message, err);
    return new Response(err.message, { status: 500 });
  } finally {
    activeQueries.delete(qid);
  }
}
Bun.serve({
  async fetch(req) {
    const token = (req.headers.get("Authorization") ?? "").split(" ")[1];
    if (token !== authToken) {
      return new Response("Unauthorized", { status: 401 });
    }
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/v1/version")) {
      return new Response(version);
    }
    if (req.method === "POST" && url.pathname.startsWith("/api/v1/sql")) {
      return await handleSQLFind(url, req);
    }
    return new Response("Success!");
  },
  port
});
