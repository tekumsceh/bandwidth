import { useParams } from 'react-router-dom';
import LegacyRoutePlaceholder from './LegacyRoutePlaceholder';

export default function EventDetail() {
  const { id } = useParams();
  return (
    <LegacyRoutePlaceholder
      title="Gig"
      body="This screen is not wired yet in the new console layout. Use the hub overview for now."
      refLabel={id ? `Date id #${id}` : undefined}
    />
  );
}
