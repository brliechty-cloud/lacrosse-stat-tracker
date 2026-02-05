/*
  # Make game_events team_id nullable and remove constraint

  1. Changes
    - Drop the foreign key constraint from game_events.team_id to teams.id
    - Make team_id nullable to allow flexibility
    
  2. Reasoning
    - The application is transitioning from teams to programs
    - team_id will now store program IDs
    - Making it nullable allows for mixed usage during transition
*/

-- Drop the old foreign key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'game_events_team_id_fkey' 
    AND table_name = 'game_events'
  ) THEN
    ALTER TABLE game_events DROP CONSTRAINT game_events_team_id_fkey;
  END IF;
END $$;

-- Make team_id nullable
DO $$
BEGIN
  ALTER TABLE game_events ALTER COLUMN team_id DROP NOT NULL;
END $$;