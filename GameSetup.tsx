import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { ArrowLeft, Users, Upload, Play, Hash } from 'lucide-react';
import { BulkPlayerImport } from './BulkPlayerImport';

type Player = Database['public']['Tables']['players']['Row'];
type Game = Database['public']['Tables']['games']['Row'];

interface GameSetupProps {
  gameId: string;
  onBack: () => void;
  onStartTracking: () => void;
}

export function GameSetup({ gameId, onBack, onStartTracking }: GameSetupProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [opponentPlayers, setOpponentPlayers] = useState<Player[]>([]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showNumberGen, setShowNumberGen] = useState(false);
  const [numberRange, setNumberRange] = useState({ start: '1', end: '50' });

  useEffect(() => {
    loadGameData();
  }, [gameId]);

  async function loadGameData() {
    const [gameResult, playersResult] = await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).maybeSingle(),
      supabase.from('players').select('*').eq('game_id', gameId).eq('is_opponent', true).order('number'),
    ]);

    if (gameResult.data) {
      setGame(gameResult.data);
    }

    if (playersResult.data) {
      setOpponentPlayers(playersResult.data);
    }
  }

  async function generateNumbers(e: React.FormEvent) {
    e.preventDefault();
    const start = parseInt(numberRange.start);
    const end = parseInt(numberRange.end);

    if (isNaN(start) || isNaN(end) || start > end) {
      alert('Please enter valid start and end numbers');
      return;
    }

    const numbers = [];
    for (let i = start; i <= end; i++) {
      numbers.push({
        number: i,
        name: `#${i}`,
        position: ['Midfield'],
        team_id: game?.opponent_team_id || null,
        game_id: gameId,
        is_opponent: true,
      });
    }

    const { error } = await supabase.from('players').insert(numbers);

    if (error) {
      console.error('Error generating numbers:', error);
      alert('Error generating numbers: ' + error.message);
    } else {
      alert(`Successfully generated ${numbers.length} player numbers!`);
      setShowNumberGen(false);
      loadGameData();
    }
  }

  if (!game) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="text-center flex-1">
          <h2 className="text-2xl font-bold">Game Setup</h2>
          <div className="text-gray-600">vs {game.opponent}</div>
        </div>
        <button
          onClick={onStartTracking}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Play size={20} />
          Start Tracking
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={24} className="text-red-600" />
            <h3 className="text-lg font-bold">{game.opponent} Roster</h3>
            <span className="text-sm text-gray-600">({opponentPlayers.length} players)</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNumberGen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Hash size={20} />
              Generate Numbers
            </button>
            <button
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Upload size={20} />
              Import Roster
            </button>
          </div>
        </div>

        {opponentPlayers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">No opponent players added yet.</p>
            <p className="text-sm">
              You can track the game without opponent rosters, or import their roster now for more detailed stats.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {opponentPlayers.map((player) => (
              <div
                key={player.id}
                className="p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {player.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{player.name}</div>
                    <div className="text-xs text-gray-600">{player.position}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Ready to Track Stats?</h4>
        <p className="text-sm text-blue-700 mb-3">
          Click "Start Tracking" to begin recording game statistics. You can add opponent players anytime during the game.
        </p>
        <button
          onClick={onStartTracking}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          <Play size={20} />
          Start Tracking Stats
        </button>
      </div>

      {showNumberGen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Generate Player Numbers</h3>
            <p className="text-gray-600 mb-4">
              Quickly create opponent players by number range. Names will be set to the number.
            </p>
            <form onSubmit={generateNumbers}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Start Number</label>
                  <input
                    type="number"
                    value={numberRange.start}
                    onChange={(e) => setNumberRange({ ...numberRange, start: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">End Number</label>
                  <input
                    type="number"
                    value={numberRange.end}
                    onChange={(e) => setNumberRange({ ...numberRange, end: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Generate
                </button>
                <button
                  type="button"
                  onClick={() => setShowNumberGen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkImport && (
        <BulkPlayerImport
          teamId={null}
          gameId={gameId}
          isOpponent={true}
          opponentTeamId={game.opponent_team_id}
          onComplete={loadGameData}
          onClose={() => setShowBulkImport(false)}
        />
      )}
    </div>
  );
}
