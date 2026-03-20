import { useEffect, useState } from 'react';

/** Channels 1–4 (per group) open right; 5–8 open left */
export function usePopupSide(ch: number) {
  return (ch % 8) < 4;
}

/** Viewport narrow (portrait / phone) — use 4-channel ranges */
export function useIsPortrait() {
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 480px)');
    const onChange = () => setIsPortrait(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isPortrait;
}

/** Patch table below strips + collapsible */
export function useIsPatchTableBelow() {
  const [below, setBelow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const onChange = () => setBelow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return below;
}
