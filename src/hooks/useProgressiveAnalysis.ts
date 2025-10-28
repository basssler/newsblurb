/**
 * Hook for managing progressive analysis state and phase transitions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AnalysisPhase,
  ProgressiveAnalysisState,
  createInitialAnalysisState,
  updatePhaseStatus,
  PHASE_CONFIGS,
  getTotalEstimatedTime,
  getCriticalPhases,
} from '@/types/analysis';

export function useProgressiveAnalysis() {
  const [state, setState] = useState<ProgressiveAnalysisState>(createInitialAnalysisState());
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate overall progress based on completed phases
  const calculateOverallProgress = useCallback((phases: ProgressiveAnalysisState['phases']): number => {
    const visiblePhases = Object.values(phases).filter(
      (p) => p.phase !== 'idle' && p.phase !== 'complete' && p.phase !== 'error'
    );

    if (visiblePhases.length === 0) return 0;

    const totalProgress = visiblePhases.reduce((sum, p) => sum + p.progress, 0);
    return Math.round(totalProgress / visiblePhases.length);
  }, []);

  // Update timer
  useEffect(() => {
    if (state.currentPhase === 'idle' || state.isComplete) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setState((prev) => {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        const totalEstimated = getTotalEstimatedTime();
        const remaining = Math.max(0, totalEstimated - elapsed);

        return {
          ...prev,
          elapsedTime: elapsed,
          estimatedTimeRemaining: remaining,
        };
      });
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.currentPhase, state.isComplete]);

  /**
   * Start analysis
   */
  const startAnalysis = useCallback(() => {
    startTimeRef.current = Date.now();
    setState(createInitialAnalysisState());
    setState((prev) => ({
      ...prev,
      currentPhase: 'fetching',
      phases: {
        ...prev.phases,
        fetching: updatePhaseStatus('fetching', { startTime: Date.now(), progress: 10 }),
      },
    }));
  }, []);

  /**
   * Complete a phase
   */
  const completePhase = useCallback((phase: AnalysisPhase, duration?: number) => {
    setState((prev) => {
      const endTime = Date.now();
      const updatedPhases = {
        ...prev.phases,
        [phase]: updatePhaseStatus(phase, { endTime, progress: 100 }),
      };

      const overallProgress = calculateOverallProgress(updatedPhases);

      return {
        ...prev,
        phases: updatedPhases,
        overallProgress,
      };
    });
  }, [calculateOverallProgress]);

  /**
   * Move to next phase
   */
  const nextPhase = useCallback((nextPhase: AnalysisPhase) => {
    setState((prev) => ({
      ...prev,
      currentPhase: nextPhase,
      phases: {
        ...prev.phases,
        [nextPhase]: updatePhaseStatus(nextPhase, { startTime: Date.now(), progress: 10 }),
      },
    }));
  }, []);

  /**
   * Update phase progress
   */
  const updatePhaseProgress = useCallback((phase: AnalysisPhase, progress: number) => {
    setState((prev) => {
      const updatedPhases = {
        ...prev.phases,
        [phase]: {
          ...prev.phases[phase],
          progress: Math.min(100, Math.max(0, progress)),
        },
      };

      const overallProgress = calculateOverallProgress(updatedPhases);

      return {
        ...prev,
        phases: updatedPhases,
        overallProgress,
      };
    });
  }, [calculateOverallProgress]);

  /**
   * Set error on phase
   */
  const setPhaseError = useCallback((phase: AnalysisPhase, error: string) => {
    setState((prev) => ({
      ...prev,
      phases: {
        ...prev.phases,
        [phase]: {
          ...prev.phases[phase],
          error,
          progress: 0,
        },
      },
      hasError: true,
    }));
  }, []);

  /**
   * Complete entire analysis
   */
  const completeAnalysis = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentPhase: 'complete',
      isComplete: true,
      overallProgress: 100,
      phases: {
        ...prev.phases,
        complete: updatePhaseStatus('complete', { endTime: Date.now(), progress: 100 }),
      },
    }));
  }, []);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState(createInitialAnalysisState());
  }, []);

  /**
   * Check if we can show data (critical phases complete)
   */
  const canShowData = useCallback((): boolean => {
    const criticalPhases = getCriticalPhases();
    return criticalPhases.every((phase) => state.phases[phase].progress === 100 && !state.phases[phase].error);
  }, [state.phases]);

  /**
   * Check if analysis is still in progress
   */
  const isLoading = useCallback((): boolean => {
    return state.currentPhase !== 'idle' && state.currentPhase !== 'complete' && !state.hasError;
  }, [state.currentPhase, state.hasError]);

  return {
    state,
    startAnalysis,
    completePhase,
    nextPhase,
    updatePhaseProgress,
    setPhaseError,
    completeAnalysis,
    reset,
    canShowData,
    isLoading,
  };
}
