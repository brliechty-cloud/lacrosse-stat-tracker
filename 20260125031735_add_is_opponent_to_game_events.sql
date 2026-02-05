/*
  # Add opponent tracking to game events

  1. Changes
    - Add is_opponent boolean field to game_events table to properly track which side events belong to
    - Defaults to false for home team events
    - This allows proper filtering and display of events by team
*/

ALTER TABLE game_events ADD COLUMN IF NOT EXISTS is_opponent BOOLEAN DEFAULT false;