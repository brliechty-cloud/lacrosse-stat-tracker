/*
  # Event-Based Stat Tracking System

  1. New Tables
    - `game_events`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `team_id` (uuid, foreign key to teams)
      - `event_type` (text) - shot, turnover, caused_turnover, ground_ball
      - `timestamp` (timestamptz) - when the event occurred
      - `created_at` (timestamptz) - when record was created
      
      Shot-specific fields:
      - `shot_outcome` (text) - goal, saved, missed, blocked
      - `scorer_player_id` (uuid) - player who took the shot/scored
      - `assist_player_id` (uuid, optional) - player who assisted (only for goals)
      - `goalie_player_id` (uuid, optional) - goalie who made the save
      
      Turnover-specific fields:
      - `turnover_player_id` (uuid, optional) - player who committed turnover
      
      Caused Turnover-specific fields:
      - `caused_by_player_id` (uuid) - player who caused the turnover
      - `linked_event_id` (uuid, optional) - links to the opponent's turnover event
      
      Ground Ball-specific fields:
      - `ground_ball_player_id` (uuid) - player who got the ground ball

  2. Security
    - Enable RLS on `game_events` table
    - Add policies for all users to manage events (simplified for now)

  3. Important Notes
    - All stats are derived from events, no running totals stored
    - Assists can only exist as part of goal shots
    - Caused turnovers are linked to opponent turnover events
    - Events maintain chronological order via timestamp
*/

-- Create game_events table
CREATE TABLE IF NOT EXISTS game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('shot', 'turnover', 'caused_turnover', 'ground_ball')),
  timestamp timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Shot-specific fields
  shot_outcome text CHECK (shot_outcome IN ('goal', 'saved', 'missed', 'blocked') OR shot_outcome IS NULL),
  scorer_player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  assist_player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  goalie_player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  
  -- Turnover-specific fields
  turnover_player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  
  -- Caused Turnover-specific fields
  caused_by_player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  linked_event_id uuid REFERENCES game_events(id) ON DELETE SET NULL,
  
  -- Ground Ball-specific fields
  ground_ball_player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  
  -- Constraints to ensure correct fields are set for each event type
  CONSTRAINT shot_fields_check CHECK (
    (event_type = 'shot' AND shot_outcome IS NOT NULL AND scorer_player_id IS NOT NULL) OR
    event_type != 'shot'
  ),
  CONSTRAINT turnover_fields_check CHECK (
    (event_type = 'turnover') OR
    event_type != 'turnover'
  ),
  CONSTRAINT caused_turnover_fields_check CHECK (
    (event_type = 'caused_turnover' AND caused_by_player_id IS NOT NULL) OR
    event_type != 'caused_turnover'
  ),
  CONSTRAINT ground_ball_fields_check CHECK (
    (event_type = 'ground_ball' AND ground_ball_player_id IS NOT NULL) OR
    event_type != 'ground_ball'
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS game_events_game_id_idx ON game_events(game_id);
CREATE INDEX IF NOT EXISTS game_events_timestamp_idx ON game_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS game_events_team_id_idx ON game_events(team_id);

-- Enable RLS
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all events
CREATE POLICY "Authenticated users can view game events"
  ON game_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert events
CREATE POLICY "Authenticated users can insert game events"
  ON game_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can delete events
CREATE POLICY "Authenticated users can delete game events"
  ON game_events
  FOR DELETE
  TO authenticated
  USING (true);