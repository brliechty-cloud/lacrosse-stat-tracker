import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import type { Database } from './database.types';

type Player = Database['public']['Tables']['players']['Row'];
type Game = Database['public']['Tables']['games']['Row'];

interface PlayerStats {
  goals: number;
  assists: number;
  shots: number;
  shots_on_goal: number;
  ground_balls: number;
  turnovers: number;
  caused_turnovers: number;
  saves: number;
  goals_allowed: number;
  clear_attempts: number;
  clear_successes: number;
  faceoffs_won: number;
  faceoffs_lost: number;
  penalties: number;
  penalty_minutes: number;
}

interface PlayerWithStats extends Player {
  stats: PlayerStats;
}

export interface ShareSummaryData {
  game: Game;
  teamName: string;
  teamPlayers: PlayerWithStats[];
  opponentPlayers: PlayerWithStats[];
  teamClearStats: { attempts: number; successes: number };
  opponentClearStats: { attempts: number; successes: number };
}

async function renderComponentToElement(Component: React.ComponentType<any>, props: any): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);

  return new Promise((resolve) => {
    root.render(Component(props));

    setTimeout(() => {
      const element = container.firstChild as HTMLElement;
      resolve(element);
    }, 100);
  });
}

export async function generateAndShareSummary(
  data: ShareSummaryData,
  ShareableSummaryComponent: React.ComponentType<any>
): Promise<boolean> {
  let container: HTMLElement | null = null;

  try {
    container = await renderComponentToElement(ShareableSummaryComponent, data);

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1200,
      windowHeight: container.scrollHeight,
    });

    if (container.parentElement) {
      document.body.removeChild(container.parentElement);
    }

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
    });

    if (navigator.share && navigator.canShare) {
      const file = new File([blob], 'game-summary.png', { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${data.teamName} vs ${data.game.opponent} - Game Summary`,
          text: 'Game Summary',
        });
        return true;
      }
    }

    return false;
  } catch (error) {
    if (container?.parentElement) {
      document.body.removeChild(container.parentElement);
    }
    console.error('Error generating summary:', error);
    return false;
  }
}

export async function generateSummaryImage(
  data: ShareSummaryData,
  ShareableSummaryComponent: React.ComponentType<any>
): Promise<Blob | null> {
  let container: HTMLElement | null = null;

  try {
    container = await renderComponentToElement(ShareableSummaryComponent, data);

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1200,
      windowHeight: container.scrollHeight,
    });

    if (container.parentElement) {
      document.body.removeChild(container.parentElement);
    }

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
    });

    return blob;
  } catch (error) {
    if (container?.parentElement) {
      document.body.removeChild(container.parentElement);
    }
    console.error('Error generating summary image:', error);
    return null;
  }
}
