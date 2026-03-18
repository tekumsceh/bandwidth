export const PHASES = [
  'Phase 0: Product definition',
  'Phase 1: Foundation',
  'Phase 2: Hubs + Navigation',
  'Phase 3: Band Ops',
  'Phase 4: Asset Modules',
  'Phase 5: Collaboration',
  'Phase 6: Hardening',
] as const;

export const EXECUTION_QUEUE = [
  'Step 1: Sidebar/page map constants',
  'Step 2: RBAC guard hardening',
  'Step 3: Auth/session scaffolding',
  'Step 4: Auth/session schema migration verification',
  'Step 5: Session-first identity cutover',
  'Step 6: Page contract locking (/api/pages/*)',
  'Step 7: Events URL-driven filters',
  'Step 8: Band page shared filter/listing',
  'Step 9: Lifecycle lock enforcement on money mutations',
  'Step 10: Regression tests (RBAC/lifecycle/session)',
  'Step 11: Stability gate + final-pass prep',
] as const;

export type TempPlanState = {
  approvedCoreRoadmap: boolean;
  completedPhases: string[];
  completedExecutionItems: string[];
  pendingDecisions: string[];
};

const STORAGE_KEY = 'bandwidth.tempPlanState.v1';

const DEFAULT_STATE: TempPlanState = {
  approvedCoreRoadmap: false,
  completedPhases: [],
  completedExecutionItems: EXECUTION_QUEUE.slice(0, 10),
  pendingDecisions: [
    'Confirm hub IA grouping',
    'Confirm auth rollout order',
    'Confirm sharing/email provider',
  ],
};

export function loadTempPlanState(): TempPlanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as TempPlanState;
    return {
      approvedCoreRoadmap: Boolean(parsed.approvedCoreRoadmap),
      completedPhases: Array.isArray(parsed.completedPhases) ? parsed.completedPhases : [],
      completedExecutionItems: Array.isArray(parsed.completedExecutionItems)
        ? parsed.completedExecutionItems
        : DEFAULT_STATE.completedExecutionItems,
      pendingDecisions: Array.isArray(parsed.pendingDecisions) ? parsed.pendingDecisions : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveTempPlanState(state: TempPlanState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

