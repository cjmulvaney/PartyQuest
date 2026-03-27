-- V2.4: Add feed_hidden toggle to events
-- Allows organizers to hide the activity feed entirely during an event

alter table events add column if not exists feed_hidden boolean default false;
