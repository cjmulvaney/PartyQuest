-- Phase 3: Enable Supabase Realtime for leaderboard updates
-- Run this in Supabase SQL Editor

-- Enable realtime on participant_missions table
ALTER PUBLICATION supabase_realtime ADD TABLE participant_missions;
