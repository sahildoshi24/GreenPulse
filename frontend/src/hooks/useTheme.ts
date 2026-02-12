import { useEffect, useState } from 'react';

export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('gp_theme') as 'light' | 'dark') || 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('gp_theme', theme);
  }, [theme]);

  return { theme, setTheme };
};
