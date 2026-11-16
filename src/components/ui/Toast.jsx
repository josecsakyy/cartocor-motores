import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);
const DURATION_MS = 3500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (message, kind) => {
      const id = `${Date.now()}_${Math.random()}`;
      setToasts((list) => [...list.slice(-2), { id, message, kind }]);
      timers.current.set(id, setTimeout(() => dismiss(id), DURATION_MS));
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const api = useMemo(
    () => ({ success: (msg) => push(msg, 'success'), error: (msg) => push(msg, 'error') }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-white shadow-xl ${
              t.kind === 'error' ? 'bg-red-700' : 'bg-slate-900'
            }`}
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.kind === 'error' ? 'bg-red-200' : 'bg-brand'}`} />
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
