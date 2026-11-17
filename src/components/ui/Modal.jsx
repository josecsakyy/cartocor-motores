import { useEffect, useRef } from 'react';

// Pila de ventanas abiertas: Escape cierra solo la de arriba.
const openStack = [];

/** Ventana modal base: cierra con Escape o clic en el fondo. */
export function Modal({ title, subtitle, onClose, children, footer, size = 'max-w-lg', dark = false }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const token = {};
    openStack.push(token);
    const onKey = (e) => e.key === 'Escape' && openStack.at(-1) === token && closeRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      openStack.splice(openStack.indexOf(token), 1);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[90vh] w-full ${size} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}
      >
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            dark ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
          }`}
        >
          <div>
            {subtitle}
            <h3 className="text-base font-bold">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={`rounded-lg p-1 font-bold ${dark ? 'text-slate-300 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="max-w-sm"
      footer={
        <>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'} autoFocus>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="px-6 py-5 text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
