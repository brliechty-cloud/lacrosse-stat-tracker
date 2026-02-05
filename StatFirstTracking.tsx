import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database, Position, EventType, ShotOutcome } from '../lib/database.types';
import { ArrowLeft, Eye, Users, UserPlus, Edit2, Trash2, Target, Circle, AlertTriangle, Shield, Flag, CircleDot, Settings, Undo2, CheckCircle, XCircle, Hash, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

type Player = Database['public']['Tables']['players']['Row'];
type Game = Database['public']['Tables']['games']['Row'];
type GameEvent = Database['public']['Tables']['game_events']['Row'];

const POSITIONS: Position[] = ['Attack', 'Midfield', 'Defense', 'Goalie'];

const PENALTY_TYPES = [
  'Slash', 'Hold', 'Push', 'Offsides', 'Illegal Body Check',
  'Cross Check', 'Interference', 'Unsportsmanlike', 'Illegal Equipment',
  'Too Many Players', 'Technical Foul', 'Other'
];

interface StatFirstTrackingProps {
  gameId: string;
  programId: string;
  onBack: () => void;
  onShowSummary: () => void;
}

type ActionType = 'shot' | 'ground_ball' | 'turnover' | 'caused_turnover' | 'penalty' | 'faceoff' | 'clear' | 'failed_clear';

export function StatFirstTracking({ gameId, programId, onBack, onShowSummary }: StatFirstTrackingProps) {
  const teamId = programId;
  const { theme, toggleTheme } = useTheme();

  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [opponentPlayers, setOpponentPlayers] = useState<Player[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);

  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [periodType, setPeriodType] = useState<'quarters' | 'halves'>('quarters');

  const [selectedAction, setSelectedAction] = useState<{ type: ActionType; side: 'home' | 'opponent' } | null>(null);
  const [showShotOutcomeModal, setShowShotOutcomeModal] = useState<'home' | 'opponent' | null>(null);
  const [selectedShotOutcome, setSelectedShotOutcome] = useState<ShotOutcome | null>(null);
  const [showGoalModal, setShowGoalModal] = useState<{ side: 'home' | 'opponent'; teamId: string } | null>(null);
  const [selectedGoalScorer, setSelectedGoalScorer] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState<{ side: 'home' | 'opponent'; teamId: string; shooterId: string; eventId: string } | null>(null);
  const [showTurnoverCausedByModal, setShowTurnoverCausedByModal] = useState<{ side: 'home' | 'opponent'; turnoverPlayerId: string; turnoverTeamId: string; turnoverIsOpponent: boolean } | null>(null);

  const [showPenaltyModal, setShowPenaltyModal] = useState<'home' | 'opponent' | null>(null);
  const [penaltyData, setPenaltyData] = useState<{
    type: string;
    minutes: string;
    seconds: string;
    playerId: string | null;
  }>({ type: 'Other', minutes: '1', seconds: '0', playerId: null });

  const [showFaceoffModal, setShowFaceoffModal] = useState(false);
  const [faceoffData, setFaceoffData] = useState<{
    player1Id: string | null;
    player2Id: string | null;
    winnerId: string | null;
  }>({ player1Id: null, player2Id: null, winnerId: null });

  const [showPlayerManagement, setShowPlayerManagement] = useState<'home' | 'opponent' | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    positions: ['Midfield'] as Position[],
  });

  const [showTeamNameEditor, setShowTeamNameEditor] = useState(false);
  const [teamNameData, setTeamNameData] = useState({ ourTeam: '', opponent: '' });

  const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null);

  const [showGoalieSelector, setShowGoalieSelector] = useState<'home' | 'opponent' | null>(null);
  const [requireGoalieFor, setRequireGoalieFor] = useState<{ action: () => void; side: 'home' | 'opponent' } | null>(null);

  const [showGenerateNumbersModal, setShowGenerateNumbersModal] = useState(false);
  const [numberRangeData, setNumberRangeData] = useState({ start: '1', end: '100' });

  const [showEditClearModal, setShowEditClearModal] = useState<{ side: 'home' | 'opponent'; currentSuccess: boolean } | null>(null);

  useEffect(() => {
    loadData();
  }, [gameId, programId]);

  useEffect(() => {
    if (editingEvent) {
      const eventType = editingEvent.event_type;

      if (eventType === 'shot') {
        const side = editingEvent.is_opponent ? 'opponent' : 'home';
        const outcome = editingEvent.shot_outcome as ShotOutcome;

        setSelectedShotOutcome(outcome);
        setShowShotOutcomeModal(side);
      } else if (eventType === 'ground_ball') {
        const side = editingEvent.is_opponent ? 'opponent' : 'home';
        setSelectedAction({ type: 'ground_ball', side });
      } else if (eventType === 'turnover') {
        const side = editingEvent.is_opponent ? 'opponent' : 'home';
        setSelectedAction({ type: 'turnover', side });
      } else if (eventType === 'penalty') {
        const side = editingEvent.is_opponent ? 'opponent' : 'home';
        const duration = editingEvent.penalty_duration || 0;
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        setPenaltyData({
          type: editingEvent.penalty_type || 'Other',
          minutes: minutes.toString(),
          seconds: seconds.toString(),
          playerId: editingEvent.penalty_player_id || null
        });
        setShowPenaltyModal(side);
      } else if (eventType === 'faceoff') {
        const yourTeamWon = teamPlayers.find(p => p.id === editingEvent.faceoff_player1_id);
        const winnerId = yourTeamWon ? editingEvent.faceoff_player1_id : editingEvent.faceoff_player2_id;

        setFaceoffData({
          player1Id: editingEvent.faceoff_player1_id || null,
          player2Id: editingEvent.faceoff_player2_id || null,
          winnerId: winnerId || null
        });
        setShowFaceoffModal(true);
      } else if (eventType === 'clear') {
        const side = editingEvent.is_opponent ? 'opponent' : 'home';
        setShowEditClearModal({
          side,
          currentSuccess: editingEvent.clear_success || false
        });
      }
    }
  }, [editingEvent, events, teamPlayers, game, teamId]);

  async function loadData() {
    const [teamPlayersResult, opponentPlayersResult, gameResult, eventsResult] = await Promise.all([
      supabase.from('players').select('*').eq('program_id', programId).order('number'),
      supabase.from('players').select('*').eq('game_id', gameId).eq('is_opponent', true).order('number'),
      supabase.from('games').select('*').eq('id', gameId).maybeSingle(),
      supabase.from('game_events').select('*').eq('game_id', gameId).order('created_at', { ascending: false }),
    ]);

    if (teamPlayersResult.data) setTeamPlayers(teamPlayersResult.data);
    if (opponentPlayersResult.data) setOpponentPlayers(opponentPlayersResult.data);
    if (gameResult.data) {
      const { data: programData } = await supabase.from('programs').select('*').eq('id', gameResult.data.program_id).maybeSingle();
      setTeamNameData({
        ourTeam: programData?.name || 'Your Team',
        opponent: gameResult.data.opponent || 'Opponent'
      });
    }
    if (eventsResult.data) {
      setEvents(eventsResult.data);

      const goalEvents = eventsResult.data.filter(e => e.event_type === 'shot' && e.shot_outcome === 'goal');
      const ourGoals = goalEvents.filter(e => teamPlayersResult.data?.some(p => p.id === e.scorer_player_id)).length;
      const oppGoals = goalEvents.filter(e => opponentPlayersResult.data?.some(p => p.id === e.scorer_player_id)).length;

      await supabase.from('games').update({
        our_score: ourGoals,
        opponent_score: oppGoals
      }).eq('id', gameId);

      const { data: updatedGame } = await supabase.from('games').select('*').eq('id', gameId).maybeSingle();
      if (updatedGame) setGame(updatedGame);
    } else if (gameResult.data) {
      setGame(gameResult.data);
    }
  }

  function checkGoalieRequired(side: 'home' | 'opponent'): boolean {
    const currentGoalieId = side === 'home' ? game?.current_home_goalie_id : game?.current_opponent_goalie_id;
    return !currentGoalieId;
  }

  function handleActionClick(actionType: ActionType, side: 'home' | 'opponent') {
    if (actionType === 'clear' || actionType === 'failed_clear') {
      if (checkGoalieRequired(side)) {
        setRequireGoalieFor({ action: () => recordClear(side, actionType === 'clear'), side });
        setShowGoalieSelector(side);
        return;
      }
      recordClear(side, actionType === 'clear');
    } else if (actionType === 'shot') {
      setShowShotOutcomeModal(side);
    } else if (actionType === 'penalty') {
      setShowPenaltyModal(side);
      setPenaltyData({ type: 'Other', minutes: '1', seconds: '0', playerId: null });
    } else if (actionType === 'faceoff') {
      setShowFaceoffModal(true);
      setFaceoffData({ player1Id: null, player2Id: null, winnerId: null });
    } else {
      setSelectedAction({ type: actionType, side });
    }
  }

  async function handleShotOutcome(outcome: ShotOutcome, side: 'home' | 'opponent') {
    setSelectedShotOutcome(outcome);
    const currentTeamId = side === 'home' ? teamId : game?.team_id || teamId;
    const opposingSide = side === 'home' ? 'opponent' : 'home';

    if (outcome === 'goal') {
      if (checkGoalieRequired(opposingSide)) {
        setRequireGoalieFor({
          action: () => {
            setShowGoalModal({ side, teamId: currentTeamId });
            setShowShotOutcomeModal(null);
          },
          side: opposingSide
        });
        setShowGoalieSelector(opposingSide);
        return;
      }
      setShowGoalModal({ side, teamId: currentTeamId });
      setShowShotOutcomeModal(null);
    } else if (outcome === 'saved') {
      if (checkGoalieRequired(opposingSide)) {
        setRequireGoalieFor({
          action: () => {
            setShowShotOutcomeModal(null);
            setSelectedAction({ type: 'shot', side });
          },
          side: opposingSide
        });
        setShowGoalieSelector(opposingSide);
        return;
      }
      setShowShotOutcomeModal(null);
      setSelectedAction({ type: 'shot', side });
    } else {
      setShowShotOutcomeModal(null);
      setSelectedAction({ type: 'shot', side });
    }
  }

  async function handlePlayerSelection(playerId: string) {
    if (!selectedAction || !game) return;

    const isOpponent = selectedAction.side === 'opponent';
    const currentTeamId = isOpponent ? (game.team_id || teamId) : teamId;

    switch (selectedAction.type) {
      case 'shot':
        if (editingEvent) {
          // UPDATE existing shot event
          const opposingSide = selectedAction.side === 'home' ? 'opponent' : 'home';
          const opposingGoalieId = opposingSide === 'home' ? game.current_home_goalie_id : game.current_opponent_goalie_id;

          await supabase
            .from('game_events')
            .update({
              scorer_player_id: playerId,
              shot_outcome: selectedShotOutcome,
              goalie_player_id: selectedShotOutcome === 'saved' ? opposingGoalieId : null,
            })
            .eq('id', editingEvent.id);

          setEditingEvent(null);
          await loadData();
        } else if (selectedShotOutcome === 'saved') {
          const opposingSide = selectedAction.side === 'home' ? 'opponent' : 'home';
          const opposingGoalieId = opposingSide === 'home' ? game.current_home_goalie_id : game.current_opponent_goalie_id;

          const { data: newEvent } = await supabase
            .from('game_events')
            .insert({
              game_id: gameId,
              team_id: currentTeamId,
              event_type: 'shot',
              shot_outcome: 'saved',
              scorer_player_id: playerId,
              goalie_player_id: opposingGoalieId,
              is_opponent: isOpponent,
              timestamp: new Date().toISOString(),
            })
            .select()
            .single();

          if (newEvent && !opposingGoalieId) {
            setShowSaveModal({
              side: opposingSide,
              teamId: opposingSide === 'home' ? teamId : game.team_id || teamId,
              shooterId: playerId,
              eventId: newEvent.id
            });
          }
          await loadData();
        } else if (selectedShotOutcome) {
          await supabase
            .from('game_events')
            .insert({
              game_id: gameId,
              team_id: currentTeamId,
              event_type: 'shot',
              shot_outcome: selectedShotOutcome,
              scorer_player_id: playerId,
              is_opponent: isOpponent,
              timestamp: new Date().toISOString(),
            });

          await loadData();
        }
        setSelectedAction(null);
        setSelectedShotOutcome(null);
        break;

      case 'ground_ball':
        if (editingEvent) {
          // UPDATE existing ground ball event
          await supabase
            .from('game_events')
            .update({
              ground_ball_player_id: playerId,
            })
            .eq('id', editingEvent.id);

          setEditingEvent(null);
          setSelectedAction(null);
          await loadData();
        } else {
          await recordGroundBall(playerId, currentTeamId, isOpponent);
        }
        break;

      case 'turnover':
        if (editingEvent) {
          // For editing a turnover, we need to show the caused-by modal with the editing event context
          setSelectedAction(null);
          const opposingSide = selectedAction.side === 'home' ? 'opponent' : 'home';
          setShowTurnoverCausedByModal({
            side: opposingSide,
            turnoverPlayerId: playerId,
            turnoverTeamId: currentTeamId,
            turnoverIsOpponent: isOpponent
          });
        } else {
          setSelectedAction(null);
          const opposingSide = selectedAction.side === 'home' ? 'opponent' : 'home';
          setShowTurnoverCausedByModal({
            side: opposingSide,
            turnoverPlayerId: playerId,
            turnoverTeamId: currentTeamId,
            turnoverIsOpponent: isOpponent
          });
        }
        break;

      case 'caused_turnover':
        await recordCausedTurnover(playerId, currentTeamId, isOpponent);
        break;
    }
  }

  async function handleGoalScorerSelection(scorerId: string) {
    setSelectedGoalScorer(scorerId);
  }

  async function handleAssistSelection(assisterId: string | null) {
    if (!selectedGoalScorer || !showGoalModal || !game) return;

    const isOpponent = showGoalModal.side === 'opponent';
    const opposingSide = showGoalModal.side === 'home' ? 'opponent' : 'home';
    const opposingGoalieId = opposingSide === 'home' ? game.current_home_goalie_id : game.current_opponent_goalie_id;

    if (editingEvent) {
      // UPDATE existing event
      await supabase
        .from('game_events')
        .update({
          scorer_player_id: selectedGoalScorer,
          assist_player_id: assisterId,
          goalie_player_id: opposingGoalieId,
        })
        .eq('id', editingEvent.id);

      setEditingEvent(null);
    } else {
      // INSERT new event
      await supabase
        .from('game_events')
        .insert({
          game_id: gameId,
          team_id: showGoalModal.teamId,
          event_type: 'shot',
          shot_outcome: 'goal',
          scorer_player_id: selectedGoalScorer,
          assist_player_id: assisterId,
          goalie_player_id: opposingGoalieId,
          is_opponent: isOpponent,
          timestamp: new Date().toISOString(),
          period: currentPeriod,
        });
    }

    setShowGoalModal(null);
    setSelectedGoalScorer(null);

    await loadData();
  }

  async function saveSave(goalieId: string | null) {
    if (!showSaveModal) return;

    if (goalieId) {
      await supabase
        .from('game_events')
        .update({ goalie_player_id: goalieId })
        .eq('id', showSaveModal.eventId);
    }

    setShowSaveModal(null);
    await loadData();
  }

  async function handleTurnoverCausedBy(causerId: string | null) {
    if (!showTurnoverCausedByModal) return;

    const { turnoverPlayerId, turnoverTeamId, turnoverIsOpponent } = showTurnoverCausedByModal;

    if (editingEvent && editingEvent.event_type === 'turnover') {
      // UPDATE existing turnover event
      await supabase
        .from('game_events')
        .update({
          turnover_player_id: turnoverPlayerId,
        })
        .eq('id', editingEvent.id);

      // Handle the linked caused_turnover event
      const linkedCausedTO = events.find(e => e.event_type === 'caused_turnover' && e.linked_event_id === editingEvent.id);

      if (causerId) {
        const causerIsOpponent = !turnoverIsOpponent;
        const causerTeamId = causerIsOpponent ? (game?.team_id || teamId) : teamId;

        if (linkedCausedTO) {
          // UPDATE existing caused_turnover
          await supabase
            .from('game_events')
            .update({
              caused_by_player_id: causerId,
            })
            .eq('id', linkedCausedTO.id);
        } else {
          // INSERT new caused_turnover
          await supabase
            .from('game_events')
            .insert({
              game_id: gameId,
              team_id: causerTeamId,
              event_type: 'caused_turnover',
              caused_by_player_id: causerId,
              linked_event_id: editingEvent.id,
              is_opponent: causerIsOpponent,
              timestamp: new Date().toISOString(),
            });
        }
      } else if (linkedCausedTO) {
        // Remove the caused_turnover if causerId is null
        await supabase
          .from('game_events')
          .delete()
          .eq('id', linkedCausedTO.id);
      }

      setEditingEvent(null);
    } else {
      // INSERT new turnover event
      const { data: turnoverEvent } = await supabase
        .from('game_events')
        .insert({
          game_id: gameId,
          team_id: turnoverTeamId,
          event_type: 'turnover',
          turnover_player_id: turnoverPlayerId,
          is_opponent: turnoverIsOpponent,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (causerId && turnoverEvent) {
        const causerIsOpponent = !turnoverIsOpponent;
        const causerTeamId = causerIsOpponent ? (game?.team_id || teamId) : teamId;

        await supabase
          .from('game_events')
          .insert({
            game_id: gameId,
            team_id: causerTeamId,
            event_type: 'caused_turnover',
            caused_by_player_id: causerId,
            linked_event_id: turnoverEvent.id,
            is_opponent: causerIsOpponent,
            timestamp: new Date().toISOString(),
          });
      }
    }

    setShowTurnoverCausedByModal(null);
    await loadData();
  }

  async function recordPenalty() {
    if (!showPenaltyModal || !penaltyData.type) return;

    const isOpponent = showPenaltyModal === 'opponent';
    const currentTeamId = isOpponent ? (game?.team_id || teamId) : teamId;
    const totalSeconds = parseInt(penaltyData.minutes) * 60 + parseInt(penaltyData.seconds);

    if (editingEvent) {
      // UPDATE existing event
      await supabase
        .from('game_events')
        .update({
          penalty_type: penaltyData.type,
          penalty_duration: totalSeconds,
          penalty_player_id: penaltyData.playerId,
        })
        .eq('id', editingEvent.id);

      setEditingEvent(null);
    } else {
      // INSERT new event
      await supabase
        .from('game_events')
        .insert({
          game_id: gameId,
          team_id: currentTeamId,
          event_type: 'penalty',
          penalty_type: penaltyData.type,
          penalty_duration: totalSeconds,
          penalty_player_id: penaltyData.playerId,
          is_opponent: isOpponent,
          timestamp: new Date().toISOString(),
          period: currentPeriod,
        });
    }

    setShowPenaltyModal(null);
    setPenaltyData({ type: 'Other', minutes: '1', seconds: '0', playerId: null });
    await loadData();
  }

  async function recordFaceoff() {
    if (!faceoffData.player1Id || !faceoffData.player2Id || !faceoffData.winnerId || !game) return;

    const yourTeamWon = teamPlayers.find(p => p.id === faceoffData.winnerId);
    let winnerTeamId = yourTeamWon ? teamId : game.opponent_team_id;

    if (!winnerTeamId && !yourTeamWon) {
      const opponentName = game.opponent || game.opponent_team_name || 'Opponent';

      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({ name: opponentName })
        .select()
        .single();

      if (teamError || !newTeam) {
        console.error('Failed to create opponent team:', teamError);
        return;
      }

      winnerTeamId = newTeam.id;

      await supabase
        .from('games')
        .update({ opponent_team_id: newTeam.id })
        .eq('id', gameId);

      await supabase
        .from('players')
        .update({ team_id: newTeam.id })
        .eq('game_id', gameId)
        .eq('is_opponent', true);
    }

    if (!winnerTeamId) {
      console.error('Cannot determine winner team ID');
      return;
    }

    if (editingEvent) {
      // UPDATE existing event
      await supabase
        .from('game_events')
        .update({
          faceoff_player1_id: faceoffData.player1Id,
          faceoff_player2_id: faceoffData.player2Id,
          faceoff_winner_team_id: winnerTeamId,
        })
        .eq('id', editingEvent.id);

      setEditingEvent(null);
    } else {
      // INSERT new event
      await supabase
        .from('game_events')
        .insert({
          game_id: gameId,
          team_id: teamId,
          event_type: 'faceoff',
          faceoff_player1_id: faceoffData.player1Id,
          faceoff_player2_id: faceoffData.player2Id,
          faceoff_winner_team_id: winnerTeamId,
          is_opponent: false,
          timestamp: new Date().toISOString(),
          period: currentPeriod,
        });
    }

    setShowFaceoffModal(false);
    setFaceoffData({ player1Id: null, player2Id: null, winnerId: null });
    await loadData();
  }

  async function recordGroundBall(playerId: string, currentTeamId: string, isOpponent: boolean) {
    await supabase
      .from('game_events')
      .insert({
        game_id: gameId,
        team_id: currentTeamId,
        event_type: 'ground_ball',
        ground_ball_player_id: playerId,
        is_opponent: isOpponent,
        timestamp: new Date().toISOString(),
        period: currentPeriod,
      });

    setSelectedAction(null);
    await loadData();
  }

  async function recordTurnover(playerId: string, currentTeamId: string, isOpponent: boolean) {
    await supabase
      .from('game_events')
      .insert({
        game_id: gameId,
        team_id: currentTeamId,
        event_type: 'turnover',
        turnover_player_id: playerId,
        is_opponent: isOpponent,
        timestamp: new Date().toISOString(),
        period: currentPeriod,
      });

    setSelectedAction(null);
    await loadData();
  }

  async function recordCausedTurnover(playerId: string, currentTeamId: string, isOpponent: boolean) {
    const opposingTeamId = selectedAction?.side === 'home' ? (game?.team_id || teamId) : teamId;
    const opponentIsOpponent = !isOpponent;

    const { data: opponentTO } = await supabase
      .from('game_events')
      .insert({
        game_id: gameId,
        team_id: opposingTeamId,
        event_type: 'turnover',
        turnover_player_id: null,
        is_opponent: opponentIsOpponent,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (!opponentTO) return;

    await supabase
      .from('game_events')
      .insert({
        game_id: gameId,
        team_id: currentTeamId,
        event_type: 'caused_turnover',
        caused_by_player_id: playerId,
        linked_event_id: opponentTO.id,
        is_opponent: isOpponent,
        timestamp: new Date().toISOString(),
        period: currentPeriod,
      });

    setSelectedAction(null);
    await loadData();
  }

  async function selectGoalie(goalieId: string, side: 'home' | 'opponent') {
    const field = side === 'home' ? 'current_home_goalie_id' : 'current_opponent_goalie_id';

    await supabase
      .from('games')
      .update({ [field]: goalieId })
      .eq('id', gameId);

    await loadData();
    setShowGoalieSelector(null);

    if (requireGoalieFor) {
      requireGoalieFor.action();
      setRequireGoalieFor(null);
    }
  }

  async function recordClear(side: 'home' | 'opponent', success: boolean) {
    const isOpponent = side === 'opponent';
    const currentTeamId = isOpponent ? (game?.team_id || teamId) : teamId;

    if (editingEvent) {
      // UPDATE existing clear event
      await supabase
        .from('game_events')
        .update({
          clear_success: success,
        })
        .eq('id', editingEvent.id);

      setEditingEvent(null);
    } else {
      // INSERT new clear event
      await supabase
        .from('game_events')
        .insert({
          game_id: gameId,
          team_id: currentTeamId,
          event_type: 'clear',
          clear_success: success,
          is_opponent: isOpponent,
          timestamp: new Date().toISOString(),
          period: currentPeriod,
        });
    }

    await loadData();
  }

  async function undoLastPlay() {
    if (events.length === 0) return;

    const lastEvent = events[0];

    if (lastEvent.event_type === 'caused_turnover' && lastEvent.linked_event_id) {
      await supabase.from('game_events').delete().eq('id', lastEvent.linked_event_id);
    }

    if (lastEvent.event_type === 'turnover') {
      const linkedCausedTO = events.find(e => e.event_type === 'caused_turnover' && e.linked_event_id === lastEvent.id);
      if (linkedCausedTO) {
        await supabase.from('game_events').delete().eq('id', linkedCausedTO.id);
      }
    }

    await supabase.from('game_events').delete().eq('id', lastEvent.id);
    await loadData();
  }

  async function deleteEvent(eventId: string) {
    const eventToDelete = events.find(e => e.id === eventId);
    if (!eventToDelete) return;

    if (eventToDelete.event_type === 'caused_turnover' && eventToDelete.linked_event_id) {
      await supabase.from('game_events').delete().eq('id', eventToDelete.linked_event_id);
    }

    await supabase.from('game_events').delete().eq('id', eventId);
    await loadData();
  }

  async function updateScore() {
    const goalEvents = events.filter(e => e.event_type === 'shot' && e.shot_outcome === 'goal');
    const ourGoals = goalEvents.filter(e => teamPlayers.some(p => p.id === e.scorer_player_id)).length;
    const oppGoals = goalEvents.filter(e => opponentPlayers.some(p => p.id === e.scorer_player_id)).length;

    await supabase.from('games').update({
      our_score: ourGoals,
      opponent_score: oppGoals
    }).eq('id', gameId);

    const { data: updatedGame } = await supabase.from('games').select('*').eq('id', gameId).maybeSingle();
    if (updatedGame) setGame(updatedGame);
  }

  async function updateTeamNames() {
    if (!game) return;

    await supabase.from('teams').update({ name: teamNameData.ourTeam }).eq('id', game.team_id);
    await supabase.from('games').update({ opponent: teamNameData.opponent }).eq('id', gameId);

    const { data: updatedGame } = await supabase.from('games').select('*').eq('id', gameId).maybeSingle();
    if (updatedGame) setGame(updatedGame);

    setShowTeamNameEditor(false);
  }

  function getEventDescription(event: GameEvent): string {
    const teamName = event.is_opponent ? teamNameData.opponent : teamNameData.ourTeam;

    if (event.event_type === 'shot') {
      const player = [...teamPlayers, ...opponentPlayers].find(p => p.id === event.scorer_player_id);
      const assister = event.assist_player_id ? [...teamPlayers, ...opponentPlayers].find(p => p.id === event.assist_player_id) : null;
      const goalie = event.goalie_player_id ? [...teamPlayers, ...opponentPlayers].find(p => p.id === event.goalie_player_id) : null;

      if (event.shot_outcome === 'goal') {
        return `GOAL - ${player?.name || 'Unknown'}${assister ? ` from ${assister.name}` : ''} (${teamName})`;
      } else if (event.shot_outcome === 'saved') {
        return `Save${goalie ? ` by ${goalie.name}` : ''} on ${player?.name || 'Unknown'}'s shot (${teamName})`;
      } else if (event.shot_outcome === 'missed') {
        return `Shot missed by ${player?.name || 'Unknown'} (${teamName})`;
      } else {
        return `Shot blocked - ${player?.name || 'Unknown'} (${teamName})`;
      }
    } else if (event.event_type === 'ground_ball') {
      const player = [...teamPlayers, ...opponentPlayers].find(p => p.id === event.ground_ball_player_id);
      return `Ground ball - ${player?.name || 'Unknown'} (${teamName})`;
    } else if (event.event_type === 'turnover') {
      const player = event.turnover_player_id ? [...teamPlayers, ...opponentPlayers].find(p => p.id === event.turnover_player_id) : null;
      return `Turnover${player ? ` - ${player.name}` : ''} (${teamName})`;
    } else if (event.event_type === 'caused_turnover') {
      const player = [...teamPlayers, ...opponentPlayers].find(p => p.id === event.caused_by_player_id);
      return `Caused turnover - ${player?.name || 'Unknown'} (${teamName})`;
    } else if (event.event_type === 'penalty') {
      const player = event.penalty_player_id ? [...teamPlayers, ...opponentPlayers].find(p => p.id === event.penalty_player_id) : null;
      const minutes = Math.floor((event.penalty_duration || 0) / 60);
      const seconds = (event.penalty_duration || 0) % 60;
      const duration = minutes > 0 ? (seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${minutes}:00`) : `${seconds}s`;
      return `Penalty - ${event.penalty_type} (${duration})${player ? ` - ${player.name}` : ''} (${teamName})`;
    } else if (event.event_type === 'faceoff') {
      const player1 = [...teamPlayers, ...opponentPlayers].find(p => p.id === event.faceoff_player1_id);
      const player2 = [...teamPlayers, ...opponentPlayers].find(p => p.id === event.faceoff_player2_id);
      const winner = event.faceoff_winner_team_id === teamId ? teamNameData.ourTeam : teamNameData.opponent;
      return `Faceoff: ${player1?.name || 'Unknown'} vs ${player2?.name || 'Unknown'} - Won by ${winner}`;
    } else if (event.event_type === 'clear') {
      return event.clear_success ? `Clear successful (${teamName})` : `Clear failed (${teamName})`;
    }
    return 'Unknown event';
  }

  function getEventIcon(event: GameEvent) {
    if (event.event_type === 'shot') {
      if (event.shot_outcome === 'goal') return <Target className="text-green-600" size={20} />;
      if (event.shot_outcome === 'saved') return <Shield className="text-teal-600" size={20} />;
      return <Target className="text-green-600" size={20} />;
    } else if (event.event_type === 'ground_ball') {
      return <Circle className="text-yellow-600" size={20} />;
    } else if (event.event_type === 'turnover') {
      return <AlertTriangle className="text-red-600" size={20} />;
    } else if (event.event_type === 'caused_turnover') {
      return <Shield className="text-indigo-600" size={20} />;
    } else if (event.event_type === 'penalty') {
      return <Flag className="text-purple-600" size={20} />;
    } else if (event.event_type === 'faceoff') {
      return <CircleDot className="text-blue-600" size={20} />;
    } else if (event.event_type === 'clear') {
      return event.clear_success ? <CheckCircle className="text-emerald-600" size={20} /> : <XCircle className="text-red-600" size={20} />;
    }
    return null;
  }

  async function addPlayer(side: 'home' | 'opponent') {
    const isOpponent = side === 'opponent';
    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert({
        name: formData.name,
        number: parseInt(formData.number),
        position: formData.positions,
        program_id: isOpponent ? null : programId,
        game_id: isOpponent ? gameId : null,
        is_opponent: isOpponent,
      })
      .select()
      .single();

    if (!error && newPlayer) {
      if (isOpponent) {
        setOpponentPlayers([...opponentPlayers, newPlayer].sort((a, b) => a.number - b.number));
      } else {
        setTeamPlayers([...teamPlayers, newPlayer].sort((a, b) => a.number - b.number));
      }
    }
    resetForm();
  }

  async function updatePlayer() {
    if (!editingPlayer) return;

    const { error } = await supabase
      .from('players')
      .update({
        name: formData.name,
        number: parseInt(formData.number),
        position: formData.positions,
      })
      .eq('id', editingPlayer.id);

    if (error) return;

    const updatedPlayer = {
      ...editingPlayer,
      name: formData.name,
      number: parseInt(formData.number),
      position: formData.positions,
    };

    if (editingPlayer.is_opponent) {
      setOpponentPlayers(opponentPlayers.map((p) => (p.id === editingPlayer.id ? updatedPlayer : p)).sort((a, b) => a.number - b.number));
    } else {
      setTeamPlayers(teamPlayers.map((p) => (p.id === editingPlayer.id ? updatedPlayer : p)).sort((a, b) => a.number - b.number));
    }
    resetForm();
  }

  async function deletePlayer(playerId: string) {
    await supabase.from('players').delete().eq('id', playerId);
    setTeamPlayers(teamPlayers.filter((p) => p.id !== playerId));
    setOpponentPlayers(opponentPlayers.filter((p) => p.id !== playerId));
  }

  async function generateNumbers(side: 'home' | 'opponent') {
    if (side === 'opponent') {
      setShowGenerateNumbersModal(true);
      return;
    }

    const players = teamPlayers;

    if (players.length === 0) {
      alert('No players to renumber. Add players to your team first.');
      return;
    }

    if (!confirm('This will renumber all players sequentially (1, 2, 3...). Continue?')) return;

    const updates = players.map((player, index) => ({
      id: player.id,
      number: index + 1,
    }));

    for (const update of updates) {
      await supabase
        .from('players')
        .update({ number: update.number })
        .eq('id', update.id);
    }

    loadData();
  }

  async function confirmGenerateOpponentNumbers() {
    const start = parseInt(numberRangeData.start);
    const end = parseInt(numberRangeData.end);

    if (isNaN(start) || isNaN(end) || start < 0 || end < start || end > 999) {
      alert('Please enter valid numbers (0-999, start must be less than or equal to end)');
      return;
    }

    let shouldReplace = true;
    if (opponentPlayers.length > 0) {
      const choice = confirm('Replace existing opponent roster?\n\nOK = Replace all\nCancel = Keep existing and add new');
      shouldReplace = choice;

      if (shouldReplace) {
        for (const player of opponentPlayers) {
          await supabase.from('players').delete().eq('id', player.id);
        }
      }
    }

    for (let i = start; i <= end; i++) {
      const jerseyName = `#${i}`;
      await supabase.from('players').insert({
        program_id: null,
        game_id: gameId,
        name: jerseyName,
        number: i,
        position: ['Midfield'],
        is_opponent: true,
      });
    }

    setShowGenerateNumbersModal(false);
    setNumberRangeData({ start: '1', end: '100' });
    loadData();
  }

  function startEdit(player: Player) {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      number: player.number.toString(),
      positions: player.position,
    });
    setShowAddForm(true);
  }

  function resetForm() {
    setFormData({ name: '', number: '', positions: ['Midfield'] });
    setEditingPlayer(null);
    setShowAddForm(false);
  }

  function togglePosition(position: Position) {
    if (formData.positions.includes(position)) {
      if (formData.positions.length > 1) {
        setFormData({ ...formData, positions: formData.positions.filter((p) => p !== position) });
      }
    } else {
      setFormData({ ...formData, positions: [...formData.positions, position] });
    }
  }

  async function setCurrentGoalie(playerId: string, side: 'home' | 'opponent') {
    if (!game) return;

    const updateField = side === 'home' ? 'current_home_goalie_id' : 'current_opponent_goalie_id';

    await supabase
      .from('games')
      .update({ [updateField]: playerId })
      .eq('id', gameId);

    await loadData();
  }

  if (!game) return <div className="p-8 text-center">Loading...</div>;

  const ACTION_BUTTONS = [
    { key: 'shot' as ActionType, label: 'Shot', color: 'bg-green-600 hover:bg-green-700' },
    { key: 'faceoff' as ActionType, label: 'Faceoff', color: 'bg-blue-600 hover:bg-blue-700' },
    { key: 'ground_ball' as ActionType, label: 'Ground Ball', color: 'bg-yellow-600 hover:bg-yellow-700' },
    { key: 'penalty' as ActionType, label: 'Penalty', color: 'bg-purple-600 hover:bg-purple-700' },
    { key: 'turnover' as ActionType, label: 'Turnover', color: 'bg-red-600 hover:bg-red-700' },
    { key: 'clear' as ActionType, label: 'Clear', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { key: 'failed_clear' as ActionType, label: 'Failed Clear', color: 'bg-red-600 hover:bg-red-700' },
  ];

  const maxPeriod = periodType === 'quarters' ? 4 : 2;

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 landscape:overflow-hidden">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 py-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1 px-2 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation min-h-[36px]"
            >
              <ArrowLeft size={16} />
              <span className="font-bold text-xs">Back</span>
            </button>

            <div className="flex items-center gap-3 flex-1 justify-center">
              <div className="flex flex-col items-start">
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">{teamNameData.ourTeam}</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 leading-none">{game.our_score}</div>
              </div>
              <div className="text-xl font-bold text-gray-400 dark:text-gray-500 px-2">-</div>
              <div className="flex flex-col items-end">
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">{teamNameData.opponent}</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400 leading-none">{game.opponent_score}</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={undoLastPlay}
                disabled={events.length === 0}
                className="flex items-center gap-1 px-2 py-1.5 bg-gray-700 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-500 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation min-h-[36px]"
              >
                <Undo2 size={14} />
                <span className="hidden sm:inline">Undo</span>
              </button>
              <button
                onClick={onShowSummary}
                className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-bold text-xs touch-manipulation min-h-[36px]"
              >
                <Eye size={14} />
                <span className="hidden sm:inline">Stats</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 portrait:flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleActionClick('faceoff', 'home')}
                className="px-3 py-1.5 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-bold text-xs hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors touch-manipulation min-h-[36px]"
              >
                Faceoff
              </button>
              <button
                onClick={() => setShowTeamNameEditor(true)}
                className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <Settings size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((period) => (
                  <button
                    key={period}
                    onClick={() => setCurrentPeriod(period)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors min-w-[36px] ${
                      currentPeriod === period
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>

              <select
                value={periodType}
                onChange={(e) => {
                  setPeriodType(e.target.value as 'quarters' | 'halves');
                  setCurrentPeriod(1);
                }}
                className="px-2 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium border-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="quarters">Quarters</option>
                <option value="halves">Halves</option>
              </select>

              <button
                onClick={toggleTheme}
                className="p-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col portrait:flex-col landscape:flex-row overflow-hidden">
        <div className="w-full portrait:h-auto landscape:w-[180px] flex portrait:flex-row landscape:flex-col border-b landscape:border-b-0 landscape:border-r border-gray-300 dark:border-gray-700 bg-blue-50 dark:bg-blue-950">
          <div className="bg-blue-600 dark:bg-blue-800 text-white px-2 py-1 portrait:flex-1">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold truncate">{teamNameData.ourTeam}</h2>
              <button
                onClick={() => setShowPlayerManagement('home')}
                className="p-1.5 bg-blue-700 dark:bg-blue-900 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <Users size={18} />
              </button>
            </div>
            {game?.current_home_goalie_id ? (
              <div
                onClick={() => setShowGoalieSelector('home')}
                className="text-xs bg-blue-700 dark:bg-blue-900 rounded px-2 py-1 cursor-pointer hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors"
              >
                G: {teamPlayers.find(p => p.id === game.current_home_goalie_id)?.name || 'Unknown'}
              </div>
            ) : (
              <button
                onClick={() => setShowGoalieSelector('home')}
                className="text-xs bg-yellow-500 text-black font-semibold rounded px-2 py-1 w-full hover:bg-yellow-400 transition-colors"
              >
                Select Goalie
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 portrait:grid-cols-3 landscape:grid-cols-2 gap-1 p-1 overflow-y-auto flex-1">
            {ACTION_BUTTONS.filter(btn => btn.key !== 'faceoff').map((btn) => (
              <button
                key={btn.key}
                onClick={() => handleActionClick(btn.key, 'home')}
                className={`px-2 py-2 ${btn.color} dark:opacity-90 text-white rounded-lg font-bold text-xs transition-colors shadow-md touch-manipulation min-h-[38px]`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col bg-white dark:bg-gray-800 min-w-0 portrait:max-h-[40vh] landscape:flex">
          <div className="bg-gray-100 dark:bg-gray-700 px-2 py-1 border-b border-gray-300 dark:border-gray-600">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Play-by-Play</h2>
          </div>
          <div className="flex-1 overflow-auto p-1 space-y-1">
            {events.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4 text-xs">No events yet</div>
            ) : (
              events.map((event, index) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-300 flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-shrink-0">{getEventIcon(event)}</div>
                    <div className="text-xs font-medium flex-1 min-w-0 truncate dark:text-gray-200">{getEventDescription(event)}</div>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => setEditingEvent(event)}
                      className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="w-full portrait:h-auto landscape:w-[180px] flex portrait:flex-row landscape:flex-col border-t landscape:border-t-0 landscape:border-l border-gray-300 dark:border-gray-700 bg-red-50 dark:bg-red-950">
          <div className="bg-red-600 dark:bg-red-800 text-white px-2 py-1 portrait:flex-1">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold truncate">{teamNameData.opponent}</h2>
              <button
                onClick={() => setShowPlayerManagement('opponent')}
                className="p-1.5 bg-red-700 dark:bg-red-900 rounded-lg hover:bg-red-800 dark:hover:bg-red-700 transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <Users size={18} />
              </button>
            </div>
            {game?.current_opponent_goalie_id ? (
              <div
                onClick={() => setShowGoalieSelector('opponent')}
                className="text-xs bg-red-700 dark:bg-red-900 rounded px-2 py-1 cursor-pointer hover:bg-red-800 dark:hover:bg-red-700 transition-colors"
              >
                G: {opponentPlayers.find(p => p.id === game.current_opponent_goalie_id)?.name || 'Unknown'}
              </div>
            ) : (
              <button
                onClick={() => setShowGoalieSelector('opponent')}
                className="text-xs bg-yellow-500 text-black font-semibold rounded px-2 py-1 w-full hover:bg-yellow-400 transition-colors"
              >
                Select Goalie
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 portrait:grid-cols-3 landscape:grid-cols-2 gap-1 p-1 overflow-y-auto flex-1">
            {ACTION_BUTTONS.filter(btn => btn.key !== 'faceoff').map((btn) => (
              <button
                key={btn.key}
                onClick={() => handleActionClick(btn.key, 'opponent')}
                className={`px-2 py-2 ${btn.color} dark:opacity-90 text-white rounded-lg font-bold text-xs transition-colors shadow-md touch-manipulation min-h-[38px]`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-2 border-b border-gray-200">
              <h3 className="text-sm font-bold">
                {selectedAction.type === 'turnover'
                  ? (editingEvent ? `Which ${selectedAction.side === 'home' ? teamNameData.ourTeam : teamNameData.opponent} player turned the ball over? (Currently: ${(selectedAction.side === 'home' ? teamPlayers : opponentPlayers).find(p => p.id === editingEvent.turnover_player_id)?.name || 'Unknown'})` : `Which ${selectedAction.side === 'home' ? teamNameData.ourTeam : teamNameData.opponent} player turned the ball over?`)
                  : (editingEvent && (selectedAction.type === 'shot' || selectedAction.type === 'ground_ball') ? `Select Player - ${selectedAction.side === 'home' ? teamNameData.ourTeam : teamNameData.opponent} (Currently: ${(selectedAction.side === 'home' ? teamPlayers : opponentPlayers).find(p => p.id === (selectedAction.type === 'shot' ? editingEvent.scorer_player_id : editingEvent.ground_ball_player_id))?.name || 'Unknown'})` : `Select Player - ${selectedAction.side === 'home' ? teamNameData.ourTeam : teamNameData.opponent}`)}
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <div className="grid grid-cols-5 landscape:grid-cols-7 gap-1.5">
                {(selectedAction.side === 'home' ? teamPlayers : opponentPlayers).map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerSelection(player.id)}
                    className={`p-1 rounded-lg border-2 transition-all touch-manipulation active:scale-95 min-h-[48px] ${
                      editingEvent && (
                        (selectedAction.type === 'turnover' && player.id === editingEvent.turnover_player_id) ||
                        (selectedAction.type === 'shot' && player.id === editingEvent.scorer_player_id) ||
                        (selectedAction.type === 'ground_ball' && player.id === editingEvent.ground_ball_player_id)
                      )
                        ? 'border-blue-600 bg-blue-100'
                        : 'border-gray-200 hover:border-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs ${
                        selectedAction.side === 'home' ? 'bg-blue-600' : 'bg-red-600'
                      }`}>
                        {player.number}
                      </div>
                      <div className="text-[8px] font-semibold text-center line-clamp-2 leading-tight">{player.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-2 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedAction(null);
                  setSelectedShotOutcome(null);
                  setEditingEvent(null);
                }}
                className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold text-sm touch-manipulation min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showShotOutcomeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-3">
            <h3 className="text-base font-bold mb-3">Shot Result?</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleShotOutcome('goal', showShotOutcomeModal)}
                className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm touch-manipulation active:scale-95 min-h-[52px] shadow-md"
              >
                Goal
              </button>
              <button
                onClick={() => handleShotOutcome('saved', showShotOutcomeModal)}
                className="p-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold text-sm touch-manipulation active:scale-95 min-h-[52px] shadow-md"
              >
                Saved
              </button>
              <button
                onClick={() => handleShotOutcome('missed', showShotOutcomeModal)}
                className="p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold text-sm touch-manipulation active:scale-95 min-h-[52px] shadow-md"
              >
                Missed
              </button>
              <button
                onClick={() => handleShotOutcome('blocked', showShotOutcomeModal)}
                className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm touch-manipulation active:scale-95 min-h-[52px] shadow-md"
              >
                Blocked
              </button>
            </div>
            <button
              onClick={() => {
                setShowShotOutcomeModal(null);
                setEditingEvent(null);
                setSelectedShotOutcome(null);
              }}
              className="w-full mt-3 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold text-sm touch-manipulation min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-2 border-b border-gray-200">
              <h3 className="text-sm font-bold">
                Record Goal - {showGoalModal.side === 'home' ? teamNameData.ourTeam : teamNameData.opponent}
              </h3>
            </div>

            <div className="flex-1 overflow-auto p-2">
              {!selectedGoalScorer ? (
                <div>
                  <h4 className="font-bold mb-2 text-xs">
                    {editingEvent ? 'Who scored? (Currently: ' + ((showGoalModal.side === 'home' ? teamPlayers : opponentPlayers).find(p => p.id === editingEvent.scorer_player_id)?.name || 'Unknown') + ')' : 'Who scored?'}
                  </h4>
                  <div className="grid grid-cols-5 landscape:grid-cols-7 gap-1.5">
                    {(showGoalModal.side === 'home' ? teamPlayers : opponentPlayers).map((player) => (
                      <button
                        key={player.id}
                        onClick={() => handleGoalScorerSelection(player.id)}
                        className={`p-1 rounded-lg border-2 transition-all touch-manipulation active:scale-95 min-h-[48px] ${
                          editingEvent && player.id === editingEvent.scorer_player_id
                            ? 'border-green-600 bg-green-100'
                            : 'border-gray-200 hover:border-green-600 hover:bg-green-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs ${
                            showGoalModal.side === 'home' ? 'bg-blue-600' : 'bg-red-600'
                          }`}>
                            {player.number}
                          </div>
                          <div className="text-[8px] font-semibold text-center line-clamp-2 leading-tight">{player.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-[10px] text-gray-600 mb-0.5 font-medium">Scorer</div>
                    <div className="font-bold text-sm">
                      {(showGoalModal.side === 'home' ? teamPlayers : opponentPlayers).find(p => p.id === selectedGoalScorer)?.name}
                    </div>
                  </div>
                  <h4 className="font-bold mb-2 text-xs">
                    {editingEvent ? 'Who assisted? (Currently: ' + ((showGoalModal.side === 'home' ? teamPlayers : opponentPlayers).find(p => p.id === editingEvent.assist_player_id)?.name || 'No Assist') + ')' : 'Who assisted?'}
                  </h4>
                  <div className="grid grid-cols-5 landscape:grid-cols-7 gap-1.5">
                    {(showGoalModal.side === 'home' ? teamPlayers : opponentPlayers)
                      .filter(p => p.id !== selectedGoalScorer)
                      .map((player) => (
                        <button
                          key={player.id}
                          onClick={() => handleAssistSelection(player.id)}
                          className={`p-1 rounded-lg border-2 transition-all touch-manipulation active:scale-95 min-h-[48px] ${
                            editingEvent && player.id === editingEvent.assist_player_id
                              ? 'border-blue-600 bg-blue-100'
                              : 'border-gray-200 hover:border-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs ${
                              showGoalModal.side === 'home' ? 'bg-blue-600' : 'bg-red-600'
                            }`}>
                              {player.number}
                            </div>
                            <div className="text-[8px] font-semibold text-center line-clamp-2 leading-tight">{player.name}</div>
                          </div>
                        </button>
                      ))}
                  </div>
                  <button
                    onClick={() => handleAssistSelection(null)}
                    className={`w-full mt-3 px-4 py-2.5 rounded-lg font-bold text-sm touch-manipulation min-h-[44px] ${
                      editingEvent && !editingEvent.assist_player_id
                        ? 'bg-blue-100 border-2 border-blue-600 text-gray-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    No Assist
                  </button>
                </div>
              )}
            </div>

            <div className="p-2 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowGoalModal(null);
                  setSelectedGoalScorer(null);
                  setEditingEvent(null);
                }}
                className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold text-sm touch-manipulation min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold">
                Who made the save? - {showSaveModal.side === 'home' ? teamNameData.ourTeam : teamNameData.opponent}
              </h3>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-4 gap-3">
                {(showSaveModal.side === 'home' ? teamPlayers : opponentPlayers)
                  .filter(p => p.position.includes('Goalie'))
                  .map((player) => (
                    <button
                      key={player.id}
                      onClick={() => saveSave(player.id)}
                      className="p-4 rounded-lg border-2 border-gray-200 hover:border-teal-600 hover:bg-teal-50 transition-all"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                          showSaveModal.side === 'home' ? 'bg-blue-600' : 'bg-red-600'
                        }`}>
                          {player.number}
                        </div>
                        <div className="text-sm font-semibold text-center">{player.name}</div>
                      </div>
                    </button>
                  ))}
              </div>
              <button
                onClick={() => saveSave(null)}
                className="w-full mt-4 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {showTurnoverCausedByModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-2 border-b border-gray-200">
              <h3 className="text-sm font-bold">
                Turnover Caused By? - {showTurnoverCausedByModal.side === 'home' ? teamNameData.ourTeam : teamNameData.opponent}
              </h3>
            </div>

            <div className="flex-1 overflow-auto p-2">
              <div className="mb-3 p-2 bg-red-50 rounded-lg border border-red-200">
                <div className="text-[10px] text-gray-600 mb-0.5 font-medium">Turnover By</div>
                <div className="font-bold text-sm">
                  {(() => {
                    const turnoverPlayer = [...teamPlayers, ...opponentPlayers].find(p => p.id === showTurnoverCausedByModal.turnoverPlayerId);
                    return turnoverPlayer ? `#${turnoverPlayer.number} ${turnoverPlayer.name}` : 'Unknown';
                  })()}
                </div>
              </div>
              <h4 className="font-bold mb-2 text-xs">
                Who caused the turnover?
                {editingEvent && (() => {
                  const linkedCausedTO = events.find(e => e.event_type === 'caused_turnover' && e.linked_event_id === editingEvent.id);
                  if (linkedCausedTO && linkedCausedTO.caused_by_player_id) {
                    const causerPlayer = [...teamPlayers, ...opponentPlayers].find(p => p.id === linkedCausedTO.caused_by_player_id);
                    return ` (Currently: ${causerPlayer?.name || 'Unknown'})`;
                  }
                  return ' (Currently: Unforced)';
                })()}
              </h4>
              <div className="grid grid-cols-5 landscape:grid-cols-7 gap-1.5">
                {(showTurnoverCausedByModal.side === 'home' ? teamPlayers : opponentPlayers).map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleTurnoverCausedBy(player.id)}
                    className={`p-1 rounded-lg border-2 transition-all touch-manipulation active:scale-95 min-h-[48px] ${
                      editingEvent && (() => {
                        const linkedCausedTO = events.find(e => e.event_type === 'caused_turnover' && e.linked_event_id === editingEvent.id);
                        return linkedCausedTO && player.id === linkedCausedTO.caused_by_player_id;
                      })()
                        ? 'border-blue-600 bg-blue-100'
                        : 'border-gray-200 hover:border-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs ${
                        showTurnoverCausedByModal.side === 'home' ? 'bg-blue-600' : 'bg-red-600'
                      }`}>
                        {player.number}
                      </div>
                      <div className="text-[8px] font-semibold text-center line-clamp-2 leading-tight">{player.name}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleTurnoverCausedBy(null)}
                className={`w-full mt-3 px-4 py-2.5 rounded-lg font-bold text-sm touch-manipulation min-h-[44px] ${
                  editingEvent && !events.find(e => e.event_type === 'caused_turnover' && e.linked_event_id === editingEvent.id)?.caused_by_player_id
                    ? 'bg-blue-100 border-2 border-blue-600 text-gray-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Unforced / Skip
              </button>
            </div>

            <div className="p-2 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTurnoverCausedByModal(null);
                  setEditingEvent(null);
                }}
                className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold text-sm touch-manipulation min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPenaltyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-2 border-b border-gray-200">
              <h3 className="text-sm font-bold">
                Record Penalty - {showPenaltyModal === 'home' ? teamNameData.ourTeam : teamNameData.opponent}
              </h3>
            </div>

            <div className="flex-1 overflow-auto p-2 space-y-3">
              <div>
                <label className="block text-xs font-bold mb-2">Penalty Duration</label>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {[
                    { label: '30s', minutes: '0', seconds: '30' },
                    { label: '45s', minutes: '0', seconds: '45' },
                    { label: '1 min', minutes: '1', seconds: '0' },
                    { label: '1.5 min', minutes: '1', seconds: '30' },
                    { label: '2 min', minutes: '2', seconds: '0' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setPenaltyData({ ...penaltyData, minutes: preset.minutes, seconds: preset.seconds })}
                      className={`px-3 py-2.5 rounded-lg border-2 font-bold text-sm transition-all touch-manipulation min-h-[44px] ${
                        penaltyData.minutes === preset.minutes && penaltyData.seconds === preset.seconds
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-gray-600 mb-1.5 font-medium">Or enter custom duration:</div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      placeholder="Minutes"
                      value={penaltyData.minutes}
                      onChange={(e) => setPenaltyData({ ...penaltyData, minutes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="Seconds"
                      value={penaltyData.seconds}
                      onChange={(e) => setPenaltyData({ ...penaltyData, seconds: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-2">Player (Optional)</label>
                <div className="grid grid-cols-5 landscape:grid-cols-7 gap-1.5">
                  {(showPenaltyModal === 'home' ? teamPlayers : opponentPlayers).map((player) => (
                    <button
                      key={player.id}
                      onClick={() => setPenaltyData({ ...penaltyData, playerId: player.id })}
                      className={`p-1 rounded-lg border-2 transition-all touch-manipulation active:scale-95 min-h-[48px] ${
                        penaltyData.playerId === player.id
                          ? 'border-blue-600 bg-blue-100'
                          : 'border-gray-200 hover:border-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs ${
                          showPenaltyModal === 'home' ? 'bg-blue-600' : 'bg-red-600'
                        }`}>
                          {player.number}
                        </div>
                        <div className="text-[8px] font-semibold text-center line-clamp-2 leading-tight">{player.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {penaltyData.playerId && (
                  <button
                    onClick={() => setPenaltyData({ ...penaltyData, playerId: null })}
                    className="w-full mt-3 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold text-sm touch-manipulation min-h-[44px]"
                  >
                    Clear Player Selection
                  </button>
                )}
              </div>

              <div className="border-t pt-3">
                <label className="block text-[10px] font-medium text-gray-600 mb-1.5">Penalty Type (Optional)</label>
                <select
                  value={penaltyData.type}
                  onChange={(e) => setPenaltyData({ ...penaltyData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                >
                  {PENALTY_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-2 border-t border-gray-200 flex gap-2">
              <button
                onClick={recordPenalty}
                disabled={!penaltyData.type || (!penaltyData.minutes && !penaltyData.seconds)}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm touch-manipulation min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Record Penalty
              </button>
              <button
                onClick={() => {
                  setShowPenaltyModal(null);
                  setPenaltyData({ type: 'Other', minutes: '1', seconds: '0', playerId: null });
                }}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold text-sm touch-manipulation min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showFaceoffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-base font-bold">Record Faceoff</h3>
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-4">
              <div>
                <h4 className="font-semibold mb-2 text-xs">{teamNameData.ourTeam} Player</h4>
                <div className="grid grid-cols-5 landscape:grid-cols-7 gap-1.5">
                  {teamPlayers.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => setFaceoffData({ ...faceoffData, player1Id: player.id })}
                      className={`p-1 rounded-lg border-2 transition-all touch-manipulation active:scale-95 min-h-[48px] ${
                        faceoffData.player1Id === player.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs bg-blue-600">
                          {player.number}
                        </div>
                        <div className="text-[8px] font-semibold text-center line-clamp-2 leading-tight">{player.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-xs">{teamNameData.opponent} Player</h4>
                <div className="grid grid-cols-5 landscape:grid-cols-7 gap-1.5">
                  {opponentPlayers.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => setFaceoffData({ ...faceoffData, player2Id: player.id })}
                      className={`p-1 rounded-lg border-2 transition-all touch-manipulation active:scale-95 min-h-[48px] ${
                        faceoffData.player2Id === player.id
                          ? 'border-red-600 bg-red-50'
                          : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs bg-red-600">
                          {player.number}
                        </div>
                        <div className="text-[8px] font-semibold text-center line-clamp-2 leading-tight">{player.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {faceoffData.player1Id && faceoffData.player2Id && (
                <div>
                  <h4 className="font-semibold mb-2 text-xs text-center">Who won?</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFaceoffData({ ...faceoffData, winnerId: faceoffData.player1Id })}
                      className={`p-3 rounded-lg border-2 transition-all touch-manipulation active:scale-95 ${
                        faceoffData.winnerId === faceoffData.player1Id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-sm font-bold mb-1">{teamNameData.ourTeam}</div>
                        <div className="text-xs">
                          {teamPlayers.find(p => p.id === faceoffData.player1Id)?.name}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setFaceoffData({ ...faceoffData, winnerId: faceoffData.player2Id })}
                      className={`p-3 rounded-lg border-2 transition-all touch-manipulation active:scale-95 ${
                        faceoffData.winnerId === faceoffData.player2Id
                          ? 'border-red-600 bg-red-50'
                          : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-sm font-bold mb-1">{teamNameData.opponent}</div>
                        <div className="text-xs">
                          {opponentPlayers.find(p => p.id === faceoffData.player2Id)?.name}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-2 border-t border-gray-200 flex gap-2">
              <button
                onClick={recordFaceoff}
                disabled={!faceoffData.player1Id || !faceoffData.player2Id || !faceoffData.winnerId}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                Record Faceoff
              </button>
              <button
                onClick={() => {
                  setShowFaceoffModal(false);
                  setFaceoffData({ player1Id: null, player2Id: null, winnerId: null });
                }}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold text-sm touch-manipulation min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showTeamNameEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Edit Team Names</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Your Team Name</label>
                <input
                  type="text"
                  value={teamNameData.ourTeam}
                  onChange={(e) => setTeamNameData({ ...teamNameData, ourTeam: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Opponent Name</label>
                <input
                  type="text"
                  value={teamNameData.opponent}
                  onChange={(e) => setTeamNameData({ ...teamNameData, opponent: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={updateTeamNames}
                disabled={!teamNameData.ourTeam || !teamNameData.opponent}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                onClick={() => setShowTeamNameEditor(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlayerManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold">
                Manage {showPlayerManagement === 'home' ? teamNameData.ourTeam : teamNameData.opponent} Players
              </h3>
              <button
                onClick={() => generateNumbers(showPlayerManagement)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-semibold"
              >
                <Hash size={18} />
                Generate Numbers
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-teal-900">Current Goalie</h4>
                  {(() => {
                    const currentGoalieId = showPlayerManagement === 'home' ? game?.current_home_goalie_id : game?.current_opponent_goalie_id;
                    const currentGoalie = (showPlayerManagement === 'home' ? teamPlayers : opponentPlayers).find(p => p.id === currentGoalieId);
                    return currentGoalie ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {currentGoalie.number}
                        </div>
                        <span className="font-bold text-teal-900">{currentGoalie.name}</span>
                      </div>
                    ) : (
                      <span className="text-teal-700 text-sm">No goalie selected</span>
                    );
                  })()}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(showPlayerManagement === 'home' ? teamPlayers : opponentPlayers)
                    .filter(p => showPlayerManagement === 'opponent' ? true : p.position.includes('Goalie'))
                    .map((player) => {
                      const isCurrentGoalie = (showPlayerManagement === 'home' ? game?.current_home_goalie_id : game?.current_opponent_goalie_id) === player.id;
                      return (
                        <button
                          key={player.id}
                          onClick={() => setCurrentGoalie(player.id, showPlayerManagement!)}
                          className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                            isCurrentGoalie
                              ? 'bg-teal-600 text-white'
                              : 'bg-white text-teal-800 border border-teal-300 hover:bg-teal-100'
                          }`}
                        >
                          #{player.number} {player.name}
                        </button>
                      );
                    })}
                </div>
                {showPlayerManagement === 'home' && teamPlayers.filter(p => p.position.includes('Goalie')).length === 0 && (
                  <p className="text-sm text-teal-700">No goalies in roster. Add a player with Goalie position.</p>
                )}
                {showPlayerManagement === 'opponent' && opponentPlayers.length === 0 && (
                  <p className="text-sm text-teal-700">No players in roster. Add opponent players first.</p>
                )}
              </div>

              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-gray-600 font-semibold mb-4"
                >
                  <UserPlus size={20} />
                  Add Player
                </button>
              ) : (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-3">{editingPlayer ? 'Edit Player' : 'Add New Player'}</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Player Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Jersey Number"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <div>
                      <label className="block text-sm font-semibold mb-2">Positions</label>
                      <div className="flex flex-wrap gap-2">
                        {POSITIONS.map((pos) => (
                          <button
                            key={pos}
                            onClick={() => togglePosition(pos)}
                            className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                              formData.positions.includes(pos)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => (editingPlayer ? updatePlayer() : addPlayer(showPlayerManagement!))}
                        disabled={!formData.name || !formData.number}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                      >
                        {editingPlayer ? 'Update' : 'Add'}
                      </button>
                      <button
                        onClick={resetForm}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {(showPlayerManagement === 'home' ? teamPlayers : opponentPlayers).map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold">
                        {player.number}
                      </div>
                      <div>
                        <div className="font-semibold">{player.name}</div>
                        <div className="text-sm text-gray-600">{player.position.join(', ')}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(player)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => deletePlayer(player.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowPlayerManagement(null);
                  resetForm();
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenerateNumbersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Generate Opponent Numbers</h3>
            <p className="text-gray-600 mb-6">
              Create numbered entries (e.g., #1, #2, #3) for opponent players. This is useful when you only know jersey numbers.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Start Number
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={numberRangeData.start}
                  onChange={(e) => setNumberRangeData({ ...numberRangeData, start: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  End Number
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={numberRangeData.end}
                  onChange={(e) => setNumberRangeData({ ...numberRangeData, end: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {opponentPlayers.length > 0 && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> You have {opponentPlayers.length} existing opponent player(s). You'll be asked to replace or merge.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={confirmGenerateOpponentNumbers}
                className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold"
              >
                Generate
              </button>
              <button
                onClick={() => {
                  setShowGenerateNumbersModal(false);
                  setNumberRangeData({ start: '1', end: '100' });
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {showEditClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-4">
            <h3 className="text-lg font-bold mb-4 dark:text-gray-100">Edit Clear</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Was the clear successful?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  recordClear(showEditClearModal.side, true);
                  setShowEditClearModal(null);
                }}
                className="p-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-base touch-manipulation active:scale-95 shadow-md"
              >
                Successful Clear
              </button>
              <button
                onClick={() => {
                  recordClear(showEditClearModal.side, false);
                  setShowEditClearModal(null);
                }}
                className="p-4 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-bold text-base touch-manipulation active:scale-95 shadow-md"
              >
                Failed Clear
              </button>
            </div>
            <button
              onClick={() => {
                setShowEditClearModal(null);
                setEditingEvent(null);
              }}
              className="w-full mt-3 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-bold text-sm touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showGoalieSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-red-600">
              Goalie Required!
            </h3>
            <p className="text-gray-700 mb-4">
              Please select a goalie for {showGoalieSelector === 'home' ? teamNameData.ourTeam : teamNameData.opponent} before recording this play.
            </p>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {(showGoalieSelector === 'home' ? teamPlayers : opponentPlayers)
                .filter(p => showGoalieSelector === 'opponent' ? true : p.position.includes('Goalie'))
                .map((player) => (
                  <button
                    key={player.id}
                    onClick={() => selectGoalie(player.id, showGoalieSelector!)}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-400 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      {player.number}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-xs text-gray-600">{player.position.join(', ')}</div>
                    </div>
                  </button>
                ))}
              {showGoalieSelector === 'home' && teamPlayers.filter(p => p.position.includes('Goalie')).length === 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-semibold mb-2">No goalies in roster!</p>
                  <p className="text-xs text-yellow-700">Add a player with the Goalie position first, then try again.</p>
                </div>
              )}
              {showGoalieSelector === 'opponent' && opponentPlayers.length === 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-semibold mb-2">No players in opponent roster!</p>
                  <p className="text-xs text-yellow-700">Add opponent players first, then try again.</p>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setShowGoalieSelector(null);
                setRequireGoalieFor(null);
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
