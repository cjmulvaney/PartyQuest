-- Party Quest V2 — Seed Data
-- 10 categories × 10 missions = 100 missions

-- ============================================================
-- CATEGORIES
-- ============================================================

insert into categories (id, name, description) values
  ('a1000000-0000-0000-0000-000000000001', 'Icebreakers', 'Conversation starters and get-to-know-you prompts.'),
  ('a1000000-0000-0000-0000-000000000002', 'Silly Dares', 'Low-stakes, goofy challenges designed to get laughs.'),
  ('a1000000-0000-0000-0000-000000000003', 'Storytelling', 'Get people sharing — personal stories, memories, and moments.'),
  ('a1000000-0000-0000-0000-000000000004', 'Food & Drink', 'Missions involving beverages, snacks, or culinary moments.'),
  ('a1000000-0000-0000-0000-000000000005', 'Performance', 'Sing, dance, act, demonstrate — put yourself out there.'),
  ('a1000000-0000-0000-0000-000000000006', 'Social Connector', 'Find commonalities, make introductions, build bridges.'),
  ('a1000000-0000-0000-0000-000000000007', 'Bold Dares', 'Higher commitment, higher stakes — for the brave.'),
  ('a1000000-0000-0000-0000-000000000008', 'Deep Cut', 'Meaningful, thoughtful prompts for genuine human connection.'),
  ('a1000000-0000-0000-0000-000000000009', 'Party Classic', 'Timeless party game energy — familiar, inclusive, high participation.'),
  ('a1000000-0000-0000-0000-000000000010', 'Wildcard', 'Unexpected, chaotic, hard to categorize. High entropy.');

-- ============================================================
-- MISSIONS
-- ============================================================

-- Icebreakers
insert into missions (text, category_id, tags) values
  ('Find someone who has lived in another country and ask them about it.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Learn the full name of someone you only know by first name tonight.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Find out what someone''s most unusual job or side hustle has been.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Ask someone what their most unpopular opinion is.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Find someone whose birthday is in the same month as yours.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Ask someone what they wanted to be when they grew up — and whether they still want that.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Find out what one person''s hidden talent is.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Ask someone what the last thing they googled was.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Find someone who has met a celebrity and hear the story.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}'),
  ('Ask someone what the best piece of advice they''ve ever received was.', 'a1000000-0000-0000-0000-000000000001', '{icebreaker,conversation,social}');

-- Silly Dares
insert into missions (text, category_id, tags) values
  ('Do your best impression of someone at the party without saying who it is. Let people guess.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,physical,funny}'),
  ('Speak in a British accent for the next 5 minutes.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,funny}'),
  ('Do 10 jumping jacks in the middle of the room right now.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,physical,funny}'),
  ('Find someone and challenge them to a 30-second staring contest.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,funny}'),
  ('Walk up to someone and compliment their shoes, regardless of what they''re wearing.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,social,funny}'),
  ('Moonwalk across the room.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,physical,funny}'),
  ('Say "hashtag" out loud before every sentence for the next 3 minutes.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,funny}'),
  ('Do your best runway walk from one end of the room to the other.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,physical,funny}'),
  ('Call someone by the wrong name for the rest of the night. See how long it takes them to notice.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,funny}'),
  ('Convince someone to high-five a stranger with you.', 'a1000000-0000-0000-0000-000000000002', '{silly,dare,social,funny}');

-- Storytelling
insert into missions (text, category_id, tags) values
  ('Tell someone a story about the most embarrassing thing that''s ever happened to you.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Get someone to tell you about their worst travel experience.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Share the story of how you met the host of this event.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Find out about someone''s most memorable meal.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Ask someone about the best decision they ever made on a whim.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Get someone to tell you about a time they were completely lost — literally or figuratively.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Share a story about a time you got in trouble as a kid.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Ask someone what their earliest memory is.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Find out about a time someone did something they were really proud of but never got credit for.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}'),
  ('Tell someone about the most spontaneous thing you''ve ever done.', 'a1000000-0000-0000-0000-000000000003', '{story,personal,memory}');

-- Food & Drink
insert into missions (text, category_id, tags) values
  ('Get someone to make a toast — to anything. It must be at least 3 sentences.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Find someone willing to try a food they''ve never had before tonight (if available).', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Convince someone to switch drinks with you for one sip.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Ask the bartender or host what their go-to drink order is.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Create a new cocktail name on the spot and pitch it to someone like it''s a real menu item.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Find someone and agree on the best and worst bar snack of all time.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Get someone to cheers you using a word other than "cheers."', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Challenge someone to describe their drink using only three words.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Ask someone what their signature dish is and get the recipe.', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}'),
  ('Find out what someone''s most controversial food opinion is (e.g. pineapple on pizza).', 'a1000000-0000-0000-0000-000000000004', '{food,drink,social}');

-- Performance
insert into missions (text, category_id, tags) values
  ('Sing the first verse of any song you know by heart to one person.', 'a1000000-0000-0000-0000-000000000005', '{performance,physical,funny}'),
  ('Teach someone a dance move — any move you actually know.', 'a1000000-0000-0000-0000-000000000005', '{performance,physical,funny}'),
  ('Do a 30-second stand-up bit. It doesn''t have to be funny.', 'a1000000-0000-0000-0000-000000000005', '{performance,funny}'),
  ('Perform a dramatic reading of a text message from your phone.', 'a1000000-0000-0000-0000-000000000005', '{performance,funny}'),
  ('Act out a movie scene using only gestures. No words. The other person has to guess the movie.', 'a1000000-0000-0000-0000-000000000005', '{performance,physical,funny}'),
  ('Beatbox for 15 seconds in front of at least two people.', 'a1000000-0000-0000-0000-000000000005', '{performance,physical,funny}'),
  ('Perform your best air guitar solo to whatever song is playing.', 'a1000000-0000-0000-0000-000000000005', '{performance,physical,funny}'),
  ('Recite something you have memorized — poem, speech, movie quote, song chorus — anything.', 'a1000000-0000-0000-0000-000000000005', '{performance,funny}'),
  ('Do a dramatic slow-motion walk across the room.', 'a1000000-0000-0000-0000-000000000005', '{performance,physical,funny}'),
  ('Freestyle rap for 15 seconds. Any topic. Any skill level.', 'a1000000-0000-0000-0000-000000000005', '{performance,physical,funny}');

-- Social Connector
insert into missions (text, category_id, tags) values
  ('Introduce two people who don''t know each other and find one thing they have in common.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find someone who grew up in the same state or region as you.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find someone who shares a niche hobby or interest with you — something most people wouldn''t guess.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Introduce yourself to someone using only three words to describe who you are.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find two people at the party who should know each other and explain why.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find someone who has read one of your favorite books.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find someone who grew up watching the same TV show you did.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Ask someone to introduce you to one person they think you''d get along with.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find someone who has been to a country you want to visit and ask for a recommendation.', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}'),
  ('Find someone who shares your Myers-Briggs or enneagram type (or is your opposite).', 'a1000000-0000-0000-0000-000000000006', '{social,connection,introductions}');

-- Bold Dares
insert into missions (text, category_id, tags) values
  ('Ask a stranger at the party to be your plus-one for a group photo. Actually take the photo.', 'a1000000-0000-0000-0000-000000000007', '{dare,bold,vulnerable}'),
  ('Give a 60-second motivational speech to whoever is standing closest to you.', 'a1000000-0000-0000-0000-000000000007', '{dare,bold,vulnerable}'),
  ('Go around to five people and tell each one something genuinely specific you noticed about them.', 'a1000000-0000-0000-0000-000000000007', '{dare,bold,vulnerable}'),
  ('Ask someone you don''t know well what they think your vibe is at first glance. Listen without defending yourself.', 'a1000000-0000-0000-0000-000000000007', '{dare,bold,vulnerable}'),
  ('Text someone outside the party right now and tell them you''re thinking about them.', 'a1000000-0000-0000-0000-000000000007', '{dare,bold,vulnerable}'),
  ('Publicly announce your most controversial hot take to a group of at least three people.', 'a1000000-0000-0000-0000-000000000007', '{dare,bold,vulnerable}'),
  ('Ask someone for honest, unsolicited feedback on something — a decision you made, an idea you have, anything.', 'a1000000-0000-0000-0000-000000000007', '{dare,bold,vulnerable}'),
  ('Find the person at this party you know the least and spend 5 minutes asking them questions only.', 'a1000000-0000-0000-0000-000000000007', '{dare,bold,vulnerable}'),
  ('Tell someone something you''ve been meaning to say but haven''t gotten around to.', 'a1000000-0000-0000-0000-000000000007', '{dare,bold,vulnerable}'),
  ('Ask someone to roast you — one minute, no holding back. You cannot respond.', 'a1000000-0000-0000-0000-000000000007', '{dare,bold,vulnerable}');

-- Deep Cut
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
  ('Ask someone what they think the secret to a good life is.', 'a1000000-0000-0000-0000-000000000008', '{deep,meaningful,vulnerable}');

-- Party Classic
insert into missions (text, category_id, tags) values
  ('Start a game of two truths and a lie with whoever is nearest to you.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Get a group of at least four people to play a round of "never have I ever."', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Challenge someone to a thumb war. Best of three.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Find someone willing to play rock paper scissors — loser buys the next round or owes a favor.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Get a group of three or more to play 21 questions with you as the subject.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Start a chain compliment — you compliment someone, they have to immediately compliment someone else, see how long it goes.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Challenge someone to a coin flip. Loser has to do whatever the winner says (within reason).', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Get at least five people to participate in a group "most likely to" question of your choosing.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Start a round of "would you rather" with at least two other people.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}'),
  ('Organize an impromptu trivia question — you ask, anyone can answer, first correct answer wins.', 'a1000000-0000-0000-0000-000000000009', '{classic,game,group}');

-- Wildcard
insert into missions (text, category_id, tags) values
  ('Find out what someone''s secret talent is that they never get to show off.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Ask someone to teach you something useful in under two minutes.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Find someone who has a scar and hear the story behind it (only if they''re comfortable sharing).', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Get someone to tell you their most-used emoji and what it says about them.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Find out what someone''s karaoke song would be — the one they''d actually nail.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Ask someone what they would do with $10,000 they had to spend in 24 hours.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Find out what app on someone''s phone they would be most embarrassed to explain.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Ask someone what the weirdest thing they believe is.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Find out what someone''s most irrational fear is.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}'),
  ('Ask someone what they think happens after we die. Get their actual answer.', 'a1000000-0000-0000-0000-000000000010', '{wildcard,conversation,fun}');

-- ============================================================
-- WEST YELLOWSTONE PARTY PACK
-- ============================================================

insert into categories (id, name, description) values
  ('a1000000-0000-0000-0000-000000000011', 'West Yellowstone Party Pack', 'Bike ride and group trip missions built for a weekend in the wild.');

-- West Yellowstone Party Pack — On the Ride
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

-- West Yellowstone Party Pack — Trip Antics
insert into missions (text, category_id, tags) values
  ('Speak only in questions for 10 consecutive minutes. Someone has to explicitly call you out before you can stop.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,funny,group}'),
  ('Make up a team name for this weekend trip. Get every single person to say it at least once before midnight.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,group,funny}'),
  ('At some point, pretend you don''t know how to do something you obviously know how to do. Keep the act going as long as possible.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,sneaky,funny}'),
  ('Text someone in the group chat something cryptic and specific with zero context. Don''t explain it for at least 2 hours.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,sneaky,funny}'),
  ('Do your best impression of someone who is NOT on this trip. The group guesses.', 'a1000000-0000-0000-0000-000000000011', '{wypp,performance,funny,group}'),
  ('Convince at least 3 people to attempt a 10-minute victory nap after the ride. Everyone has to genuinely try.', 'a1000000-0000-0000-0000-000000000011', '{wypp,dare,social,funny}');

-- West Yellowstone Party Pack — Discovery
insert into missions (text, category_id, tags) values
  ('Find out something about someone in this group that genuinely surprises you. Report it back to at least one other person.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,connection,conversation}'),
  ('Ask two different people what they each think is the most underrated vegetable. Report their answers to the group.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,funny,conversation}'),
  ('Find out what two people in this group have in common that you didn''t already know.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,connection,conversation}'),
  ('Get the origin story of how two specific people in the group first met. Tell it back to them and see how accurate you are.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,story,connection}'),
  ('Find out what everyone thinks the group''s funniest shared memory is. See if anyone agrees.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,memory,group}'),
  ('Find out what someone''s most embarrassing purchase from the last year was.', 'a1000000-0000-0000-0000-000000000011', '{wypp,conversation,funny,vulnerable}'),
  ('Get someone else to describe what song best fits your energy on this trip. You can''t suggest it yourself.', 'a1000000-0000-0000-0000-000000000011', '{wypp,social,conversation,funny}');

-- West Yellowstone Party Pack — Group Games & Dinner
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
