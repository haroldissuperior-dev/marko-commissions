/* /api/apply — receives support applications and forwards them to a Discord
   webhook. Requires the DISCORD_WEBHOOK_URL environment variable on Vercel. */

const buckets = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const hits = (buckets.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (hits.length >= 10) {
    buckets.set(ip, hits);
    return true;
  }
  hits.push(now);
  buckets.set(ip, hits);
  if (buckets.size > 1000) buckets.clear();
  return false;
}

const cut = (s, n) => String(s ?? "").trim().slice(0, n);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  const ip = (req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: "Too many submissions — try again later." });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return res.status(503).json({ ok: false, error: "Applications are closed right now." });
  }

  const body = typeof req.body === "object" && req.body !== null ? req.body : {};

  // honeypot filled → silently accept and drop
  if (cut(body.company, 10)) {
    return res.status(200).json({ ok: true });
  }

  const contact = cut(body.contact, 60);
  const email = cut(body.email, 120);
  const experience = cut(body.experience, 1500);
  const scenario = cut(body.scenario, 1500);
  const why = cut(body.why, 1024);

  if (
    contact.length < 2 ||
    !email.includes("@") ||
    experience.length < 10 ||
    scenario.length < 10 ||
    why.length < 4
  ) {
    return res.status(400).json({ ok: false, error: "Missing required fields." });
  }

  const embed = {
    title: "Support Team Application",
    color: 0xf4f4f5,
    timestamp: new Date().toISOString(),
    footer: { text: "Marko's Commissions — website application form" },
    fields: [
      { name: "Discord", value: contact, inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Age range", value: cut(body.age, 20) || "—", inline: true },
      { name: "Time zone", value: cut(body.timezone, 40) || "—", inline: true },
      { name: "Hours / week", value: cut(body.hours, 20) || "—", inline: true },
      { name: "Experience", value: experience },
      { name: "Scenario — spam + arguments", value: scenario },
      { name: "Why the support team", value: why },
      ...(cut(body.extra, 1000) ? [{ name: "Anything else", value: cut(body.extra, 1000) }] : []),
    ],
  };

  try {
    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Marko's Commissions — Applications", embeds: [embed] }),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.error("[apply] webhook rejected:", r.status, txt.slice(0, 300));
      return res.status(502).json({ ok: false, error: "Delivery failed — try again." });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[apply] webhook fetch failed:", err);
    return res.status(502).json({ ok: false, error: "Delivery failed — try again." });
  }
}
