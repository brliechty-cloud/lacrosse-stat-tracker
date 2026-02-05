/*
  # Fix Games Table Constraints
  
  1. Changes
    - Make `team_id` nullable (replaced by `program_id`)
    - Make `opponent` nullable (replaced by `opponent_id`)
    - Add default values to prevent insert failures
  
  2. Notes
    - The new program-based system uses `program_id` and `opponent_id`
    - Old columns are kept for backward compatibility but made optional
*/

-- Make team_id nullable
ALTER TABLE games ALTER COLUMN team_id DROP NOT NULL;

-- Make opponent nullable  
ALTER TABLE games ALTER COLUMN opponent DROP NOT NULL;