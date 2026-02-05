/*
  # Add Clear Attempts Tracking

  1. Changes to game_events table
    - Add `clear_success` (boolean) - whether a clear attempt was successful
    - This allows tracking defensive clears for goalies and defenders
    
  2. Notes
    - Clear attempts provide context for defensive performance
    - Success rate helps evaluate goalie and defensive decision-making
    - Optional field maintains backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_events' AND column_name = 'clear_success'
  ) THEN
    ALTER TABLE game_events ADD COLUMN clear_success boolean;
  END IF;
END $$;