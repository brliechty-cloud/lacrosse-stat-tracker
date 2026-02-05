import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database, Position } from '../lib/database.types';
import { UserPlus, Trash2, Upload, Edit2, Hash } from 'lucide-react';
import { BulkPlayerImport } from './BulkPlayerImport';

type Player = Database['public']['Tables']['players']['Row'];

const POSITIONS: Position[] = ['Attack', 'Midfield', 'Defense', 'Goalie'];

interface PlayerManagementProps {
  players: Player[];
  teamType: 'home' | 'opponent';
  onPlayerUpdate: () => void;
  programId?: string;
  teamId?: string;
}

export function PlayerManagement({ players, teamType, onPlayerUpdate, programId, teamId }: PlayerManagementProps) {
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    positions: ['Midfield'] as Position[],
  });

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.number || formData.positions.length === 0) return;

    if (editingPlayer) {
      const { error } = await supabase
        .from('players')
        .update({
          name: formData.name,
          number: parseInt(formData.number),
          position: formData.positions,
        })
        .eq('id', editingPlayer.id);

      if (error) {
        console.error('Error updating player:', error);
      } else {
        setFormData({ name: '', number: '', positions: ['Midfield'] });
        setShowForm(false);
        setEditingPlayer(null);
        onPlayerUpdate();
      }
    } else {
      const insertData: any = {
        name: formData.name,
        number: parseInt(formData.number),
        position: formData.positions,
        is_opponent: teamType === 'opponent',
      };

      if (programId) {
        insertData.program_id = programId;
      } else if (teamId) {
        insertData.team_id = teamId;
      }

      const { error } = await supabase.from('players').insert(insertData);

      if (error) {
        console.error('Error adding player:', error);
      } else {
        setFormData({ name: '', number: '', positions: ['Midfield'] });
        setShowForm(false);
        onPlayerUpdate();
      }
    }
  }

  async function deletePlayer(playerId: string) {
    if (!confirm('Are you sure you want to delete this player?')) return;

    const { error } = await supabase.from('players').delete().eq('id', playerId);

    if (error) {
      console.error('Error deleting player:', error);
    } else {
      onPlayerUpdate();
    }
  }

  function startEdit(player: Player) {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      number: player.number.toString(),
      positions: player.position,
    });
    setShowForm(true);
  }

  function cancelEdit() {
    setEditingPlayer(null);
    setFormData({ name: '', number: '', positions: ['Midfield'] });
    setShowForm(false);
  }

  function togglePosition(position: Position) {
    setFormData(prev => {
      const positions = prev.positions.includes(position)
        ? prev.positions.filter(p => p !== position)
        : [...prev.positions, position];
      return { ...prev, positions: positions.length > 0 ? positions : prev.positions };
    });
  }

  async function generateNumbers() {
    if (!confirm('This will assign sequential numbers (1, 2, 3...) to all players. Continue?')) return;

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

    onPlayerUpdate();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Roster</h2>
        <div className="flex gap-2">
          {players.length > 0 && (
            <button
              onClick={generateNumbers}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Hash size={20} />
              Generate Numbers
            </button>
          )}
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Upload size={20} />
            Import Roster
          </button>
          <button
            onClick={() => {
              setEditingPlayer(null);
              setFormData({ name: '', number: '', positions: ['Midfield'] });
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus size={20} />
            Add Player
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={addPlayer} className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-3">
            {editingPlayer ? 'Edit Player' : 'Add New Player'}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Player name"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              placeholder="Jersey #"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Position(s) - Select all that apply
            </label>
            <div className="flex gap-3">
              {POSITIONS.map((pos) => (
                <label
                  key={pos}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={formData.positions.includes(pos)}
                    onChange={() => togglePosition(pos)}
                    className="w-4 h-4"
                  />
                  <span>{pos}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {editingPlayer ? 'Update Player' : 'Add Player'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {players.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No players yet. Add players individually or use bulk import!
        </div>
      ) : (
        <div className="grid gap-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                  {player.number}
                </div>
                <div>
                  <div className="font-semibold">{player.name}</div>
                  <div className="text-sm text-gray-600">{player.position.join(', ')}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(player)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={20} />
                </button>
                <button
                  onClick={() => deletePlayer(player.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showBulkImport && (
        <BulkPlayerImport
          teamId={teamId}
          programId={programId}
          isOpponent={teamType === 'opponent'}
          onComplete={onPlayerUpdate}
          onClose={() => setShowBulkImport(false)}
        />
      )}
    </div>
  );
}
