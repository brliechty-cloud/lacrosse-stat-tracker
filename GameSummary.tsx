import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { X, Download, Share2 } from 'lucide-react';
import { generateAndShareSummary, generateSummaryImage } from '../lib/shareSummary';
import { SharePreview } from './SharePreview';
import { ShareableSummary } from './ShareableSummary';

type Player = Database['public']['Tables']['players']['Row'];
type Game = Database['public']['Tables']['games']['Row'];
type GameEvent = Database['public']['Tables']['game_events']['Row'];

interface PlayerStats {
  goals: number;
  assists: number;
  shots: number;
  shots_on_goal: number;
  ground_balls: number;
  turnovers: number;
  caused_turnovers: number;
  saves: number;
  goals_allowed: number;
  clear_attempts: number;
  clear_successes: number;
  faceoffs_won: number;
  faceoffs_lost: number;
  penalties: number;
  penalty_minutes: number;
}

interface PlayerWithStats extends Player {
  stats: PlayerStats;
}

interface GameSummaryProps {
  gameId: string;
  teamId: string;
  onClose: () => void;
  onExportFull: () => void;
  onExportMaxPreps: () => void;
}

export function GameSummary({ gameId, teamId, onClose, onExportFull, onExportMaxPreps }: GameSummaryProps) {
  const [teamPlayers, setTeamPlayers] = useState<PlayerWithStats[]>([]);
  const [opponentPlayers, setOpponentPlayers] = useState<PlayerWithStats[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamClearStats, setTeamClearStats] = useState({ attempts: 0, successes: 0 });
  const [opponentClearStats, setOpponentClearStats] = useState({ attempts: 0, successes: 0 });
  const [sharePreviewBlob, setSharePreviewBlob] = useState<Blob | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [teamName, setTeamName] = useState<string>('');
  const [events, setEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    loadSummary();
  }, [gameId, teamId]);

  function calculatePlayerStats(playerId: string, events: GameEvent[], playerTeamId: string | null): PlayerStats {
    const stats: PlayerStats = {
      goals: 0,
      assists: 0,
      shots: 0,
      shots_on_goal: 0,
      ground_balls: 0,
      turnovers: 0,
      caused_turnovers: 0,
      saves: 0,
      goals_allowed: 0,
      clear_attempts: 0,
      clear_successes: 0,
      faceoffs_won: 0,
      faceoffs_lost: 0,
      penalties: 0,
      penalty_minutes: 0,
    };

    events.forEach(event => {
      if (event.event_type === 'shot') {
        if (event.scorer_player_id === playerId) {
          stats.shots++;
          if (event.shot_outcome === 'goal' || event.shot_outcome === 'saved') {
            stats.shots_on_goal++;
          }
          if (event.shot_outcome === 'goal') {
            stats.goals++;
          }
        }
        if (event.assist_player_id === playerId) {
          stats.assists++;
        }
        if (event.goalie_player_id === playerId) {
          if (event.shot_outcome === 'saved') {
            stats.saves++;
          } else if (event.shot_outcome === 'goal') {
            stats.goals_allowed++;
          }
        }
      } else if (event.event_type === 'ground_ball' && event.ground_ball_player_id === playerId) {
        stats.ground_balls++;
      } else if (event.event_type === 'turnover' && event.turnover_player_id === playerId) {
        stats.turnovers++;
      } else if (event.event_type === 'caused_turnover' && event.caused_by_player_id === playerId) {
        stats.caused_turnovers++;
      } else if (event.event_type === 'faceoff') {
        if (event.faceoff_player1_id === playerId || event.faceoff_player2_id === playerId) {
          if (event.faceoff_winner_team_id === playerTeamId) {
            stats.faceoffs_won++;
          } else {
            stats.faceoffs_lost++;
          }
        }
      } else if (event.event_type === 'penalty' && event.penalty_player_id === playerId) {
        stats.penalties++;
        stats.penalty_minutes += Math.floor((event.penalty_duration || 0) / 60);
      }
    });

    return stats;
  }

  async function loadSummary() {
    const [teamPlayersResult, opponentPlayersResult, gameResult, eventsResult, teamResult] = await Promise.all([
      supabase.from('players').select('*').eq('program_id', teamId).eq('is_opponent', false).order('number'),
      supabase.from('players').select('*').eq('game_id', gameId).eq('is_opponent', true).order('number'),
      supabase.from('games').select('*').eq('id', gameId).maybeSingle(),
      supabase.from('game_events').select('*').eq('game_id', gameId),
      supabase.from('programs').select('name').eq('id', teamId).maybeSingle(),
    ]);

    if (gameResult.data) {
      setGame(gameResult.data);
    }

    if (teamResult.data) {
      setTeamName(teamResult.data.name);
    }

    if (eventsResult.data) {
      setEvents(eventsResult.data);

      const teamClearEvents = eventsResult.data.filter(e => e.event_type === 'clear' && !e.is_opponent);
      const oppClearEvents = eventsResult.data.filter(e => e.event_type === 'clear' && e.is_opponent);

      setTeamClearStats({
        attempts: teamClearEvents.length,
        successes: teamClearEvents.filter(e => e.clear_success).length,
      });

      setOpponentClearStats({
        attempts: oppClearEvents.length,
        successes: oppClearEvents.filter(e => e.clear_success).length,
      });
    }

    if (teamPlayersResult.data && eventsResult.data && gameResult.data) {
      const playersWithStats = teamPlayersResult.data.map(player => {
        const stats = calculatePlayerStats(player.id, eventsResult.data || [], teamId);
        return { ...player, stats };
      }).filter(p => {
        const s = p.stats;
        return s.goals + s.assists + s.shots + s.ground_balls + s.turnovers + s.caused_turnovers + s.saves + s.goals_allowed + s.clear_attempts + s.faceoffs_won + s.faceoffs_lost + s.penalties > 0;
      });
      setTeamPlayers(playersWithStats);
    }

    if (opponentPlayersResult.data && eventsResult.data && gameResult.data) {
      const playersWithStats = opponentPlayersResult.data.map(player => {
        const stats = calculatePlayerStats(player.id, eventsResult.data || [], gameResult.data.opponent_team_id || null);
        return { ...player, stats };
      }).filter(p => {
        const s = p.stats;
        return s.goals + s.assists + s.shots + s.ground_balls + s.turnovers + s.caused_turnovers + s.saves + s.goals_allowed + s.clear_attempts + s.faceoffs_won + s.faceoffs_lost + s.penalties > 0;
      });
      setOpponentPlayers(playersWithStats);
    }

    setLoading(false);
  }

  function calculateShootingPercentage(goals: number, shots: number): string {
    if (shots === 0) return '-';
    return ((goals / shots) * 100).toFixed(0) + '%';
  }

  function calculateSavePercentage(saves: number, shotsAgainst: number): string {
    if (shotsAgainst === 0) return '-';
    return ((saves / shotsAgainst) * 100).toFixed(0) + '%';
  }

  async function handleShare() {
    if (!game || isGeneratingShare) return;

    setIsGeneratingShare(true);

    const shareData = {
      game,
      teamName: teamName || 'Your Team',
      teamPlayers,
      opponentPlayers,
      teamClearStats,
      opponentClearStats,
    };

    const shared = await generateAndShareSummary(shareData, ShareableSummary);

    if (!shared) {
      const blob = await generateSummaryImage(shareData, ShareableSummary);
      if (blob) {
        setSharePreviewBlob(blob);
      }
    }

    setIsGeneratingShare(false);
  }

  if (loading || !game) {
    return <div className="text-center py-8">Loading summary...</div>;
  }

  const ourScore = teamPlayers.reduce((sum, p) => sum + p.stats.goals, 0);
  const oppScore = opponentPlayers.reduce((sum, p) => sum + p.stats.goals, 0);

  const teamTotalGoals = teamPlayers.reduce((sum, p) => sum + p.stats.goals, 0);
  const teamTotalShots = teamPlayers.reduce((sum, p) => sum + p.stats.shots, 0);
  const teamTotalShotsOnGoal = teamPlayers.reduce((sum, p) => sum + p.stats.shots_on_goal, 0);
  const teamTotalSaves = teamPlayers.reduce((sum, p) => sum + p.stats.saves, 0);

  const oppTotalGoals = opponentPlayers.reduce((sum, p) => sum + p.stats.goals, 0);
  const oppTotalShots = opponentPlayers.reduce((sum, p) => sum + p.stats.shots, 0);
  const oppTotalShotsOnGoal = opponentPlayers.reduce((sum, p) => sum + p.stats.shots_on_goal, 0);
  const oppTotalSaves = opponentPlayers.reduce((sum, p) => sum + p.stats.saves, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 landscape:p-4 z-50">
      <div className="bg-white rounded-xl landscape:rounded-2xl max-w-6xl w-full max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-3 landscape:p-4 gap-2 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base landscape:text-xl font-bold">Game Summary</h2>
          <div className="flex gap-1 landscape:gap-2">
            <button
              onClick={handleShare}
              disabled={isGeneratingShare}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md touch-manipulation min-h-[36px] text-xs disabled:opacity-50"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">{isGeneratingShare ? 'Generating...' : 'Share'}</span>
            </button>
            <button
              onClick={onExportFull}
              className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-md touch-manipulation min-h-[36px] text-xs"
            >
              <Download size={16} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={onExportMaxPreps}
              className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 transition-colors shadow-md touch-manipulation min-h-[36px] text-xs"
            >
              <Download size={16} />
              <span className="hidden sm:inline">MaxPreps</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 landscape:p-4">

        <div className="mb-4">
          <div className="text-center mb-3">
            <div className="text-sm text-gray-600 mb-1">vs {game.opponent}</div>
            <div className="text-5xl font-bold text-gray-900">
              {ourScore} - {oppScore}
            </div>
          </div>

          {(() => {
            const goalEvents = events.filter(e => e.event_type === 'shot' && e.shot_outcome === 'goal');
            const periods = [...new Set(goalEvents.map(e => e.period || 1))].sort((a, b) => a - b);
            const currentPeriod = game.current_period || Math.max(...periods, 1);

            if (goalEvents.length > 0 && periods.length > 0) {
              const periodGoals = periods.map(period => {
                const periodEvents = goalEvents.filter(e => (e.period || 1) === period);
                const teamGoals = periodEvents.filter(e => teamPlayers.some(p => p.id === e.scorer_player_id)).length;
                const oppGoals = periodEvents.filter(e => opponentPlayers.some(p => p.id === e.scorer_player_id)).length;
                return { period, teamGoals, oppGoals };
              });

              return (
                <div className="mb-3 max-w-2xl mx-auto">
                  <h3 className="text-center text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Goals by Period</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {periodGoals.map(({ period, teamGoals, oppGoals }) => {
                      const wonPeriod = teamGoals > oppGoals;
                      const lostPeriod = teamGoals < oppGoals;
                      const isCurrent = period === currentPeriod;

                      return (
                        <div
                          key={period}
                          className={`p-2.5 rounded-lg transition-all ${
                            isCurrent
                              ? 'bg-blue-50 border-[3px] border-blue-500 shadow-md'
                              : 'bg-white border-2 border-gray-200'
                          }`}
                        >
                          <div className="text-xs text-gray-600 text-center mb-1 font-medium">
                            {periods.length === 2
                              ? (period === 1 ? '1st Half' : '2nd Half')
                              : `${period}${period === 1 ? 'st' : period === 2 ? 'nd' : period === 3 ? 'rd' : 'th'} Qtr`
                            }
                          </div>
                          <div className="text-center flex items-center justify-center gap-2">
                            <span className={`text-lg font-bold ${wonPeriod ? 'text-green-600' : lostPeriod ? 'text-gray-500' : 'text-gray-600'}`}>
                              {teamGoals}
                            </span>
                            <span className="text-gray-400">-</span>
                            <span className={`text-lg font-bold ${lostPeriod ? 'text-red-600' : wonPeriod ? 'text-gray-500' : 'text-gray-600'}`}>
                              {oppGoals}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="grid grid-cols-3 gap-2 max-w-4xl mx-auto">
            {(() => {
              const teamWon = teamPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won, 0);
              const oppWon = opponentPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won, 0);
              const net = teamWon - oppWon;

              const borderTopColor = net > 0 ? 'border-t-green-500' : net < 0 ? 'border-t-red-500' : 'border-t-gray-400';
              const textColor = net > 0 ? 'text-green-600' : net < 0 ? 'text-red-600' : 'text-gray-600';

              return (
                <div className={`bg-white p-3 rounded-lg border border-gray-200 border-t-4 ${borderTopColor}`}>
                  <div className="text-xs uppercase tracking-wide font-semibold text-gray-600 mb-1.5">Faceoffs</div>
                  <div className={`text-lg font-bold ${textColor} mb-1`}>
                    {net === 0 ? 'Even' : net > 0 ? `+${net} Advantage` : `${net} Disadvantage`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {teamWon}-{oppWon}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const teamGB = teamPlayers.reduce((sum, p) => sum + p.stats.ground_balls, 0);
              const oppGB = opponentPlayers.reduce((sum, p) => sum + p.stats.ground_balls, 0);
              const net = teamGB - oppGB;

              const borderTopColor = net > 0 ? 'border-t-green-500' : net < 0 ? 'border-t-red-500' : 'border-t-gray-400';
              const textColor = net > 0 ? 'text-green-600' : net < 0 ? 'text-red-600' : 'text-gray-600';

              return (
                <div className={`bg-white p-3 rounded-lg border border-gray-200 border-t-4 ${borderTopColor}`}>
                  <div className="text-xs uppercase tracking-wide font-semibold text-gray-600 mb-1.5">Ground Balls</div>
                  <div className={`text-lg font-bold ${textColor} mb-1`}>
                    {net === 0 ? 'Even' : net > 0 ? `+${net} Advantage` : `${net} Disadvantage`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {teamGB}-{oppGB}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const teamTO = teamPlayers.reduce((sum, p) => sum + p.stats.turnovers, 0);
              const oppTO = opponentPlayers.reduce((sum, p) => sum + p.stats.turnovers, 0);
              const net = oppTO - teamTO;

              const borderTopColor = net > 0 ? 'border-t-green-500' : net < 0 ? 'border-t-red-500' : 'border-t-gray-400';
              const textColor = net > 0 ? 'text-green-600' : net < 0 ? 'text-red-600' : 'text-gray-600';

              return (
                <div className={`bg-white p-3 rounded-lg border border-gray-200 border-t-4 ${borderTopColor}`}>
                  <div className="text-xs uppercase tracking-wide font-semibold text-gray-600 mb-1.5">Turnovers</div>
                  <div className={`text-lg font-bold ${textColor} mb-1`}>
                    {net === 0 ? 'Even' : net > 0 ? `+${net} Advantage` : `${net} Disadvantage`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {teamTO}-{oppTO}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold mb-2 text-blue-600">Your Team</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-gray-50">#</th>
                    <th className="text-left px-3 py-2 font-semibold sticky left-10 bg-gray-50">Player</th>
                    <th className="text-center px-2 py-2 font-semibold">G</th>
                    <th className="text-center px-2 py-2 font-semibold">A</th>
                    <th className="text-center px-2 py-2 font-semibold">Pts</th>
                    <th className="text-center px-2 py-2 font-semibold">S</th>
                    <th className="text-center px-2 py-2 font-semibold">SOG</th>
                    <th className="text-center px-2 py-2 font-semibold">SH%</th>
                    <th className="text-center px-2 py-2 font-semibold">GB</th>
                    <th className="text-center px-2 py-2 font-semibold">TO</th>
                    <th className="text-center px-2 py-2 font-semibold">CT</th>
                    <th className="text-center px-2 py-2 font-semibold">FO</th>
                    <th className="text-center px-2 py-2 font-semibold">FO%</th>
                    <th className="text-center px-2 py-2 font-semibold">SV</th>
                    <th className="text-center px-2 py-2 font-semibold">GA</th>
                    <th className="text-center px-2 py-2 font-semibold">SV%</th>
                    <th className="text-center px-2 py-2 font-semibold">CLR</th>
                    <th className="text-center px-2 py-2 font-semibold">CLR%</th>
                    <th className="text-center px-2 py-2 font-semibold">PEN</th>
                    <th className="text-center px-2 py-2 font-semibold">PIM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={20} className="text-center py-4 text-gray-500">
                        No stats recorded
                      </td>
                    </tr>
                  ) : (
                    teamPlayers.map((player) => {
                      const totalFaceoffs = player.stats.faceoffs_won + player.stats.faceoffs_lost;
                      const faceoffPct = totalFaceoffs > 0
                        ? ((player.stats.faceoffs_won / totalFaceoffs) * 100).toFixed(0) + '%'
                        : '-';
                      return (
                        <tr key={player.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-semibold sticky left-0 bg-white">{player.number}</td>
                          <td className="px-3 py-2 sticky left-10 bg-white">{player.name}</td>
                          <td className="text-center px-2 py-2 font-semibold">{player.stats.goals || 0}</td>
                          <td className="text-center px-2 py-2">{player.stats.assists || 0}</td>
                          <td className="text-center px-2 py-2 font-semibold text-blue-600">
                            {player.stats.goals + player.stats.assists}
                          </td>
                          <td className="text-center px-2 py-2">{player.stats.shots || 0}</td>
                          <td className="text-center px-2 py-2">{player.stats.shots_on_goal || 0}</td>
                          <td className="text-center px-2 py-2 text-green-700 font-semibold">
                            {calculateShootingPercentage(player.stats.goals, player.stats.shots_on_goal)}
                          </td>
                          <td className="text-center px-2 py-2">{player.stats.ground_balls || 0}</td>
                          <td className="text-center px-2 py-2 text-red-600">{player.stats.turnovers || 0}</td>
                          <td className="text-center px-2 py-2 text-green-600">{player.stats.caused_turnovers || 0}</td>
                          <td className="text-center px-2 py-2">{totalFaceoffs > 0 ? `${player.stats.faceoffs_won}-${player.stats.faceoffs_lost}` : '-'}</td>
                          <td className="text-center px-2 py-2 font-semibold">{faceoffPct}</td>
                          <td className="text-center px-2 py-2">{player.stats.saves || 0}</td>
                          <td className="text-center px-2 py-2 text-red-600">{player.stats.goals_allowed || 0}</td>
                          <td className="text-center px-2 py-2 text-teal-700 font-semibold">
                            {player.stats.saves > 0 ? calculateSavePercentage(player.stats.saves, oppTotalShotsOnGoal) : '-'}
                          </td>
                          <td className="text-center px-2 py-2 text-gray-400">-</td>
                          <td className="text-center px-2 py-2 text-gray-400">-</td>
                          <td className="text-center px-2 py-2">{player.stats.penalties || 0}</td>
                          <td className="text-center px-2 py-2">{player.stats.penalty_minutes || 0}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {teamPlayers.length > 0 && (
                  <tfoot className="bg-gray-100 font-bold">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 sticky left-0 bg-gray-100">TOTALS</td>
                      <td className="text-center px-2 py-2">
                        {teamTotalGoals}
                      </td>
                      <td className="text-center px-2 py-2">
                        {teamPlayers.reduce((sum, p) => sum + p.stats.assists, 0)}
                      </td>
                      <td className="text-center px-2 py-2 text-blue-600">
                        {teamPlayers.reduce((sum, p) => sum + p.stats.goals + p.stats.assists, 0)}
                      </td>
                      <td className="text-center px-2 py-2">
                        {teamPlayers.reduce((sum, p) => sum + p.stats.shots, 0)}
                      </td>
                      <td className="text-center px-2 py-2">
                        {teamPlayers.reduce((sum, p) => sum + p.stats.shots_on_goal, 0)}
                      </td>
                      <td className="text-center px-2 py-2 text-green-700">
                        {calculateShootingPercentage(teamTotalGoals, teamPlayers.reduce((sum, p) => sum + p.stats.shots_on_goal, 0))}
                      </td>
                      <td className="text-center px-2 py-2">
                        {teamPlayers.reduce((sum, p) => sum + p.stats.ground_balls, 0)}
                      </td>
                      <td className="text-center px-2 py-2 text-red-600">
                        {teamPlayers.reduce((sum, p) => sum + p.stats.turnovers, 0)}
                      </td>
                      <td className="text-center px-2 py-2 text-green-600">
                        {teamPlayers.reduce((sum, p) => sum + p.stats.caused_turnovers, 0)}
                      </td>
                      <td className="text-center px-2 py-2">
                        {(() => {
                          const won = teamPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won, 0);
                          const lost = teamPlayers.reduce((sum, p) => sum + p.stats.faceoffs_lost, 0);
                          return won + lost > 0 ? `${won}-${lost}` : '-';
                        })()}
                      </td>
                      <td className="text-center px-2 py-2">
                        {(() => {
                          const won = teamPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won, 0);
                          const total = won + teamPlayers.reduce((sum, p) => sum + p.stats.faceoffs_lost, 0);
                          return total > 0 ? ((won / total) * 100).toFixed(0) + '%' : '-';
                        })()}
                      </td>
                      <td className="text-center px-2 py-2">
                        {teamTotalSaves}
                      </td>
                      <td className="text-center px-2 py-2 text-red-600">
                        {teamPlayers.reduce((sum, p) => sum + p.stats.goals_allowed, 0)}
                      </td>
                      <td className="text-center px-2 py-2 text-teal-700">
                        {teamTotalSaves > 0 ? calculateSavePercentage(teamTotalSaves, oppTotalShotsOnGoal) : '-'}
                      </td>
                      <td className="text-center px-2 py-2">
                        {teamClearStats.attempts > 0 ? `${teamClearStats.successes}-${teamClearStats.attempts}` : '-'}
                      </td>
                      <td className="text-center px-2 py-2">
                        {teamClearStats.attempts > 0 ? ((teamClearStats.successes / teamClearStats.attempts) * 100).toFixed(0) + '%' : '-'}
                      </td>
                      <td className="text-center px-2 py-2">
                        {teamPlayers.reduce((sum, p) => sum + p.stats.penalties, 0)}
                      </td>
                      <td className="text-center px-2 py-2">
                        {teamPlayers.reduce((sum, p) => sum + p.stats.penalty_minutes, 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold mb-2 text-red-600">{game.opponent}</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-gray-50">#</th>
                    <th className="text-left px-3 py-2 font-semibold sticky left-10 bg-gray-50">Player</th>
                    <th className="text-center px-2 py-2 font-semibold">G</th>
                    <th className="text-center px-2 py-2 font-semibold">A</th>
                    <th className="text-center px-2 py-2 font-semibold">Pts</th>
                    <th className="text-center px-2 py-2 font-semibold">S</th>
                    <th className="text-center px-2 py-2 font-semibold">SOG</th>
                    <th className="text-center px-2 py-2 font-semibold">SH%</th>
                    <th className="text-center px-2 py-2 font-semibold">GB</th>
                    <th className="text-center px-2 py-2 font-semibold">TO</th>
                    <th className="text-center px-2 py-2 font-semibold">CT</th>
                    <th className="text-center px-2 py-2 font-semibold">FO</th>
                    <th className="text-center px-2 py-2 font-semibold">FO%</th>
                    <th className="text-center px-2 py-2 font-semibold">SV</th>
                    <th className="text-center px-2 py-2 font-semibold">GA</th>
                    <th className="text-center px-2 py-2 font-semibold">SV%</th>
                    <th className="text-center px-2 py-2 font-semibold">CLR</th>
                    <th className="text-center px-2 py-2 font-semibold">CLR%</th>
                    <th className="text-center px-2 py-2 font-semibold">PEN</th>
                    <th className="text-center px-2 py-2 font-semibold">PIM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {opponentPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={20} className="text-center py-4 text-gray-500">
                        No stats recorded
                      </td>
                    </tr>
                  ) : (
                    opponentPlayers.map((player) => {
                      const totalFaceoffs = player.stats.faceoffs_won + player.stats.faceoffs_lost;
                      const faceoffPct = totalFaceoffs > 0
                        ? ((player.stats.faceoffs_won / totalFaceoffs) * 100).toFixed(0) + '%'
                        : '-';
                      return (
                        <tr key={player.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-semibold sticky left-0 bg-white">{player.number}</td>
                          <td className="px-3 py-2 sticky left-10 bg-white">{player.name}</td>
                          <td className="text-center px-2 py-2 font-semibold">{player.stats.goals || 0}</td>
                          <td className="text-center px-2 py-2">{player.stats.assists || 0}</td>
                          <td className="text-center px-2 py-2 font-semibold text-red-600">
                            {player.stats.goals + player.stats.assists}
                          </td>
                          <td className="text-center px-2 py-2">{player.stats.shots || 0}</td>
                          <td className="text-center px-2 py-2">{player.stats.shots_on_goal || 0}</td>
                          <td className="text-center px-2 py-2 text-green-700 font-semibold">
                            {calculateShootingPercentage(player.stats.goals, player.stats.shots_on_goal)}
                          </td>
                          <td className="text-center px-2 py-2">{player.stats.ground_balls || 0}</td>
                          <td className="text-center px-2 py-2 text-red-600">{player.stats.turnovers || 0}</td>
                          <td className="text-center px-2 py-2 text-green-600">{player.stats.caused_turnovers || 0}</td>
                          <td className="text-center px-2 py-2">{totalFaceoffs > 0 ? `${player.stats.faceoffs_won}-${player.stats.faceoffs_lost}` : '-'}</td>
                          <td className="text-center px-2 py-2 font-semibold">{faceoffPct}</td>
                          <td className="text-center px-2 py-2">{player.stats.saves || 0}</td>
                          <td className="text-center px-2 py-2 text-red-600">{player.stats.goals_allowed || 0}</td>
                          <td className="text-center px-2 py-2 text-teal-700 font-semibold">
                            {player.stats.saves > 0 ? calculateSavePercentage(player.stats.saves, teamTotalShotsOnGoal) : '-'}
                          </td>
                          <td className="text-center px-2 py-2 text-gray-400">-</td>
                          <td className="text-center px-2 py-2 text-gray-400">-</td>
                          <td className="text-center px-2 py-2">{player.stats.penalties || 0}</td>
                          <td className="text-center px-2 py-2">{player.stats.penalty_minutes || 0}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {opponentPlayers.length > 0 && (
                  <tfoot className="bg-gray-100 font-bold">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 sticky left-0 bg-gray-100">TOTALS</td>
                      <td className="text-center px-2 py-2">
                        {oppTotalGoals}
                      </td>
                      <td className="text-center px-2 py-2">
                        {opponentPlayers.reduce((sum, p) => sum + p.stats.assists, 0)}
                      </td>
                      <td className="text-center px-2 py-2 text-red-600">
                        {opponentPlayers.reduce((sum, p) => sum + p.stats.goals + p.stats.assists, 0)}
                      </td>
                      <td className="text-center px-2 py-2">
                        {opponentPlayers.reduce((sum, p) => sum + p.stats.shots, 0)}
                      </td>
                      <td className="text-center px-2 py-2">
                        {opponentPlayers.reduce((sum, p) => sum + p.stats.shots_on_goal, 0)}
                      </td>
                      <td className="text-center px-2 py-2 text-green-700">
                        {calculateShootingPercentage(oppTotalGoals, opponentPlayers.reduce((sum, p) => sum + p.stats.shots_on_goal, 0))}
                      </td>
                      <td className="text-center px-2 py-2">
                        {opponentPlayers.reduce((sum, p) => sum + p.stats.ground_balls, 0)}
                      </td>
                      <td className="text-center px-2 py-2 text-red-600">
                        {opponentPlayers.reduce((sum, p) => sum + p.stats.turnovers, 0)}
                      </td>
                      <td className="text-center px-2 py-2 text-green-600">
                        {opponentPlayers.reduce((sum, p) => sum + p.stats.caused_turnovers, 0)}
                      </td>
                      <td className="text-center px-2 py-2">
                        {(() => {
                          const won = opponentPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won, 0);
                          const lost = opponentPlayers.reduce((sum, p) => sum + p.stats.faceoffs_lost, 0);
                          return won + lost > 0 ? `${won}-${lost}` : '-';
                        })()}
                      </td>
                      <td className="text-center px-2 py-2">
                        {(() => {
                          const won = opponentPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won, 0);
                          const total = won + opponentPlayers.reduce((sum, p) => sum + p.stats.faceoffs_lost, 0);
                          return total > 0 ? ((won / total) * 100).toFixed(0) + '%' : '-';
                        })()}
                      </td>
                      <td className="text-center px-2 py-2">
                        {oppTotalSaves}
                      </td>
                      <td className="text-center px-2 py-2 text-red-600">
                        {opponentPlayers.reduce((sum, p) => sum + p.stats.goals_allowed, 0)}
                      </td>
                      <td className="text-center px-2 py-2 text-teal-700">
                        {oppTotalSaves > 0 ? calculateSavePercentage(oppTotalSaves, teamTotalShotsOnGoal) : '-'}
                      </td>
                      <td className="text-center px-2 py-2">
                        {opponentClearStats.attempts > 0 ? `${opponentClearStats.successes}-${opponentClearStats.attempts}` : '-'}
                      </td>
                      <td className="text-center px-2 py-2">
                        {opponentClearStats.attempts > 0 ? ((opponentClearStats.successes / opponentClearStats.attempts) * 100).toFixed(0) + '%' : '-'}
                      </td>
                      <td className="text-center px-2 py-2">
                        {opponentPlayers.reduce((sum, p) => sum + p.stats.penalties, 0)}
                      </td>
                      <td className="text-center px-2 py-2">
                        {opponentPlayers.reduce((sum, p) => sum + p.stats.penalty_minutes, 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        </div>
      </div>

      {sharePreviewBlob && (
        <SharePreview
          imageBlob={sharePreviewBlob}
          onClose={() => setSharePreviewBlob(null)}
        />
      )}
    </div>
  );
}
