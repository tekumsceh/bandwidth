import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsHubHref } from '../config/navigation';

type Props = {
  label?: string;
  fallbackTo?: string;
  className?: string;
  onBeforeBack?: () => boolean | Promise<boolean>;
};

function BackNavLink({ label = 'Back', fallbackTo = eventsHubHref('dashboard'), className = 'back-nav-link', onBeforeBack }: Props) {
  const navigate = useNavigate();

  const onClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onBeforeBack) {
      const allowed = await Promise.resolve(onBeforeBack());
      if (!allowed) return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackTo);
  };

  return (
    <a href={fallbackTo} className={className} onClick={onClick}>
      ← {label}
    </a>
  );
}

export default BackNavLink;
