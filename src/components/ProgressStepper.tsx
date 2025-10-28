"use client";

import { ProgressiveAnalysisState, getVisiblePhases, PHASE_CONFIGS } from "@/types/analysis";

interface ProgressStepperProps {
  state: ProgressiveAnalysisState;
  ticker: string;
}

export default function ProgressStepper({ state, ticker }: ProgressStepperProps) {
  const visiblePhases = getVisiblePhases();
  const completedPhases = visiblePhases.filter(
    (phase) => state.phases[phase].progress === 100 && !state.phases[phase].error
  );

  return (
    <div className="card p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Analyzing {ticker}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {state.elapsedTime}s elapsed • {Math.max(0, state.estimatedTimeRemaining - state.elapsedTime)}s remaining
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Overall Progress
            </span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {Math.round(state.overallProgress)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${state.overallProgress}%` }}
            />
          </div>
        </div>

        {/* Phases list */}
        <div className="space-y-4">
          {visiblePhases.map((phase, idx) => {
            const config = PHASE_CONFIGS[phase];
            const phaseStatus = state.phases[phase];
            const isActive = state.currentPhase === phase;
            const isCompleted = phaseStatus.progress === 100 && !phaseStatus.error;
            const hasError = !!phaseStatus.error;

            return (
              <div
                key={phase}
                className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : hasError
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Status icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5">
                  {hasError ? (
                    <span className="text-red-600 dark:text-red-400 text-lg">✕</span>
                  ) : isCompleted ? (
                    <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
                  ) : isActive ? (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-4 h-4 bg-slate-300 dark:bg-slate-600 rounded-full" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    {config.label}
                    {phaseStatus.duration && !isActive && (
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-2">
                        ({(phaseStatus.duration / 1000).toFixed(1)}s)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    {hasError ? phaseStatus.error : config.description}
                  </p>

                  {/* Mini progress bar for active phase */}
                  {isActive && !isCompleted && !hasError && (
                    <div className="mt-3 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${phaseStatus.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Step number */}
                <div className="flex-shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {idx + 1}/{visiblePhases.length}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer message */}
        {state.isComplete && !state.hasError && (
          <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              ✓ Analysis complete in {(state.elapsedTime).toFixed(1)}s
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
