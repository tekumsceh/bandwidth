type DateContext = {
  event_date: string | Date;
  status: string;
};

function toDateOnly(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function getLifecyclePhase(dateCtx: DateContext): 'draft' | 'confirmed' | 'locked' | 'settled' {
  const status = String(dateCtx.status || '').toLowerCase();
  if (status === 'done') return 'settled';

  const today = toDateOnly(new Date());
  const eventDay = toDateOnly(new Date(dateCtx.event_date));
  if (eventDay <= today) return 'locked';

  if (status === 'confirmed' || status === 'postponed') return 'confirmed';
  return 'draft';
}

export function canEditByLifecyclePhase(
  phase: ReturnType<typeof getLifecyclePhase>,
  action:
    | 'plan_edit'
    | 'incoming'
    | 'member_allocation'
    | 'expense'
    | 'member_paid'
    | 'settlement_adjustment',
) {
  if (phase === 'settled') {
    return action === 'settlement_adjustment';
  }
  if (phase === 'locked') {
    return action === 'expense' || action === 'member_paid' || action === 'settlement_adjustment';
  }
  // draft + confirmed
  return true;
}

