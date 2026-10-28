'use client';

import { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';

interface UserProfileDropdownProps {
  user: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    avatarUrl?: string;
  };
  onProfileClick?: () => void;
  onLogoutClick: () => void;
  badgeLabel?: string;
  badgeColor?: 'rose' | 'amber' | 'emerald' | 'indigo' | 'blue';
}

export default function UserProfileDropdown({
  user,
  onProfileClick,
  onLogoutClick,
  badgeLabel,
  badgeColor = 'rose'
}: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : (user?.name || 'User');

  const initial = (user?.firstName || user?.name || user?.role || 'U').trim().charAt(0).toUpperCase();

  const roleText = badgeLabel || user?.role || 'User';

  const badgeColorClasses = {
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
  }[badgeColor] || 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';

  const avatarGradient = {
    rose: 'from-rose-500 to-orange-600 shadow-[0_0_10px_rgba(244,63,94,0.35)]',
    amber: 'from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(251,191,36,0.35)]',
    emerald: 'from-emerald-500 to-teal-600 shadow-[0_0_10px_rgba(16,185,129,0.35)]',
    indigo: 'from-blue-500 to-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.35)]',
    blue: 'from-blue-500 to-sky-600 shadow-[0_0_10px_rgba(59,130,246,0.35)]',
  }[badgeColor] || 'from-rose-500 to-orange-600 shadow-[0_0_10px_rgba(244,63,94,0.35)]';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl border transition-all duration-200 outline-none ${
          isOpen
            ? 'bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/20 ring-2 ring-rose-500/20'
            : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5'
        }`}
        title="Account & Profile Menu"
        aria-expanded={isOpen}
      >
        <div className="relative shrink-0">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center font-black text-white text-sm tracking-wide`}>
            {initial}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
        </div>

        <div className="hidden sm:block text-left min-w-0">
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px] leading-tight">
            {displayName}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize truncate max-w-[120px] leading-tight mt-0.5 font-medium">
            {roleText.replace(/_/g, ' ')}
          </p>
        </div>

        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header Info */}
          <div className="p-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center font-black text-white text-base shrink-0`}>
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {displayName}
                </p>
                {user?.email && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {user.email}
                  </p>
                )}
                <div className="mt-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${badgeColorClasses}`}>
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    <span className="truncate">{roleText}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2 space-y-1">
            {onProfileClick && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onProfileClick();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>My Profile Settings</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogoutClick();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
