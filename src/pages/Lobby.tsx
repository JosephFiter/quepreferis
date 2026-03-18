import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { Settings, Users, Copy, CheckCircle2, Play, Plus, X } from 'lucide-react';

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { gameState, startGame, updateSettings } = useGame();

  const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
  const isHost = currentPlayer?.isHost || false;

  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    mode: gameState.settings.mode,
    rounds: gameState.settings.rounds,
    timeLimit: gameState.settings.timeLimit,
    topics: gameState.settings.topics || [],
  });

  const [newTopic, setNewTopic] = useState('');

  const predefinedTopics = ['Famosos', 'Comida y bebida', 'Menciona a alguien del grupo'];

  // Redirigir al home si no hay jugador actual
  useEffect(() => {
    if (!gameState.currentPlayerId) {
      navigate('/');
    }
  }, [gameState.currentPlayerId, navigate]);

  // Si el juego empieza, ir a la pantalla de juego
  useEffect(() => {
    if (gameState.currentPhase === 'writing') {
      navigate(`/game/${roomId}`);
    }
  }, [gameState.currentPhase, navigate, roomId]);

  const handleCopyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = () => {
    // Sincronizar configuraciones en Firebase justo antes de iniciar
    if (isHost) {
      const finalSettings = { ...settings };
      // Si la cantidad de temas es menor a la cantidad de rondas,
      // repetir los temas aleatoriamente hasta llenar las rondas
      if (finalSettings.mode === 'tematica' && finalSettings.topics.length > 0 && finalSettings.topics.length < finalSettings.rounds) {
        const topics = [...finalSettings.topics];
        while (topics.length < finalSettings.rounds) {
          const randomTopic = finalSettings.topics[Math.floor(Math.random() * finalSettings.topics.length)];
          topics.push(randomTopic);
        }
        finalSettings.topics = topics;
      }
      updateSettings(finalSettings);
    }
    startGame();
  };

  const addTopic = (topic: string) => {
    if (topic && !settings.topics.includes(topic)) {
      setSettings(prev => ({
        ...prev,
        topics: [...prev.topics, topic]
      }));
    }
    setNewTopic('');
  };

  const removeTopic = (topicToRemove: string) => {
    setSettings(prev => ({
      ...prev,
      topics: prev.topics.filter(t => t !== topicToRemove)
    }));
  };

  if (!gameState.currentPlayerId) return null;

  return (
    <div className="flex flex-col flex-grow max-w-4xl mx-auto w-full gap-6 animate-in fade-in duration-300">

      {/* HEADER: Código de la sala */}
      <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm uppercase tracking-wider text-neutral-400 font-semibold mb-1">Código de Sala</h2>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-black tracking-widest text-white">{roomId}</span>
            <button
              onClick={handleCopyCode}
              className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors group relative"
              title="Copiar código"
            >
              {copied ? <CheckCircle2 className="text-green-400" size={20} /> : <Copy className="text-neutral-300 group-hover:text-white" size={20} />}
              {copied && <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">¡Copiado!</span>}
            </button>
          </div>
        </div>

        <div className="text-center md:text-right">
          <p className="text-neutral-400 mb-1">Jugadores unidos</p>
          <p className="text-2xl font-bold flex items-center gap-2 justify-center md:justify-end">
            <Users size={24} className="text-purple-400" />
            {gameState.players.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">

        {/* COLUMNA IZQUIERDA: Configuración (Solo Host) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 shadow-lg h-full">
            <div className="flex items-center gap-3 mb-6 border-b border-neutral-700 pb-4">
              <Settings className="text-purple-400" />
              <h3 className="text-xl font-bold">Configuración de Partida</h3>
            </div>

            {isHost ? (
              <div className="space-y-6">
                {/* MODO DE JUEGO */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Modo de Juego</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSettings(s => ({ ...s, mode: 'libre' }))}
                      className={`py-3 px-4 rounded-xl border font-semibold transition-all ${
                        settings.mode === 'libre'
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                      }`}
                    >
                      Libre
                    </button>
                    <button
                      onClick={() => setSettings(s => ({ ...s, mode: 'tematica' }))}
                      className={`py-3 px-4 rounded-xl border font-semibold transition-all ${
                        settings.mode === 'tematica'
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                      }`}
                    >
                      Temáticas
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* RONDAS */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Rondas ({settings.rounds})
                    </label>
                    <input
                      type="range"
                      min="1" max="10"
                      value={settings.rounds}
                      onChange={(e) => setSettings(s => ({ ...s, rounds: parseInt(e.target.value) }))}
                      className="w-full accent-purple-500"
                    />
                  </div>

                  {/* TIEMPO */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Tiempo (segundos)
                    </label>
                    <select
                      value={settings.timeLimit}
                      onChange={(e) => setSettings(s => ({ ...s, timeLimit: parseInt(e.target.value) }))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="30">30s (Muy rápido)</option>
                      <option value="45">45s (Rápido)</option>
                      <option value="60">60s (Normal)</option>
                      <option value="90">90s (Largo)</option>
                      <option value="120">120s (Épico)</option>
                    </select>
                  </div>
                </div>

                {/* TEMÁTICAS (Si el modo es temático) */}
                {settings.mode === 'tematica' && (
                  <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-700/50 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Elegir o crear temáticas (Seleccionadas: {settings.topics.length})
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {predefinedTopics.map(topic => (
                          <button
                            key={topic}
                            onClick={() => {
                              if (settings.topics.includes(topic)) {
                                removeTopic(topic);
                              } else {
                                addTopic(topic);
                              }
                            }}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              settings.topics.includes(topic)
                                ? 'bg-purple-600 text-white border-purple-500'
                                : 'bg-neutral-800 text-neutral-400 border-neutral-600 hover:border-neutral-400'
                            }`}
                          >
                            {topic}
                          </button>
                        ))}
                      </div>

                      {/* Agregar custom topic */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addTopic(newTopic)}
                          placeholder="Escribe una nueva temática..."
                          className="flex-grow bg-neutral-800 border border-neutral-600 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <button
                          onClick={() => addTopic(newTopic)}
                          className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-2 rounded-lg transition-colors"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Lista de temáticas activas */}
                    {settings.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-700/50">
                        {settings.topics.map((t, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-sm border border-purple-500/30">
                            {t}
                            <button onClick={() => removeTopic(t)} className="hover:text-white rounded-full p-0.5 hover:bg-purple-500/40">
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center space-y-4">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <p className="text-xl font-semibold text-white">Esperando al anfitrión...</p>
                  <p className="text-neutral-400">El creador de la sala está configurando la partida.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: Jugadores */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 shadow-lg h-full flex flex-col">
          <div className="flex items-center gap-3 mb-6 border-b border-neutral-700 pb-4">
            <Users className="text-blue-400" />
            <h3 className="text-xl font-bold">Jugadores ({gameState.players.length})</h3>
          </div>

          <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {gameState.players.map(player => (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  player.id === currentPlayer?.id
                    ? 'bg-blue-600/10 border-blue-500/50 text-blue-200'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  player.isHost ? 'bg-purple-500 text-white' : 'bg-neutral-700 text-neutral-300'
                }`}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold leading-tight">{player.name} {player.id === currentPlayer?.id && '(Tú)'}</span>
                  {player.isHost && <span className="text-[10px] uppercase text-purple-400 font-bold tracking-wider">Anfitrión</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Botón para iniciar (solo host) */}
          {isHost && (
            <div className="mt-6 pt-4 border-t border-neutral-700">
              <button
                onClick={handleStartGame}
                disabled={gameState.players.length < 2 && import.meta.env.MODE !== 'development'} // Para testing permitimos 1
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play fill="currentColor" size={20} />
                Iniciar Partida
              </button>
              {gameState.players.length < 2 && (
                <p className="text-xs text-center text-yellow-500 mt-2">
                  *Nota: En desarrollo puedes empezar solo, pero normalmente se necesitan 2+.
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
