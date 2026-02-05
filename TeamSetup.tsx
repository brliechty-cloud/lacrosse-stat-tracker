import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Team = Database['public']['Tables']['teams']['Row'];

interface TeamSetupProps {
  onTeamSelected: (teamId: string) => void;
}

export function TeamSetup({ onTeamSelected }: TeamSetupProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading teams:', error);
    } else {
      setTeams(data || []);
    }
    setLoading(false);
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const { data, error } = await supabase
      .from('teams')
      .insert({ name: newTeamName })
      .select()
      .single();

    if (error) {
      console.error('Error creating team:', error);
    } else if (data) {
      setTeams([data, ...teams]);
      setNewTeamName('');
      onTeamSelected(data.id);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Select or Create Team</h2>

      <form onSubmit={createTeam} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="New team name"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Team
          </button>
        </div>
      </form>

      {teams.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Existing Teams</h3>
          <div className="grid gap-2">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => onTeamSelected(team.id)}
                className="px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                {team.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
