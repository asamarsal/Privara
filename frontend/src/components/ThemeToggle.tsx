import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const SunIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="M4.93 4.93l1.41 1.41"></path>
    <path d="M17.66 17.66l1.41 1.41"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <path d="M6.34 17.66l-1.41 1.41"></path>
    <path d="M19.07 4.93l-1.41 1.41"></path>
  </svg>
);

export const MoonIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={color} stroke="none">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      style={{
        width: '84px',
        height: '36px',
        borderRadius: '24px',
        background: 'var(--color-overlay-strong)',
        display: 'flex',
        alignItems: 'center',
        padding: '4px',
        cursor: 'pointer',
        position: 'relative',
        border: '1px solid var(--color-border)',
        outline: 'none',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
      }}
      title="Toggle Theme"
      aria-label="Toggle Theme"
    >
      {/* Sliding active pill (Thumb) with 3D raised style */}
      <div 
        style={{
          position: 'absolute',
          width: '38px',
          height: '28px',
          borderRadius: '20px',
          background: 'linear-gradient(180deg, var(--color-bg-surface-hover) 0%, var(--color-bg-surface) 100%)',
          border: '1px solid var(--color-accent-primary)',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2), inset 0 -1px 2px rgba(0, 0, 0, 0.4), 0 2px 0 var(--color-accent-primary), 0 3px 8px var(--color-accent-glow)',
          top: '3px',
          left: isDark ? '41px' : '3px', 
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease, box-shadow 0.2s ease',
          zIndex: 1,
        }}
      />
      
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', zIndex: 2 }}>
        <SunIcon color={!isDark ? 'var(--color-accent-primary)' : 'var(--color-text-muted)'} />
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', zIndex: 2 }}>
        <MoonIcon color={isDark ? 'var(--color-accent-primary)' : 'var(--color-text-muted)'} />
      </div>
    </button>
  );
}
