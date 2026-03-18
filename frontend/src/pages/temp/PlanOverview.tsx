import { useMemo } from 'react';
import { EXECUTION_QUEUE, PHASES, loadTempPlanState } from './planState';

function PlanOverview() {
  const state = loadTempPlanState();
  const completedCount = state.completedExecutionItems.length;
  const pct = useMemo(
    () => Math.round((completedCount / EXECUTION_QUEUE.length) * 100),
    [completedCount],
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Plan Overview</h1>
          <div className="page-header-sub">Temporary roadmap dashboard and milestone tracker.</div>
        </div>
      </header>

      <section className="event-detail-section">
        <h2>Progress</h2>
        <div style={{ marginBottom: '0.5rem' }}>
          <div
            style={{
              width: '100%',
              height: '10px',
              borderRadius: '999px',
              background: '#1f2937',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: '#f97316',
              }}
            />
          </div>
        </div>
        <p className="muted">{pct}% complete</p>
        <p className="muted">Completed execution items: {completedCount}/{EXECUTION_QUEUE.length}</p>
        <p className="muted">Pending decisions: {state.pendingDecisions.length}</p>
      </section>

      <section className="event-detail-section" style={{ marginTop: '1rem' }}>
        <h2>Phases</h2>
        <ul className="lineup-list">
          {PHASES.map((phase) => (
            <li key={phase}>
              <span className="lineup-name">
                {state.completedPhases.includes(phase) ? '✓' : '•'}
              </span>
              <span className="lineup-role">{phase}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default PlanOverview;

