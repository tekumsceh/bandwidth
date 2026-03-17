import ScheduleCard from './ScheduleCard';
import Listing from './listing/Listing';

type ScheduleEvent = {
  id: number;
  band_color?: string | null;
  event_date: string;
  city: string | null;
  venue_name: string | null;
  soundcheck_time?: string | null;
  set_time?: string | null;
  status: string;
  description?: string | null;
  band_paid_at?: string | null;
};

type Props = {
  events: ScheduleEvent[];
  loading: boolean;
  error: string | null;
  filter: 'upcoming' | 'past' | 'all';
  onSelectEvent: (id: number) => void;
};

function ScheduleList({ events, loading, error, filter, onSelectEvent }: Props) {
  return (
    <Listing
      items={events}
      loading={loading}
      error={error}
      emptyMessage="No events for this filter."
      className="event-list"
      getKey={(ev) => ev.id}
      renderItem={(ev) => <ScheduleCard event={ev} filter={filter} onSelectEvent={onSelectEvent} />}
    />
  );
}

export default ScheduleList;

