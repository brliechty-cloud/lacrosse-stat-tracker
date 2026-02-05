/*
  # Add Score Tracking Columns to Games Table

  1. Changes
    - Add `our_score` column (integer, defaults to 0) to track home team score
    - Add `opponent_score` column (integer, defaults to 0) to track opponent score
  
  2. Notes
    - Using IF NOT EXISTS pattern to make migration idempotent
    - Scores default to 0 for new games
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'our_score'
  ) THEN
    ALTER TABLE games ADD COLUMN our_score integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'opponent_score'
  ) THEN
    ALTER TABLE games ADD COLUMN opponent_score integer DEFAULT 0;
  END IF;
END $$;