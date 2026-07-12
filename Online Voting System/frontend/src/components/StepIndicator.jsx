import React from 'react';

/**
 * Accessible step progress indicator.
 * steps: [{ label: string }]
 * current: 0-indexed current step number
 */
export default function StepIndicator({ steps, current }) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol role="list" className="flex items-center justify-center gap-0">
        {steps.map((step, index) => {
          const isDone    = index < current;
          const isActive  = index === current;
          const isLast    = index === steps.length - 1;

          return (
            <li key={step.label} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                {/* Circle */}
                <div
                  aria-current={isActive ? 'step' : undefined}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    transition-all duration-300 ${
                      isDone
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                >
                  {isDone ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {/* Label */}
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isActive ? 'text-primary-700' : isDone ? 'text-green-600' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={`h-0.5 w-12 sm:w-20 mx-2 mb-5 rounded transition-all duration-300 ${
                    isDone ? 'bg-green-400' : 'bg-slate-200'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
