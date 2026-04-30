-- v3.5: Admin-only RPC for organizer sign-in registry

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
