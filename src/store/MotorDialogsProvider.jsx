import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMotors } from './MotorsProvider';
import { ConfirmDialog } from '../components/ui/Modal';
import { MotorFormModal } from '../features/motors/MotorFormModal';
import { HistoryModal } from '../features/motors/HistoryModal';

const DialogsContext = createContext(null);

/**
 * Ventanas compartidas por las tres vistas (editar, historial, eliminar).
 * Guardan solo el id del motor: los datos se leen siempre del estado único,
 * nunca de una copia, así no quedan fichas "fantasma" de motores borrados.
 */
export function MotorDialogsProvider({ children }) {
  const { motors, deleteMotor } = useMotors();
  const [editor, setEditor] = useState(null); // { id: string|null }
  const [historyId, setHistoryId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const find = (id) => motors.find((m) => m.id === id) ?? null;
  const editingMotor = editor?.id ? find(editor.id) : null;
  const historyMotor = historyId ? find(historyId) : null;
  const deleteMotorTarget = deleteId ? find(deleteId) : null;

  // Si el motor se borra (en esta u otra ventana) mientras su ficha está abierta, se cierra.
  useEffect(() => {
    if (editor?.id && !editingMotor) setEditor(null);
    if (historyId && !historyMotor) setHistoryId(null);
    if (deleteId && !deleteMotorTarget) setDeleteId(null);
  }, [editor, editingMotor, historyId, historyMotor, deleteId, deleteMotorTarget]);

  const openCreate = useCallback(() => setEditor({ id: null }), []);
  const openEdit = useCallback((id) => setEditor({ id }), []);
  const openHistory = useCallback((id) => setHistoryId(id), []);
  const requestDelete = useCallback((id) => setDeleteId(id), []);

  const api = useMemo(
    () => ({ openCreate, openEdit, openHistory, requestDelete }),
    [openCreate, openEdit, openHistory, requestDelete],
  );

  return (
    <DialogsContext.Provider value={api}>
      {children}

      {editor && (editor.id === null || editingMotor) && (
        <MotorFormModal motor={editingMotor} onClose={() => setEditor(null)} />
      )}

      {historyMotor && <HistoryModal motor={historyMotor} onClose={() => setHistoryId(null)} />}

      {deleteMotorTarget && (
        <ConfirmDialog
          title="¿Eliminar motor?"
          message={`Se eliminará ${deleteMotorTarget.tag} de forma permanente. Desaparece de la tabla, del depósito y del plano.`}
          confirmLabel="Sí, eliminar"
          danger
          onCancel={() => setDeleteId(null)}
          onConfirm={() => {
            const id = deleteId;
            setDeleteId(null);
            setEditor((e) => (e?.id === id ? null : e));
            setHistoryId((h) => (h === id ? null : h));
            deleteMotor(id);
          }}
        />
      )}
    </DialogsContext.Provider>
  );
}

export function useMotorDialogs() {
  const ctx = useContext(DialogsContext);
  if (!ctx) throw new Error('useMotorDialogs debe usarse dentro de <MotorDialogsProvider>');
  return ctx;
}
