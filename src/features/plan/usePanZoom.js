import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_SCALE = 10;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Zoom con la rueda / botones y desplazamiento arrastrando el fondo.
 * El "stage" ocupa el ancho del visor con escala 1; `fit` es la escala
 * que hace entrar el plano completo en el visor.
 */
export function usePanZoom(aspectRatio, focus) {
  const viewportRef = useRef(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [fit, setFit] = useState(1);
  const panRef = useRef(null);

  const computeFit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp || !aspectRatio) return null;
    const { width, height } = vp.getBoundingClientRect();
    const stageHeight = width / aspectRatio;
    const whole = Math.min(1, height / stageHeight);
    if (!focus) return { min: whole, view: { scale: whole, x: (width - width * whole) / 2, y: (height - stageHeight * whole) / 2 } };
    // Encuadre inicial: la zona `focus` (en % del plano) ocupa el visor.
    const fw = ((focus.x1 - focus.x0) / 100) * width;
    const fh = ((focus.y1 - focus.y0) / 100) * stageHeight;
    const scale = clamp(Math.min(width / fw, height / fh) * 0.96, whole, MAX_SCALE);
    const cx = (((focus.x0 + focus.x1) / 2) / 100) * width;
    const cy = (((focus.y0 + focus.y1) / 2) / 100) * stageHeight;
    // Sin dejar margen vacío a la izquierda ni arriba del plano.
    return { min: whole, view: { scale, x: Math.min(0, width / 2 - cx * scale), y: Math.min(0, height / 2 - cy * scale) } };
  }, [aspectRatio, focus]);

  const reset = useCallback(() => {
    const f = computeFit();
    if (!f) return;
    setFit(f.min);
    setView(f.view);
  }, [computeFit]);

  useEffect(() => {
    reset();
    const vp = viewportRef.current;
    if (!vp) return undefined;
    const observer = new ResizeObserver(reset);
    observer.observe(vp);
    return () => observer.disconnect();
  }, [reset]);

  const zoomAt = useCallback(
    (factor, clientX, clientY) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      const px = (clientX ?? rect.left + rect.width / 2) - rect.left;
      const py = (clientY ?? rect.top + rect.height / 2) - rect.top;
      setView((v) => {
        const scale = clamp(v.scale * factor, fit, MAX_SCALE);
        const k = scale / v.scale;
        return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
      });
    },
    [fit],
  );

  // La rueda necesita un listener no pasivo para poder bloquear el scroll de la página.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const panHandlers = {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      panRef.current = { startX: e.clientX, startY: e.clientY, origin: view };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const pan = panRef.current;
      if (!pan) return;
      setView({ ...pan.origin, x: pan.origin.x + e.clientX - pan.startX, y: pan.origin.y + e.clientY - pan.startY });
    },
    onPointerUp: () => {
      panRef.current = null;
    },
  };

  return {
    viewportRef,
    view,
    panHandlers,
    zoomIn: () => zoomAt(1.4),
    zoomOut: () => zoomAt(1 / 1.4),
    reset,
    isPanning: () => panRef.current !== null,
  };
}
