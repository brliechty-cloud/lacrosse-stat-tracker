/*
  # Update Game Events Constraint to Support All Event Types

  1. Changes
    - Drop the old event_type constraint that only allows 'shot', 'turnover', 'caused_turnover', 'ground_ball'
    - Add new constraint that includes all event types: 'shot', 'turnover', 'caused_turnover', 'ground_ball', 'penalty', 'faceoff', 'clear'
  
  2. Notes
    - This fixes the issue where penalty, faceoff, and clear events were not being saved to the database
    - The original constraint was created before these event types were added
*/

-- Drop the old constraint
ALTER TABLE game_events DROP CONSTRAINT IF EXISTS game_events_event_type_check;

-- Add new constraint with all event types
ALTER TABLE game_events ADD CONSTRAINT game_events_event_type_check 
  CHECK (event_type IN ('shot', 'turnover', 'caused_turnover', 'ground_ball', 'penalty', 'faceoff', 'clear'));