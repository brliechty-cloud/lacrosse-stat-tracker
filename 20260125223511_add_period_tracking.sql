/*
  # Add Period Tracking to Game Events

  ## Changes
  
  1. New Columns
    - `period` (integer) - The period/quarter when the event occurred
      - Defaults to 1 (first period)
      - Used to track when during the game events happened
  
  2. Purpose
    - Enable period-by-period analysis of game statistics
    - Support goals by period summaries
    - Allow future per-period reporting without changing existing logic
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_events' AND column_name = 'period'
  ) THEN
    ALTER TABLE game_events ADD COLUMN period integer DEFAULT 1 NOT NULL;
  END IF;
END $$;