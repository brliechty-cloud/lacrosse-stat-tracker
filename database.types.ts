export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Position = 'Attack' | 'Midfield' | 'Defense' | 'Goalie';
export type EventType = 'shot' | 'turnover' | 'caused_turnover' | 'ground_ball' | 'penalty' | 'faceoff' | 'clear';
export type ShotOutcome = 'goal' | 'saved' | 'missed' | 'blocked';

export interface Database {
  public: {
    Tables: {
      programs: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      opponent_library: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      players: {
        Row: {
          id: string
          team_id: string | null
          program_id: string | null
          name: string
          number: number
          position: Position[]
          is_opponent: boolean
          game_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id?: string | null
          program_id?: string | null
          name: string
          number: number
          position: Position[]
          is_opponent?: boolean
          game_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string | null
          program_id?: string | null
          name?: string
          number?: number
          position?: Position[]
          is_opponent?: boolean
          game_id?: string | null
          created_at?: string
        }
      }
      games: {
        Row: {
          id: string
          team_id: string | null
          program_id: string | null
          opponent_id: string | null
          opponent: string | null
          opponent_team_name: string
          opponent_team_id: string | null
          game_date: string
          our_score: number
          opponent_score: number
          our_team_score: number
          opponent_team_score: number
          current_home_goalie_id: string | null
          current_opponent_goalie_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id?: string | null
          program_id?: string | null
          opponent_id?: string | null
          opponent?: string | null
          opponent_team_name?: string
          opponent_team_id?: string | null
          game_date?: string
          our_score?: number
          opponent_score?: number
          our_team_score?: number
          opponent_team_score?: number
          current_home_goalie_id?: string | null
          current_opponent_goalie_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string | null
          program_id?: string | null
          opponent_id?: string | null
          opponent?: string | null
          opponent_team_name?: string
          opponent_team_id?: string | null
          game_date?: string
          our_score?: number
          opponent_score?: number
          our_team_score?: number
          opponent_team_score?: number
          current_home_goalie_id?: string | null
          current_opponent_goalie_id?: string | null
          created_at?: string
        }
      }
      game_stats: {
        Row: {
          id: string
          game_id: string
          player_id: string
          goals: number
          assists: number
          shots: number
          ground_balls: number
          turnovers: number
          caused_turnovers: number
          saves: number
          goals_allowed: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          goals?: number
          assists?: number
          shots?: number
          ground_balls?: number
          turnovers?: number
          caused_turnovers?: number
          saves?: number
          goals_allowed?: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          goals?: number
          assists?: number
          shots?: number
          ground_balls?: number
          turnovers?: number
          caused_turnovers?: number
          saves?: number
          goals_allowed?: number
          created_at?: string
        }
      }
      game_events: {
        Row: {
          id: string
          game_id: string
          team_id: string
          event_type: EventType
          timestamp: string
          created_at: string
          is_opponent: boolean
          shot_outcome: ShotOutcome | null
          scorer_player_id: string | null
          assist_player_id: string | null
          goalie_player_id: string | null
          turnover_player_id: string | null
          caused_by_player_id: string | null
          linked_event_id: string | null
          ground_ball_player_id: string | null
          penalty_type: string | null
          penalty_duration: number | null
          penalty_player_id: string | null
          faceoff_player1_id: string | null
          faceoff_player2_id: string | null
          faceoff_winner_team_id: string | null
          clear_success: boolean | null
        }
        Insert: {
          id?: string
          game_id: string
          team_id: string
          event_type: EventType
          timestamp?: string
          created_at?: string
          is_opponent?: boolean
          shot_outcome?: ShotOutcome | null
          scorer_player_id?: string | null
          assist_player_id?: string | null
          goalie_player_id?: string | null
          turnover_player_id?: string | null
          caused_by_player_id?: string | null
          linked_event_id?: string | null
          ground_ball_player_id?: string | null
          penalty_type?: string | null
          penalty_duration?: number | null
          penalty_player_id?: string | null
          faceoff_player1_id?: string | null
          faceoff_player2_id?: string | null
          faceoff_winner_team_id?: string | null
          clear_success?: boolean | null
        }
        Update: {
          id?: string
          game_id?: string
          team_id?: string
          event_type?: EventType
          timestamp?: string
          created_at?: string
          is_opponent?: boolean
          shot_outcome?: ShotOutcome | null
          scorer_player_id?: string | null
          assist_player_id?: string | null
          goalie_player_id?: string | null
          turnover_player_id?: string | null
          caused_by_player_id?: string | null
          linked_event_id?: string | null
          ground_ball_player_id?: string | null
          penalty_type?: string | null
          penalty_duration?: number | null
          penalty_player_id?: string | null
          faceoff_player1_id?: string | null
          faceoff_player2_id?: string | null
          faceoff_winner_team_id?: string | null
          clear_success?: boolean | null
        }
      }
    }
  }
}
