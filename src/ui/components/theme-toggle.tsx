import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function getStoredTheme(): Theme | null {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === 'light' || t === 'dark') return t;
    return null;
  } catch {
    return null;
  }
}

function getPreferredTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const initial = getPreferredTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const isDark = theme === 'dark';

  return (
    <div className="fixed right-3 top-3 z-50">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => {
          const next = isDark ? 'light' : 'dark';
          setTheme(next);
          applyTheme(next);
        }}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </Button>
    </div>
  );
}
