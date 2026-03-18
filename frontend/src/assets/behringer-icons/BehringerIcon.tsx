/**
 * Behringer X32/Midas mixer icons — from https://github.com/mamarguerat/behringer-icons
 * GPL-3.0. Renders SVG with currentColor for theme compatibility.
 */
import type { ReactNode } from 'react';

// Eager-load SVG strings (Vite ?raw)
const rawIcons = import.meta.glob('./*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

function colorizeSvg(raw: string): string {
  return raw
    .replace(/stroke:\s*#000000/gi, 'stroke: currentColor')
    .replace(/fill:\s*#000000/gi, 'fill: currentColor');
}

/** Behringer icon by numeric id (2–74). Renders with currentColor. */
export function BehringerIcon({
  id,
  size = 32,
  style,
}: {
  id: number | string;
  size?: number;
  style?: React.CSSProperties;
}): ReactNode {
  const key = `./${id}.svg`;
  const raw = rawIcons[key] as string | undefined;
  if (!raw) return <span style={{ width: size, height: size, display: 'inline-block' }} />;

  const svg = colorizeSvg(raw)
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`);

  return (
    <span
      style={{ width: size, height: size, display: 'inline-flex', color: 'currentColor', ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
