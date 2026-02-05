/*
  # Update Player Positions to Support Multiple Positions

  1. Changes
    - Change position from single value to array of values
    - Remove opponent_team_name (use game_id instead)
    - Add game_id to link opponent players to specific games
    
  2. Notes
    - Players can now have multiple positions (e.g., Attack/Midfield)
    - Opponent players are linked to games via game_id
*/

-- Drop the old constraint on position
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_position_check;

-- Change position to text array
DO $$
BEGIN
  -- First, convert existing single position values to arrays
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'position' AND data_type = 'text'
  ) THEN
    ALTER TABLE players ADD COLUMN position_temp text[];
    UPDATE players SET position_temp = ARRAY[position];
    ALTER TABLE players DROP COLUMN position;
    ALTER TABLE players RENAME COLUMN position_temp TO position;
  END IF;
END $$;

-- Ensure position is not null and has at least one value
ALTER TABLE players ALTER COLUMN position SET NOT NULL;

-- Drop opponent_team_name if it exists and add game_id instead
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'opponent_team_name'
  ) THEN
    ALTER TABLE players DROP COLUMN opponent_team_name;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'game_id'
  ) THEN
    ALTER TABLE players ADD COLUMN game_id uuid REFERENCES games(id) ON DELETE CASCADE;
  END IF;
END $$;