import { FaMicrophone } from 'react-icons/fa';
import { resolveWedgeIcon, resolveIemIcon } from '../../../config/userIconSelection';

/** Handheld microphone - Font Awesome */
export function MicIcon({ size = 16 }: { size?: number }) {
  return <FaMicrophone size={size} aria-hidden />;
}

/** Wedge monitor - from user selection or default */
export function WedgeIcon({ size = 16 }: { size?: number }) {
  const Icon = resolveWedgeIcon();
  return <Icon size={size} aria-hidden />;
}

/** IEM body pack - from user selection or default */
export function IemIcon({ size = 16 }: { size?: number }) {
  const Icon = resolveIemIcon();
  return <Icon size={size} aria-hidden />;
}

export function StripDivider() {
  return <div className="strip-divider" aria-hidden />;
}
