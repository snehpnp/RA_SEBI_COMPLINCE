'use client';

import { useEffect } from 'react';
import { AlertTriangle, Trash2, X, CheckCircle, Info, ShieldAlert } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const VARIANT_MAP: Record<ConfirmVariant, {
  border: string;
  iconBg: string;
  iconColor: string;
  confirmBtn: string;
  Icon: React.ElementType;
}> = {
  danger: {
    border: 'border-rose-500/30',
    iconBg: 'bg-rose-500/15',
    iconColor: 'text-rose-600 dark:text-rose-400',
    confirmBtn: 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500/40',
    Icon: Trash2,
  },
  warning: {
    border: 'border-amber-500/30',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
    confirmBtn: 'bg-amber-600 hover:bg-amber-500 focus:ring-amber-500/40',
    Icon: AlertTriangle,
  },
  info: {
    border: 'border-blue-500/30',
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmBtn: 'bg-blue-600 hover:bg-blue-500 focus:ring-blue-500/40',
    Icon: Info,
  },
  success: {
    border: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    confirmBtn: 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500/40',
    Icon: CheckCircle,
  },
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Yes, Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const v = VARIANT_MAP[variant];
  const Icon = v.Icon;

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog box */}
      <div
        className={`
          relative w-full max-w-sm bg-white dark:bg-slate-900 border ${v.border}
          rounded-2xl shadow-2xl overflow-hidden
          animate-in fade-in zoom-in-95 duration-200
        `}
      >
        {/* Top accent line */}
        <div className={`h-1 w-full ${v.confirmBtn.split(' ')[0]}`} />

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${v.iconBg} flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${v.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
              <div className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{message}</div>
            </div>
            <button
              onClick={onCancel}
              className="text-slate-500 hover:text-slate-900 dark:text-white transition flex-shrink-0 -mt-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-300 dark:border-white/5" />

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-400 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`
                px-5 py-2 text-xs font-bold text-slate-900 dark:text-white rounded-xl transition
                focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center gap-2 ${v.confirmBtn}
              `}
            >
              {loading ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
              ) : (
                <CheckCircle className="h-3.5 w-3.5" />
              )}
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
