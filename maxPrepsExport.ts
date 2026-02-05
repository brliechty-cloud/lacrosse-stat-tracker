import { supabase } from './supabase';
import type { Database } from './database.types';

type Player = Database['public']['Tables']['players']['Row'];
type Game = Database['public']['Tables']['games']['Row'];
type GameEvent = Database['public']['Tables']['game_events']['Row'];

function isMobile(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

async function downloadFile(content: string, filename: string, mimeType: string): Promise<void> {
  if (isMobile() && navigator.share) {
    const blob = new Blob([content], { type: mimeType });
    const file = new File([blob], filename, { type: mimeType });

    try {
      await navigator.share({ files: [file] });
      return;
    } catch (shareError: any) {
      if (shareError.name === 'AbortError') {
        return;
      }
    }
  }

  showFallbackModal(content, filename, mimeType);
}

function showFallbackModal(content: string, filename: string, mimeType: string): void {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  `;

  const content_div = document.createElement('div');
  content_div.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  `;

  const title = document.createElement('h3');
  title.textContent = 'Export Ready';
  title.style.cssText = 'margin: 0 0 8px 0; font-size: 18px; font-weight: bold;';

  const subtitle = document.createElement('p');
  subtitle.innerHTML = 'Try <strong>Download File</strong> button first, or use <strong>Copy to Clipboard</strong> and paste into a text editor, saving as <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace;">' + filename + '</code>';
  subtitle.style.cssText = 'margin: 0 0 12px 0; font-size: 14px; color: #666; line-height: 1.5;';

  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.readOnly = true;
  textarea.style.cssText = `
    flex: 1;
    min-height: 200px;
    font-family: monospace;
    font-size: 12px;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-bottom: 16px;
    resize: vertical;
  `;

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';

  const downloadButton = document.createElement('button');
  downloadButton.textContent = 'Download File';
  downloadButton.style.cssText = `
    background: #10b981;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  downloadButton.onclick = () => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      downloadButton.textContent = 'Downloaded!';
      downloadButton.style.background = '#059669';
      setTimeout(() => {
        downloadButton.textContent = 'Download File';
        downloadButton.style.background = '#10b981';
      }, 2000);
    } catch (error) {
      downloadButton.textContent = 'Download Failed';
      downloadButton.style.background = '#ef4444';
      setTimeout(() => {
        downloadButton.textContent = 'Download File';
        downloadButton.style.background = '#10b981';
      }, 2000);
    }
  };

  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy to Clipboard';
  copyButton.style.cssText = `
    background: #3b82f6;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  copyButton.onclick = () => {
    textarea.select();
    navigator.clipboard.writeText(content).then(() => {
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy to Clipboard';
      }, 2000);
    });
  };

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.cssText = `
    background: #6b7280;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  closeButton.onclick = () => document.body.removeChild(modal);

  buttonContainer.appendChild(downloadButton);
  buttonContainer.appendChild(copyButton);
  buttonContainer.appendChild(closeButton);
  content_div.appendChild(title);
  content_div.appendChild(subtitle);
  content_div.appendChild(textarea);
  content_div.appendChild(buttonContainer);
  modal.appendChild(content_div);
  document.body.appendChild(modal);
}

interface PlayerStats {
  goals: number;
  assists: number;
  shots: number;
  shots_on_goal: number;
  ground_balls: number;
  turnovers: number;
  caused_turnovers: number;
  unforced_errors: number;
  saves: number;
  goals_allowed: number;
  faceoffs_won: number;
  faceoffs_lost: number;
  penalties: number;
  penalty_minutes: number;
}

interface PlayerWithStats extends Player {
  stats: PlayerStats;
}

function calculatePlayerStats(playerId: string, events: GameEvent[], playerTeamId: string | null): PlayerStats {
  const stats: PlayerStats = {
    goals: 0,
    assists: 0,
    shots: 0,
    shots_on_goal: 0,
    ground_balls: 0,
    turnovers: 0,
    caused_turnovers: 0,
    unforced_errors: 0,
    saves: 0,
    goals_allowed: 0,
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
      if (!event.caused_by_player_id) {
        stats.unforced_errors++;
      }
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

function normalizePosition(positions: string[]): string {
  if (!positions || positions.length === 0) return 'M';

  const posMap: { [key: string]: string } = {
    'Attack': 'A',
    'Midfield': 'M',
    'Defense': 'D',
    'Goalie': 'G',
    'LSM': 'LSM',
    'SSDM': 'M',
    'FO': 'M'
  };

  return posMap[positions[0]] || 'M';
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function exportToMaxPreps(gameId: string, teamId: string) {
  const [teamPlayersResult, gameResult, eventsResult] = await Promise.all([
    supabase.from('players').select('*').eq('program_id', teamId).eq('is_opponent', false).order('number'),
    supabase.from('games').select('*').eq('id', gameId).maybeSingle(),
    supabase.from('game_events').select('*').eq('game_id', gameId),
  ]);

  if (!gameResult.data || !teamPlayersResult.data || !eventsResult.data) {
    throw new Error('Failed to load game data');
  }

  const game = gameResult.data;
  const players = teamPlayersResult.data;

  console.log('MaxPreps Export - Found players:', players.length);
  console.log('MaxPreps Export - Found events:', eventsResult.data.length);

  const lines: string[] = [];

  lines.push(generateUUID());

  lines.push('Jersey|Goals|Assists|TotalShots|ShotsOnGoal|GroundBalls|Turnovers|Takeaways|UnforcedErrors|FaceoffWon|FaceoffAttempts|Saves|GoalsAgainst|Penalties|PenaltyMinutes');

  let playersWithStats = 0;

  players.forEach(player => {
    const stats = calculatePlayerStats(player.id, eventsResult.data || [], teamId);

    const jersey = player.number || 0;
    const goals = stats.goals;
    const assists = stats.assists;
    const totalShots = stats.shots;
    const shotsOnGoal = stats.shots_on_goal;
    const groundBalls = stats.ground_balls;
    const turnovers = stats.turnovers;
    const takeaways = stats.caused_turnovers;
    const unforcedErrors = stats.unforced_errors;
    const faceoffWon = stats.faceoffs_won;
    const faceoffAttempts = stats.faceoffs_won + stats.faceoffs_lost;
    const saves = stats.saves;
    const goalsAgainst = stats.goals_allowed;
    const penalties = stats.penalties;
    const penaltyMinutes = stats.penalty_minutes;

    const hasStats = goals > 0 || assists > 0 || totalShots > 0 || groundBalls > 0 ||
                     turnovers > 0 || takeaways > 0 || unforcedErrors > 0 ||
                     faceoffAttempts > 0 || saves > 0 || goalsAgainst > 0 || penalties > 0;

    if (hasStats) {
      playersWithStats++;
      lines.push(
        `${jersey}|${goals}|${assists}|${totalShots}|${shotsOnGoal}|${groundBalls}|${turnovers}|${takeaways}|${unforcedErrors}|${faceoffWon}|${faceoffAttempts}|${saves}|${goalsAgainst}|${penalties}|${penaltyMinutes}`
      );
    }
  });

  console.log('MaxPreps Export - Players with stats:', playersWithStats);
  console.log('MaxPreps Export - Output lines:', lines.length);

  const output = lines.join('\n');
  const opponentName = game.opponent || game.opponent_team_name || 'Opponent';
  const filename = `MaxPreps_${opponentName.replace(/\s+/g, '_')}_${game.game_date}.txt`;
  await downloadFile(output, filename, 'text/plain');
}

export async function exportFullGameReport(gameId: string, teamId: string) {
  const [teamPlayersResult, opponentPlayersResult, gameResult, eventsResult] = await Promise.all([
    supabase.from('players').select('*').eq('program_id', teamId).eq('is_opponent', false).order('number'),
    supabase.from('players').select('*').eq('game_id', gameId).eq('is_opponent', true).order('number'),
    supabase.from('games').select('*').eq('id', gameId).maybeSingle(),
    supabase.from('game_events').select('*').eq('game_id', gameId),
  ]);

  if (!gameResult.data || !teamPlayersResult.data || !eventsResult.data) {
    throw new Error('Failed to load game data');
  }

  const game = gameResult.data;
  const teamPlayers = teamPlayersResult.data;
  const opponentPlayers = opponentPlayersResult.data || [];

  const teamWithStats = teamPlayers.map(player => {
    const stats = calculatePlayerStats(player.id, eventsResult.data || [], teamId);
    return { ...player, stats };
  }).filter(p => {
    const s = p.stats;
    return s.goals + s.assists + s.shots + s.ground_balls + s.turnovers + s.caused_turnovers + s.unforced_errors + s.saves + s.faceoffs_won + s.faceoffs_lost + s.penalties > 0;
  });

  const opponentWithStats = opponentPlayers.map(player => {
    const stats = calculatePlayerStats(player.id, eventsResult.data || [], game.opponent_team_id || null);
    return { ...player, stats };
  }).filter(p => {
    const s = p.stats;
    return s.goals + s.assists + s.shots + s.ground_balls + s.turnovers + s.caused_turnovers + s.unforced_errors + s.saves + s.faceoffs_won + s.faceoffs_lost + s.penalties > 0;
  });

  const ourScore = teamWithStats.reduce((sum, p) => sum + p.stats.goals, 0);
  const oppScore = opponentWithStats.reduce((sum, p) => sum + p.stats.goals, 0);

  const opponentName = game.opponent || game.opponent_team_name || 'Opponent';

  const csvLines = [
    `Game Report - ${game.game_date}`,
    `Opponent: ${opponentName}`,
    `Final Score: ${ourScore} - ${oppScore}`,
    '',
    'YOUR TEAM',
    'Player Number,Player Name,Position,Goals,Assists,Points,Shots,SOG,GB,TO,CT,FO Won,FO Lost,Saves,GA,PEN,PIM',
  ];

  teamWithStats.forEach(player => {
    const s = player.stats;
    const foRecord = s.faceoffs_won + s.faceoffs_lost > 0 ? `${s.faceoffs_won}` : '0';
    const foLost = s.faceoffs_won + s.faceoffs_lost > 0 ? `${s.faceoffs_lost}` : '0';
    csvLines.push(
      `${player.number},"${player.name}","${player.position.join('/')}",${s.goals},${s.assists},${s.goals + s.assists},${s.shots},${s.shots_on_goal},${s.ground_balls},${s.turnovers},${s.caused_turnovers},${foRecord},${foLost},${s.saves},${s.goals_allowed},${s.penalties},${s.penalty_minutes}`
    );
  });

  csvLines.push('');
  csvLines.push(`OPPONENT - ${opponentName}`);
  csvLines.push('Player Number,Player Name,Position,Goals,Assists,Points,Shots,SOG,GB,TO,CT,FO Won,FO Lost,Saves,GA,PEN,PIM');

  opponentWithStats.forEach(player => {
    const s = player.stats;
    const foRecord = s.faceoffs_won + s.faceoffs_lost > 0 ? `${s.faceoffs_won}` : '0';
    const foLost = s.faceoffs_won + s.faceoffs_lost > 0 ? `${s.faceoffs_lost}` : '0';
    csvLines.push(
      `${player.number},"${player.name}","${player.position.join('/')}",${s.goals},${s.assists},${s.goals + s.assists},${s.shots},${s.shots_on_goal},${s.ground_balls},${s.turnovers},${s.caused_turnovers},${foRecord},${foLost},${s.saves},${s.goals_allowed},${s.penalties},${s.penalty_minutes}`
    );
  });

  const csv = csvLines.join('\n');
  const filename = `Game_Report_${opponentName.replace(/\s+/g, '_')}_${game.game_date}.csv`;
  await downloadFile(csv, filename, 'text/csv');
}
