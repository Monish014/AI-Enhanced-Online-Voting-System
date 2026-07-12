import React from 'react';

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
  xl: 'h-16 w-16 border-4',
};

export default function LoadingSpinner({
  size = 'md',
  color = 'primary',
  label = 'Loading...',
  className = '',
  fullScreen = false,
}) {
  const colorClass =
    color === 'white'
      ? 'border-white/30 border-t-white'
      : 'border-primary-200 border-t-primary-600';

  const spinner = (
    <div
      role="status"
      aria-label={label}
      className={`inline-flex flex-col items-center gap-3 ${className}`}
    >
      <div
        className={`rounded-full animate-spin ${sizes[size]} ${colorClass}`}
        aria-hidden="true"
      />
      {label && (
        <span className={`text-sm font-medium ${color === 'white' ? 'text-white/80' : 'text-slate-500'}`}>
          {label}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }
  return spinner;
}
