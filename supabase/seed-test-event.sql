-- Party Quest — Test Event Seed
-- Paste this into Supabase SQL Editor to create a test event you can play through.

-- 1. Create the test event
insert into events (name, event_type, start_time, end_time, event_code, status)
values (
  'Test Party',
  'house party',
  now(),
  now() + interval '6 hours',
  'TEST01',
  'active'
);

-- 2. Create event config (3 missions per person, all unlocked)
insert into event_config (event_id, mission_count, unlock_type, tag_filters)
select id, 3, 'all_at_once', '{}'
from events where event_code = 'TEST01';

-- 3. Create 5 participants
insert into participants (event_id, name, access_code) values
  ((select id from events where event_code = 'TEST01'), 'Sarah',  'SARAH001'),
  ((select id from events where event_code = 'TEST01'), 'Jake',   'JAKE0001'),
  ((select id from events where event_code = 'TEST01'), 'Mike',   'MIKE0001'),
  ((select id from events where event_code = 'TEST01'), 'Taylor', 'TAYLOR01'),
  ((select id from events where event_code = 'TEST01'), 'Alex',   'ALEX0001');

-- 4. Assign 3 random missions to each participant
-- (picks from the full pool, minimizing overlap)
do $$
declare
  p record;
  m record;
  i integer;
  assigned_count integer := 0;
begin
  for p in select id from participants where event_id = (select id from events where event_code = 'TEST01')
  loop
    i := 0;
    for m in select id from missions where active = true order by random() limit 3 offset assigned_count
    loop
      insert into participant_missions (participant_id, mission_id, unlock_time)
      values (p.id, m.id, null);
      i := i + 1;
    end loop;
    assigned_count := assigned_count + 3;
  end loop;
end $$;
