# WC2026 — Read-only viewer (web link)

A static web page that reads `data.json` from your repo and shows the standings,
group tables, bracket and charts. No install, no login, no editing. You host it on
GitHub Pages and drop the link in WhatsApp; it refreshes itself every ~3 minutes.
  
## Files
- `index.html` — the viewer page (your dashboard, locked to read-only)
- `viewer.js` — loads `data.json` and renders it
 
## Setup (once, ~3 minutes)

1. **Make the data repo public.** In `wc2026-valiente-data` →
   Settings → General → Danger Zone → *Change visibility* → **Public**.
   - This makes the pool data (scores, names, predictions) viewable by anyone with
     the link — fine for a family pool. It does **not** expose your token: the token
     lives only inside your editor APK, never in the repo.
2. **Add these two files to that repo's root** (GitHub web: *Add file → Upload files*):
   `index.html` and `viewer.js`. (`data.json` is already there once you've saved once
   from the editor app.)
3. **Enable Pages.** Settings → Pages → Source: *Deploy from a branch* → Branch
   `main`, folder `/ (root)` → Save.
4. Wait ~1 minute, then your link is:
   **https://fervaldies.github.io/wc2026-valiente-data/**
5. Share that link on WhatsApp.

## How it stays current
Every time you hit save in the editor app, `data.json` updates in the repo. The
viewer fetches it fresh (cache-busted) on open, every 3 minutes while open, and
whenever someone refocuses the tab. GitHub Pages can lag a minute or two behind a
push — well within your "couple of times a day" goal.

## If you'd rather keep the data private
Then this tokenless approach won't work (private-repo Pages needs a paid plan, and
embedding a read token in a public page is no more private than a public repo).
Tell me and I'll talk through options — but for a family football pool, public is
the clean choice.
