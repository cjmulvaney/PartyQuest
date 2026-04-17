# supabase/archive

Historical migration SQL files. **All of these have already been applied to the production database.** Kept for audit/reference only.

**Source of truth for the current schema is `../schema.sql`** — do not re-run anything in this folder against prod.

## Applied migrations (chronological)

| File | Purpose |
|------|---------|
| `add-draft-support.sql` | Early: event draft status |
| `phase3-realtime.sql` | Realtime enablement for feed |
| `phase5-storage.sql` | Photo-upload storage bucket |
| `v2.1-migration.sql` | v2.1 feature set (invite links, organizer dual role, activity feed, mission reassignment) |
| `v2.3-feed-interactions.sql` | Completion reactions + comments |
| `v2.4-feed-hidden.sql` | Hide-completion flag on feed |
| `v2.6-migration.sql` | v2.6 bug fixes + category cleanup |
| `v2.7-sms.sql` | SMS reminder tables, Twilio edge function support |
| `v2.8-west-yellowstone-pack.sql` | West Yellowstone themed mission pack |
| `v2.9-bug-fixes.sql` | Post-v2.7 / v2.8 fixes |
| `v2.10-post-event-survey.sql` | `event_surveys` table + `rpc_submit_survey` |
| `v3.0-admin-rls.sql` | `admin_emails` table + admin RLS policies |
| `v3.1-cleanup.sql` | Security/perf cleanup: `search_path`, `(select auth.uid())` wrapping, duplicate-policy removal, missing FK indexes, `sms_reminders` RLS enable |

## Workflow for new migrations

1. Draft new SQL in `../` (one version up from this archive folder).
2. Test locally or on a Supabase branch.
3. Apply to prod via Supabase MCP / dashboard.
4. Move the file into this `archive/` folder.
5. Update `../schema.sql` to reflect the new canonical state.
