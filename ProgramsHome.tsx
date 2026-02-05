import { useEffect, useState } from 'react';
import { Trophy, Plus, Edit2, Trash2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Program {
  id: string;
  name: string;
  created_at: string;
}

interface ProgramsHomeProps {
  onSelectProgram: (program: Program) => void;
  onManageOpponents: () => void;
}

export function ProgramsHome({ onSelectProgram, onManageOpponents }: ProgramsHomeProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    loadPrograms();
  }, []);

  async function loadPrograms() {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error loading programs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addProgram() {
    if (!newProgramName.trim()) return;

    try {
      const { error } = await supabase
        .from('programs')
        .insert([{ name: newProgramName.trim() }]);

      if (error) throw error;

      setNewProgramName('');
      setShowAddProgram(false);
      loadPrograms();
    } catch (error) {
      console.error('Error adding program:', error);
    }
  }

  async function updateProgram() {
    if (!editingProgram || !editName.trim()) return;

    try {
      const { error } = await supabase
        .from('programs')
        .update({ name: editName.trim() })
        .eq('id', editingProgram.id);

      if (error) throw error;

      setEditingProgram(null);
      setEditName('');
      loadPrograms();
    } catch (error) {
      console.error('Error updating program:', error);
    }
  }

  async function deleteProgram(program: Program) {
    if (!confirm(`Delete ${program.name}? This will also delete all associated games and players.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', program.id);

      if (error) throw error;
      loadPrograms();
    } catch (error) {
      console.error('Error deleting program:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600 text-lg">Loading programs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-12 h-12 text-slate-700" />
            <h1 className="text-4xl font-bold text-slate-900">Lacrosse Stats</h1>
          </div>
          <p className="text-slate-600 text-lg">Select a program to get started</p>
        </div>

        <div className="grid gap-4 mb-6">
          {programs.map((program) => (
            <div
              key={program.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all group"
            >
              <div className="p-6 flex items-center justify-between">
                <button
                  onClick={() => onSelectProgram(program)}
                  className="flex-1 text-left"
                >
                  <h2 className="text-2xl font-bold text-slate-800 group-hover:text-slate-900">
                    {program.name}
                  </h2>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingProgram(program);
                      setEditName(program.name);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteProgram(program)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!showAddProgram ? (
          <button
            onClick={() => setShowAddProgram(true)}
            className="w-full p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-slate-400 hover:bg-white transition-all flex items-center justify-center gap-3 text-slate-600 font-semibold"
          >
            <Plus className="w-6 h-6" />
            Add New Program
          </button>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Add New Program</h3>
            <input
              type="text"
              value={newProgramName}
              onChange={(e) => setNewProgramName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addProgram()}
              placeholder="Program name (e.g., Varsity, JV)"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={addProgram}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Add Program
              </button>
              <button
                onClick={() => {
                  setShowAddProgram(false);
                  setNewProgramName('');
                }}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={onManageOpponents}
            className="w-full p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 text-slate-700 font-semibold border border-slate-200 hover:border-slate-300"
          >
            <Users className="w-6 h-6" />
            Manage Opponents
          </button>
        </div>
      </div>

      {editingProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Edit Program</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateProgram()}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={updateProgram}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingProgram(null);
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
