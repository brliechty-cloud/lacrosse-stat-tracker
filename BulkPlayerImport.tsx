import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Position } from '../lib/database.types';
import { Upload, X } from 'lucide-react';

const POSITIONS: Position[] = ['Attack', 'Midfield', 'Defense', 'Goalie'];

interface BulkPlayerImportProps {
  teamId?: string | null;
  programId?: string | null;
  gameId?: string | null;
  isOpponent?: boolean;
  opponentTeamId?: string | null;
  opponentName?: string;
  onComplete: () => void;
  onClose: () => void;
}

export function BulkPlayerImport({ teamId, programId, gameId, isOpponent = false, opponentTeamId, opponentName, onComplete, onClose }: BulkPlayerImportProps) {
  const [textInput, setTextInput] = useState('');
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    setImporting(true);
    const lines = textInput.trim().split('\n').filter(line => line.trim());

    let targetTeamId = opponentTeamId;
    if (opponentName && !targetTeamId) {
      console.log('Looking up team for opponent:', opponentName);
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('name', opponentName)
        .maybeSingle();

      if (teamError) {
        console.error('Error finding team:', teamError);
        alert('Error finding team: ' + teamError.message);
        setImporting(false);
        return;
      }

      if (teamData) {
        targetTeamId = teamData.id;
        console.log('Found team ID:', targetTeamId);
      } else {
        console.error('No team found for opponent:', opponentName);
        alert('No team found for this opponent. Please try again.');
        setImporting(false);
        return;
      }
    }

    const players = lines.map(line => {
      const parts = line.split(/[,\t]/).map(p => p.trim());
      if (parts.length < 2) return null;

      const number = parseInt(parts[0]);
      const name = parts[1];
      const positionString = parts[2] || 'Midfield';

      const positions = positionString.split('/').map(p => p.trim()).filter(p =>
        POSITIONS.includes(p as Position)
      ) as Position[];

      if (isNaN(number) || !name) return null;

      const playerData: any = {
        number,
        name,
        position: positions.length > 0 ? positions : ['Midfield' as Position],
        is_opponent: isOpponent,
      };

      if (programId) {
        playerData.program_id = programId;
      } else if (isOpponent && targetTeamId) {
        playerData.team_id = targetTeamId;
        if (gameId) {
          playerData.game_id = gameId;
        }
      } else if (teamId) {
        playerData.team_id = teamId;
      }

      return playerData;
    }).filter(p => p !== null);

    if (players.length === 0) {
      alert('No valid players found. Format: Number, Name, Position (one per line)');
      setImporting(false);
      return;
    }

    console.log('Attempting to insert players:', players);

    const { data: insertedData, error } = await supabase.from('players').insert(players).select();

    if (error) {
      console.error('Error importing players:', error);
      alert('Error importing players: ' + error.message);
    } else {
      console.log('Successfully inserted players:', insertedData);
      alert(`Successfully imported ${players.length} players!`);
      setTextInput('');
      onComplete();
      onClose();
    }

    setImporting(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            Bulk Import {isOpponent ? 'Opponent ' : ''}Players
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm">
          <p className="font-semibold mb-2">Format (one player per line):</p>
          <p className="text-gray-700 mb-1">Number, Name, Position</p>
          <p className="text-gray-600 text-xs mb-2">
            Position can be: Attack, Midfield, Defense, or Goalie
          </p>
          <p className="text-gray-600 text-xs mb-2">
            For multiple positions, use / (e.g., Attack/Midfield)
          </p>
          <div className="mt-2 p-2 bg-white rounded border border-blue-200 font-mono text-xs">
            1, John Smith, Attack<br />
            12, Jane Doe, Attack/Midfield<br />
            25, Bob Johnson, Defense<br />
            50, Alice Williams, Goalie
          </div>
        </div>

        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Paste your player list here..."
          className="w-full h-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleImport}
            disabled={importing || !textInput.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={20} />
            {importing ? 'Importing...' : 'Import Players'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
