'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface RichTextEditorProps {
  data: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  config?: any;
  className?: string;
  disabled?: boolean;
}

export default function RichTextEditor({
  data,
  onChange,
  placeholder,
  rows = 6,
  config,
  className = '',
  disabled = false
}: RichTextEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const editorComponents = useRef<{
    CKEditor: any;
    ClassicEditor: any;
  } | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let isMounted = true;
    setHasError(false);

    Promise.all([
      import('@ckeditor/ckeditor5-react'),
      import('@ckeditor/ckeditor5-build-classic')
    ])
      .then(([ckReact, ckClassic]) => {
        if (!isMounted) return;
        editorComponents.current = {
          CKEditor: ckReact.CKEditor || ckReact.default?.CKEditor || ckReact.default,
          ClassicEditor: ckClassic.default || ckClassic
        };
        setEditorReady(true);
        setHasError(false);
      })
      .catch((err) => {
        console.error('Failed to load CKEditor dynamically:', err);
        if (isMounted) {
          setHasError(true);
          setEditorReady(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isClient, retryKey]);

  if (!isClient || (!editorReady && !hasError)) {
    return (
      <div className={`w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-4 flex items-center justify-center space-x-2 text-slate-400 text-xs ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin text-primary-500" />
        <span>Loading Editor...</span>
      </div>
    );
  }

  if (hasError || !editorComponents.current) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg text-amber-700 dark:text-amber-300 text-xs">
          <span className="flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Rich text editor failed to load chunk. Using fallback text editor.</span>
          </span>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="underline font-semibold hover:text-amber-900 dark:hover:text-amber-100 flex items-center space-x-1 ml-2"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
        <textarea
          value={data || ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl py-3 px-4 text-xs font-mono focus:border-primary-500 outline-none transition"
        />
      </div>
    );
  }

  const { CKEditor, ClassicEditor } = editorComponents.current;

  return (
    <div className={`text-black bg-white rounded-xl overflow-hidden border border-slate-300 dark:border-white/10 shadow-inner ${className}`}>
      <CKEditor
        editor={ClassicEditor}
        data={data || ''}
        disabled={disabled}
        config={config}
        onChange={(_event: any, editor: any) => {
          const content = editor.getData();
          onChange(content);
        }}
      />
    </div>
  );
}
