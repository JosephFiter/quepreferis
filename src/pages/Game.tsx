import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { Clock, Send, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { gameState, submitQuestion, submitVote, nextQuestion, nextRound, forceNextPhase } = useGame();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameContext = useGame() as any; // Para acceder a _forcePhase

  // Estados Fase 1: Escritura
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(gameState.settings.timeLimit);

  // Estados Fase 2: Votación
  const [selectedVote, setSelectedVote] = useState<'A' | 'B' | null>(null);

  // Tema actual
  const currentTopic = gameState.settings.mode === 'tematica'
    ? (gameState.settings.topics[gameState.currentRound % gameState.settings.topics.length] || 'Tema Aleatorio')
    : null;

  // Redirigir si no hay jugador (ej. recarga de página sin estado)
  useEffect(() => {
    if (!gameState.currentPlayerId) {
      navigate('/');
    }
  }, [gameState.currentPlayerId, navigate]);

  const handleSubmitQuestion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitted) return;

    // Si se acaba el tiempo y está vacío, poner algo default
    const finalA = optionA.trim() || 'Nada';
    const finalB = optionB.trim() || 'Todo';

    submitQuestion(finalA, finalB, currentTopic || undefined);
    setIsSubmitted(true);
  };

  const handleTimeUp = () => {
    console.log(`[TIMER] El tiempo llegó a 0 en la fase: ${gameState.currentPhase}`);

    if (gameState.currentPhase === 'writing') {
      if (!isSubmitted) {
        console.log(`[TIMER] Tiempo acabado y NO se había enviado pregunta. Autocompletando y enviando...`);
        handleSubmitQuestion();
      } else {
        console.log(`[TIMER] Tiempo acabado, pero la pregunta ya estaba enviada.`);
      }

      // El Host fuerza la siguiente fase luego de unos instantes (si todos no hubieran enviado ya)
      const isHost = gameState.players.find(p => p.id === gameState.currentPlayerId)?.isHost;
      if (isHost) {
        console.log(`[TIMER] Soy el Host. Dando 2 segundos extra antes de forzar el paso a votación.`);
        setTimeout(() => {
          console.log(`[TIMER] Han pasado los 2 segundos extra. Forzando a votación.`);
          forceNextPhase();
        }, 2000); // 2 segundos para dar tiempo a los demás a subir su last-second question
      } else {
        console.log(`[TIMER] NO soy el Host. Esperando a que el Host cambie la fase en Firebase.`);
      }
    } else if (gameState.currentPhase === 'voting') {
      const isHost = gameState.players.find(p => p.id === gameState.currentPlayerId)?.isHost;
      if (isHost) {
        console.log(`[TIMER] Soy el Host. Forzando paso a la siguiente pregunta/fase.`);
        forceNextPhase();
      } else {
        console.log(`[TIMER] NO soy el Host. Esperando a que el Host pase la pregunta de votación.`);
      }
    }
  };

  // Manejar el temporizador (Simplificado para el frontend mock)
  useEffect(() => {
    if (gameState.currentPhase === 'writing' || gameState.currentPhase === 'voting') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPhase, isSubmitted, selectedVote]);

  // Resetear estados al cambiar de fase
  useEffect(() => {
    if (gameState.currentPhase === 'writing') {
      setOptionA('');
      setOptionB('');
      setIsSubmitted(false);
      setTimeLeft(gameState.settings.timeLimit);
    } else if (gameState.currentPhase === 'voting') {
      setSelectedVote(null);
      setTimeLeft(15); // 15 segs por pregunta
    } else if (gameState.currentPhase === 'round_ranking') {
      // Auto-avanzar después de 15 segundos
      const timer = setTimeout(() => {
        nextRound();
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPhase, gameState.currentQuestionIndex, gameState.settings.timeLimit, nextRound]);

  const handleVote = (option: 'A' | 'B') => {
    if (selectedVote || gameState.currentPhase !== 'voting') return;

    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    if (!currentQ) return;

    // No puedes votar por tu propia pregunta
    if (currentQ.authorId === gameState.currentPlayerId) return;

    setSelectedVote(option);
    submitVote(currentQ.id, option);

    // Auto avanzar tras votar para agilizar el mock (en real esperaría a todos)
    setTimeout(() => {
      nextQuestion();
    }, 1000);
  };

  // --- RENDERIZADO POR FASES ---

  if (!gameState.currentPlayerId) return null;

  if (gameState.currentPhase === 'writing') {
    return (
      <div className="flex flex-col flex-grow items-center w-full max-w-3xl mx-auto py-8 animate-in fade-in duration-500">

        {/* Cabecera de la ronda */}
        <div className="text-center mb-10 w-full space-y-4">
          <div className="inline-flex items-center gap-2 bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-full text-sm font-semibold text-neutral-300">
            Ronda {gameState.currentRound} de {gameState.settings.rounds}
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-2">
            ¿Qué preferís?
          </h1>

          <div className="text-2xl md:text-3xl font-bold text-white uppercase tracking-widest mt-4">
            {gameState.settings.mode === 'libre' ? (
              <span className="text-blue-400">MODO LIBRE</span>
            ) : (
              <span className="text-emerald-400">TEMÁTICA: {currentTopic}</span>
            )}
          </div>
        </div>

        {/* Temporizador */}
        <div className={`flex items-center gap-3 text-4xl font-black mb-8 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-neutral-300'}`}>
          <Clock size={32} />
          {timeLeft}s
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmitQuestion} className="w-full space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full relative">

              {/* Opción A */}
              <div className="flex flex-col gap-3 group">
                <label className="text-xl font-bold text-purple-400 pl-2">Opción A</label>
                <textarea
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  maxLength={100}
                  required
                  placeholder="Ej: Ser increíblemente lindo pero no tener un peso"
                  className="w-full h-40 bg-neutral-800 border-2 border-neutral-700 focus:border-purple-500 rounded-3xl p-6 text-xl text-white resize-none outline-none transition-colors group-hover:bg-neutral-800/80 shadow-lg"
                />
              </div>

              {/* O decorativo */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-neutral-900 border-4 border-neutral-700 rounded-full flex items-center justify-center font-black text-2xl text-neutral-500 z-10 hidden md:flex">
                O
              </div>

              {/* Opción B */}
              <div className="flex flex-col gap-3 group">
                <label className="text-xl font-bold text-blue-400 pl-2 md:text-right">Opción B</label>
                <textarea
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  maxLength={100}
                  required
                  placeholder="Ej: Ser multimillonario pero ser horrible"
                  className="w-full h-40 bg-neutral-800 border-2 border-neutral-700 focus:border-blue-500 rounded-3xl p-6 text-xl text-white resize-none outline-none transition-colors group-hover:bg-neutral-800/80 shadow-lg md:text-right"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!optionA.trim() || !optionB.trim()}
              className="w-full max-w-md mx-auto flex items-center justify-center gap-3 bg-white hover:bg-neutral-200 text-black font-black text-xl py-5 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send size={24} />
              ¡Listo!
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 space-y-6 bg-neutral-800 border border-neutral-700 rounded-3xl w-full max-w-lg p-8 text-center animate-in zoom-in-95 duration-300 shadow-2xl">
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 size={48} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">¡Dilema enviado!</h2>
              <p className="text-neutral-400 text-lg">Esperando a los demás jugadores...</p>
            </div>

            {/* Animación de carga de jugadores */}
            <div className="flex gap-2 mt-4">
              {[1,2,3].map(i => (
                <div key={i} className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>

            {/* Botón MOCK para pasar a votación rápido en dev */}
            {import.meta.env.MODE === 'development' && (
               <button
                onClick={() => gameContext._forcePhase('voting')}
                className="mt-4 text-xs text-neutral-500 underline"
               >
                 Dev: Forzar fase de votación
               </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (gameState.currentPhase === 'voting') {
    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];

    // Si no hay preguntas por alguna razón (ej. testing), pasamos directo al ranking
    if (!currentQuestion) {
      if (import.meta.env.MODE === 'development') {
        return (
          <div className="flex flex-col items-center justify-center flex-grow">
            <p>No hay preguntas para votar.</p>
            <button onClick={() => gameContext._forcePhase('round_ranking')} className="mt-4 px-4 py-2 bg-purple-600 rounded">Saltar al ranking</button>
          </div>
        );
      }
      return null;
    }

    const isAuthor = currentQuestion.authorId === gameState.currentPlayerId;

    return (
      <div className="flex flex-col flex-grow items-center justify-center w-full max-w-4xl mx-auto py-8 animate-in fade-in zoom-in-95 duration-500">

        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-full text-sm font-semibold text-neutral-300">
            Pregunta {gameState.currentQuestionIndex + 1} de {gameState.questions.length}
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest mt-2">
            ¡A VOTAR!
          </h2>
        </div>

        {/* Temporizador */}
        <div className={`flex items-center gap-2 text-3xl font-black mb-8 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-neutral-300'}`}>
          <Clock size={28} />
          {timeLeft}s
        </div>

        {/* Las opciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full relative">

          <button
            onClick={() => handleVote('A')}
            disabled={isAuthor || !!selectedVote}
            className={`flex flex-col items-center justify-center text-center p-8 rounded-3xl border-4 transition-all min-h-[250px]
              ${selectedVote === 'A'
                ? 'bg-purple-600/20 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)] scale-105'
                : 'bg-neutral-800 border-neutral-700 hover:border-purple-500/50 hover:bg-neutral-800/80'}
              ${(isAuthor || selectedVote) && selectedVote !== 'A' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-xl font-bold text-purple-400 mb-4">Opción A</span>
            <span className="text-2xl font-black text-white">{currentQuestion.optionA}</span>
          </button>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-neutral-900 border-4 border-neutral-700 rounded-full flex items-center justify-center font-black text-2xl text-neutral-500 z-10 hidden md:flex">
            VS
          </div>

          <button
            onClick={() => handleVote('B')}
            disabled={isAuthor || !!selectedVote}
            className={`flex flex-col items-center justify-center text-center p-8 rounded-3xl border-4 transition-all min-h-[250px]
              ${selectedVote === 'B'
                ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.4)] scale-105'
                : 'bg-neutral-800 border-neutral-700 hover:border-blue-500/50 hover:bg-neutral-800/80'}
              ${(isAuthor || selectedVote) && selectedVote !== 'B' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="text-xl font-bold text-blue-400 mb-4">Opción B</span>
            <span className="text-2xl font-black text-white">{currentQuestion.optionB}</span>
          </button>
        </div>

        {/* Mensaje para el autor */}
        {isAuthor && (
          <div className="mt-8 flex items-center gap-3 bg-yellow-500/20 text-yellow-500 px-6 py-4 rounded-xl border border-yellow-500/30">
            <AlertTriangle size={24} />
            <span className="font-semibold text-lg">Este es tu "Qué preferís", no puedes votar. ¡Mira cómo votan los demás!</span>
          </div>
        )}

        {/* Mensaje de espera post-voto */}
        {selectedVote && !isAuthor && (
          <div className="mt-8 text-xl font-semibold text-neutral-400 animate-pulse">
            Voto registrado. Esperando a los demás...
          </div>
        )}

      </div>
    );
  }

  if (gameState.currentPhase === 'round_ranking') {
    // Calculamos los resultados locales solo para mostrar en pantalla,
    // sin afectar todavía el estado global (que se actualizará al llamar a nextRound)
    const results = gameState.questions.map(q => {
      const totalVotes = q.votesA + q.votesB;
      const percentA = totalVotes > 0 ? (q.votesA / totalVotes) * 100 : 0;
      const percentB = totalVotes > 0 ? (q.votesB / totalVotes) * 100 : 0;

      const diff = Math.abs(percentA - 50) * 2;
      const points = totalVotes > 0 ? Math.round(1000 * ((100 - diff) / 100)) : 0;

      const authorName = gameState.players.find(p => p.id === q.authorId)?.name || 'Desconocido';

      return {
        ...q,
        percentA,
        percentB,
        points,
        authorName,
        diff
      };
    }).sort((a, b) => a.diff - b.diff); // Ordenar del más parejo al menos parejo

    return (
      <div className="flex flex-col flex-grow items-center w-full max-w-4xl mx-auto py-8 animate-in fade-in duration-500">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 uppercase tracking-widest">
            Resultados de la Ronda {gameState.currentRound}
          </h2>
          <p className="text-neutral-400 text-lg">Próxima ronda en breve...</p>
        </div>

        <div className="w-full space-y-6">
          {results.map((res, idx) => (
            <div key={res.id} className="bg-neutral-800 border border-neutral-700 rounded-3xl p-6 shadow-xl relative overflow-hidden group">

              {/* Etiqueta de posición/autor */}
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="bg-neutral-900 border border-neutral-700 px-3 py-1 rounded-lg text-sm font-semibold text-neutral-300">
                  #{idx + 1} • De: <span className="text-white">{res.authorName}</span>
                </span>
                <span className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 font-black px-4 py-1 rounded-full text-lg shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                  +{res.points} pts
                </span>
              </div>

              {/* Barra de porcentajes (Fondo) */}
              <div className="absolute top-0 left-0 w-full h-full opacity-10 flex z-0">
                <div style={{ width: `${res.percentA}%` }} className="h-full bg-purple-500 transition-all duration-1000" />
                <div style={{ width: `${res.percentB}%` }} className="h-full bg-blue-500 transition-all duration-1000" />
              </div>

              {/* Textos de opciones */}
              <div className="flex items-center justify-between gap-4 relative z-10">
                <div className="w-1/2 flex flex-col gap-1 pr-4 border-r border-neutral-700/50">
                  <span className="text-3xl font-black text-purple-400">{Math.round(res.percentA)}%</span>
                  <span className="text-lg font-bold text-white line-clamp-2">{res.optionA}</span>
                </div>

                <div className="w-1/2 flex flex-col items-end gap-1 pl-4 text-right">
                  <span className="text-3xl font-black text-blue-400">{Math.round(res.percentB)}%</span>
                  <span className="text-lg font-bold text-white line-clamp-2">{res.optionB}</span>
                </div>
              </div>

            </div>
          ))}

          {results.length === 0 && (
            <div className="text-center p-12 bg-neutral-800 rounded-3xl border border-neutral-700">
              <p className="text-xl text-neutral-400">Nadie escribió preguntas esta ronda.</p>
            </div>
          )}
        </div>

        {/* Botón dev para avanzar */}
        {import.meta.env.MODE === 'development' && (
          <button
            onClick={() => nextRound()}
            className="mt-10 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors border border-neutral-700 text-sm font-semibold"
          >
            Dev: Siguiente Ronda/Finalizar
          </button>
        )}
      </div>
    );
  }

  // Si el estado es "finished", redirigimos al podio final
  if (gameState.currentPhase === 'finished') {
    // Para que no se quede aquí "atorado", React Router navega.
    // Usamos useEffect o setTimeout para no renderizar durante la fase de actualización,
    // pero como estamos en la rama de render principal, un pequeño setTimeout es seguro.
    setTimeout(() => {
      navigate(`/results/${roomId}`);
    }, 0);
    return null;
  }

  return <div className="p-4 flex items-center justify-center flex-grow text-neutral-500">Cargando fase...</div>;
}
