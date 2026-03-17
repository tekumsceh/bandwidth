import { useMemo, useState } from 'react';
import { FEATURE_FREEZE_ACTIVE } from '../../config/tempMode';
import { PHASES, loadTempPlanState, saveTempPlanState } from './planState';

type FeatureCandidate = {
  id: string;
  name: string;
  impact: number;
  urgency: number;
  complexity: number;
};

const DEFAULT_CANDIDATES: FeatureCandidate[] = [
  { id: 'hub', name: 'Hub foundation', impact: 5, urgency: 5, complexity: 4 },
  { id: 'band-ops', name: 'Band/member ops', impact: 5, urgency: 4, complexity: 4 },
  { id: 'assets', name: 'Gear/setlist/patch', impact: 4, urgency: 3, complexity: 4 },
];

function score(item: FeatureCandidate) {
  return item.impact * 2 + item.urgency - item.complexity;
}

function PlanExecution() {
  const initial = loadTempPlanState();
  const [approvedCoreRoadmap, setApprovedCoreRoadmap] = useState(initial.approvedCoreRoadmap);
  const [completedPhases, setCompletedPhases] = useState<string[]>(initial.completedPhases);
  const [pendingDecisions, setPendingDecisions] = useState<string[]>(initial.pendingDecisions);
  const ranked = useMemo(
    () => [...DEFAULT_CANDIDATES].sort((a, b) => score(b) - score(a)),
    [],
  );

  const freezeActive = FEATURE_FREEZE_ACTIVE && !approvedCoreRoadmap;

  const persist = (next: {
    approvedCoreRoadmap?: boolean;
    completedPhases?: string[];
    pendingDecisions?: string[];
  }) => {
    const state = {
      approvedCoreRoadmap:
        next.approvedCoreRoadmap !== undefined ? next.approvedCoreRoadmap : approvedCoreRoadmap,
      completedPhases: next.completedPhases || completedPhases,
      pendingDecisions: next.pendingDecisions || pendingDecisions,
    };
    saveTempPlanState(state);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Plan Execution</h1>
          <div className="page-header-sub">Temporary execution console with decision and priority gates.</div>
        </div>
      </header>

      <section className="event-detail-section">
        <h2>Feature freeze</h2>
        <p className="muted">
          {freezeActive
            ? 'Feature freeze is active. New features are blocked until core roadmap is built, tested, and approved.'
            : 'Feature freeze lifted for controlled expansion.'}
        </p>
        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          <button
            type="button"
            className="btn btn-action btn-secondary"
            onClick={() =>
              setApprovedCoreRoadmap((v) => {
                const next = !v;
                persist({ approvedCoreRoadmap: next });
                return next;
              })
            }
          >
            {approvedCoreRoadmap ? 'Re-enable freeze' : 'Mark core roadmap approved'}
          </button>
        </div>
      </section>

      <section className="event-detail-section" style={{ marginTop: '1rem' }}>
        <h2>Phase tracker</h2>
        <ul className="lineup-list">
          {PHASES.map((phase) => {
            const done = completedPhases.includes(phase);
            return (
              <li key={phase}>
                <span className="lineup-name">{phase}</span>
                <button
                  type="button"
                  className="btn btn-action btn-secondary"
                  onClick={() => {
                    const next = done
                      ? completedPhases.filter((p) => p !== phase)
                      : [...completedPhases, phase];
                    setCompletedPhases(next);
                    persist({ completedPhases: next });
                  }}
                >
                  {done ? 'Mark open' : 'Mark done'}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="event-detail-section" style={{ marginTop: '1rem' }}>
        <h2>Priority check</h2>
        <ul className="lineup-list">
          {ranked.map((item) => (
            <li key={item.id}>
              <span className="lineup-name">{item.name}</span>
              <span className="lineup-role">Priority score: {score(item)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="event-detail-section" style={{ marginTop: '1rem' }}>
        <h2>Pending decisions</h2>
        {pendingDecisions.length === 0 ? (
          <p className="muted">No open decisions.</p>
        ) : (
          <ul className="lineup-list">
            {pendingDecisions.map((d) => (
              <li key={d}>
                <span className="lineup-role">{d}</span>
                <button
                  type="button"
                  className="btn btn-action btn-secondary"
                  onClick={() => {
                    const next = pendingDecisions.filter((item) => item !== d);
                    setPendingDecisions(next);
                    persist({ pendingDecisions: next });
                  }}
                >
                  Resolve
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default PlanExecution;

