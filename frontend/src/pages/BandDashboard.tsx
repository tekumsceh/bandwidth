import { useParams } from 'react-router-dom';
import LegacyRoutePlaceholder from './LegacyRoutePlaceholder';

export default function BandDashboard() {
  const { id } = useParams();
  return (
    <LegacyRoutePlaceholder
      title="Band"
      body="Band overview in this layout is not available yet."
      refLabel={id ? `Band id #${id}` : undefined}
    />
  );
}
