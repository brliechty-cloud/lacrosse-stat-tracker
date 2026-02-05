/*
  # Add Opponent Player Tracking

  1. Changes
    - Add `is_opponent` boolean to players table to distinguish team vs opponent players
    - Add `opponent_name` to games table for easier reference
    - Update players table to allow opponent players without team_id requirement
    
  2. Notes
    - Existing data will have is_opponent = false by default
    - Opponent players can be game-specific or reusable
*/

-- Add is_opponent column to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'is_opponent'
  ) THEN
    ALTER TABLE players ADD COLUMN is_opponent boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Make team_id nullable for opponent players
DO $$
BEGIN
  ALTER TABLE players ALTER COLUMN team_id DROP NOT NULL;
END $$;

-- Add game_id column to players for game-specific opponent rosters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'game_id'
  ) THEN
    ALTER TABLE players ADD COLUMN game_id uuid REFERENCES games(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_players_is_opponent ON players(is_opponent);
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);