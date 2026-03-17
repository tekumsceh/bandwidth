export const PHASES = [
  'Phase 0: Product definition',
  'Phase 1: Foundation',
  'Phase 2: Hubs + Navigation',
  'Phase 3: Band Ops',
  'Phase 4: Asset Modules',
  'Phase 5: Collaboration',
  'Phase 6: Hardening',
] as const;

export type TempPlanState = {
  approvedCoreRoadmap: boolean;
  completedPhases: string[];
  pendingDecisions: string[];
};

const STORAGE_KEY = 'bandwidth.tempPlanState.v1';

const DEFAULT_STATE: TempPlanState = {
  approvedCoreRoadmap: false,
  completedPhases: [],
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
      pendingDecisions: Array.isArray(parsed.pendingDecisions) ? parsed.pendingDecisions : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveTempPlanState(state: TempPlanState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

