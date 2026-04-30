# Build Doc: Admin Users Page (Organizer Sign-In Registry)

## Goal
Add a new "Users" tab to the PQ Admin dashboard that shows all organizers who have ever signed in via Google OAuth — with name, email, avatar, sign-up date, and last sign-in date.

---

## Stack Context
- React 19 + Vite SPA
- React Router v7
- Supabase (project ID: `ynffsjqnwhvyzrerbxor`)
- Tailwind + custom CSS variables
- Admin auth: single email check via `VITE_ADMIN_EMAIL` env var + `admin_emails` table + `is_admin()` function

---

## Security Note on the View Approach

`auth.users` is in a restricted Postgres schema. Exposing it via a view is safe **if done correctly**. The risks and mitigations:

| Risk | Mitigation |
|---|---|
| Anon users could query the view | RLS policy restricts SELECT to `is_admin()` only |
| Sensitive auth fields exposed (hashed passwords, tokens) | View selects only: `id`, `email`, `raw_user_meta_data`, `created_at`, `last_sign_in_at` — no sensitive fields |
| View created in `public` schema, accessible to anon role | The RLS policy blocks all non-admin access regardless |

The view uses `security_invoker = false` (default), meaning it runs with the definer's permissions — needed to read `auth.users` at all. The RLS policy is what limits who can actually see rows.

---

## Step 1: SQL Migration

Run this in the Supabase SQL editor. After applying, fold the DDL into `supabase/schema.sql` and save the migration SQL to `supabase/archive/v3.5-organizer-users-view.sql`.

### Option A: View + RLS

```sql
-- v3.5: Admin-only view over auth.users for the organizer registry page

create or replace view public.organizer_users as
select
  id,
  email,
  raw_user_meta_data->>'full_name'   as full_name,
  raw_user_meta_data->>'avatar_url'  as avatar_url,
  raw_user_meta_data->>'name'        as display_name,
  created_at,
  last_sign_in_at
from auth.users;

alter view public.organizer_users set (security_invoker = false);

create policy "Admins can read organizer_users"
  on public.organizer_users
  for select
  using (public.is_admin());
```

> Note: If the RLS policy syntax throws an error on the view, use Option B instead.

### Option B: RPC Function (preferred — more reliable across Supabase versions)

```sql
create or replace function public.rpc_get_organizer_users()
returns table (
  id               uuid,
  email            text,
  full_name        text,
  avatar_url       text,
  created_at       timestamptz,
  last_sign_in_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email,
    (u.raw_user_meta_data->>'full_name')::text,
    (u.raw_user_meta_data->>'avatar_url')::text,
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  order by u.created_at desc;
end;
$$;

grant execute on function public.rpc_get_organizer_users() to authenticated;
```

---

## Step 2: Create `UsersPage.jsx`

Create this file at: `src/pages/admin/UsersPage.jsx`

The component should:
- On mount, query `organizer_users` view OR call `rpc_get_organizer_users()`
- Display a table with columns: Avatar, Name, Email, Signed Up, Last Sign In
- Match style of `OrganizersPage.jsx` — same `pq-card`, `pq-spinner`, CSS vars, `SortHeader` pattern, search input
- Support search by name or email
- Sort by: name, email, created_at, last_sign_in_at
- Show a count badge ("12 users") in the header
- Format dates with `toLocaleDateString`

### Query (view):
```js
const { data, error } = await supabase
  .from('organizer_users')
  .select('*')
  .order('created_at', { ascending: false })
```

### Query (RPC):
```js
const { data, error } = await supabase.rpc('rpc_get_organizer_users')
```

### Avatar:
Show a circular avatar image if `avatar_url` exists. Fall back to a colored circle with the user's first initial. Check `src/lib/avatar.js` — may have a utility already.

---

## Step 3: Wire into AdminLayout + App

**`src/pages/admin/AdminLayout.jsx`** — add to `NAV_ITEMS` array (~line 10):
```js
{ to: '/admin/users', label: 'Users' },
```
Place it after `Organizers` and before `Metrics`.

**`src/App.jsx`** — add route inside the `/admin` nested block:
```jsx
import UsersPage from './pages/admin/UsersPage.jsx'
// ...
<Route path="users" element={<UsersPage />} />
```

---

## Step 4: Update `schema.sql`

After verifying in prod:
1. Add view/function DDL to `supabase/schema.sql` under `-- v3.5` comment
2. Move migration SQL to `supabase/archive/v3.5-organizer-users-view.sql`

---

## Files to Touch

| File | Action |
|---|---|
| `supabase/archive/v3.5-organizer-users-view.sql` | Create — migration SQL |
| `supabase/schema.sql` | Edit — fold in v3.5 DDL |
| `src/pages/admin/UsersPage.jsx` | Create — new page component |
| `src/pages/admin/AdminLayout.jsx` | Edit — add nav item |
| `src/App.jsx` | Edit — add route |

---

## Test Checklist

- [ ] View/function queryable from Supabase SQL editor as admin
- [ ] Anon request to `organizer_users` is blocked
- [ ] "Users" tab appears in admin nav
- [ ] Table loads with correct name/email/dates
- [ ] Search filters by name and email
- [ ] Sort works on all columns
- [ ] Avatar fallback renders when `avatar_url` is null
- [ ] Visual style matches `OrganizersPage.jsx`
