import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Tipos base para el juego
export type GameMode = 'libre' | 'tematica';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
}

export interface Question {
  id: string;
  authorId: string;
  optionA: string;
  optionB: string;
  topic?: string;
  votesA: number;
  votesB: number;
  // Para guardar quién votó a qué (opcional pero útil)
  voters?: Record<string, 'A' | 'B'>;
}

export interface GameSettings {
  mode: GameMode;
  rounds: number;
  timeLimit: number;
  topics: string[];
}

export type GamePhase = 'waiting' | 'writing' | 'voting' | 'round_ranking' | 'finished';

export interface GameState {
  roomId: string;
  players: Player[];
  settings: GameSettings;
  currentPhase: GamePhase;
  currentRound: number;
  questions: Question[]; // Preguntas de la ronda actual
  currentQuestionIndex: number; // Para la fase de votación

  // Usuario actual
  currentPlayerId: string | null;
}

interface GameContextType {
  gameState: GameState;
  createRoom: (playerName: string, settings: GameSettings) => string;
  joinRoom: (roomId: string, playerName: string) => boolean;
  startGame: () => void;
  submitQuestion: (optionA: string, optionB: string, topic?: string) => void;
  submitVote: (questionId: string, option: 'A' | 'B') => void;
  nextQuestion: () => void;
  nextRound: () => void;
  finishGame: () => void;
}

const defaultState: GameState = {
  roomId: '',
  players: [],
  settings: {
    mode: 'libre',
    rounds: 3,
    timeLimit: 60,
    topics: [],
  },
  currentPhase: 'waiting',
  currentRound: 1,
  questions: [],
  currentQuestionIndex: 0,
  currentPlayerId: null,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(defaultState);

  // Funciones simuladas
  const createRoom = (playerName: string, settings: GameSettings) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const hostId = `player_${Math.random().toString(36).substring(2, 9)}`;

    setGameState({
      ...defaultState,
      roomId,
      settings,
      players: [{ id: hostId, name: playerName, isHost: true, score: 0 }],
      currentPlayerId: hostId,
    });

    return roomId;
  };

  const joinRoom = (roomId: string, playerName: string) => {
    const newPlayerId = `player_${Math.random().toString(36).substring(2, 9)}`;

    setGameState(prev => ({
      ...prev,
      roomId,
      players: [...prev.players, { id: newPlayerId, name: playerName, isHost: false, score: 0 }],
      currentPlayerId: newPlayerId,
    }));

    return true; // Éxito
  };

  const startGame = () => {
    setGameState(prev => ({ ...prev, currentPhase: 'writing' }));
  };

  const submitQuestion = (optionA: string, optionB: string, topic?: string) => {
    if (!gameState.currentPlayerId) return;

    const newQuestion: Question = {
      id: `q_${Math.random().toString(36).substring(2, 9)}`,
      authorId: gameState.currentPlayerId,
      optionA,
      optionB,
      topic,
      votesA: 0,
      votesB: 0,
      voters: {}
    };

    setGameState(prev => {
      const updatedQuestions = [...prev.questions, newQuestion];

      // MOCK: Generar preguntas automáticas para los bots para que se pueda testear la votación
      const botPlayers = prev.players.filter(p => p.id !== gameState.currentPlayerId);

      botPlayers.forEach((bot) => {
        // Solo generamos si no generó ya
        if (!updatedQuestions.find(q => q.authorId === bot.id)) {
          updatedQuestions.push({
            id: `q_bot_${bot.id}_${Math.random().toString(36).substring(2, 6)}`,
            authorId: bot.id,
            optionA: `Opción A de ${bot.name} (Simulada)`,
            optionB: `Opción B de ${bot.name} (Simulada)`,
            topic,
            votesA: 0,
            votesB: 0,
            voters: {}
          });
        }
      });

      return {
        ...prev,
        questions: updatedQuestions,
        // En simulación, al enviar el único jugador humano pasamos a votación,
        // (En la realidad sería al enviar todos)
      };
    });
  };

  const submitVote = (questionId: string, option: 'A' | 'B') => {
    if (!gameState.currentPlayerId) return;

    setGameState(prev => {
      const updatedQuestions = prev.questions.map(q => {
        if (q.id === questionId) {
          const isA = option === 'A';
          return {
            ...q,
            votesA: isA ? q.votesA + 1 : q.votesA,
            votesB: !isA ? q.votesB + 1 : q.votesB,
            voters: {
              ...q.voters,
              [prev.currentPlayerId!]: option
            }
          };
        }
        return q;
      });

      return { ...prev, questions: updatedQuestions };
    });
  };

  const nextQuestion = () => {
    setGameState(prev => {
      // MOCK: Generar votos aleatorios de los bots antes de pasar a la siguiente pregunta
      const currentQ = prev.questions[prev.currentQuestionIndex];
      const botPlayers = prev.players.filter(p => p.id !== prev.currentPlayerId);

      const updatedQuestions = [...prev.questions];

      if (currentQ) {
        const qIndex = prev.currentQuestionIndex;
        let vA = updatedQuestions[qIndex].votesA;
        let vB = updatedQuestions[qIndex].votesB;

        botPlayers.forEach(bot => {
          // El autor no vota
          if (bot.id === currentQ.authorId) return;
          // Si el bot no votó ya
          if (!updatedQuestions[qIndex].voters || !updatedQuestions[qIndex].voters[bot.id]) {
            const voteForA = Math.random() > 0.5;
            if (voteForA) vA++; else vB++;

            updatedQuestions[qIndex] = {
              ...updatedQuestions[qIndex],
              votesA: vA,
              votesB: vB,
              voters: {
                ...(updatedQuestions[qIndex].voters || {}),
                [bot.id]: voteForA ? 'A' : 'B'
              }
            };
          }
        });
      }

      if (prev.currentQuestionIndex < prev.questions.length - 1) {
        return { ...prev, questions: updatedQuestions, currentQuestionIndex: prev.currentQuestionIndex + 1 };
      } else {
        return { ...prev, questions: updatedQuestions, currentPhase: 'round_ranking' };
      }
    });
  };

  const nextRound = () => {
    setGameState(prev => {
      // 1. Calculate and update scores before moving to the next round
      const updatedPlayers = [...prev.players];

      prev.questions.forEach(q => {
        const totalVotes = q.votesA + q.votesB;
        if (totalVotes === 0) return; // Nadie votó

        // Porcentaje de A (0 a 100)
        const percentA = (q.votesA / totalVotes) * 100;

        // El peor caso es 100% / 0% (diferencia de 100).
        // El mejor caso es 50% / 50% (diferencia de 0).
        const diff = Math.abs(percentA - 50) * 2; // de 0 (perfecto) a 100 (pésimo)

        // Función continua: puntos máximos = 1000
        const points = Math.round(1000 * ((100 - diff) / 100));

        // Asignar puntos al autor
        const authorIndex = updatedPlayers.findIndex(p => p.id === q.authorId);
        if (authorIndex !== -1) {
          updatedPlayers[authorIndex].score += points;
        }
      });

      if (prev.currentRound < prev.settings.rounds) {
        return {
          ...prev,
          players: updatedPlayers,
          currentRound: prev.currentRound + 1,
          currentPhase: 'writing',
          questions: [],
          currentQuestionIndex: 0,
        };
      } else {
        return { ...prev, players: updatedPlayers, currentPhase: 'finished' };
      }
    });
  };

  const finishGame = () => {
    setGameState(prev => ({ ...prev, currentPhase: 'finished' }));
  };

  const _forcePhase = (phase: GamePhase) => {
    setGameState(prev => ({ ...prev, currentPhase: phase }));
  };

  // Simular la llegada de jugadores extra para pruebas
  const __mockAddPlayer = () => {
    const id = `player_${Math.random().toString(36).substring(2, 9)}`;
    const names = ['Ana', 'Carlos', 'Lucía', 'Marcos', 'Elena', 'Diego'];
    const randomName = names[Math.floor(Math.random() * names.length)];

    setGameState(prev => ({
      ...prev,
      players: [...prev.players, { id, name: randomName, isHost: false, score: 0 }]
    }));
  };

  // Exponemos el mock en window para testear fácil desde la consola
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__mockAddPlayer = __mockAddPlayer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gameState = gameState;
  }

  return (
    <GameContext.Provider value={{
      gameState,
      createRoom,
      joinRoom,
      startGame,
      submitQuestion,
      submitVote,
      nextQuestion,
      nextRound,
      finishGame,
      _forcePhase // Para testeo rápido en frontend
    } as GameContextType & { _forcePhase: (p: GamePhase) => void }}>
      {children}
    </GameContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
