import { useState } from 'react';
import { ProgramsHome } from './components/ProgramsHome';
import { ProgramHub } from './components/ProgramHub';
import { OpponentSelector } from './components/OpponentSelector';
import { OpponentManagement } from './components/OpponentManagement';
import { StatFirstTracking } from './components/StatFirstTracking';
import { GameSummary } from './components/GameSummary';
import { supabase } from './lib/supabase';
import { exportFullGameReport, exportToMaxPreps } from './lib/maxPrepsExport';

interface Program {
  id: string;
  name: string;
}

interface Opponent {
  id: string;
  name: string;
}

type AppView = 'programs' | 'program-hub' | 'opponent-select' | 'opponents' | 'game';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('programs');
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);

  function handleSelectProgram(program: Program) {
    setSelectedProgram(program);
    setCurrentView('program-hub');
  }

  function handleBackToPrograms() {
    setSelectedProgram(null);
    setCurrentView('programs');
  }

  function handleManageOpponents() {
    setCurrentView('opponents');
  }

  function handleBackFromOpponents() {
    setCurrentView('programs');
  }

  function handleNewGame(programId: string) {
    setCurrentView('opponent-select');
  }

  function handleCancelOpponentSelect() {
    setCurrentView('program-hub');
  }

  async function handleSelectOpponent(opponent: Opponent, gameDate: string) {
    if (!selectedProgram) return;

    setCreatingGame(true);

    try {
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert([
          {
            program_id: selectedProgram.id,
            opponent_id: opponent.id,
            opponent: opponent.name,
            game_date: gameDate,
            our_score: 0,
            opponent_score: 0,
          },
        ])
        .select()
        .single();

      if (gameError) {
        console.error('Detailed error:', gameError);
        throw gameError;
      }

      await supabase
        .from('opponent_library')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', opponent.id);

      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('name', opponent.name)
        .maybeSingle();

      if (teamData) {
        const { data: rosterPlayers } = await supabase
          .from('players')
          .select('*')
          .eq('team_id', teamData.id)
          .eq('is_opponent', true)
          .is('game_id', null);

        if (rosterPlayers && rosterPlayers.length > 0) {
          const gamePlayers = rosterPlayers.map(player => ({
            name: player.name,
            number: player.number,
            position: player.position,
            team_id: teamData.id,
            game_id: game.id,
            is_opponent: true,
          }));

          await supabase.from('players').insert(gamePlayers);
        }
      }

      setSelectedGameId(game.id);
      setCurrentView('game');
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
    } finally {
      setCreatingGame(false);
    }
  }

  function handleOpenGame(gameId: string) {
    setSelectedGameId(gameId);
    setCurrentView('game');
  }

  function handleBackFromGame() {
    setSelectedGameId(null);
    setShowSummary(false);
    setCurrentView('program-hub');
  }

  function handleShowSummary() {
    setShowSummary(true);
  }

  async function handleExportFull() {
    if (selectedGameId && selectedProgram) {
      try {
        await exportFullGameReport(selectedGameId, selectedProgram.id);
      } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export game report. Please try again.');
      }
    }
  }

  async function handleExportMaxPreps() {
    if (selectedGameId && selectedProgram) {
      try {
        await exportToMaxPreps(selectedGameId, selectedProgram.id);
      } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export MaxPreps file. Please try again.');
      }
    }
  }

  if (currentView === 'programs') {
    return <ProgramsHome onSelectProgram={handleSelectProgram} onManageOpponents={handleManageOpponents} />;
  }

  if (currentView === 'opponents') {
    return <OpponentManagement onBack={handleBackFromOpponents} />;
  }

  if (currentView === 'program-hub' && selectedProgram) {
    return (
      <ProgramHub
        program={selectedProgram}
        onBack={handleBackToPrograms}
        onNewGame={handleNewGame}
        onOpenGame={handleOpenGame}
      />
    );
  }

  if (currentView === 'opponent-select') {
    return creatingGame ? (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600 text-lg">Creating game...</div>
      </div>
    ) : (
      <OpponentSelector
        onSelectOpponent={handleSelectOpponent}
        onCancel={handleCancelOpponentSelect}
      />
    );
  }

  if (currentView === 'game' && selectedGameId && selectedProgram) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <StatFirstTracking
            gameId={selectedGameId}
            programId={selectedProgram.id}
            onBack={handleBackFromGame}
            onShowSummary={handleShowSummary}
          />

          {showSummary && (
            <GameSummary
              gameId={selectedGameId}
              teamId={selectedProgram.id}
              onClose={() => setShowSummary(false)}
              onExportFull={handleExportFull}
              onExportMaxPreps={handleExportMaxPreps}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-slate-600 text-lg">Loading...</div>
    </div>
  );
}

export default App;
