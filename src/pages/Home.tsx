import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Zap, Eye, ArrowRight, Palette } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';

type ActionType = 'create' | 'join' | 'quick' | 'spectate' | null;

export default function Home() {
  const navigate = useNavigate();
  const { createRoom, joinRoom } = useGame();
  const { theme, setTheme } = useTheme();

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      const success = await joinRoom(roomCode.toUpperCase(), playerName);
      if (success) {
        navigate(`/lobby/${roomCode.toUpperCase()}`);
      }
    }
  };

  const handleBack = () => {
    setSelectedAction(null);
    setPlayerName('');
    setRoomCode('');
  };

  const [showCustomTheme, setShowCustomTheme] = useState(false);

  const toggleTheme = () => {
    const themes: ('dark-purple' | 'light-blue' | 'monochrome' | 'neon-green' | 'custom')[] = ['dark-purple', 'light-blue', 'monochrome', 'neon-green', 'custom'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
    if (themes[nextIndex] === 'custom') {
      setShowCustomTheme(true);
    } else {
      setShowCustomTheme(false);
    }
  };

  const handleCustomColorChange = (variable: string, value: string) => {
    document.documentElement.style.setProperty(variable, value);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-grow p-4 w-full max-w-md mx-auto relative">

      {/* Selector Custom Theme (para diseñadores) */}
      {showCustomTheme && (
        <div className="absolute top-16 right-0 bg-panel border border-border-color p-4 rounded-xl shadow-2xl z-50 flex flex-col gap-2 animate-in fade-in zoom-in w-64">
          <h3 className="text-sm font-bold text-text-primary mb-2 border-b border-border-color pb-2">Diseñador de Colores</h3>

          {[
            { label: 'Fondo Principal', var: '--bg-base', default: '#171717' },
            { label: 'Fondo Paneles', var: '--bg-panel', default: '#262626' },
            { label: 'Acento Primario', var: '--color-primary', default: '#a855f7' },
            { label: 'Acento Secundario', var: '--color-secondary', default: '#3b82f6' },
            { label: 'Texto Principal', var: '--text-primary', default: '#ffffff' },
            { label: 'Texto Secundario', var: '--text-secondary', default: '#a3a3a3' },
            { label: 'Bordes', var: '--border-color', default: '#404040' },
          ].map(c => (
            <div key={c.var} className="flex items-center justify-between text-xs">
              <label className="text-text-secondary">{c.label}</label>
              <input
                type="color"
                defaultValue={c.default}
                onChange={(e) => handleCustomColorChange(c.var, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
              />
            </div>
          ))}
        </div>
      )}

      {/* Botón temporal de cambio de tema */}
      <button
        onClick={toggleTheme}
        className="absolute top-0 right-0 p-3 bg-panel border border-border-color rounded-full text-text-secondary hover:text-primary transition-colors shadow-lg flex items-center gap-2"
        title="Cambiar Paleta de Colores"
      >
        <Palette size={20} />
        <span className="text-xs font-bold hidden md:inline">Tema: {theme}</span>
      </button>

      <div className="text-center mb-10 mt-12 md:mt-0">
        <h1 className="text-5xl font-extrabold text-primary mb-2 transition-colors">
          ¿Qué preferís?
        </h1>
        <p className="text-text-secondary transition-colors">El juego de los peores dilemas</p>
      </div>

      {!selectedAction ? (
        <div className="w-full flex flex-col gap-4">
          <button
            onClick={() => handleActionClick('create')}
            className="group flex items-center justify-between p-4 bg-panel border border-border-color hover:border-primary rounded-xl transition-all shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 text-primary rounded-lg transition-colors">
                <Users size={24} />
              </div>
              <span className="font-semibold text-lg text-text-primary">Crear lobby privado</span>
            </div>
            <ArrowRight className="text-text-secondary group-hover:text-primary transition-colors" />
          </button>

          <button
            onClick={() => handleActionClick('join')}
            className="group flex items-center justify-between p-4 bg-panel border border-border-color hover:border-secondary rounded-xl transition-all shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/20 text-secondary rounded-lg transition-colors">
                <UserPlus size={24} />
              </div>
              <span className="font-semibold text-lg text-text-primary">Entrar lobby privado</span>
            </div>
            <ArrowRight className="text-text-secondary group-hover:text-secondary transition-colors" />
          </button>

          <button
            onClick={() => handleActionClick('quick')}
            className="group flex items-center justify-between p-4 bg-panel border border-border-color opacity-60 cursor-not-allowed rounded-xl transition-all shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-lg">
                <Zap size={24} />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-lg text-text-secondary">Juego rápido</span>
                <span className="text-xs text-text-secondary opacity-70">Próximamente</span>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleActionClick('spectate')}
            className="group flex items-center justify-between p-4 bg-panel border border-border-color opacity-60 cursor-not-allowed rounded-xl transition-all shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg">
                <Eye size={24} />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-lg text-text-secondary">Modo espectador</span>
                <span className="text-xs text-text-secondary opacity-70">Próximamente</span>
              </div>
            </div>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-left mb-2">
            <h2 className="text-2xl font-bold text-text-primary transition-colors">
              {selectedAction === 'create' ? 'Crear Partida' : 'Unirse a Partida'}
            </h2>
            <p className="text-text-secondary text-sm transition-colors">Ingresa tus datos para continuar</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="playerName" className="text-sm font-medium text-text-secondary ml-1 transition-colors">
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
              className="w-full px-4 py-3 bg-panel border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary placeholder-text-secondary transition-all"
            />
          </div>

          {selectedAction === 'join' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="roomCode" className="text-sm font-medium text-text-secondary ml-1 transition-colors">
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
                className="w-full px-4 py-3 bg-panel border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent text-text-primary placeholder-text-secondary uppercase transition-all tracking-widest"
              />
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-3 bg-panel border border-border-color hover:bg-border-color rounded-xl font-medium text-text-primary transition-colors w-1/3"
            >
              Volver
            </button>
            <button
              type="submit"
              className={`px-6 py-3 rounded-xl font-bold text-white transition-all w-2/3 shadow-lg hover:opacity-90 ${
                selectedAction === 'create'
                  ? 'bg-primary'
                  : 'bg-secondary'
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
