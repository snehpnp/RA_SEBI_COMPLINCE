import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, 
  Save, 
  RotateCcw, 
  Copy, 
  Check, 
  Eye, 
  Code, 
  Search, 
  Info, 
  ShieldCheck, 
  Sparkles, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';

export interface EmailTemplateItem {
  type: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  variables: string[];
  variableLabels?: Record<string, string>;
  sampleVariables?: Record<string, string>;
  isCustomized?: boolean;
  updatedAt?: string | null;
}

export default function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('WELCOME_CLIENT');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch templates from API
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res: any = await api.getEmailTemplates();
      if (res && res.success && Array.isArray(res.data)) {
        setTemplates(res.data);
        const current = res.data.find((t: EmailTemplateItem) => t.type === selectedType) || res.data[0];
        if (current) {
          setSelectedType(current.type);
          setSubject(current.subject || '');
          setBody(current.body || '');
        }
      }
    } catch (err: any) {
      console.error('Failed to load email templates:', err);
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to load email templates' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const currentTemplate = templates.find(t => t.type === selectedType) || templates[0];

  const handleSelectTemplate = (item: EmailTemplateItem) => {
    setSelectedType(item.type);
    setSubject(item.subject || '');
    setBody(item.body || '');
    setStatusMessage(null);
  };

  const handleCopyOrInsertVariable = (variableKey: string) => {
    const varTag = `{{${variableKey}}}`;
    const textarea = bodyTextareaRef.current;

    if (textarea && viewMode === 'edit') {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = body;
      const newText = text.substring(0, start) + varTag + text.substring(end);
      setBody(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + varTag.length, start + varTag.length);
      }, 50);
    } else {
      navigator.clipboard.writeText(varTag);
    }

    setCopiedVar(varTag);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const handleSave = async () => {
    if (!subject.trim()) {
      setStatusMessage({ type: 'error', text: 'Email subject is required.' });
      return;
    }
    if (!body.trim()) {
      setStatusMessage({ type: 'error', text: 'Email body content is required.' });
      return;
    }

    try {
      setSaving(true);
      setStatusMessage(null);
      const res: any = await api.updateEmailTemplate(selectedType, {
        subject: subject.trim(),
        body: body.trim()
      });

      if (res && res.success) {
        setStatusMessage({ type: 'success', text: `Template "${currentTemplate?.name || selectedType}" saved successfully!` });
        // Update local state
        setTemplates(prev => prev.map(t => {
          if (t.type === selectedType) {
            return {
              ...t,
              subject: subject.trim(),
              body: body.trim(),
              isCustomized: true,
              updatedAt: new Date().toISOString()
            };
          }
          return t;
        }));
      } else {
        setStatusMessage({ type: 'error', text: res?.message || 'Failed to save template.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to save template.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Are you sure you want to restore the default SEBI-compliant content for "${currentTemplate?.name}"? Any modifications will be reverted.`)) {
      return;
    }

    try {
      setResetting(true);
      setStatusMessage(null);
      const res: any = await api.resetEmailTemplate(selectedType);
      if (res && res.success && res.data) {
        setSubject(res.data.subject || '');
        setBody(res.data.body || '');
        setStatusMessage({ type: 'success', text: `Template restored to standard default version.` });
        
        setTemplates(prev => prev.map(t => {
          if (t.type === selectedType) {
            return {
              ...t,
              subject: res.data.subject,
              body: res.data.body,
              isCustomized: false,
              updatedAt: null
            };
          }
          return t;
        }));
      } else {
        setStatusMessage({ type: 'error', text: res?.message || 'Failed to reset template.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to reset template.' });
    } finally {
      setResetting(false);
    }
  };

  // Render preview with sample variables substituted
  const renderPreviewContent = () => {
    if (!currentTemplate) return { subject: '', body: '' };

    const sampleVars = currentTemplate.sampleVariables || {};
    let renderedSubject = subject;
    let renderedBody = body;

    Object.entries(sampleVars).forEach(([k, v]) => {
      const reg = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g');
      renderedSubject = renderedSubject.replace(reg, v);
      renderedBody = renderedBody.replace(reg, v);
    });

    return {
      subject: renderedSubject,
      body: renderedBody
    };
  };

  const previewData = renderPreviewContent();

  const filteredTemplates = templates.filter(t => {
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || 
           t.type.toLowerCase().includes(q) || 
           t.description.toLowerCase().includes(q) ||
           (t.variables && t.variables.some(v => v.toLowerCase().includes(q)));
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading email templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                <Mail className="w-5 h-5 text-blue-300" />
              </div>
              <h2 className="text-xl font-bold">Automated Email Templates & Variables</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Dynamic Engine
              </span>
            </div>
            <p className="text-xs text-blue-200/80 max-w-2xl leading-relaxed">
              Customize subject lines and message content for all system-generated client emails. Insert dynamic variables (e.g. client name, OTP, invoice credentials) to personalize notifications while maintaining SEBI compliance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-200/70 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {templates.length} SEBI Templates Active
            </span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="ml-auto text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Main Grid: Sidebar Templates List + Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Templates Sidebar */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Email Templates ({filteredTemplates.length})
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search templates or variables..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredTemplates.map(item => {
              const isSelected = item.type === selectedType;
              return (
                <button
                  key={item.type}
                  onClick={() => handleSelectTemplate(item)}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${
                    isSelected 
                      ? 'bg-primary-50/70 dark:bg-primary-950/30 border-primary-500 dark:border-primary-600 shadow-sm' 
                      : 'bg-white dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {item.name}
                    </span>
                    {item.isCustomized ? (
                      <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Custom
                      </span>
                    ) : (
                      <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor & Preview Area */}
        <div className="lg:col-span-8 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          {currentTemplate && (
            <>
              {/* Template Title & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                      {currentTemplate.name}
                    </h3>
                    {currentTemplate.isCustomized ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                        Customized Content
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        SEBI Standard Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {currentTemplate.description}
                  </p>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                  <button
                    onClick={() => setViewMode('edit')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'edit'
                        ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Edit Template</span>
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'preview'
                        ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live Preview</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Variables Section */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                    Available Dynamic Variables (Click to Insert / Copy)
                  </span>
                  {copiedVar && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Inserted {copiedVar}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {currentTemplate.variables && currentTemplate.variables.map(varKey => {
                    const label = currentTemplate.variableLabels?.[varKey] || varKey;
                    return (
                      <button
                        key={varKey}
                        type="button"
                        onClick={() => handleCopyOrInsertVariable(varKey)}
                        title={`Click to insert {{${varKey}}} - ${label}`}
                        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/40 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                      >
                        <span className="text-primary-600 dark:text-primary-400 font-bold">{`{{${varKey}}}`}</span>
                        <span className="text-[10px] text-slate-400 font-sans group-hover:text-primary-600 dark:group-hover:text-primary-400">
                          ({label})
                        </span>
                        <Copy className="w-3 h-3 text-slate-400 group-hover:text-primary-600 opacity-60 group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editor Mode */}
              {viewMode === 'edit' ? (
                <div className="space-y-4">
                  {/* Subject Line */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Email Subject Line
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="e.g. Welcome to {{companyName}} — Your Account is Ready"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                    />
                  </div>

                  {/* Body Content */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Email Body Content
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Plain text with line breaks or HTML format supported
                      </span>
                    </div>
                    <textarea
                      ref={bodyTextareaRef}
                      rows={12}
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      placeholder="Enter email content with dynamic variables..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-sans leading-relaxed resize-y"
                    />
                  </div>
                </div>
              ) : (
                /* Live Preview Mode */
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-bold mr-2">Subject:</span>
                      <span className="text-slate-800 dark:text-slate-100 font-bold">{previewData.subject}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                      Sample Variables Injected
                    </span>
                  </div>

                  {/* Branded Email Preview Mockup */}
                  <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-inner bg-slate-50 dark:bg-slate-900 p-4 md:p-8 flex justify-center">
                    <div className="max-w-[560px] w-full bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden text-slate-800 font-sans text-xs">
                      {/* Gradient Header */}
                      <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-indigo-800 p-6 text-center text-white">
                        <div className="text-2xl mb-1">📩</div>
                        <h4 className="text-base font-bold text-white">{currentTemplate.name}</h4>
                        <p className="text-[11px] text-blue-200 mt-0.5">
                          {currentTemplate.sampleVariables?.companyName || 'Your Research Company'} • SEBI Registered RA
                        </p>
                      </div>

                      {/* Rendered Body */}
                      <div className="p-6 space-y-3 bg-white text-slate-700 leading-relaxed whitespace-pre-line text-xs">
                        {previewData.body}
                      </div>

                      {/* Compliance Footer */}
                      <div className="bg-slate-50 border-t border-slate-200 p-4 text-center text-[10px] text-slate-500">
                        <p className="mb-1">
                          This regulatory communication was issued in compliance with SEBI (Research Analysts) Regulations, 2014.
                        </p>
                        <p className="text-slate-400">Please do not reply directly to this automated email.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={resetting || saving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
                >
                  {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>Restore SEBI Default</span>
                </button>

                <div className="w-full sm:w-auto flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || resetting}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-500/20 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Template Changes</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
