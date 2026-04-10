-- Party Quest v2.8 — West Yellowstone Party Pack
-- Adds 1 category + 40 missions for bike trip / group weekend events

insert into categories (id, name, description) values
  ('a1000000-0000-0000-0000-000000000011', 'West Yellowstone Party Pack', 'Bike ride and group trip missions built for a weekend in the wild.')
on conflict (id) do nothing;

-- On the Ride
insert into missions (text, category_id, tags) values
  ('Secretly attach something to someone''s bike — a leaf, stick, anything you can find — without them noticing. It has to still be there when the group next stops.', 'a1000000-0000-0000-0000-000000000011', '{wypp,physical,sneaky,bike}'),
  ('Announce "I am the leader, follow me" and take the front of the group. Hold it for at least 5 minutes.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,bike,funny}'),
  ('Name your bike. Tell at least 2 people the name and a one-sentence backstory before the ride ends.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,bike,funny}'),
  ('Narrate your own ride out loud like a Tour de France commentator for at least 30 continuous seconds.', 'a1000000-0000-0000-0000-000000000011', '{wypp,performance,bike,funny}'),
  ('Call out a fake wildlife sighting with complete conviction. It has to cause at least one person to visibly react.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,bike,funny}'),
  ('At any rest stop, lie down on the ground like you''ve been fully defeated. Don''t explain yourself.', 'a1000000-0000-0000-0000-000000000011', '{wypp,silly,dare,physical}'),
  ('Get the whole group to stop for a photo at a scenic spot. You have to organize it and be in it.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,group,bike}'),
  ('Pick someone and draft directly behind them for as long as possible without them telling you to back off. Report your time.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,physical,bike}'),
  ('Get a candid photo of every person on the ride. They can''t know it''s coming.', 'a1000000-0000-0000-0000-000000000011', '{wypp,sneaky,social,bike}'),
  ('Give everyone a riding nickname based on their style today. Announce them at the end of the ride.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,funny,bike}'),
  ('Find a natural object on the trail and keep it in your pocket for the rest of the day without explaining why. Reveal it at dinner.', 'a1000000-0000-0000-0000-000000000011', '{wypp,sneaky,silly,reveal}');

-- Trip Antics
insert into missions (text, category_id, tags) values
  ('Speak only in questions for 10 consecutive minutes. Someone has to explicitly call you out before you can stop.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,funny,group}'),
  ('Make up a team name for this weekend trip. Get every single person to say it at least once before midnight.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,group,funny}'),
  ('At some point, pretend you don''t know how to do something you obviously know how to do. Keep the act going as long as possible.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,sneaky,funny}'),
  ('Text someone in the group chat something cryptic and specific with zero context. Don''t explain it for at least 2 hours.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,sneaky,funny}'),
  ('Do your best impression of someone who is NOT on this trip. The group guesses.', 'a1000000-0000-0000-0000-000000000011', '{wypp,performance,funny,group}'),
  ('Convince at least 3 people to attempt a 10-minute victory nap after the ride. Everyone has to genuinely try.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,social,funny}');

-- Discovery
insert into missions (text, category_id, tags) values
  ('Find out something about someone in this group that genuinely surprises you. Report it back to at least one other person.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,connection,conversation}'),
  ('Ask two different people what they each think is the most underrated vegetable. Report their answers to the group.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,funny,conversation}'),
  ('Find out what two people in this group have in common that you didn''t already know.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,connection,conversation}'),
  ('Get the origin story of how two specific people in the group first met. Tell it back to them and see how accurate you are.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,story,connection}'),
  ('Find out what everyone thinks the group''s funniest shared memory is. See if anyone agrees.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,memory,group}'),
  ('Find out what someone''s most embarrassing purchase from the last year was.', 'a1000000-0000-0000-0000-000000000011', '{wypp,conversation,funny,vulnerable}'),
  ('Get someone else to describe what song best fits your energy on this trip. You can''t suggest it yourself.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,conversation,funny}');

-- Group Games & Dinner
insert into missions (text, category_id, tags) values
  ('Start a group bet on something specific that will happen before midnight. Everyone puts in a stake.', 'a1000000-0000-0000-0000-000000000011', '{wypp,group,game,dare}'),
  ('Challenge someone to a duel. You decide the format. Loser owes the winner a favor.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,game,funny}'),
  ('Tell a story about a trip that went sideways. Real story. Get at least 2 others to tell theirs after.', 'a1000000-0000-0000-0000-000000000011', '{wypp,story,social,memory}'),
  ('Find out everyone''s walk-up song — the one they''d want playing as they entered a room. You have to remember all of them.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,group,conversation}'),
  ('Start a "would you rather" chain — you ask someone, they answer AND ask the next person. Keep it going as long as possible.', 'a1000000-0000-0000-0000-000000000011', '{wypp,game,group,funny}'),
  ('Get someone to teach you their signature move — dance, stretch, trick, anything they''ve actually got.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,performance,funny}'),
  ('Share your most controversial food opinion and defend it like your life depends on it.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,funny,conversation}'),
  ('Get a group photo where you direct everyone into a specific ridiculous pose. You have to be in it.', 'a1000000-0000-0000-0000-000000000011', '{wypp,group,silly,funny}'),
  ('Find out everyone''s most irrational fear. Collect all of them.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,group,conversation}'),
  ('Convince someone to do something they said they''d never do this weekend. Document it.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,bold,social}'),
  ('Write and deliver the closing toast for the day. It has to reference at least 3 specific things that actually happened.', 'a1000000-0000-0000-0000-000000000011', '{wypp,performance,bold,group}'),
  ('Get a candid photo of everyone at dinner.', 'a1000000-0000-0000-0000-000000000011', '{wypp,sneaky,social,group}'),
  ('Find out what song everyone would want played at their wedding. You go last and you have to commit to an answer.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,group,conversation}'),
  ('Get the group to agree on the MVP of the day. You run the vote and announce the winner.', 'a1000000-0000-0000-0000-000000000011', '{wypp,group,social,funny}'),
  ('Start a group story — one sentence each around the table. Keep going until it reaches a natural end or falls apart.', 'a1000000-0000-0000-0000-000000000011', '{wypp,group,game,funny}'),
  ('Get everyone to share the thing they were most worried about before this trip. Doesn''t have to be serious.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,vulnerable,group}');
