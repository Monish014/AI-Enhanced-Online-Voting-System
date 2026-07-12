import React, { useEffect, useRef } from 'react';

/**
 * Accessible confirmation modal with focus trap.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  confirmClass = 'btn-primary',
  onConfirm,
  onCancel,
  children,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up">
        <h2 id="modal-title" className="text-lg font-bold text-slate-900">{title}</h2>
        {message && <p className="text-slate-600 text-sm leading-relaxed">{message}</p>}
        {children}
        <div className="flex gap-3 pt-2">
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="flex-1 btn-secondary">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
