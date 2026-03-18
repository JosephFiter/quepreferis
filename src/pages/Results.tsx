import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { Trophy, Medal, Home as HomeIcon } from 'lucide-react';

export default function Results() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { gameState } = useGame();

  // Redirigir si no hay jugador
  useEffect(() => {
    if (!gameState.currentPlayerId) {
      navigate('/');
    }
  }, [gameState.currentPlayerId, navigate]);

  if (!gameState.currentPlayerId) return null;

  // Ordenar jugadores de mayor a menor puntaje
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  const getPodiumColor = (index: number) => {
    switch (index) {
      case 0: return 'bg-yellow-500 text-yellow-900 border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.5)]'; // Oro
      case 1: return 'bg-slate-300 text-slate-800 border-slate-200 shadow-[0_0_20px_rgba(203,213,225,0.4)]'; // Plata
      case 2: return 'bg-amber-700 text-amber-100 border-amber-600 shadow-[0_0_15px_rgba(180,83,9,0.4)]'; // Bronce
      default: return 'bg-neutral-800 text-white border-neutral-700'; // Resto
    }
  };

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy size={32} className="text-yellow-900" />;
      case 1: return <Medal size={28} className="text-slate-800" />;
      case 2: return <Medal size={28} className="text-amber-100" />;
      default: return <span className="text-xl font-bold text-neutral-500 w-7 text-center">#{index + 1}</span>;
    }
  };

  return (
    <div className="flex flex-col flex-grow items-center justify-center w-full max-w-2xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

      <div className="text-center mb-12">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2 uppercase tracking-widest">
          Ranking Final
        </h1>
        <p className="text-xl text-neutral-400">¡Partida terminada en la sala {roomId}!</p>
      </div>

      <div className="w-full space-y-4 mb-12">
        {sortedPlayers.map((player, idx) => {
          const isMe = player.id === gameState.currentPlayerId;
          const podiumClass = getPodiumColor(idx);
          const isTop3 = idx < 3;

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-4 md:p-6 rounded-2xl border-2 transition-transform hover:scale-105 ${podiumClass} ${isMe && !isTop3 ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 flex justify-center">
                  {getMedalIcon(idx)}
                </div>
                <div className="flex flex-col">
                  <span className={`text-2xl font-black ${isTop3 ? '' : (isMe ? 'text-purple-400' : 'text-white')}`}>
                    {player.name} {isMe && '(Tú)'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-3xl font-black ${isTop3 ? '' : 'text-white'}`}>
                  {player.score}
                </span>
                <span className={`text-sm block font-bold ${isTop3 ? 'opacity-80' : 'text-neutral-500'}`}>pts</span>
              </div>
            </div>
          );
        })}

        {sortedPlayers.length === 0 && (
          <div className="text-center p-8 bg-neutral-800 rounded-2xl border border-neutral-700 text-neutral-400">
            No hay jugadores en esta partida.
          </div>
        )}
      </div>

      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-3 px-8 py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl border border-neutral-700 transition-colors shadow-lg"
      >
        <HomeIcon size={24} />
        Volver al Inicio
      </button>

    </div>
  );
}
