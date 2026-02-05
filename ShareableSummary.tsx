import type { Database } from '../lib/database.types';

type Player = Database['public']['Tables']['players']['Row'];
type Game = Database['public']['Tables']['games']['Row'];

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

interface ShareableSummaryProps {
  game: Game;
  teamName: string;
  teamPlayers: PlayerWithStats[];
  opponentPlayers: PlayerWithStats[];
  teamClearStats: { attempts: number; successes: number };
  opponentClearStats: { attempts: number; successes: number };
}

export function ShareableSummary({
  game,
  teamName,
  teamPlayers,
  opponentPlayers,
  teamClearStats,
  opponentClearStats,
}: ShareableSummaryProps) {
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

  function calculateShootingPercentage(goals: number, shots: number): string {
    if (shots === 0) return '-';
    return ((goals / shots) * 100).toFixed(0) + '%';
  }

  function calculateSavePercentage(saves: number, shotsAgainst: number): string {
    if (shotsAgainst === 0) return '-';
    return ((saves / shotsAgainst) * 100).toFixed(0) + '%';
  }

  return (
    <div style={{
      width: '1200px',
      backgroundColor: 'white',
      padding: '40px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'absolute',
      left: '-9999px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' }}>
          {teamName}
        </div>
        <div style={{ fontSize: '18px', color: '#6b7280', marginBottom: '16px' }}>
          vs {game.opponent}
        </div>
        <div style={{ fontSize: '64px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
          {ourScore} - {oppScore}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {(() => {
          const teamWon = teamPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won, 0);
          const oppWon = opponentPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won, 0);
          const net = teamWon - oppWon;

          const borderColor = net > 0 ? '#22c55e' : net < 0 ? '#ef4444' : '#9ca3af';
          const textColor = net > 0 ? '#16a34a' : net < 0 ? '#dc2626' : '#6b7280';

          return (
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '2px solid #e5e7eb', borderTop: `4px solid ${borderColor}` }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Faceoffs</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>
                {net === 0 ? 'Even' : net > 0 ? `+${net} Advantage` : `${net} Disadvantage`}
              </div>
              <div style={{ fontSize: '16px', color: '#6b7280' }}>
                {teamWon}-{oppWon}
              </div>
            </div>
          );
        })()}
        {(() => {
          const teamGB = teamPlayers.reduce((sum, p) => sum + p.stats.ground_balls, 0);
          const oppGB = opponentPlayers.reduce((sum, p) => sum + p.stats.ground_balls, 0);
          const net = teamGB - oppGB;

          const borderColor = net > 0 ? '#22c55e' : net < 0 ? '#ef4444' : '#9ca3af';
          const textColor = net > 0 ? '#16a34a' : net < 0 ? '#dc2626' : '#6b7280';

          return (
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '2px solid #e5e7eb', borderTop: `4px solid ${borderColor}` }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Ground Balls</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>
                {net === 0 ? 'Even' : net > 0 ? `+${net} Advantage` : `${net} Disadvantage`}
              </div>
              <div style={{ fontSize: '16px', color: '#6b7280' }}>
                {teamGB}-{oppGB}
              </div>
            </div>
          );
        })()}
        {(() => {
          const teamTO = teamPlayers.reduce((sum, p) => sum + p.stats.turnovers, 0);
          const oppTO = opponentPlayers.reduce((sum, p) => sum + p.stats.turnovers, 0);
          const net = oppTO - teamTO;

          const borderColor = net > 0 ? '#22c55e' : net < 0 ? '#ef4444' : '#9ca3af';
          const textColor = net > 0 ? '#16a34a' : net < 0 ? '#dc2626' : '#6b7280';

          return (
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '2px solid #e5e7eb', borderTop: `4px solid ${borderColor}` }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Turnovers</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>
                {net === 0 ? 'Even' : net > 0 ? `+${net} Advantage` : `${net} Disadvantage`}
              </div>
              <div style={{ fontSize: '16px', color: '#6b7280' }}>
                {teamTO}-{oppTO}
              </div>
            </div>
          );
        })()}
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: '#2563eb' }}>
          {teamName}
        </h3>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>#</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Player</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>G</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>A</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Pts</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>S</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>SOG</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>SH%</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>GB</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>TO</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>CT</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>FO</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>FO%</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>SV</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>GA</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>SV%</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>CLR</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>CLR%</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>PEN</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>PIM</th>
              </tr>
            </thead>
            <tbody>
              {teamPlayers.map((player, idx) => {
                const totalFaceoffs = player.stats.faceoffs_won + player.stats.faceoffs_lost;
                const faceoffPct = totalFaceoffs > 0
                  ? ((player.stats.faceoffs_won / totalFaceoffs) * 100).toFixed(0) + '%'
                  : '-';
                return (
                  <tr key={player.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '600' }}>{player.number || '?'}</td>
                    <td style={{ padding: '10px 12px' }}>{player.name}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600' }}>{player.stats.goals || 0}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.assists || 0}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.goals + player.stats.assists}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.shots || 0}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.shots_on_goal || 0}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>{calculateShootingPercentage(player.stats.goals, player.stats.shots)}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.ground_balls || 0}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.turnovers || 0}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.caused_turnovers || 0}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                      {totalFaceoffs > 0 ? `${player.stats.faceoffs_won}-${totalFaceoffs}` : '-'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>{faceoffPct}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.saves || 0}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.goals_allowed || 0}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                      {player.stats.saves > 0 ? calculateSavePercentage(player.stats.saves, player.stats.saves + player.stats.goals_allowed) : '-'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                      {player.stats.clear_attempts > 0 ? `${player.stats.clear_successes}-${player.stats.clear_attempts}` : '-'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                      {player.stats.clear_attempts > 0 ? ((player.stats.clear_successes / player.stats.clear_attempts) * 100).toFixed(0) + '%' : '-'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.penalties || 0}</td>
                    <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.penalty_minutes || 0}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f3f4f6', fontWeight: '600' }}>
                <td colSpan={2} style={{ padding: '10px 12px', borderTop: '2px solid #e5e7eb' }}>TOTALS</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{teamTotalGoals}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{teamPlayers.reduce((sum, p) => sum + p.stats.assists, 0)}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{teamTotalGoals + teamPlayers.reduce((sum, p) => sum + p.stats.assists, 0)}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{teamTotalShots}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{teamTotalShotsOnGoal}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{calculateShootingPercentage(teamTotalGoals, teamTotalShots)}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{teamPlayers.reduce((sum, p) => sum + p.stats.ground_balls, 0)}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{teamPlayers.reduce((sum, p) => sum + p.stats.turnovers, 0)}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{teamPlayers.reduce((sum, p) => sum + p.stats.caused_turnovers, 0)}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>
                  {teamPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won, 0)}-{teamPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won + p.stats.faceoffs_lost, 0)}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>
                  {(() => {
                    const won = teamPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won, 0);
                    const total = teamPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won + p.stats.faceoffs_lost, 0);
                    return total > 0 ? ((won / total) * 100).toFixed(0) + '%' : '-';
                  })()}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{teamTotalSaves}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{teamPlayers.reduce((sum, p) => sum + p.stats.goals_allowed, 0)}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>
                  {teamTotalSaves > 0 ? calculateSavePercentage(teamTotalSaves, oppTotalShotsOnGoal) : '-'}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>
                  {teamClearStats.attempts > 0 ? `${teamClearStats.successes}-${teamClearStats.attempts}` : '-'}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>
                  {teamClearStats.attempts > 0 ? ((teamClearStats.successes / teamClearStats.attempts) * 100).toFixed(0) + '%' : '-'}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{teamPlayers.reduce((sum, p) => sum + p.stats.penalties, 0)}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{teamPlayers.reduce((sum, p) => sum + p.stats.penalty_minutes, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {opponentPlayers.length > 0 && (
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: '#dc2626' }}>
            {game.opponent}
          </h3>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Player</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>G</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>A</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Pts</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>S</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>SOG</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>SH%</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>GB</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>TO</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>CT</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>FO</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>FO%</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>SV</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>GA</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>SV%</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>CLR</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>CLR%</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>PEN</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>PIM</th>
                </tr>
              </thead>
              <tbody>
                {opponentPlayers.map((player, idx) => {
                  const totalFaceoffs = player.stats.faceoffs_won + player.stats.faceoffs_lost;
                  const faceoffPct = totalFaceoffs > 0
                    ? ((player.stats.faceoffs_won / totalFaceoffs) * 100).toFixed(0) + '%'
                    : '-';
                  return (
                    <tr key={player.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                      <td style={{ padding: '10px 12px', fontWeight: '600' }}>{player.number || '?'}</td>
                      <td style={{ padding: '10px 12px' }}>{player.name}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px', fontWeight: '600' }}>{player.stats.goals || 0}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.assists || 0}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.goals + player.stats.assists}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.shots || 0}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.shots_on_goal || 0}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>{calculateShootingPercentage(player.stats.goals, player.stats.shots)}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.ground_balls || 0}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.turnovers || 0}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.caused_turnovers || 0}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                        {totalFaceoffs > 0 ? `${player.stats.faceoffs_won}-${totalFaceoffs}` : '-'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>{faceoffPct}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.saves || 0}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.goals_allowed || 0}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                        {player.stats.saves > 0 ? calculateSavePercentage(player.stats.saves, player.stats.saves + player.stats.goals_allowed) : '-'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                        {player.stats.clear_attempts > 0 ? `${player.stats.clear_successes}-${player.stats.clear_attempts}` : '-'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                        {player.stats.clear_attempts > 0 ? ((player.stats.clear_successes / player.stats.clear_attempts) * 100).toFixed(0) + '%' : '-'}
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.penalties || 0}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>{player.stats.penalty_minutes || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f3f4f6', fontWeight: '600' }}>
                  <td colSpan={2} style={{ padding: '10px 12px', borderTop: '2px solid #e5e7eb' }}>TOTALS</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{oppTotalGoals}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{opponentPlayers.reduce((sum, p) => sum + p.stats.assists, 0)}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{oppTotalGoals + opponentPlayers.reduce((sum, p) => sum + p.stats.assists, 0)}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{oppTotalShots}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{oppTotalShotsOnGoal}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{calculateShootingPercentage(oppTotalGoals, oppTotalShots)}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{opponentPlayers.reduce((sum, p) => sum + p.stats.ground_balls, 0)}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{opponentPlayers.reduce((sum, p) => sum + p.stats.turnovers, 0)}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{opponentPlayers.reduce((sum, p) => sum + p.stats.caused_turnovers, 0)}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>
                    {opponentPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won, 0)}-{opponentPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won + p.stats.faceoffs_lost, 0)}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>
                    {(() => {
                      const won = opponentPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won, 0);
                      const total = opponentPlayers.reduce((sum, p) => sum + p.stats.faceoffs_won + p.stats.faceoffs_lost, 0);
                      return total > 0 ? ((won / total) * 100).toFixed(0) + '%' : '-';
                    })()}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{oppTotalSaves}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{opponentPlayers.reduce((sum, p) => sum + p.stats.goals_allowed, 0)}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>
                    {oppTotalSaves > 0 ? calculateSavePercentage(oppTotalSaves, teamTotalShotsOnGoal) : '-'}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>
                    {opponentClearStats.attempts > 0 ? `${opponentClearStats.successes}-${opponentClearStats.attempts}` : '-'}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>
                    {opponentClearStats.attempts > 0 ? ((opponentClearStats.successes / opponentClearStats.attempts) * 100).toFixed(0) + '%' : '-'}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{opponentPlayers.reduce((sum, p) => sum + p.stats.penalties, 0)}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', borderTop: '2px solid #e5e7eb' }}>{opponentPlayers.reduce((sum, p) => sum + p.stats.penalty_minutes, 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
