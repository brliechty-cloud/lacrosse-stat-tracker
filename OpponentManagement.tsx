import { useEffect, useState } from 'react';
import { ArrowLeft, Users, Plus, Edit2, Trash2, Hash, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BulkPlayerImport } from './BulkPlayerImport';

interface Opponent {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface Player {
  id: string;
  name: string;
  number: number;
  position: string[];
  team_id: string;
}

interface OpponentManagementProps {
  onBack: () => void;
}

export function OpponentManagement({ onBack }: OpponentManagementProps) {
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<Opponent | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showAddOpponent, setShowAddOpponent] = useState(false);
  const [showEditOpponent, setShowEditOpponent] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showNumberGen, setShowNumberGen] = useState(false);
  const [newOpponentName, setNewOpponentName] = useState('');
  const [editOpponentName, setEditOpponentName] = useState('');
  const [numberRange, setNumberRange] = useState({ start: '1', end: '50' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOpponents();
  }, []);

  useEffect(() => {
    if (selectedOpponent) {
      loadOpponentPlayers();
    }
  }, [selectedOpponent]);

  async function loadOpponents() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('opponent_library')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setOpponents(data || []);
    } catch (error) {
      console.error('Error loading opponents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOpponentPlayers() {
    if (!selectedOpponent) return;

    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('name', selectedOpponent.name)
        .maybeSingle();

      if (teamError) {
        console.error('Error finding team:', teamError);
        setPlayers([]);
        return;
      }

      if (!teamData) {
        console.log('No team found for opponent:', selectedOpponent.name);
        setPlayers([]);
        return;
      }

      const { data: playersData, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamData.id)
        .eq('is_opponent', true)
        .is('game_id', null)
        .order('number', { ascending: true });

      if (error) {
        console.error('Error loading players:', error);
        throw error;
      }

      console.log('Loaded players:', playersData);
      setPlayers(playersData || []);
    } catch (error) {
      console.error('Error loading opponent players:', error);
      setPlayers([]);
    }
  }

  async function addOpponent(e: React.FormEvent) {
    e.preventDefault();
    if (!newOpponentName.trim()) return;

    const trimmedName = newOpponentName.trim();
    const duplicate = opponents.find(
      opp => opp.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      alert(`"${duplicate.name}" already exists.`);
      return;
    }

    try {
      const { data: oppData, error: oppError } = await supabase
        .from('opponent_library')
        .insert([{ name: trimmedName }])
        .select()
        .single();

      if (oppError) throw oppError;

      let teamData = null;
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('name', trimmedName)
        .maybeSingle();

      if (existingTeam) {
        console.log('Team already exists, using existing team:', existingTeam);
        teamData = existingTeam;
      } else {
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert([{ name: trimmedName }])
          .select()
          .single();

        if (teamError) {
          console.error('Error creating team:', teamError);
          throw teamError;
        }
        teamData = newTeam;
        console.log('Created new team:', teamData);
      }

      setNewOpponentName('');
      setShowAddOpponent(false);
      loadOpponents();
      setSelectedOpponent(oppData);
    } catch (error) {
      console.error('Error adding opponent:', error);
      alert('Failed to add opponent. Please try again.');
    }
  }

  async function updateOpponent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOpponent || !editOpponentName.trim()) return;

    const trimmedName = editOpponentName.trim();
    const duplicate = opponents.find(
      opp => opp.id !== selectedOpponent.id && opp.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      alert(`"${duplicate.name}" already exists.`);
      return;
    }

    try {
      const { error: oppError } = await supabase
        .from('opponent_library')
        .update({ name: trimmedName, updated_at: new Date().toISOString() })
        .eq('id', selectedOpponent.id);

      if (oppError) throw oppError;

      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('name', selectedOpponent.name)
        .maybeSingle();

      if (teamData) {
        await supabase
          .from('teams')
          .update({ name: trimmedName })
          .eq('id', teamData.id);
      }

      await supabase
        .from('games')
        .update({ opponent: trimmedName })
        .eq('opponent_id', selectedOpponent.id);

      setShowEditOpponent(false);
      setSelectedOpponent({ ...selectedOpponent, name: trimmedName });
      loadOpponents();
    } catch (error) {
      console.error('Error updating opponent:', error);
      alert('Failed to update opponent. Please try again.');
    }
  }

  async function deleteOpponent() {
    if (!selectedOpponent) return;
    if (!confirm(`Delete "${selectedOpponent.name}"? This will remove the opponent from the library but won't affect existing games.`)) return;

    try {
      const { error } = await supabase
        .from('opponent_library')
        .delete()
        .eq('id', selectedOpponent.id);

      if (error) throw error;
      setSelectedOpponent(null);
      loadOpponents();
    } catch (error) {
      console.error('Error deleting opponent:', error);
      alert('Failed to delete opponent. Please try again.');
    }
  }

  async function generateNumbers(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOpponent) return;

    const start = parseInt(numberRange.start);
    const end = parseInt(numberRange.end);

    if (isNaN(start) || isNaN(end) || start > end) {
      alert('Please enter valid start and end numbers');
      return;
    }

    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('name', selectedOpponent.name)
        .maybeSingle();

      if (teamError) {
        console.error('Error finding team:', teamError);
        alert('Error finding team: ' + teamError.message);
        return;
      }

      if (!teamData) {
        console.error('No team found for opponent:', selectedOpponent.name);
        alert('Team not found for this opponent. Please try again.');
        return;
      }

      console.log('Generating numbers for team:', teamData.id);

      const numbers = [];
      for (let i = start; i <= end; i++) {
        numbers.push({
          number: i,
          name: `#${i}`,
          position: ['Midfield'],
          team_id: teamData.id,
          is_opponent: true,
        });
      }

      const { data: insertedData, error } = await supabase.from('players').insert(numbers).select();

      if (error) {
        console.error('Error inserting players:', error);
        throw error;
      }

      console.log('Successfully inserted players:', insertedData);
      alert(`Successfully generated ${numbers.length} player numbers!`);
      setShowNumberGen(false);
      loadOpponentPlayers();
    } catch (error) {
      console.error('Error generating numbers:', error);
      alert('Failed to generate numbers. Please try again.');
    }
  }

  async function deletePlayer(playerId: string) {
    if (!confirm('Delete this player?')) return;

    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (error) throw error;
      loadOpponentPlayers();
    } catch (error) {
      console.error('Error deleting player:', error);
      alert('Failed to delete player. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Opponent Management</h1>
          <div className="w-24"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Opponents</h2>
                <button
                  onClick={() => setShowAddOpponent(true)}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Add opponent"
                >
                  <Plus size={20} />
                </button>
              </div>

              {opponents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="mb-2">No opponents yet</p>
                  <p className="text-sm">Add your first opponent to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {opponents.map((opp) => (
                    <button
                      key={opp.id}
                      onClick={() => setSelectedOpponent(opp)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedOpponent?.id === opp.id
                          ? 'bg-blue-50 border-2 border-blue-600'
                          : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="font-semibold text-slate-800">{opp.name}</div>
                      <div className="text-xs text-slate-500">
                        Updated: {new Date(opp.updated_at).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedOpponent ? (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedOpponent.name}</h2>
                    <p className="text-sm text-slate-500">Manage opponent roster</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditOpponentName(selectedOpponent.name);
                        setShowEditOpponent(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit opponent"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={deleteOpponent}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete opponent"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => setShowNumberGen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Hash size={20} />
                    Generate Numbers
                  </button>
                  <button
                    onClick={() => setShowBulkImport(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Upload size={20} />
                    Import Roster
                  </button>
                </div>

                {players.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Users size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="mb-2">No roster yet</p>
                    <p className="text-sm">Add players to this opponent's roster</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg group relative"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-slate-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {player.number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{player.name}</div>
                            <div className="text-xs text-slate-600">{player.position?.[0]}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => deletePlayer(player.id)}
                          className="absolute top-1 right-1 p-1 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <Users size={64} className="mx-auto mb-4 text-slate-300" />
                <p className="text-slate-600 text-lg mb-2">No opponent selected</p>
                <p className="text-slate-500 text-sm">Select an opponent from the list to manage their roster</p>
              </div>
            )}
          </div>
        </div>

        {showAddOpponent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Add New Opponent</h3>
              <form onSubmit={addOpponent}>
                <input
                  type="text"
                  value={newOpponentName}
                  onChange={(e) => setNewOpponentName(e.target.value)}
                  placeholder="Opponent name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  autoFocus
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Opponent
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddOpponent(false);
                      setNewOpponentName('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditOpponent && selectedOpponent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Edit Opponent</h3>
              <form onSubmit={updateOpponent}>
                <input
                  type="text"
                  value={editOpponentName}
                  onChange={(e) => setEditOpponentName(e.target.value)}
                  placeholder="Opponent name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  autoFocus
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditOpponent(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showNumberGen && selectedOpponent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Generate Player Numbers</h3>
              <p className="text-gray-600 mb-4">
                Quickly create players by number range. Names will be set to the number.
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

        {showBulkImport && selectedOpponent && (
          <BulkPlayerImport
            teamId={null}
            gameId={null}
            isOpponent={true}
            opponentTeamId={null}
            opponentName={selectedOpponent.name}
            onComplete={loadOpponentPlayers}
            onClose={() => setShowBulkImport(false)}
          />
        )}
      </div>
    </div>
  );
}
