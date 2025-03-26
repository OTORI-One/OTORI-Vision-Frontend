import React from 'react';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <div data-theme="light" className="min-h-screen bg-white">
      {children}
    </div>
  );
}; 