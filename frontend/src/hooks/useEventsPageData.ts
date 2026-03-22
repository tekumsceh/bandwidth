import { useCallback, useState } from 'react';
import type { BandOption, EventsPagePayload, UpcomingEvent } from '../types';
import { apiUrl } from '../config/api';
import { fetchJsonOk } from '../utils/apiJson';
import { toErrorMessage } from '../utils/toErrorMessage';

export function useEventsPageData() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [bandOptions, setBandOptions] = useState<BandOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (params?: {
      view?: 'schedule' | 'all';
      timeline?: 'past' | 'upcoming' | 'all';
      band?: 'all' | number;
      archive?: boolean;
    }) => {
      const query = new URLSearchParams();
      query.set('view', params?.view === 'all' ? 'all' : 'schedule');
      if (params?.timeline) query.set('timeline', params.timeline);
      if (params?.band && params.band !== 'all') query.set('bandId', String(params.band));
      if (params?.archive) query.set('archive', '1');
      const url = `${apiUrl('/api/pages/events')}${query.toString() ? `?${query.toString()}` : ''}`;

      setLoading(true);
      setError(null);
      try {
        const json = await fetchJsonOk<EventsPagePayload>(url, undefined, 'Failed to load events page');
        setEvents(json.schedule || []);
        setBandOptions(json.bands || []);
      } catch (e: unknown) {
        setError(toErrorMessage(e, 'Failed to load events page'));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    events,
    bandOptions,
    loading,
    error,
    refresh,
  };
}
