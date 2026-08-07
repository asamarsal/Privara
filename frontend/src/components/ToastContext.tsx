import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export type ToastPosition = 'top-right' | 'bottom-center';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  position: ToastPosition;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType, position: ToastPosition) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType, position: ToastPosition) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, position }]);

    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Separate toasts by position
  const topRightToasts = toasts.filter(t => t.position === 'top-right');
  const bottomCenterToasts = toasts.filter(t => t.position === 'bottom-center');

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Top Right Toasts */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 9999,
      }}>
        {topRightToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>

      {/* Bottom Center Toasts */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 9999,
      }}>
        {bottomCenterToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage, onRemove: () => void }) {
  const bgColors = {
    success: 'rgba(0, 231, 223, 0.1)',
    error: 'rgba(230, 32, 88, 0.1)',
    info: 'rgba(0, 85, 255, 0.1)'
  };
  
  const borderColors = {
    success: 'var(--color-success)',
    error: 'var(--color-error)',
    info: 'var(--color-accent-primary)'
  };
  
  const textColors = {
    success: 'var(--color-success)',
    error: 'var(--color-error)',
    info: 'var(--color-text-primary)'
  };

  const icons = {
    success: '✓',
    error: '⚠️',
    info: 'ℹ'
  };

  return (
    <div style={{
      background: 'var(--color-bg-glass)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${borderColors[toast.type]}`,
      borderLeft: `4px solid ${borderColors[toast.type]}`,
      borderRadius: '8px',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '300px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      animation: 'slideIn 0.3s ease-out forwards',
    }}>
      <div style={{ 
        width: '24px', 
        height: '24px', 
        borderRadius: '50%', 
        background: bgColors[toast.type],
        color: textColors[toast.type],
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '12px'
      }}>
        {icons[toast.type]}
      </div>
      
      <div style={{ flex: 1, fontSize: '14px', color: 'var(--color-text-primary)' }}>
        {toast.message}
      </div>
      
      <button 
        onClick={onRemove}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ✕
      </button>
      
      <style>{`
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
