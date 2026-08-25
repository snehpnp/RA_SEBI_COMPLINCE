"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string, title?: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useGlobalConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useGlobalConfirm must be used within a GlobalConfirmProvider');
  }
  return context;
};

export const GlobalConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions | string, title?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof opts === 'string') {
        setOptions({ message: opts, title });
      } else {
        setOptions(opts);
      }
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  };

  const handleConfirm = () => {
    if (resolvePromise) resolvePromise(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolvePromise) resolvePromise(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-500/10 mb-4">
              <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-500" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
              {options.title || 'Are you sure?'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {options.message}
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300 w-full"
              >
                {options.cancelText || 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-primary-500/20 w-full"
              >
                {options.confirmText || 'Yes, Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

