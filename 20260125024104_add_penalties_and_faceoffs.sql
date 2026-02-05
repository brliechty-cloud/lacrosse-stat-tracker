/*
  # Add Penalties and Faceoffs Support

  1. Changes to game_events table
    - Add `penalty_type` (text) - type of penalty (e.g., "Slash", "Hold", "Offsides")
    - Add `penalty_duration` (integer) - duration in seconds
    - Add `penalty_player_id` (uuid) - player who committed the penalty (optional)
    - Add `faceoff_player1_id` (uuid) - first player in faceoff
    - Add `faceoff_player2_id` (uuid) - second player in faceoff
    - Add `faceoff_winner_team_id` (uuid) - team that won the faceoff

  2. Notes
    - Penalties can be team penalties (no player) or player penalties
    - Faceoffs track both participating players and which team won
    - All new fields are optional to maintain backward compatibility
*/

DO $$
BEGIN
  -- Add penalty fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_events' AND column_name = 'penalty_type'
  ) THEN
    ALTER TABLE game_events ADD COLUMN penalty_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_events' AND column_name = 'penalty_duration'
  ) THEN
    ALTER TABLE game_events ADD COLUMN penalty_duration integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_events' AND column_name = 'penalty_player_id'
  ) THEN
    ALTER TABLE game_events ADD COLUMN penalty_player_id uuid REFERENCES players(id) ON DELETE SET NULL;
  END IF;

  -- Add faceoff fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_events' AND column_name = 'faceoff_player1_id'
  ) THEN
    ALTER TABLE game_events ADD COLUMN faceoff_player1_id uuid REFERENCES players(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_events' AND column_name = 'faceoff_player2_id'
  ) THEN
    ALTER TABLE game_events ADD COLUMN faceoff_player2_id uuid REFERENCES players(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_events' AND column_name = 'faceoff_winner_team_id'
  ) THEN
    ALTER TABLE game_events ADD COLUMN faceoff_winner_team_id uuid;
  END IF;
END $$;