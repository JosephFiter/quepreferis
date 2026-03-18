import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Zap, Eye, ArrowRight } from 'lucide-react';
import { useGame } from '../context/GameContext';

type ActionType = 'create' | 'join' | 'quick' | 'spectate' | null;

export default function Home() {
  const navigate = useNavigate();
  const { createRoom, joinRoom } = useGame();

  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleActionClick = (action: ActionType) => {
    // Si es modo espectador o partida rápida, no hacemos nada
    if (action === 'quick' || action === 'spectate') {
      return;
    }
    setSelectedAction(action);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    if (selectedAction === 'create') {
      const defaultSettings = {
        mode: 'libre' as const,
        rounds: 3,
        timeLimit: 60,
        topics: [],
      };

      const newRoomId = createRoom(playerName, defaultSettings);
      navigate(`/lobby/${newRoomId}?action=setup`);

    } else if (selectedAction === 'join') {
      if (!roomCode.trim()) return;
      joinRoom(roomCode.toUpperCase(), playerName);
      navigate(`/lobby/${roomCode.toUpperCase()}`);
    }
  };

  const handleBack = () => {
    setSelectedAction(null);
    setPlayerName('');
    setRoomCode('');
  };

  return (
    <div className="flex flex-col items-center justify-center flex-grow p-4 w-full max-w-md mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
          ¿Qué preferís?
        </h1>
        <p className="text-neutral-400">El juego de los peores dilemas</p>
      </div>

      {!selectedAction ? (
        <div className="w-full flex flex-col gap-4">
          <button
            onClick={() => handleActionClick('create')}
            className="group flex items-center justify-between p-4 bg-neutral-800 border border-neutral-700 hover:border-purple-500 rounded-xl transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                <Users size={24} />
              </div>
              <span className="font-semibold text-lg">Crear lobby privado</span>
            </div>
            <ArrowRight className="text-neutral-500 group-hover:text-purple-400 transition-colors" />
          </button>

          <button
            onClick={() => handleActionClick('join')}
            className="group flex items-center justify-between p-4 bg-neutral-800 border border-neutral-700 hover:border-blue-500 rounded-xl transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                <UserPlus size={24} />
              </div>
              <span className="font-semibold text-lg">Entrar lobby privado</span>
            </div>
            <ArrowRight className="text-neutral-500 group-hover:text-blue-400 transition-colors" />
          </button>

          <button
            onClick={() => handleActionClick('quick')}
            className="group flex items-center justify-between p-4 bg-neutral-800/50 border border-neutral-800 opacity-60 cursor-not-allowed rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-lg">
                <Zap size={24} />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-lg text-neutral-400">Juego rápido</span>
                <span className="text-xs text-neutral-500">Próximamente</span>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleActionClick('spectate')}
            className="group flex items-center justify-between p-4 bg-neutral-800/50 border border-neutral-800 opacity-60 cursor-not-allowed rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg">
                <Eye size={24} />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-lg text-neutral-400">Modo espectador</span>
                <span className="text-xs text-neutral-500">Próximamente</span>
              </div>
            </div>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-left mb-2">
            <h2 className="text-2xl font-bold">
              {selectedAction === 'create' ? 'Crear Partida' : 'Unirse a Partida'}
            </h2>
            <p className="text-neutral-400 text-sm">Ingresa tus datos para continuar</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="playerName" className="text-sm font-medium text-neutral-300 ml-1">
              Tu Nombre
            </label>
            <input
              id="playerName"
              type="text"
              required
              maxLength={15}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Ej: Jugador1"
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-neutral-500 transition-all"
            />
          </div>

          {selectedAction === 'join' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="roomCode" className="text-sm font-medium text-neutral-300 ml-1">
                Código de la Sala
              </label>
              <input
                id="roomCode"
                type="text"
                required
                maxLength={6}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Ej: A1B2C3"
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-neutral-500 uppercase transition-all tracking-widest"
              />
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-xl font-medium transition-colors w-1/3"
            >
              Volver
            </button>
            <button
              type="submit"
              className={`px-6 py-3 rounded-xl font-bold transition-all w-2/3 shadow-lg ${
                selectedAction === 'create'
                  ? 'bg-purple-600 hover:bg-purple-500 hover:shadow-purple-500/25'
                  : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/25'
              }`}
            >
              Continuar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
