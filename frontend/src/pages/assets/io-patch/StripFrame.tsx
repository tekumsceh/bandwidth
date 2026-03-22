import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export type StripFrameProps = {
  children: ReactNode;
  /** Dimmed / inactive strip (e.g. skipped channel). */
  skipped?: boolean;
  className?: string;
  style?: CSSProperties;
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'children'>;

/**
 * Renders `.strip-frame` — all column width, flex stack, border, and default background
 * come from `styles/strip/strip-base.css` + `:root` strip tokens. Use `className` for
 * context (`io-strip`, `date-strip`, …); use `style` only for per-instance tint (e.g. band color).
 */
export function StripFrame({ children, skipped, className = '', style, ...rest }: StripFrameProps) {
  return (
    <div
      className={['strip-frame', skipped ? 'skipped' : '', className].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}
