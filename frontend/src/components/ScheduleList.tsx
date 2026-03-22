import { useMemo } from 'react';
import ScheduleStripCard from './ScheduleStripCard';
import ScheduleEmptyStrip from './ScheduleEmptyStrip';
import ScheduleAddStrip from './ScheduleAddStrip';
import type { ScheduleEvent } from './scheduleTypes';
import { DASHBOARD_STRIP_EVENT_SLOTS } from '../utils/dashboardStripEvents';

function buildDashboardStripSlots(events: ScheduleEvent[]) {
  /** Events are pre-ordered (upcoming then past) by the dashboard parent. */
  const top = events.slice(0, DASHBOARD_STRIP_EVENT_SLOTS);
  const empties = DASHBOARD_STRIP_EVENT_SLOTS - top.length;
  const slots: Array<
    | { kind: 'event'; event: ScheduleEvent }
    | { kind: 'empty' }
    | { kind: 'add' }
  > = [
    ...top.map((event) => ({ kind: 'event' as const, event })),
    ...Array.from({ length: empties }, () => ({ kind: 'empty' as const })),
    { kind: 'add' as const },
  ];
  return slots;
}

type Props = {
  events: ScheduleEvent[];
  loading: boolean;
  error: string | null;
  onSelectEvent: (id: number) => void;
  /** Which gig gets full strip band tint (closest upcoming, non-done); others date-pill only */
  stripPrimaryEventId?: number | null;
  onAddDate?: () => void;
};

function ScheduleList({
  events,
  loading,
  error,
  onSelectEvent,
  stripPrimaryEventId = null,
  onAddDate,
}: Props) {
  const listClass = 'event-list event-list--strip-grid strip-row--input';

  const dashboardSlots = useMemo(() => buildDashboardStripSlots(events), [events]);

  if (loading) {
    return (
      <div className={listClass}>
        <div className="page-loading" style={{ padding: '1rem', gridColumn: '1 / -1' }}>
          Loading…
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={listClass}>
        <div className="page-status error" style={{ gridColumn: '1 / -1' }}>
          {error}
        </div>
      </div>
    );
  }
  if (!onAddDate) {
    return (
      <div className={listClass}>
        <div className="page-status" style={{ gridColumn: '1 / -1' }}>
          Missing add handler.
        </div>
      </div>
    );
  }

  return (
    <div className={listClass}>
      {dashboardSlots.map((slot, index) => {
        const key = slotKey(slot, index);
        const channelSlot = index + 1;
        if (slot.kind === 'event') {
          return (
            <div key={key}>
              <ScheduleStripCard
                event={slot.event}
                channelSlot={channelSlot}
                onSelectEvent={onSelectEvent}
                fullStripBandTint={stripPrimaryEventId != null && slot.event.id === stripPrimaryEventId}
                dimmed={slot.event.status.toLowerCase() === 'done'}
              />
            </div>
          );
        }
        if (slot.kind === 'empty') {
          return (
            <div key={key}>
              <ScheduleEmptyStrip channelSlot={channelSlot} />
            </div>
          );
        }
        return (
          <div key={key}>
            <ScheduleAddStrip onAddDate={onAddDate} channelSlot={channelSlot} />
          </div>
        );
      })}
    </div>
  );
}

function slotKey(
  slot: { kind: 'event'; event: ScheduleEvent } | { kind: 'empty' } | { kind: 'add' },
  index: number,
) {
  if (slot.kind === 'event') return `ev-${slot.event.id}`;
  if (slot.kind === 'empty') return `empty-${index}`;
  return 'add-date';
}

export default ScheduleList;
