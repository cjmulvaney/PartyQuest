-- Party Quest — v3.4 Missions v2 refresh
--
-- Applies the Missions v2 content update:
--   • Renames "Silly Dares" → "Silly Dares/Performances" (merges old Performance cat)
--   • Renames "Bold Dares" → "Brave Moments"
--   • Deletes the "Performance" category
--   • Adds 3 new categories: Group Activation, Playful Conspiracy, Observational
--   • Deactivates all existing core-category missions (preserves historical
--     participant_missions references) and inserts the new v2 mission set.
--   • West Yellowstone Party Pack is untouched.
--
-- Run in one transaction so a failure rolls everything back.

begin;

-- ------------------------------------------------------------
-- 1. Deactivate all existing core-library missions
--    (category 1–10; WYPP is 11 and stays untouched)
-- ------------------------------------------------------------
update missions
   set active = false
 where category_id in (
   'a1000000-0000-0000-0000-000000000001', -- Icebreakers
   'a1000000-0000-0000-0000-000000000002', -- Silly Dares
   'a1000000-0000-0000-0000-000000000003', -- Storytelling
   'a1000000-0000-0000-0000-000000000004', -- Food & Drink
   'a1000000-0000-0000-0000-000000000005', -- Performance
   'a1000000-0000-0000-0000-000000000006', -- Social Connector
   'a1000000-0000-0000-0000-000000000007', -- Bold Dares
   'a1000000-0000-0000-0000-000000000008', -- Deep Cut
   'a1000000-0000-0000-0000-000000000009', -- Party Classic
   'a1000000-0000-0000-0000-000000000010'  -- Wildcard
 );

-- ------------------------------------------------------------
-- 2. Rename existing categories
-- ------------------------------------------------------------
update categories
   set name = 'Silly Dares/Performances',
       description = 'Low-stakes dares and short performances — sing, dance, act, demonstrate.'
 where id = 'a1000000-0000-0000-0000-000000000002';

update categories
   set name = 'Brave Moments',
       description = 'Higher commitment, higher stakes — for the brave.'
 where id = 'a1000000-0000-0000-0000-000000000007';

-- ------------------------------------------------------------
-- 3. Delete the Performance category
--    (its missions were just deactivated; category_id will be set null by FK)
-- ------------------------------------------------------------
delete from categories
 where id = 'a1000000-0000-0000-0000-000000000005';

-- ------------------------------------------------------------
-- 4. Add the 3 new categories
-- ------------------------------------------------------------
insert into categories (id, name, description) values
  ('a1000000-0000-0000-0000-000000000012', 'Group Activation',   'Rally groups of 3+ for a shared moment — cheers, photos, votes, sing-alongs.'),
  ('a1000000-0000-0000-0000-000000000013', 'Playful Conspiracy', 'Pair up with someone on a shared bit, signal, or secret for the night.'),
  ('a1000000-0000-0000-0000-000000000014', 'Observational',      'Pay attention to the space and the people in it — notice, then share.');

-- ------------------------------------------------------------
-- 5. Insert new Missions v2 content
-- ------------------------------------------------------------

-- Icebreakers (15)
insert into missions (text, category_id, tags) values
  ('Find someone who has lived in another country and ask them about it.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Find out what someone''s most unusual job or side hustle has been.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Ask someone what their most unpopular opinion is.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Find someone whose birthday is in the same month as yours.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Ask someone what they wanted to be when they grew up — and whether they still want that.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Find out what one person''s hidden talent is.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Find someone who has met a celebrity and hear the story.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Ask someone what the best piece of advice they''ve ever received was.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Find someone whose full name you don''t know and learn it — first, middle, last.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Ask someone what the last thing they googled was — and why.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Find someone whose commute to get here tonight was the most interesting.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Ask someone what three words their best friend would use to describe them.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Find someone who has a story behind what they''re wearing tonight.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Ask someone what the last thing they bought for themselves was — and if it was worth it.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Find someone who has a recurring dream and get them to describe it.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}');

-- Silly Dares/Performances (10)
insert into missions (text, category_id, tags) values
  ('Do 10 jumping jacks in the middle of the room.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,physical,funny}'),
  ('Find someone and challenge them to a 30-second staring contest.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,funny}'),
  ('Moonwalk across the room.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,physical,funny}'),
  ('Sing the first verse of any song you know by heart to one person.', 'a1000000-0000-0000-0000-000000000002', '{performance,silly,funny}'),
  ('Teach someone a dance move — any move you actually know.', 'a1000000-0000-0000-0000-000000000002', '{performance,physical,funny}'),
  ('Recite something you have memorized — poem, speech, movie quote, song chorus — anything.', 'a1000000-0000-0000-0000-000000000002', '{performance,funny}'),
  ('Tell someone a knock-knock joke that makes them laugh.', 'a1000000-0000-0000-0000-000000000002', '{silly,funny,social}'),
  ('Look at your phone, loudly exclaim "NO WAY," then put it back in your pocket without explaining.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,funny}'),
  ('Say "hashtag ___" at the end of a sentence five times tonight.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,funny}'),
  ('Do a dramatic slow-motion walk across the room. Bonus points for sound effects.', 'a1000000-0000-0000-0000-000000000002', '{performance,physical,funny}');

-- Storytelling (10)
insert into missions (text, category_id, tags) values
  ('Get someone to tell you about their worst travel experience.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Share the story of how you met the host of this event.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Find out about someone''s most memorable meal.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Ask someone about the best decision they ever made on a whim.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Get someone to tell you about a time they were completely lost — literally or figuratively.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Ask someone what their earliest memory is.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Find out about a time someone did something they were really proud of but never got credit for.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Tell someone about the most spontaneous thing you''ve ever done.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Share your most embarrassing story with someone, then ask them to share theirs.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Ask someone about the best trouble they got into as a kid.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}');

-- Food & Drink (10)
insert into missions (text, category_id, tags) values
  ('Get someone to make a toast — to anything. It must be at least 3 sentences.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Get someone to try a food they''ve never had before tonight.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Convince someone to switch drinks with you for one sip.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Ask the bartender or host what their go-to drink order is.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Create a new cocktail name on the spot and pitch it to someone like it''s a real menu item.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Get someone to cheers you using a word other than "cheers."', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Challenge someone to describe their drink using only three words.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Ask someone what their signature dish is and get the recipe.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Find out what someone''s most controversial food opinion is (e.g. pineapple on pizza).', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Debate someone on the best and worst bar snack of all time. Pick a snack and defend it.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}');

-- Social Connector (10)
insert into missions (text, category_id, tags) values
  ('Introduce two people who don''t know each other and find one thing they have in common.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find someone who grew up in the same state or region as you.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find someone who shares a niche hobby or interest with you — something most people wouldn''t guess.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find someone who has read one of your favorite books.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find someone who grew up watching the same TV show you did.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Ask someone to introduce you to one person they think you''d get along with.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find someone who has been to a country you want to visit and ask for a recommendation.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Introduce yourself to someone new tonight and find out how they know the host.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find two people who you think should know each other and introduce them.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find someone whose astrology sign is the same as yours.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}');

-- Brave Moments (10)
insert into missions (text, category_id, tags) values
  ('Ask a stranger at the party to be your plus-one for a group photo. Actually take the photo.', 'a1000000-0000-0000-0000-000000000007', '{brave,bold,vulnerable}'),
  ('Text someone outside the party right now and tell them you''re thinking about them.', 'a1000000-0000-0000-0000-000000000007', '{brave,bold,vulnerable}'),
  ('Publicly announce your most controversial hot take to a group of at least three people.', 'a1000000-0000-0000-0000-000000000007', '{brave,bold,vulnerable}'),
  ('Ask someone for honest feedback on something — a decision, an idea, an outfit. Listen without defending.', 'a1000000-0000-0000-0000-000000000007', '{brave,bold,vulnerable}'),
  ('Find the person here you know the least and ask them two real questions — not small talk.', 'a1000000-0000-0000-0000-000000000007', '{brave,bold,vulnerable}'),
  ('Tell someone something you''ve been meaning to say but haven''t gotten around to.', 'a1000000-0000-0000-0000-000000000007', '{brave,bold,vulnerable}'),
  ('Pay someone a specific honest compliment about something they did.', 'a1000000-0000-0000-0000-000000000007', '{brave,bold,vulnerable}'),
  ('Tell the host one specific thing you''re enjoying about the party tonight.', 'a1000000-0000-0000-0000-000000000007', '{brave,bold,vulnerable}'),
  ('Ask someone about a fun project they''re working on right now — and actually follow up on the details.', 'a1000000-0000-0000-0000-000000000007', '{brave,bold,vulnerable}'),
  ('Admit to someone that you don''t know something you probably should — and ask them to explain it.', 'a1000000-0000-0000-0000-000000000007', '{brave,bold,vulnerable}');

-- Deep Cut (15)
insert into missions (text, category_id, tags) values
  ('Ask someone what they would do differently if they knew no one would judge them.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Find out what someone''s biggest non-career ambition is.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Ask someone what the hardest thing they''ve ever had to learn was.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Find out what someone is most looking forward to in the next year.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Ask someone what they think their purpose is — even if they''re still figuring it out.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Ask someone about a moment that changed how they see the world.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Find out what someone misses most about being a kid.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Ask someone what they wish more people understood about them.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Find out what someone would tell their younger self if they could.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Ask someone what they think the secret to a good life is.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Ask someone what they''re proud of that they rarely talk about.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Find out what someone has changed their mind about in the last few years.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Ask someone what a good day looks like for them.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Find out what someone is still figuring out in their life right now.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}'),
  ('Ask someone what they would do if they had one extra hour in every day.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}');

-- Party Classic (10)
insert into missions (text, category_id, tags) values
  ('Get a group of at least four people to play a round of "never have I ever."', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Challenge someone to a thumb war. Best of three.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Find someone willing to play rock paper scissors, best of 3 — loser buys the next round or owes a favor.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Get a group of three or more to play 21 questions with you as the subject.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Organize an impromptu trivia question — you ask, anyone can answer, first correct answer wins.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Start a round of two truths and a lie with at least two other people tonight.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Start a compliment chain with someone. You give a compliment, then at least 3 other people need to give compliments after yours.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Challenge someone to a coin flip. Loser has to do a small favor for the winner — within reason.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Start a round of "would you rather" with at least two other people. Make the choices hard.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Play a game with someone. Could be cards, chopsticks, or something else.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}');

-- Group Activation (10)
insert into missions (text, category_id, tags) values
  ('Get a group of 3+ to do a synchronized cheers — count down from 3 and everyone drinks at once.', 'a1000000-0000-0000-0000-000000000012', '{group,activation,social}'),
  ('Organize a group photo where everyone has to make the same facial expression.', 'a1000000-0000-0000-0000-000000000012', '{group,activation,social}'),
  ('Get a group of 3+ to agree on the single best movie of the last 10 years. They have to actually land on one.', 'a1000000-0000-0000-0000-000000000012', '{group,activation,social}'),
  ('Start a group countdown to something — anything. Get at least 3 people to count down with you.', 'a1000000-0000-0000-0000-000000000012', '{group,activation,social}'),
  ('Get a group of 3+ to pose for a "fake awkward family photo."', 'a1000000-0000-0000-0000-000000000012', '{group,activation,social}'),
  ('Rally 3+ people to sing the chorus of a song together — loud enough that someone across the room hears it.', 'a1000000-0000-0000-0000-000000000012', '{group,activation,social}'),
  ('Get 3+ people to each share one word that describes their week.', 'a1000000-0000-0000-0000-000000000012', '{group,activation,social}'),
  ('Organize a quick group vote on something trivial — best snack at the party, best song playing, anything. Announce the winner.', 'a1000000-0000-0000-0000-000000000012', '{group,activation,social}'),
  ('Get 3+ people to do the wave in sequence. Yes, the stadium wave. Get it to go around at least twice.', 'a1000000-0000-0000-0000-000000000012', '{group,activation,social}'),
  ('Get a group of 3+ to each name a band they loved in high school. The group picks the most embarrassing one.', 'a1000000-0000-0000-0000-000000000012', '{group,activation,social}');

-- Playful Conspiracy (10)
insert into missions (text, category_id, tags) values
  ('Find someone and agree on a secret handshake. Use it at least twice tonight.', 'a1000000-0000-0000-0000-000000000013', '{conspiracy,playful,partner}'),
  ('Pick a word with one other person. Every time either of you says it, the other has to nod solemnly.', 'a1000000-0000-0000-0000-000000000013', '{conspiracy,playful,partner}'),
  ('Team up with someone and convince a third person you two are cousins. See how long you can keep it going.', 'a1000000-0000-0000-0000-000000000013', '{conspiracy,playful,partner}'),
  ('Pair up with someone and invent a fake backstory for how you met. Tell it convincingly to one other person.', 'a1000000-0000-0000-0000-000000000013', '{conspiracy,playful,partner}'),
  ('Find a partner and pick a song. You both have to work its title into conversation before the night ends.', 'a1000000-0000-0000-0000-000000000013', '{conspiracy,playful,partner}'),
  ('Pick a gesture with one other person (nose touch, ear tug, etc.). Use it as a signal across the room at least once.', 'a1000000-0000-0000-0000-000000000013', '{conspiracy,playful,partner}'),
  ('Team up with someone and give each other fake nicknames. Only use those names for the rest of the night.', 'a1000000-0000-0000-0000-000000000013', '{conspiracy,playful,partner}'),
  ('Find a partner and start a rumor about yourselves — something obviously untrue but fun. See who believes it.', 'a1000000-0000-0000-0000-000000000013', '{conspiracy,playful,partner}'),
  ('Pair up with someone and agree to both mention the same random object (a pineapple, a submarine) in separate conversations.', 'a1000000-0000-0000-0000-000000000013', '{conspiracy,playful,partner}'),
  ('Find someone and invent a word together. Use it in at least three conversations tonight.', 'a1000000-0000-0000-0000-000000000013', '{conspiracy,playful,partner}');

-- Observational (10)
insert into missions (text, category_id, tags) values
  ('Find the oldest object in the room and ask the host the story behind it.', 'a1000000-0000-0000-0000-000000000014', '{observational,noticing,social}'),
  ('Spot something in the space you think most people haven''t noticed. Point it out to one person.', 'a1000000-0000-0000-0000-000000000014', '{observational,noticing,social}'),
  ('Count how many people are wearing the same color as you. Tell one of them.', 'a1000000-0000-0000-0000-000000000014', '{observational,noticing,social}'),
  ('Identify three things in the room that tell you something about the host. Share one with someone.', 'a1000000-0000-0000-0000-000000000014', '{observational,noticing,social}'),
  ('Find the best-dressed person at the party (your call) and tell them.', 'a1000000-0000-0000-0000-000000000014', '{observational,noticing,social}'),
  ('Notice what snack is disappearing fastest. Tell the host — they''ll want to know.', 'a1000000-0000-0000-0000-000000000014', '{observational,noticing,social}'),
  ('Find something in the room that looks like it has a story. Ask someone about it.', 'a1000000-0000-0000-0000-000000000014', '{observational,noticing,social}'),
  ('Spot a piece of art, a book, or an object in the space and ask someone what they think of it.', 'a1000000-0000-0000-0000-000000000014', '{observational,noticing,social}'),
  ('Find the person who has moved around the most at the party. Go say hi to them.', 'a1000000-0000-0000-0000-000000000014', '{observational,noticing,social}'),
  ('Notice who seems to know everyone. Go introduce yourself to them.', 'a1000000-0000-0000-0000-000000000014', '{observational,noticing,social}');

-- Wildcard (15)
insert into missions (text, category_id, tags) values
  ('Find out what someone''s secret talent is that they never get to show off.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Ask someone to teach you something useful in under two minutes.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Find someone who has a scar and hear the story behind it (only if they''re comfortable sharing).', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Get someone to tell you their most-used emoji and what it says about them.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Ask someone what they would do with $10,000 they had to spend in 24 hours.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Find out what app on someone''s phone they would be most embarrassed to explain.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Ask someone what the weirdest thing they believe is.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Find out what someone''s most irrational fear is.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Ask someone what they think happens after we die. Get their actual answer.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Find out someone''s karaoke song — and make them commit to singing it next time they''re at karaoke.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Ask someone what the most recent song they had stuck in their head was. Get them to hum it.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Find someone whose phone lock screen has a story. Hear it.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Ask someone what the worst haircut they ever had was. Details required.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Find out what someone''s most niche internet interest is — the thing they''d lose sleep googling.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Ask someone to describe their perfect Sunday in one sentence.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}');

commit;
