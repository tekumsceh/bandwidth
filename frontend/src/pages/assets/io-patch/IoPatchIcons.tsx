import { createElement, type ComponentType } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import { resolveWedgeIcon, resolveIemIcon } from '../../../config/userIconSelection';

/** Handheld microphone - Font Awesome */
export function MicIcon({ size = 16 }: { size?: number }) {
  return <FaMicrophone size={size} aria-hidden />;
}

function renderResolvedIcon(Icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>, size: number) {
  return createElement(Icon, { size, 'aria-hidden': true });
}

/** Wedge monitor - from user selection or default */
export function WedgeIcon({ size = 16 }: { size?: number }) {
  return renderResolvedIcon(resolveWedgeIcon(), size);
}

/** IEM body pack - from user selection or default */
export function IemIcon({ size = 16 }: { size?: number }) {
  return renderResolvedIcon(resolveIemIcon(), size);
}

export function StripDivider() {
  return <div className="strip-divider" aria-hidden />;
}
