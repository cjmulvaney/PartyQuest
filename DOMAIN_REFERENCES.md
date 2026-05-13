# Domain References — Party Quest

This document catalogs every place the app's public domain is referenced in the codebase. Use it as a checklist whenever the production domain changes (e.g., moving from one custom domain to another, or back to a Vercel auto-domain).

**Current production domain:** `https://partyquest.connormulvaney.com`
**Prior auto-domain (legacy):** `https://party-quest-six.vercel.app`

---

## Quick reference: places to update when the domain changes

| # | Location | Type | Lives in code? | Action needed |
|---|----------|------|----------------|---------------|
| 1 | `supabase/functions/send-participant-sms/index.ts` (line 45) | Hardcoded URL in SMS body | Yes | Edit + redeploy edge function |
| 2 | `supabase/functions/send-event-sms-blast/index.ts` (line 114) | Hardcoded URL in SMS body | Yes | Edit + redeploy edge function |
| 3 | `supabase/functions/send-feedback-sms/index.ts` (line 118) | Hardcoded URL in SMS body | Yes | Edit + redeploy edge function |
| 4 | `.env` (local) and Vercel project env vars (`VITE_APP_URL`) | Env var consumed at build time | Outside repo | Update both `.env` locally and the Vercel env var, then redeploy frontend |
| 5 | Vercel project → Settings → Domains | DNS / domain attachment | Outside repo | Attach new domain, update DNS records, remove old |
| 6 | Supabase → Auth → URL Configuration (Site URL + redirect allowlist) | Auth callback allowlist | Outside repo | Add new domain; remove old after cutover |
| 7 | Twilio → Messaging Service → A2P 10DLC campaign | SMS sample messages reference the URL | Outside repo | Resubmit verification with new domain |
| 8 | `../README.md` (working-folder meta-readme, outside this repo) | Doc — "Live app" link | Outside repo | Edit |
| 9 | `../docs-archive/specs/*.md` (outside this repo) | Historical spec references | Outside repo | Optional — these are archived; leave as historical record |

---

## Detailed inventory

### A. Hardcoded URLs in code (must be edited + redeployed)

#### 1. `supabase/functions/send-participant-sms/index.ts:45`
```ts
const playUrl = `https://partyquest.connormulvaney.com/play/${accessCode}`
```
**Purpose:** Builds the "Play now" link in the SMS sent to a participant immediately after self-registration.
**Deploy step:** `supabase functions deploy send-participant-sms`

#### 2. `supabase/functions/send-event-sms-blast/index.ts:114`
```ts
const playUrl = `https://partyquest.connormulvaney.com/play/${p.access_code}`
```
**Purpose:** Builds the "Play" link in the SMS blast for the "event is live" message and the 15-minute reminder.
**Deploy step:** `supabase functions deploy send-event-sms-blast`

#### 3. `supabase/functions/send-feedback-sms/index.ts:118`
```ts
const feedbackUrl = `https://partyquest.connormulvaney.com/feedback/${p.access_code}`
```
**Purpose:** Builds the post-event feedback survey link sent via SMS after an event ends.
**Deploy step:** `supabase functions deploy send-feedback-sms`

> **Why these are hardcoded:** Supabase edge functions run in Deno and don't have access to `import.meta.env` or `window.location`. They could read a Deno env var instead, but for now the domain is inline. If the domain changes again, consider replacing all three with `Deno.env.get('APP_URL')` and setting it as a Supabase function secret — that would centralize this.

---

### B. Frontend URL — read from env var with fallback

#### 4. `src/pages/organizer/EventDetail.jsx:1088`
```js
const APP_URL = (import.meta.env.VITE_APP_URL || window.location.origin).trim()
```
**Purpose:** Generates the participant-facing **invite link** (`/register/{eventCode}`) shown to the organizer for copying and rendered into a QR code (line 1256). Also used at line 1439/1451 to generate the feedback link + QR shown on the organizer's event page.

**How the domain is set:**
- Production: `VITE_APP_URL` in Vercel project env vars (must be redeployed for changes to take effect, since Vite bakes env vars in at build time).
- Local dev: `VITE_APP_URL` in `.env`.
- Fallback: `window.location.origin` (whatever the user is browsing) — this works correctly only because the user is normally browsing the production domain when copying the link.

**Files where `VITE_APP_URL` is referenced:**
- `src/pages/organizer/EventDetail.jsx:1088`
- `.env.example:4` (template — value is a placeholder)
- `.env` (real value, gitignored)

---

### C. Auth redirect — uses `window.location.origin`

#### 5. `src/hooks/useAuth.js:30`
```js
redirectTo: `${window.location.origin}/auth/callback`,
```
**Purpose:** Google OAuth redirect after sign-in. Resolves to whatever origin the user is on, so it follows the domain automatically. **No code change needed on a domain swap**, but:

**Required external step:** Add the new domain (`https://your-new-domain.com/auth/callback`) to Supabase → Authentication → URL Configuration → Redirect URLs. Otherwise sign-in will fail on the new domain.

---

### D. Documentation references

These files live **outside this repo**, in the parent "Party Quests - Working folder/":

#### 6. `../README.md` (working-folder meta-readme)
"Live app" line. Updated to `https://partyquest.connormulvaney.com` as of 2026-05-13.

#### 7. `../docs-archive/specs/v2.10-post-event-survey.md`
Historical references to `party-quest-six.vercel.app`. Archived; leave alone.

#### 8. `../docs-archive/specs/v2.11-twilio-verification-fix.md`
Documents the original Vercel → custom-domain transition. Reference if you need to repeat the process; no edits needed.

#### 9. `../docs-archive/specs/party-quest-v2.7-SMS-feature.md`
References to the old Vercel domain in the original SMS spec. Archived; leave alone.

---

### E. External systems to reconfigure when the domain changes

These are **outside the repo** but are part of the swap:

1. **Vercel** — Project → Settings → Domains. Add new domain, configure DNS at your registrar, remove old once the new one is verified.
2. **Vercel env vars** — Update `VITE_APP_URL` to the new domain. Redeploy.
3. **Supabase Auth** — Authentication → URL Configuration. Update Site URL and Redirect URLs allowlist.
4. **Supabase Edge Function secrets** — Only relevant if you migrate the hardcoded URLs (section A) to an env var.
5. **Twilio A2P 10DLC** — Messaging Service campaign references the URL in sample messages. New campaign verification may be required if the URL changes.
6. **DNS provider** — CNAME or A records for the new subdomain.

---

## Domain-change checklist (in order)

1. Buy/configure the new domain.
2. Vercel: Add domain → configure DNS → wait for verification.
3. Vercel env vars: Update `VITE_APP_URL` → redeploy.
4. Local `.env`: Update `VITE_APP_URL`.
5. Edit + redeploy all three edge functions in section A.
6. Supabase Auth: Add new domain to redirect URL allowlist.
7. Twilio: Update A2P campaign if needed, resubmit verification.
8. Test: registration → SMS → play link → feedback link, end to end.
9. Update `README.md` "Live app" line.
10. Remove the old domain from Vercel + Supabase auth allowlist once everything is confirmed working on the new one.
