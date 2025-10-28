/**
 * Progressive analysis phase types and status tracking
 */

export type AnalysisPhase = 'idle' | 'fetching' | 'analyzing' | 'explaining' | 'macro' | 'complete' | 'error';

export interface PhaseStatus {
  phase: AnalysisPhase;
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: string;
  progress: number; // 0-100
}

export interface ProgressiveAnalysisState {
  currentPhase: AnalysisPhase;
  phases: Record<AnalysisPhase, PhaseStatus>;
  overallProgress: number; // 0-100
  elapsedTime: number; // seconds
  estimatedTimeRemaining: number; // seconds
  isComplete: boolean;
  hasError: boolean;
}

export interface PhaseConfig {
  phase: AnalysisPhase;
  label: string;
  description: string;
  estimatedDuration: number; // seconds
  critical: boolean; // If true, analysis waits for completion
  order: number; // Execution order
}

export const PHASE_CONFIGS: Record<AnalysisPhase, PhaseConfig> = {
  idle: {
    phase: 'idle',
    label: 'Ready',
    description: 'Waiting to start analysis',
    estimatedDuration: 0,
    critical: false,
    order: 0,
  },
  fetching: {
    phase: 'fetching',
    label: 'Fetching market data',
    description: 'Retrieving price history and fundamentals',
    estimatedDuration: 2,
    critical: true,
    order: 1,
  },
  analyzing: {
    phase: 'analyzing',
    label: 'Analyzing technicals',
    description: 'Calculating indicators (RSI, SMA, ATR)',
    estimatedDuration: 1,
    critical: true,
    order: 2,
  },
  explaining: {
    phase: 'explaining',
    label: 'Generating AI insights',
    description: 'Claude is analyzing the stock',
    estimatedDuration: 3,
    critical: false, // Non-critical: analysis works without this
    order: 3,
  },
  macro: {
    phase: 'macro',
    label: 'Loading macro analysis',
    description: 'Fetching correlations and market regime',
    estimatedDuration: 2,
    critical: false, // Non-critical: analysis works without this
    order: 4,
  },
  complete: {
    phase: 'complete',
    label: 'Complete',
    description: 'Analysis finished',
    estimatedDuration: 0,
    critical: false,
    order: 5,
  },
  error: {
    phase: 'error',
    label: 'Error',
    description: 'Analysis encountered an error',
    estimatedDuration: 0,
    critical: false,
    order: 6,
  },
};

/**
 * Get phases that should be shown in progress stepper
 */
export function getVisiblePhases(): AnalysisPhase[] {
  return ['fetching', 'analyzing', 'explaining', 'macro'];
}

/**
 * Get critical phases that block completion
 */
export function getCriticalPhases(): AnalysisPhase[] {
  return Object.values(PHASE_CONFIGS)
    .filter((config) => config.critical && config.phase !== 'idle' && config.phase !== 'complete' && config.phase !== 'error')
    .sort((a, b) => a.order - b.order)
    .map((config) => config.phase);
}

/**
 * Calculate total estimated time for all phases
 */
export function getTotalEstimatedTime(): number {
  return getVisiblePhases().reduce((total, phase) => total + PHASE_CONFIGS[phase].estimatedDuration, 0);
}

/**
 * Create initial analysis state
 */
export function createInitialAnalysisState(): ProgressiveAnalysisState {
  const phases: Record<AnalysisPhase, PhaseStatus> = {
    idle: { phase: 'idle', startTime: 0, progress: 0 },
    fetching: { phase: 'fetching', startTime: 0, progress: 0 },
    analyzing: { phase: 'analyzing', startTime: 0, progress: 0 },
    explaining: { phase: 'explaining', startTime: 0, progress: 0 },
    macro: { phase: 'macro', startTime: 0, progress: 0 },
    complete: { phase: 'complete', startTime: 0, progress: 100 },
    error: { phase: 'error', startTime: 0, progress: 0 },
  };

  return {
    currentPhase: 'idle',
    phases,
    overallProgress: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: getTotalEstimatedTime(),
    isComplete: false,
    hasError: false,
  };
}

/**
 * Update phase with timing info
 */
export function updatePhaseStatus(
  phase: AnalysisPhase,
  status: Partial<PhaseStatus>
): PhaseStatus {
  const config = PHASE_CONFIGS[phase];
  const startTime = status.startTime ?? Date.now();
  const endTime = status.endTime;

  return {
    phase,
    startTime,
    endTime,
    duration: endTime ? endTime - startTime : undefined,
    error: status.error,
    progress: status.progress ?? (endTime ? 100 : 0),
  };
}
