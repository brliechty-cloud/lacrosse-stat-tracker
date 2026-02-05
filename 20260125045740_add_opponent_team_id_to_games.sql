/*
  # Add Opponent Team Support

  1. Changes
    - Add `opponent_team_id` (uuid) column to games table to track opponent as a proper team
    - Create team records for all existing games with opponents
    - Update existing opponent players to reference the opponent team
  
  2. Notes
    - Each game's opponent gets their own team record
    - Opponent team name is stored in teams.name
    - Opponent players are linked to opponent_team_id instead of having null team_id
    - This enables proper team-based tracking for stats like faceoffs
*/

-- Add opponent_team_id column to games
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'opponent_team_id'
  ) THEN
    ALTER TABLE games ADD COLUMN opponent_team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create opponent teams for existing games that don't have one
DO $$
DECLARE
  game_record RECORD;
  new_team_id uuid;
BEGIN
  FOR game_record IN 
    SELECT id, opponent, team_id
    FROM games 
    WHERE opponent_team_id IS NULL AND opponent IS NOT NULL
  LOOP
    -- Create a team for this opponent
    INSERT INTO teams (name, created_at)
    VALUES (game_record.opponent, now())
    RETURNING id INTO new_team_id;
    
    -- Update the game to reference this opponent team
    UPDATE games 
    SET opponent_team_id = new_team_id 
    WHERE id = game_record.id;
    
    -- Update any opponent players for this game to use the new team_id
    UPDATE players 
    SET team_id = new_team_id 
    WHERE game_id = game_record.id AND is_opponent = true;
  END LOOP;
END $$;