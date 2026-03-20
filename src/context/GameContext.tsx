import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ref, set, get, update, onValue, push, child } from 'firebase/database';
import { db } from '../firebase';

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
  // Para guardar quién votó a qué
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
  phaseEndTime: number | null; // El timestamp exacto donde termina la fase

  // Usuario actual (solo en cliente local)
  currentPlayerId: string | null;
}

interface GameContextType {
  gameState: GameState;
  createRoom: (playerName: string, settings: GameSettings) => string;
  joinRoom: (roomId: string, playerName: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  startGame: () => void;
  submitQuestion: (optionA: string, optionB: string, topic?: string) => void;
  submitVote: (questionId: string, option: 'A' | 'B') => void;
  nextQuestion: () => void;
  nextRound: () => void;
  finishGame: () => void;
  updateSettings: (settings: GameSettings) => void;
  forceNextPhase: () => void;
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
  phaseEndTime: null,
  currentPlayerId: null,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Intentar recuperar el estado de la sesión si el usuario recargó la página
    if (typeof window !== 'undefined') {
      const savedSession = sessionStorage.getItem('quepreferis_session');
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          return {
            ...defaultState,
            roomId: parsed.roomId,
            currentPlayerId: parsed.playerId,
          };
        } catch (e) {
          console.error(e);
        }
      }
    }
    return defaultState;
  });

  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const savedSession = sessionStorage.getItem('quepreferis_session');
      return savedSession ? JSON.parse(savedSession).roomId : null;
    }
    return null;
  });

  const [localPlayerId, setLocalPlayerId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const savedSession = sessionStorage.getItem('quepreferis_session');
      return savedSession ? JSON.parse(savedSession).playerId : null;
    }
    return null;
  });

  // Guardar en sessionStorage cuando entramos a una sala
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeRoomId && localPlayerId) {
        sessionStorage.setItem('quepreferis_session', JSON.stringify({
          roomId: activeRoomId,
          playerId: localPlayerId
        }));
      } else {
        sessionStorage.removeItem('quepreferis_session');
      }
    }
  }, [activeRoomId, localPlayerId]);

  // Escuchar cambios en la sala actual de Firebase
  useEffect(() => {
    if (!activeRoomId) return;

    const roomRef = ref(db, `rooms/${activeRoomId}`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();

        // Convertir diccionarios de Firebase a arrays para el state local
        const playersArray: Player[] = data.players
          ? Object.keys(data.players).map(k => ({ id: k, ...data.players[k] }))
          : [];

        const questionsArray: Question[] = data.questions
          ? Object.keys(data.questions).map(k => ({ id: k, ...data.questions[k] }))
          : [];

        // Asegurarse de que topics siempre sea un array
        const safeSettings = {
          ...(data.settings || defaultState.settings),
          topics: data.settings?.topics || []
        };

        // ====== DEBUGEANDO =======
        if (data.currentPhase === 'writing') {
          console.log(`[STATE SYNC] Fase actual: writing. Preguntas subidas: ${questionsArray.length} de ${playersArray.length} jugadores en la sala.`);
        }

        setGameState({
          roomId: activeRoomId,
          players: playersArray,
          settings: safeSettings,
          currentPhase: data.currentPhase || 'waiting',
          currentRound: data.currentRound || 1,
          questions: questionsArray,
          currentQuestionIndex: data.currentQuestionIndex || 0,
          phaseEndTime: data.phaseEndTime || null,
          currentPlayerId: localPlayerId,
        });
      } else {
        // La sala dejó de existir o fue eliminada
        setGameState(defaultState);
        setActiveRoomId(null);
        setLocalPlayerId(null);
      }
    });

    return () => unsubscribe();
  }, [activeRoomId, localPlayerId]);

  // Funciones de acción que actualizan Firebase
  const createRoom = (playerName: string, settings: GameSettings) => {
    // Generar ID de 6 letras mayúsculas
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newPlayerId = push(child(ref(db), 'rooms')).key as string; // Generar un ID único para el jugador

    const roomRef = ref(db, `rooms/${newRoomId}`);

    // Configurar estado inicial en DB
    set(roomRef, {
      settings,
      currentPhase: 'waiting',
      currentRound: 1,
      currentQuestionIndex: 0,
      phaseEndTime: null,
      players: {
        [newPlayerId]: {
          name: playerName,
          isHost: true,
          score: 0
        }
      }
    });

    setLocalPlayerId(newPlayerId);
    setActiveRoomId(newRoomId);

    // Setear optimísticamente el local state (el listener lo sobreescribirá)
    setGameState(prev => ({
      ...prev,
      roomId: newRoomId,
      settings,
      players: [{ id: newPlayerId, name: playerName, isHost: true, score: 0 }],
      currentPlayerId: newPlayerId
    }));

    return newRoomId;
  };

  const joinRoom = async (roomId: string, playerName: string): Promise<boolean> => {
    const roomRef = ref(db, `rooms/${roomId}`);
    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.currentPhase !== 'waiting') {
        alert("La partida ya comenzó");
        return false;
      }

      const newPlayerId = push(child(ref(db), 'rooms')).key as string;

      await update(ref(db, `rooms/${roomId}/players`), {
        [newPlayerId]: {
          name: playerName,
          isHost: false,
          score: 0
        }
      });

      setLocalPlayerId(newPlayerId);
      setActiveRoomId(roomId);

      // Actualización optimista para evitar ser redirigido a Home antes de que Firebase responda
      setGameState(prev => ({
        ...prev,
        roomId,
        currentPlayerId: newPlayerId
      }));

      return true;
    }

    alert("La sala no existe");
    return false;
  };

  const leaveRoom = async () => {
    if (activeRoomId && localPlayerId) {
      // Intentar eliminar al jugador de la base de datos (fire and forget, por si cierran rápido)
      set(ref(db, `rooms/${activeRoomId}/players/${localPlayerId}`), null).catch(() => {});
    }

    // Limpiar estado local y sesión
    setGameState(defaultState);
    setActiveRoomId(null);
    setLocalPlayerId(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('quepreferis_session');
    }
  };

  const updateSettings = (settings: GameSettings) => {
    if (!activeRoomId) return;
    update(ref(db, `rooms/${activeRoomId}`), { settings });
  };

  const startGame = () => {
    if (!activeRoomId) return;
    const writingTimeMs = gameState.settings.timeLimit * 1000;
    update(ref(db, `rooms/${activeRoomId}`), {
      currentPhase: 'writing',
      questions: null, // Limpiar preguntas si hubiera
      phaseEndTime: Date.now() + writingTimeMs
    });
  };

  const submitQuestion = (optionA: string, optionB: string, topic?: string) => {
    if (!activeRoomId || !localPlayerId) return;

    console.log(`[ACTION] Usuario ${localPlayerId} enviando su "Qué preferís": A(${optionA}), B(${optionB})`);

    const questionsRef = ref(db, `rooms/${activeRoomId}/questions`);
    const newQuestionRef = push(questionsRef);

    set(newQuestionRef, {
      authorId: localPlayerId,
      optionA,
      optionB,
      topic: topic || null,
      votesA: 0,
      votesB: 0
    });
  };

  const submitVote = async (questionId: string, option: 'A' | 'B') => {
    if (!activeRoomId || !localPlayerId) return;

    const questionRef = ref(db, `rooms/${activeRoomId}/questions/${questionId}`);
    const snapshot = await get(questionRef);

    if (snapshot.exists()) {
      const questionData = snapshot.val();

      // Si el usuario ya votó, no permitir
      if (questionData.voters && questionData.voters[localPlayerId]) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {};

      if (option === 'A') {
        updates['votesA'] = (questionData.votesA || 0) + 1;
      } else {
        updates['votesB'] = (questionData.votesB || 0) + 1;
      }

      // Registrar que este usuario votó por A o B
      updates[`voters/${localPlayerId}`] = option;

      await update(questionRef, updates);
    }
  };

  const nextQuestion = () => {
    if (!activeRoomId) return;

    if (gameState.currentQuestionIndex < gameState.questions.length - 1) {
      const votingTimeMs = 15000;
      update(ref(db, `rooms/${activeRoomId}`), {
        currentQuestionIndex: gameState.currentQuestionIndex + 1,
        phaseEndTime: Date.now() + votingTimeMs
      });
    } else {
      update(ref(db, `rooms/${activeRoomId}`), {
        currentPhase: 'round_ranking',
        phaseEndTime: null
      });
    }
  };

  const nextRound = async () => {
    if (!activeRoomId) return;

    // 1. Calculate scores
    const roomRef = ref(db, `rooms/${activeRoomId}`);
    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {};

      if (data.questions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.values(data.questions).forEach((q: any) => {
          const totalVotes = (q.votesA || 0) + (q.votesB || 0);
          if (totalVotes > 0) {
            const percentA = (q.votesA / totalVotes) * 100;
            const diff = Math.abs(percentA - 50) * 2;
            const points = Math.round(1000 * ((100 - diff) / 100));

            // Solo asignar puntos al autor si el autor sigue en la sala
            if (data.players && data.players[q.authorId]) {
              const currentScore = data.players[q.authorId]?.score || 0;
              updates[`players/${q.authorId}/score`] = currentScore + points;
            }
          }
        });
      }

      // 2. Prepare next round or finish
      if (data.currentRound < data.settings.rounds) {
        const writingTimeMs = (data.settings.timeLimit || 60) * 1000;
        updates['currentRound'] = data.currentRound + 1;
        updates['currentPhase'] = 'writing';
        updates['currentQuestionIndex'] = 0;
        updates['questions'] = null; // Limpiar preguntas de la ronda anterior
        updates['phaseEndTime'] = Date.now() + writingTimeMs;
      } else {
        updates['currentPhase'] = 'finished';
        updates['phaseEndTime'] = null;
      }

      await update(roomRef, updates);
    }
  };

  const finishGame = () => {
    if (!activeRoomId) return;
    update(ref(db, `rooms/${activeRoomId}`), { currentPhase: 'finished' });
  };

  const forceNextPhase = () => {
    if (!activeRoomId) return;
    console.log(`[ACTION] forceNextPhase convocado. Fase actual en mi cliente es: ${gameState.currentPhase}`);
    if (gameState.currentPhase === 'writing') {
      const votingTimeMs = 20000;
      update(ref(db, `rooms/${activeRoomId}`), {
        currentPhase: 'voting',
        currentQuestionIndex: 0,
        phaseEndTime: Date.now() + votingTimeMs
      }).catch(e => console.error(e));
    } else if (gameState.currentPhase === 'voting') {
      if (gameState.currentQuestionIndex < gameState.questions.length - 1) {
        const votingTimeMs = 20000;
        update(ref(db, `rooms/${activeRoomId}`), {
          currentQuestionIndex: gameState.currentQuestionIndex + 1,
          phaseEndTime: Date.now() + votingTimeMs
        }).catch(e => console.error(e));
      } else {
        update(ref(db, `rooms/${activeRoomId}`), {
          currentPhase: 'round_ranking',
          phaseEndTime: null
        }).catch(e => console.error(e));
      }
    }
  };

  // Lógica de transición automática de fases manejada EXCLUSIVAMENTE por el host
  useEffect(() => {
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
    const isHost = currentPlayer?.isHost || false;

    if (!activeRoomId || !isHost) return;

    if (gameState.currentPhase === 'writing') {
      if (gameState.players.length > 0 && gameState.questions.length >= gameState.players.length) {
        console.log(`[HOST LOGIC] ¡Todos enviaron! Cambiando la fase en Firebase a 'voting'...`);
        const votingTimeMs = 20000;
        update(ref(db, `rooms/${activeRoomId}`), {
          currentPhase: 'voting',
          currentQuestionIndex: 0,
          phaseEndTime: Date.now() + votingTimeMs
        }).catch(e => console.error("Error updating firebase:", e));
      }
    }
    // NOTA: Se eliminó la lógica que avanzaba automáticamente la fase de "voting" si todos votaban.
    // Ahora, la fase de votación SIEMPRE espera a que el timer llegue a 0 (lo cual ejecutará forceNextPhase).

  }, [
    activeRoomId,
    gameState.currentPhase,
    gameState.questions,
    gameState.players,
    gameState.currentQuestionIndex,
    gameState.currentPlayerId
  ]);

  useEffect(() => {
    // Exponemos el estado a window para debuguear fácilmente desde consola
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).gameState = gameState;
    }
  }, [gameState]);

  return (
    <GameContext.Provider value={{
      gameState,
      createRoom,
      joinRoom,
      leaveRoom,
      startGame,
      submitQuestion,
      submitVote,
      nextQuestion,
      nextRound,
      finishGame,
      updateSettings,
      forceNextPhase
    }}>
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
