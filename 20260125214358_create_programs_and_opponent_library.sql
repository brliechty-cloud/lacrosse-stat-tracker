/*
  # Create Programs and Opponent Library

  1. New Tables
    - `programs`
      - `id` (uuid, primary key)
      - `name` (text) - e.g., "Varsity", "JV", "Freshman/Sophomore"
      - `created_at` (timestamptz)
    
    - `opponent_library`
      - `id` (uuid, primary key)
      - `name` (text) - Opponent team name
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Changes to Existing Tables
    - Update `games` table:
      - Add `program_id` (uuid, foreign key to programs)
      - Add `opponent_id` (uuid, foreign key to opponent_library)
    
    - Update `players` table:
      - Add `program_id` (uuid, foreign key to programs)
      - This links players to programs instead of individual games
  
  3. Security
    - Enable RLS on new tables
    - Add policies for public access (since auth is not implemented)
    
  4. Notes
    - Programs represent your teams (Varsity, JV, etc.)
    - Opponent library is shared across all programs
    - Each game links to a program and an opponent from the library
    - Players now belong to programs (persistent rosters)
    - Opponent players remain game-specific (via opponent_team_id)
*/

-- Create programs table
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to programs"
  ON programs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to programs"
  ON programs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to programs"
  ON programs FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow public delete to programs"
  ON programs FOR DELETE
  TO anon
  USING (true);

-- Create opponent library table
CREATE TABLE IF NOT EXISTS opponent_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE opponent_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to opponent_library"
  ON opponent_library FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to opponent_library"
  ON opponent_library FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to opponent_library"
  ON opponent_library FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow public delete to opponent_library"
  ON opponent_library FOR DELETE
  TO anon
  USING (true);

-- Add program_id and opponent_id to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'program_id'
  ) THEN
    ALTER TABLE games ADD COLUMN program_id uuid REFERENCES programs(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'opponent_id'
  ) THEN
    ALTER TABLE games ADD COLUMN opponent_id uuid REFERENCES opponent_library(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add program_id to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'program_id'
  ) THEN
    ALTER TABLE players ADD COLUMN program_id uuid REFERENCES programs(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_games_program_id ON games(program_id);
CREATE INDEX IF NOT EXISTS idx_games_opponent_id ON games(opponent_id);
CREATE INDEX IF NOT EXISTS idx_players_program_id ON players(program_id);

-- Insert default programs
INSERT INTO programs (name) VALUES 
  ('Varsity'),
  ('JV'),
  ('Freshman/Sophomore')
ON CONFLICT DO NOTHING;