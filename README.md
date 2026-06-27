# Roast My Code Arena 🔥🎓

Two AIs (a funny Roaster and a helpful Teacher/Ustoz) fight over your code, a Judge
rules, you get a Cringe score + rank, and then YOU try to fix it. English + Uzbek.
Meme sound effects, voice, and a persistent Hall of Shame included.

This is a Vite + React app with a tiny serverless proxy so your Anthropic API key
stays on the server (never in the browser).

---

## 1. Install

```bash
npm install
```

## 2. Add your API key

Get a key at https://console.anthropic.com (Settings → API Keys), then:

```bash
cp .env.example .env.local
```

Open `.env.local` and paste your real key after `ANTHROPIC_API_KEY=`.

## 3. Run locally

The app needs BOTH the React frontend and the `/api/claude` function running.
Easiest way is the Vercel CLI (it runs both together):

```bash
npm i -g vercel
vercel dev
```

Open the URL it prints (usually http://localhost:3000).

> Plain `npm run dev` only runs the frontend, so the fights won't work without the
> function. Use `vercel dev` for local testing.

---

## 4. Deploy to Vercel (recommended, free)

1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com → **Add New → Project** → import that repo.
3. Framework preset: **Vite** (auto-detected). No build settings to change.
4. Under **Environment Variables**, add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your real key
5. Click **Deploy**. Done — you get a public URL.

Or from the terminal:

```bash
vercel              # first deploy (links the project)
vercel env add ANTHROPIC_API_KEY   # paste your key when asked
vercel --prod       # deploy to production
```

---

## ⚠️ Important: this app spends money

Every fight makes ~5 Claude API calls billed to YOUR key, and the practice
grader adds more. If the site is public, strangers can run up your bill.

Protect yourself:
- Set a **monthly spend limit** in the Anthropic console.
- Keep the URL private, or add a password / simple rate limit.
- The app uses `claude-sonnet-4-6` (cheaper + fast). You can change the model in
  `src/App.jsx` inside `callClaude`.

---

## Other hosts

- **Netlify:** move `api/claude.js` to `netlify/functions/claude.js`, export a
  `handler`, and change the frontend fetch URL to `/.netlify/functions/claude`.
- **Cloudflare Pages:** put it in `functions/api/claude.js` as an `onRequestPost`.
- **Any Node server:** run the same proxy logic in an Express route.

## Files

- `src/App.jsx` — the whole app (UI, fight logic, sounds, i18n).
- `api/claude.js` — serverless proxy that injects your API key.
- `src/main.jsx`, `index.html` — Vite entry points.
