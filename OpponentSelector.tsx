import { useEffect, useState } from 'react';
import { Search, Plus, Edit2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Opponent {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface OpponentSelectorProps {
  onSelectOpponent: (opponent: Opponent, gameDate: string) => void;
  onCancel: () => void;
}

export function OpponentSelector({ onSelectOpponent, onCancel }: OpponentSelectorProps) {
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [filteredOpponents, setFilteredOpponents] = useState<Opponent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [newOpponentName, setNewOpponentName] = useState('');
  const [editingOpponent, setEditingOpponent] = useState<Opponent | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOpponents();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredOpponents(
        opponents.filter(opp => opp.name.toLowerCase().includes(query))
      );
    } else {
      setFilteredOpponents(opponents);
    }
  }, [searchQuery, opponents]);

  async function loadOpponents() {
    try {
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

  async function addOpponent() {
    if (!newOpponentName.trim()) return;
    if (!gameDate) {
      alert('Please select a game date first');
      return;
    }

    const trimmedName = newOpponentName.trim();
    const duplicate = opponents.find(
      opp => opp.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      if (confirm(`"${duplicate.name}" already exists. Use this opponent instead?`)) {
        onSelectOpponent(duplicate, gameDate);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('opponent_library')
        .insert([{ name: trimmedName }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        onSelectOpponent(data, gameDate);
      }
    } catch (error) {
      console.error('Error adding opponent:', error);
    }
  }

  async function updateOpponent() {
    if (!editingOpponent || !editName.trim()) return;

    const trimmedName = editName.trim();
    const duplicate = opponents.find(
      opp => opp.id !== editingOpponent.id && opp.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      alert(`"${duplicate.name}" already exists. Please choose a different name.`);
      return;
    }

    try {
      const { error } = await supabase
        .from('opponent_library')
        .update({ name: trimmedName, updated_at: new Date().toISOString() })
        .eq('id', editingOpponent.id);

      if (error) throw error;

      setEditingOpponent(null);
      setEditName('');
      loadOpponents();
    } catch (error) {
      console.error('Error updating opponent:', error);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-2xl w-full p-6">
          <div className="text-center text-slate-600">Loading opponents...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Create New Game</h2>
            <button
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Game Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search opponents..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showAddNew ? (
            <button
              onClick={() => {
                setShowAddNew(true);
                setNewOpponentName(searchQuery);
              }}
              className="w-full p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 text-slate-600 font-semibold mb-4"
            >
              <Plus className="w-5 h-5" />
              Add New Opponent
            </button>
          ) : (
            <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Add New Opponent</h3>
              <input
                type="text"
                value={newOpponentName}
                onChange={(e) => setNewOpponentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addOpponent()}
                placeholder="Opponent name"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={addOpponent}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
                >
                  Add & Select
                </button>
                <button
                  onClick={() => {
                    setShowAddNew(false);
                    setNewOpponentName('');
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {filteredOpponents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-2">No opponents found</p>
              <p className="text-slate-400 text-sm">
                {searchQuery ? 'Try a different search or add a new opponent' : 'Add your first opponent to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOpponents.map((opponent) => (
                <div
                  key={opponent.id}
                  className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                >
                  <button
                    onClick={() => {
                      if (!gameDate) {
                        alert('Please select a game date first');
                        return;
                      }
                      onSelectOpponent(opponent, gameDate);
                    }}
                    className="flex-1 text-left"
                  >
                    <div className="font-semibold text-slate-800">{opponent.name}</div>
                    <div className="text-xs text-slate-500">
                      Last used: {new Date(opponent.updated_at).toLocaleDateString()}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setEditingOpponent(opponent);
                      setEditName(opponent.name);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editingOpponent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Edit Opponent</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateOpponent()}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={updateOpponent}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingOpponent(null);
                  setEditName('');
                }}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
