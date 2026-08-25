'use client';
import { useState, useEffect } from 'react';
import { Save, Trash2, Link, FileText, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import { useGlobalConfirm } from '../GlobalConfirmProvider';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
const CKEditor = dynamic(() => import('@ckeditor/ckeditor5-react').then(mod => mod.CKEditor), { ssr: false });
let ClassicEditor: any;
if (typeof window !== 'undefined') {
  ClassicEditor = require('@ckeditor/ckeditor5-build-classic');
}

interface CustomPage {
  id: string;
  title: string;
  slug: string;
  type: 'CONTENT' | 'URL';
  content?: string | null;
  externalUrl?: string | null;
  isSystem: boolean;
  status: string;
}

interface Props {
  pageSlug: string;
  onPagesUpdate: (pages: any[]) => void;
  readOnly?: boolean;
}

export default function PagesManagement({ pageSlug, onPagesUpdate, readOnly = false }: Props) {
  const { confirm } = useGlobalConfirm();
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<CustomPage>>({
    type: 'CONTENT',
    status: 'ACTIVE',
    title: '',
    slug: '',
    content: '',
    externalUrl: ''
  });

  const fetchPages = async () => {
    try {
      const res = await api.request('/admin/pages');
      if (res.success) {
        setPages(res.data);
        onPagesUpdate(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (pageSlug === 'new') {
      setFormData({ type: 'CONTENT', status: 'ACTIVE', title: '', slug: '', content: '', externalUrl: '' });
    } else if (pages.length > 0) {
      const p = pages.find(p => p.slug === pageSlug);
      if (p) {
        setFormData(p);
      }
    }
  }, [pageSlug, pages]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const confirmed = await confirm('Are you sure you want to save these changes?', 'Confirm Save');
    if (!confirmed) return;
    setSaving(true);
    try {
      const res = await api.request('/admin/pages', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.success) {
        toast.success('Page saved successfully!');
        fetchPages();
      } else {
        toast(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    try {
      const res = await api.request(`/admin/pages/${id}`, { method: 'DELETE' });
      if (res.success) {
        toast.success('Page deleted successfully');
        fetchPages();
      } else {
        toast(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete page');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading page content...</div>;
  }

  if (readOnly) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {formData.title || 'Policy Document'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">Official Governance & Policy Document</p>
          </div>
          {formData.type === 'URL' && formData.externalUrl && (
            <a 
              href={formData.externalUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-md shadow-primary-500/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Document URL</span>
            </a>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
          {formData.type === 'URL' ? (
            <div className="text-center py-12 space-y-4">
              <Link className="w-12 h-12 text-primary-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">External Document Link</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">This policy document is hosted externally. Click below to view the original document.</p>
              {formData.externalUrl && (
                <a 
                  href={formData.externalUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-xs transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View External Document ({formData.externalUrl})</span>
                </a>
              )}
            </div>
          ) : (
            <div 
              className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-primary-600 text-slate-800 dark:text-slate-200"
              dangerouslySetInnerHTML={{ __html: formData.content || '<p class="text-slate-400">No content available for this policy document.</p>' }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <form id="page-form" onSubmit={handleSave}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {formData.id ? 'Edit Page' : 'Create New Page'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">Configure your policy or custom page.</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-3">
            {formData.id && !formData.isSystem && (
              <button 
                type="button"
                onClick={() => handleDelete(formData.id!)}
                className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-xl transition font-medium flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
            
            {/* Top-Level Status Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={async () => {
                  const confirmed = await confirm('Are you sure you want to set this page as Active?', 'Confirm Action');
                  if (confirmed) setFormData({ ...formData, status: 'ACTIVE' });
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center space-x-1.5 transition ${ formData.status === 'ACTIVE' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300' }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Active</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  const confirmed = await confirm('Are you sure you want to set this page as Inactive?', 'Confirm Action');
                  if (confirmed) setFormData({ ...formData, status: 'INACTIVE' });
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center space-x-1.5 transition ${ formData.status === 'INACTIVE' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300' }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Inactive</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition font-bold shadow-lg shadow-primary-500/20 flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Page'}</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Page Title *</label>
              <input
                type="text"
                required
                value={formData.title || ''}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormData({ 
                    ...formData, 
                    title, 
                    slug: (!formData.id || !formData.isSystem) ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : formData.slug 
                  });
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="e.g. Refund Policy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">URL Slug *</label>
              <input
                type="text"
                required
                readOnly={formData.isSystem}
                value={formData.slug || ''}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className={`w-full border rounded-xl px-4 py-3 outline-none ${formData.isSystem ? 'bg-slate-100 dark:bg-slate-800/50 border-transparent text-slate-500 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500'}`}
                placeholder="e.g. refund-policy"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Page Type *</label>
            <div className="flex items-center space-x-4">
              <label className={`flex items-center space-x-2 px-4 py-3 rounded-xl border cursor-pointer transition ${formData.type === 'CONTENT' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                <input type="radio" name="pageType" value="CONTENT" checked={formData.type === 'CONTENT'} onChange={() => setFormData({ ...formData, type: 'CONTENT' })} className="hidden" />
                <FileText className="w-5 h-5" />
                <span className="font-semibold">Rich Text Content</span>
              </label>
              <label className={`flex items-center space-x-2 px-4 py-3 rounded-xl border cursor-pointer transition ${formData.type === 'URL' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                <input type="radio" name="pageType" value="URL" checked={formData.type === 'URL'} onChange={() => setFormData({ ...formData, type: 'URL' })} className="hidden" />
                <Link className="w-5 h-5" />
                <span className="font-semibold">External URL</span>
              </label>
            </div>
          </div>

          {formData.type === 'URL' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">External URL *</label>
              <input
                type="url"
                required
                value={formData.externalUrl || ''}
                onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="https://example.com/document.pdf"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Page Content *</label>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden [&_.ck-editor\_\_editable]:min-h-[300px]">
                <CKEditor
                  editor={ClassicEditor as any}
                  data={formData.content || ''}
                  onChange={(event, editor) => {
                    const data = editor.getData();
                    setFormData({ ...formData, content: data });
                  }}
                  config={{
                    toolbar: [
                      'heading', '|',
                      'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
                      'outdent', 'indent', '|',
                      'blockQuote', 'insertTable', 'undo', 'redo'
                    ]
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Use the editor above to format your page content.</p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
