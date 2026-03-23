import { useEffect, useLayoutEffect, useRef } from 'react';

/** Close when clicking outside modal content; keep action bar and other popups reachable in one click. */
export function useModalDismissOnOutside(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    let remove: (() => void) | undefined;
    const t = window.setTimeout(() => {
      const onMouseDown = (e: MouseEvent) => {
        const raw = e.target;
        const el = raw instanceof Element ? raw : raw instanceof Node ? raw.parentElement : null;
        if (!el) return;
        if (el.closest('[data-io-patch-popup]') || el.closest('.io-patch-action-bar')) return;
        onCloseRef.current();
      };
      document.addEventListener('mousedown', onMouseDown, true);
      remove = () => document.removeEventListener('mousedown', onMouseDown, true);
    }, 0);
    return () => {
      window.clearTimeout(t);
      remove?.();
    };
  }, []);
}
