import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type Theme = 'dark-purple' | 'light-blue' | 'monochrome' | 'neon-green' | 'custom';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark-purple');

  useEffect(() => {
    // Aplicar la clase al document element
    document.documentElement.classList.remove('theme-dark-purple', 'theme-light-blue', 'theme-monochrome', 'theme-neon-green', 'theme-custom');
    document.documentElement.classList.add(`theme-${theme}`);

    // Si NO es custom, limpiamos los estilos inline del documentElement por si acaso
    if (theme !== 'custom') {
      document.documentElement.style.removeProperty('--bg-base');
      document.documentElement.style.removeProperty('--bg-panel');
      document.documentElement.style.removeProperty('--color-primary');
      document.documentElement.style.removeProperty('--color-secondary');
      document.documentElement.style.removeProperty('--text-primary');
      document.documentElement.style.removeProperty('--text-secondary');
      document.documentElement.style.removeProperty('--border-color');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
