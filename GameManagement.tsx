import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { Calendar, Plus, Trash2, Edit2 } from 'lucide-react';

type Game = Database['public']['Tables']['games']['Row'];

interface Opponent {
  id: string;
  name: string;
}

interface GameManagementProps {
  teamId: string;
  onGameSelected: (gameId: string, isNewGame?: boolean) => void;
}

export function GameManagement({ teamId, onGameSelected }: GameManagementProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState({
    opponent: '',
    game_date: '',
  });
  const [editFormData, setEditFormData] = useState({
    opponent_id: '',
    game_date: '',
  });

  useEffect(() => {
    loadGames();
    loadOpponents();
  }, [teamId]);

  async function loadGames() {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('team_id', teamId)
      .order('game_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading games:', error);
    } else {
      setGames(data || []);
    }
  }

  async function loadOpponents() {
    const { data, error } = await supabase
      .from('opponent_library')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading opponents:', error);
    } else {
      setOpponents(data || []);
    }
  }

  async function createGame(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.opponent.trim()) return;

    const { data: opponentTeam, error: teamError } = await supabase
      .from('teams')
      .insert({ name: formData.opponent })
      .select()
      .single();

    if (teamError) {
      console.error('Error creating opponent team:', teamError);
      return;
    }

    const { data, error } = await supabase
      .from('games')
      .insert({
        team_id: teamId,
        opponent: formData.opponent,
        opponent_team_id: opponentTeam.id,
        game_date: formData.game_date,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating game:', error);
    } else if (data) {
      setFormData({ opponent: '', game_date: '' });
      setShowForm(false);
      loadGames();
      onGameSelected(data.id, true);
    }
  }

  function openEditModal(game: Game) {
    setEditingGame(game);
    setEditFormData({
      opponent_id: game.opponent_id || '',
      game_date: game.game_date,
    });
  }

  async function saveGameEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingGame || !editFormData.opponent_id || !editFormData.game_date) return;

    const selectedOpponent = opponents.find(o => o.id === editFormData.opponent_id);
    if (!selectedOpponent) return;

    const { error } = await supabase
      .from('games')
      .update({
        opponent_id: editFormData.opponent_id,
        opponent: selectedOpponent.name,
        game_date: editFormData.game_date,
      })
      .eq('id', editingGame.id);

    if (error) {
      console.error('Error updating game:', error);
      alert('Failed to update game. Please try again.');
    } else {
      setEditingGame(null);
      loadGames();
    }
  }

  async function deleteGame(gameId: string, opponent: string) {
    if (!confirm(`Delete game vs ${opponent}? This will also delete all stats and events for this game.`)) {
      return;
    }

    await supabase.from('game_events').delete().eq('game_id', gameId);
    await supabase.from('game_stats').delete().eq('game_id', gameId);
    await supabase.from('players').delete().eq('game_id', gameId).eq('is_opponent', true);

    const { error } = await supabase.from('games').delete().eq('id', gameId);

    if (error) {
      console.error('Error deleting game:', error);
      alert('Failed to delete game. Please try again.');
    } else {
      loadGames();
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getGameResult(game: Game) {
    if (game.our_score === 0 && game.opponent_score === 0) return 'Not Started';
    if (game.our_score > game.opponent_score) return 'W';
    if (game.our_score < game.opponent_score) return 'L';
    return 'T';
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Games</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New Game
        </button>
      </div>

      {showForm && (
        <form onSubmit={createGame} className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={formData.opponent}
              onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
              placeholder="Opponent name"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="date"
              value={formData.game_date}
              onChange={(e) => setFormData({ ...formData, game_date: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Game
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {games.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No games yet. Create your first game!</div>
      ) : (
        <div className="grid gap-2">
          {games.map((game) => {
            const result = getGameResult(game);
            const resultColor =
              result === 'W'
                ? 'bg-green-100 text-green-800'
                : result === 'L'
                ? 'bg-red-100 text-red-800'
                : result === 'T'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-600';

            return (
              <div
                key={game.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-500 transition-colors group"
              >
                <button
                  onClick={() => onGameSelected(game.id)}
                  className="flex items-center gap-4 flex-1 text-left hover:opacity-75 transition-opacity"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${resultColor}`}>
                    {result}
                  </div>
                  <div>
                    <div className="font-semibold">vs {game.opponent}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(game.game_date)}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-gray-700">
                    {game.our_score} - {game.opponent_score}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(game);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit game"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGame(game.id, game.opponent);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete game"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Edit Game</h3>
            <form onSubmit={saveGameEdit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Game Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editFormData.game_date}
                    onChange={(e) => setEditFormData({ ...editFormData, game_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Opponent <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.opponent_id}
                    onChange={(e) => setEditFormData({ ...editFormData, opponent_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select opponent...</option>
                    {opponents.map((opp) => (
                      <option key={opp.id} value={opp.id}>
                        {opp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingGame(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
