import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Users, Plus, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PlayerManagement } from './PlayerManagement';

interface Program {
  id: string;
  name: string;
}

interface Game {
  id: string;
  opponent: string;
  opponent_id: string | null;
  opponent_team_name?: string;
  our_score: number;
  opponent_score: number;
  game_date: string;
  created_at: string;
}

interface Opponent {
  id: string;
  name: string;
}

interface Player {
  id: string;
  name: string;
  number: string;
  position: string[];
  program_id: string;
}

interface ProgramHubProps {
  program: Program;
  onBack: () => void;
  onNewGame: (programId: string) => void;
  onOpenGame: (gameId: string) => void;
}

export function ProgramHub({ program, onBack, onNewGame, onOpenGame }: ProgramHubProps) {
  const [activeTab, setActiveTab] = useState<'games' | 'roster'>('games');
  const [games, setGames] = useState<Game[]>([]);
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRosterWarning, setShowRosterWarning] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editFormData, setEditFormData] = useState({
    opponent_id: '',
    game_date: '',
  });

  useEffect(() => {
    loadData();
  }, [program.id]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadGames(), loadPlayers(), loadOpponents()]);
    setLoading(false);
  }

  async function loadGames() {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('program_id', program.id)
        .order('game_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error loading games:', error);
    }
  }

  async function loadPlayers() {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('program_id', program.id)
        .order('number', { ascending: true });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  }

  async function loadOpponents() {
    try {
      const { data, error } = await supabase
        .from('opponent_library')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setOpponents(data || []);
    } catch (error) {
      console.error('Error loading opponents:', error);
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

    try {
      const { error } = await supabase
        .from('games')
        .update({
          opponent_id: editFormData.opponent_id,
          opponent: selectedOpponent.name,
          game_date: editFormData.game_date,
        })
        .eq('id', editingGame.id);

      if (error) throw error;
      setEditingGame(null);
      loadGames();
    } catch (error) {
      console.error('Error updating game:', error);
      alert('Failed to update game. Please try again.');
    }
  }

  async function deleteGame(gameId: string) {
    if (!confirm('Delete this game? All stats will be lost.')) return;

    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);

      if (error) throw error;
      loadGames();
    } catch (error) {
      console.error('Error deleting game:', error);
    }
  }

  async function handlePlayerUpdate() {
    await loadPlayers();
  }

  function handleStartNewGame() {
    if (players.length === 0) {
      setShowRosterWarning(true);
    } else {
      onNewGame(program.id);
    }
  }

  function continueToGame() {
    setShowRosterWarning(false);
    onNewGame(program.id);
  }

  function goToRoster() {
    setShowRosterWarning(false);
    setActiveTab('roster');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Programs
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-slate-900">{program.name}</h1>
            <button
              onClick={() => setActiveTab('roster')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <Users className="w-5 h-5" />
              Manage Roster
            </button>
          </div>

          <div className="flex gap-2 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('games')}
              className={`px-6 py-3 font-semibold transition-colors relative ${
                activeTab === 'games'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Games ({games.length})
              </div>
              {activeTab === 'games' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-6 py-3 font-semibold transition-colors relative ${
                activeTab === 'roster'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Roster ({players.length})
              </div>
              {activeTab === 'roster' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>

          {activeTab === 'games' ? (
            <div>
              <div className="mb-6">
                <button
                  onClick={handleStartNewGame}
                  className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-3 font-semibold shadow-sm"
                >
                  <Plus className="w-6 h-6" />
                  Start New Game
                </button>
              </div>

              {games.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 text-lg mb-2">No games yet</p>
                  <p className="text-slate-500 text-sm">Start your first game to begin tracking stats</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                    >
                      <button
                        onClick={() => onOpenGame(game.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900">
                              {game.our_score}
                            </div>
                            <div className="text-xs text-slate-500">GC</div>
                          </div>
                          <div className="text-slate-400">-</div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900">
                              {game.opponent_score}
                            </div>
                            <div className="text-xs text-slate-500">Opponent</div>
                          </div>
                          <div className="flex-1 ml-4">
                            <div className="font-semibold text-slate-800">
                              {program.name} vs {game.opponent}
                            </div>
                            <div className="text-sm text-slate-500">
                              {new Date(game.game_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </button>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => openEditModal(game)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteGame(game.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <PlayerManagement
                players={players}
                teamType="home"
                onPlayerUpdate={handlePlayerUpdate}
                programId={program.id}
              />
            </div>
          )}
        </div>
      </div>

      {showRosterWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 mb-3">Empty Roster</h3>
            <p className="text-slate-600 mb-6">
              This team has no roster yet. You can add players now or continue to the game and add them later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={goToRoster}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Go to Roster
              </button>
              <button
                onClick={continueToGame}
                className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
              >
                Continue to Game
              </button>
            </div>
          </div>
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
