# Marko's Commissions — website

Website design, code and contents by **KBlasts (ui.matt)**.

One-page site for **Marko's Commissions**, a commission service offering
graphic design and Discord bot services. Static site + a single Vercel
serverless function — no build step.

Contact: **marko@marko21022.com** · Discord: <https://discord.gg/bj8VqJbYXE>

## Stack

- Static HTML/CSS/JS (`index.html`, `css/`, `js/`) — no framework
- WebGL2 fbm fog background (`js/bg-fbm.js`)
- Lenis smooth scroll, vendored at `js/lenis.min.js`
- `api/apply.js` — Vercel function that forwards support applications to a
  Discord webhook

## Applications → Discord

Support applications POST to `/api/apply`, which builds an embed and sends it
to a Discord webhook. The env var is configured on Vercel
(`DISCORD_WEBHOOK_URL`); to change the target channel:

```bash
vercel env add DISCORD_WEBHOOK_URL   # paste a channel webhook URL
vercel --prod
```

Without the variable the API answers 503 and the form shows a fallback message.

Rate limit: 5 submissions per IP per 10 minutes (in-memory, best effort) plus a
honeypot field.

## Motion toggle

The Motion on/off pill in the nav defaults to ON and persists the choice in
`localStorage` under `marko-motion`. Animations, smooth scroll and the WebGL
background are gated on it.

## Local dev

Any static server works, e.g. `npx serve .` — the form only fully works once
deployed (the API needs the webhook env var).

## Deploy

```bash
vercel link
vercel --prod
```

## Versioning

Every production deploy bumps the visible version badge (footer, page meta,
console log). Convention: `V.1` was the first release; every edit after it
increments the last number — `V.1.1`, `V.1.2`, … `V.1.11`, …

To ship a new version:

1. Update `VERSION` in `_bump.py` (or the three places: `index.html` footer +
   meta, `terms.html` footer + meta, `SITE_VERSION` in `js/main.js`).
2. Commit, tag the commit (`git tag V.1.x && git push --tags`), then `npx vercel --prod`.
