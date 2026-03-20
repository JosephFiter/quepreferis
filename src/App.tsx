import { Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { ThemeProvider } from './context/ThemeContext';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Results from './pages/Results';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ThemeProvider>
      <GameProvider>
        <div className="min-h-screen bg-base text-text-primary font-sans flex flex-col items-center transition-colors duration-300">
          <main className="w-full max-w-4xl mx-auto p-4 flex-grow flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lobby/:roomId" element={<Lobby />} />
            <Route path="/game/:roomId" element={<Game />} />
            <Route path="/results/:roomId" element={<Results />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </main>
        </div>
      </GameProvider>
    </ThemeProvider>
  );
}

export default App;
