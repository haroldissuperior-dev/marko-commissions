/* /api/chat — Clanko V2 assistant.
   Uses an LLM (Gemini/OpenAI-compatible) when an API key exists in the
   environment; otherwise answers from the built-in knowledge base. */

import { retrieve, FALLBACK, systemPrompt } from "./_knowledge.js";

const buckets = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const hits = (buckets.get(ip) || []).filter((t) => now - t < 5 * 60 * 1000);
  if (hits.length >= 25) {
    buckets.set(ip, hits);
    return true;
  }
  hits.push(now);
  buckets.set(ip, hits);
  if (buckets.size > 1000) buckets.clear();
  return false;
}

const clean = (s, n) => String(s ?? "").trim().slice(0, n);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  const body = typeof req.body === "object" && req.body !== null ? req.body : {};
  const message = clean(body.message, 500);
  if (!message) {
    return res.status(400).json({ ok: false, error: "Empty message." });
  }

  const ip = (req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown")
    .toString()
    .split(",")[0]
    .trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: "Slow down a little — try again in a few minutes." });
  }

  const history = Array.isArray(body.history)
    ? body.history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-6)
        .map((m) => ({ role: m.role, content: clean(m.content, 600) }))
    : [];

  // generative path — only when a key is configured on Vercel
  const key = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
  if (key) {
    try {
      const base = process.env.LLM_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";
      const model = process.env.LLM_MODEL || "gemini-2.0-flash";
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(base + "/chat/completions", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt() }, ...history, { role: "user", content: message }],
          max_tokens: 220,
          temperature: 0.4,
        }),
      });
      clearTimeout(timer);
      if (r.ok) {
        const data = await r.json();
        const reply = data?.choices?.[0]?.message?.content;
        if (reply) {
          return res.status(200).json({ ok: true, reply: clean(reply, 900), links: [] });
        }
      }
      // fall through to local knowledge base on any LLM failure
    } catch (err) {
      console.error("[chat] llm failed:", err && err.message);
    }
  }

  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const contextMsg = lastUser ? lastUser.content : "";
  const entry = retrieve(message, contextMsg);
  if (!entry) {
    return res.status(200).json({ ok: true, reply: FALLBACK, links: [
      { label: "Join the Discord", href: "https://discord.gg/bj8VqJbYXE" },
    ] });
  }
  return res.status(200).json({ ok: true, reply: entry.a, links: entry.links || [] });
}
