/*
  # Disable RLS for Anonymous Access

  1. Changes
    - Disable RLS on tables to allow anon key access for stat tracking app
    - This app doesn't use authentication, so data should be accessible to all users
    
  2. Security Notes
    - This is appropriate for a stat tracking app without user accounts
    - All data is considered public within the application context
*/

ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_events DISABLE ROW LEVEL SECURITY;