# Party Quest — V2 Product Specification

**Version:** 2.0
**Last Updated:** March 2026
**Status:** Pre-development
**Prepared for:** Claude Code implementation

---

## 1. Product Overview

### App Name
Party Quest

### Tagline
*Increasing human connection through secret party quests.*

### Description
Party Quest is a mobile-first progressive web app (PWA) for social events. Participants receive secret missions to complete during an event — social challenges designed to spark conversation and interaction. Completions are self-reported and tracked on a live leaderboard visible to all participants. Organizers configure and manage events through a dedicated dashboard.

### Target Use Cases
- House parties
- Birthday parties
- Bachelorette/bachelor events
- Work offsites and team events
- Weekend trips
- Any social gathering where the organizer wants to increase interaction

### Design Priorities
1. Clear, detailed feature implementation
2. Strong foundation with ability to scale
3. Clean, mobile-first UI/UX

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Backend / Database | Supabase (Postgres) |
| Auth | Supabase Auth + Google SSO |
| File Storage | Supabase Storage (photos) |
| Real-time | Supabase Realtime (leaderboard) |
| PWA | vite-plugin-pwa |
| Hosting | Vercel |

---

## 3. User Types

### 3.1 App Admin (single superuser — the app owner)
- Access to full admin panel
- Manages mission library
- Views all events and analytics
- Views all feedback submissions
- Manages organizer accounts

### 3.2 Organizer
- Creates a persistent account via Google SSO
- Creates and manages events
- Configures missions, unlock schedule, participant list
- Views live event data and post-event stats
- Has access to event history and config cloning

### 3.3 Participant
- No persistent account
- Joins event via personal access code
- Sees their assigned missions and the leaderboard
- Self-reports mission completions

### 3.4 Display / Spectator
- No account or personal code required
- Enters event code only
- Sees leaderboard only (no missions)
- Use case: organizer's laptop connected to a TV/display at the event

---

## 4. Database Schema

### `categories`
```
id              uuid, primary key
name            text (e.g. "Icebreakers", "Silly Dares")
description     text
created_at      timestamp
```

### `missions`
```
id              uuid, primary key
text            text (the mission prompt)
category_id     uuid, foreign key → categories.id
tags            text[] (array of tag strings)
active          boolean (default true)
created_at      timestamp
```

### `events`
```
id              uuid, primary key
organizer_id    uuid, foreign key → auth.users.id
name            text
event_type      text (e.g. "birthday", "house party", "work offsite", "bachelorette", "weekend trip", "other")
start_time      timestamp
end_time        timestamp
event_code      text, unique (for display/spectator access)
anonymity_enabled boolean (default false)
how_heard       text (optional — "friend", "social media", "search", "other")
email_opt_in    boolean (default false)
organizer_email text (if email_opt_in true)
status          text ("upcoming", "active", "ended")
created_at      timestamp
```

### `participants`
```
id              uuid, primary key
event_id        uuid, foreign key → events.id
name            text
access_code     text, unique
joined_at       timestamp (null until they first log in)
```

### `participant_missions`
```
id              uuid, primary key
participant_id  uuid, foreign key → participants.id
mission_id      uuid, foreign key → missions.id
completed       boolean (default false)
notes           text (optional)
photo_url       text (optional, Supabase Storage URL)
completed_at    timestamp (null until completed)
unlock_time     timestamp (when this mission becomes visible)
```

### `event_config`
```
id              uuid, primary key
event_id        uuid, foreign key → events.id
mission_count   integer (1–5, missions per participant)
unlock_type     text ("all_at_once" | "timed")
unlock_schedule jsonb (array of unlock times if timed, e.g. ["2026-03-21T20:00:00", "2026-03-21T22:00:00"])
tag_filters     text[] (tags organizer has enabled for this event)
```

### `feedback`
```
id              uuid, primary key
event_id        uuid, foreign key → events.id (optional)
participant_id  uuid, foreign key → participants.id (optional)
text            text
created_at      timestamp
```

---

## 5. Mission Library

### Initial Build
- 100 total missions
- 10 categories
- 10 missions per category

### Categories (starter set — names TBD by app owner)
Suggested: Icebreakers, Silly Dares, Storytelling, Food & Drink, Movement, Creative, Competitive, Thoughtful, Party Classics, Wildcards

### Mission Structure
- Text prompt only (v2)
- Worth 1 point per completion (v2)
- One or more tags per mission
- Tags and categories overlap intentionally — tags enable granular organizer filtering

### Mission Assignment Logic
1. Organizer selects tag categories to include
2. System filters active missions matching those tags
3. System randomly assigns `mission_count` missions per participant
4. Assignment prioritizes unique missions across participants
5. Overlap is permitted only when the filtered pool is smaller than total missions needed across all participants

### Future Mission Features (not in v2)
- Point values per mission
- Character alignment tags
- Organizer-created private missions
- Participant-submitted missions
- Additional "party packs" (purchasable content)

---

## 6. User Flows

### 6.1 Home Page
```
Party Quest
Increasing human connection through secret party quests.

[ Join Event ]    [ Create Event ]
```
- No additional copy on home page
- Join Event → participant flow
- Create Event → organizer flow (Google SSO)

---

### 6.2 Participant Flow

**Step 1 — Join**
- Enter event code (6-character alphanumeric)
- Enter name
- System matches to pre-created participant slot OR creates new slot if event is open walk-up
- Participant receives (or is shown) their personal access code
- Personal access code is how they return to their missions if they close the app

**Step 2 — Mission Screen**
```
Welcome, [Name]
[Event Name]

Your Missions
☐  Mission prompt text here
☐  Mission prompt text here
☑  Mission prompt text here     ✎ note added
☐  [Locked — unlocks at 8:00 PM]
☐  [Locked — unlocks at 10:00 PM]
```
- Completed missions show checkmark + note indicator if notes added
- Locked missions show unlock time
- Tapping a mission opens a completion modal

**Step 3 — Mission Completion Modal**
```
[Mission text]

[ Mark Complete ]

Notes (optional)
_______________________________

Photo (optional)
[ + Add Photo ]

[ Save ]   [ Cancel ]
```

**Step 4 — Leaderboard Tab**
```
Leaderboard

1.  Sarah        4 pts
2.  Jake         3 pts
3.  Mike         3 pts
4.  Taylor       2 pts
...
```
- Live updates via Supabase Realtime
- Shows top 10 participants
- Names shown unless organizer has enabled anonymity (then shows "Player 1", etc.)
- No mission details shown on leaderboard

**Persistent UI Elements**
- Tab bar: [ Missions ] [ Leaderboard ]
- Small feedback button accessible from either tab

---

### 6.3 Display / Spectator Flow
- Enter event code only (no name, no personal code)
- Taken directly to full-screen leaderboard view
- Auto-refreshes via Supabase Realtime
- No mission access

---

### 6.4 Organizer Flow

**Authentication**
- Google SSO via Supabase Auth
- Persistent account tied to Google identity

**Dashboard**
```
Party Quest
[ + New Event ]

Active Events
────────────────────────────────
[Event Name]   12 participants   Live   →
[Event Name]    8 participants   Upcoming   →

Past Events
────────────────────────────────
[Event Name]   Mar 14   20 participants   →
[Event Name]   Feb 27   12 participants   →
```

---

### 6.5 Event Creation Wizard

**Step 1 — Event Basics**
- Event name (required)
- Event type dropdown: Birthday, House Party, Bachelorette/Bachelor, Work Offsite, Weekend Trip, Other
- Start date + time
- End date + time (default duration: 1 evening)
- How did you hear about Party Quest? (optional dropdown: Friend, Social media, Search, Other)
- Email opt-in: "Send me a post-event summary" (checkbox + email field if checked)

**Step 2 — Participants**
- Number of participants (required)
- Add participant names manually (one per line or comma-separated)
- Anonymity toggle: "Hide participant names on leaderboard" (default: off)
- Note: participants without pre-entered names can join via event code + name entry at the door

**Step 3 — Missions**
- Mission count per participant: 1–5 (slider or dropdown)
- Unlock type:
  - All at once (default)
  - Timed — organizer sets a time per unlock slot
- Tag/category toggles: show all available categories with on/off toggle
- Preview: "X missions available in your selection for Y participants"
- Warning shown if pool is too small (overlap required)

**Step 4 — Review + Launch**
- Summary of all config
- Participant list with generated access codes
- Event code displayed prominently
- [ Copy All Codes ] button (copies formatted list for distribution)
- [ Launch Event ] button
- Option to schedule start (if start time is in the future) or go live immediately

---

### 6.6 Live Event View (Organizer)
```
[Event Name]                    [ End Event Early ]
Live · 2h 14m remaining

Participants            Joined    Completed
────────────────────────────────────────────
Jake                    ✓         3 / 5
Sarah                   ✓         4 / 5
Mike                    ✓         2 / 5
Taylor                  —         0 / 5
...

[ Edit Event ]   [ View Leaderboard ]
```
- Joined indicator: whether participant has entered their access code
- Completion count: missions completed / total assigned
- Organizer can edit: participant names, unlock schedule, add participants

---

### 6.7 Post-Event View (Organizer)
```
[Event Name] — Ended
Mar 21, 2026

Final Leaderboard          Completion Stats
──────────────────         ─────────────────────
1. Sarah    4 pts          Total completions: 34
2. Jake     3 pts          Most completed mission: [text]
3. Mike     2 pts          Avg completions/person: 2.8
...                        Participation rate: 83%
```
- Final leaderboard is frozen snapshot
- Stats: total completions, most completed mission, avg per participant, participation rate (% who joined + completed at least 1)
- [ Clone Event ] button to reuse config for a future event

---

## 7. In-App Notifications

- **Type:** In-app popup only (no push notifications in v2)
- **Trigger:** When a locked mission's unlock time is reached while participant has app open
- **Behavior:** Toast/banner notification — "A new mission has unlocked!"
- **Limitation:** Only fires if app is open in browser; does not fire if tab is closed

---

## 8. Feedback

- Accessible via small persistent button on participant mission screen and leaderboard
- Simple text input, no rating system required in v2
- Stored in `feedback` table with event_id and optional participant_id
- Visible to app admin in admin panel

---

## 9. Admin Panel

Access: App owner only (single superuser, identified by a hardcoded admin user ID or role flag in Supabase)

### Mission Library
- View all missions with category, tags, active status
- Add individual mission (text, category, tags)
- Edit existing mission
- Toggle mission active/inactive (soft delete only — no hard deletes)
- **Bulk CSV upload:** Upload a `.csv` file with columns `text, category, tags` to batch-add missions
  - CSV format: `"Get someone to teach you a dance move","Silly Dares","silly,movement,social"`
  - System validates and imports, flags duplicates

### Categories & Tags
- Add/edit/deactivate categories
- View all tags in use across missions

### Events
- View all events across all organizers
- Basic stats per event (participant count, completion rate, event type)

### Feedback
- View all feedback submissions
- Filter by event or date range

### Organizer Accounts
- View all organizer accounts
- Disable account if needed

---

## 10. PWA Configuration

- **Plugin:** `vite-plugin-pwa`
- **Web App Manifest:**
  - name: "Party Quest"
  - short_name: "PartyQuest"
  - theme_color: (TBD with visual design)
  - display: "standalone"
  - icons: 192px and 512px versions
- **Service Worker:** Cache app shell for offline-capable load
- **Install prompt:** Allow browser's native "Add to Home Screen" behavior
- No custom install UI required in v2

---

## 11. Copy Reference

| Location | Copy |
|---|---|
| App name | Party Quest |
| Tagline | Increasing human connection through secret party quests. |
| Home CTA 1 | Join Event |
| Home CTA 2 | Create Event |
| Locked mission | Locked — unlocks at [time] |
| Leaderboard tab | Leaderboard |
| Missions tab | Missions |
| Feedback button | Feedback |
| Completion modal CTA | Mark Complete |

---

## 12. Monetization (Future — Not in V2)

Not implemented in v2. Architecture should support future gating of:
- Premium "party packs" (additional curated mission sets, one-time purchase)
- Pro organizer subscription (custom/secret missions, advanced analytics, branding options)
- Organizer-assigned missions (vs. auto-assigned)

Organizer accounts should have a `plan` field in Supabase (`free` | `pro`) ready to be used when monetization is introduced.

---

## 13. Build Phases

### Phase 1 — Foundation
- Supabase project setup (schema, RLS policies, Storage bucket)
- React/Vite scaffold with Tailwind + PWA config
- Home page with routing
- Participant join flow (event code + name → access code)
- Mission display (locked/unlocked states)
- Mission completion (checkbox, notes)
- Basic leaderboard (polling, no real-time yet)

### Phase 2 — Organizer
- Google SSO via Supabase Auth
- Organizer dashboard
- Event creation wizard (all 4 steps)
- Participant code generation
- Live event view

### Phase 3 — Real-time + Notifications
- Supabase Realtime subscription for leaderboard
- Display/spectator mode (event code only)
- In-app mission unlock notifications

### Phase 4 — Admin Panel
- Superuser role + access control
- Mission library management UI
- CSV bulk upload
- Feedback viewer
- Event analytics

### Phase 5 — Polish + Advanced Features
- Photo upload on mission completion (Supabase Storage)
- Post-event stats view
- Event history + config cloning
- PWA refinements (manifest, icons, caching)
- Feedback button on participant screen

---

## 14. Out of Scope for V2

The following were discussed and explicitly deferred:

- Push notifications (in-app only in v2)
- Organizer-assigned missions (auto-assign only in v2)
- Participant-submitted missions
- Organizer-created private missions
- Secret missions mechanic
- Character alignment tags
- Point values per mission (all missions = 1 point)
- Native iOS/Android app (web/PWA only)
- Monetization / paywalls
- Multiple simultaneous events per organizer
- Social reactions or comments on completions
- Animated or rich leaderboard display mode

---

## 15. Open Questions / Future Decisions

- Visual design / color palette / branding assets
- Custom domain (Vercel auto-generates URL for development; organizer will add custom domain later)
- Walk-up participants create a new participant slot at join time and are auto-assigned missions from the same tag pool as pre-registered participants

## 16. Mission Library Reference

See `party-quest-missions-v1.md` for the full 100-mission seed file (10 categories × 10 missions).

**Categories:**
1. Icebreakers
2. Silly Dares
3. Storytelling
4. Food & Drink
5. Performance
6. Social Connector
7. Bold Dares
8. Deep Cut
9. Party Classic
10. Wildcard

This file should be used to populate the database via SQL seed or admin panel CSV import during initial build setup. Additional missions can be added via CSV bulk upload in the admin panel at any time.
