/*
  # Add Current Goalie Tracking to Games

  ## Changes
  
  1. New Columns to `games` table:
    - `current_home_goalie_id` (uuid, nullable) - References the current goalie for the home team
    - `current_opponent_goalie_id` (uuid, nullable) - References the current goalie for the opponent team
  
  2. Purpose:
    - Track which goalie is currently in the game for each team
    - Automatically assign goals against and saves to the current goalie
    - Allow coaches to change goalies during the game
  
  ## Notes
  - These fields are nullable since goalies may not be set at game start
  - Foreign keys reference the players table
  - When a goal or save is recorded, it will default to the current goalie
*/

-- Add current goalie tracking columns to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'current_home_goalie_id'
  ) THEN
    ALTER TABLE games ADD COLUMN current_home_goalie_id uuid REFERENCES players(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'current_opponent_goalie_id'
  ) THEN
    ALTER TABLE games ADD COLUMN current_opponent_goalie_id uuid REFERENCES players(id) ON DELETE SET NULL;
  END IF;
END $$;