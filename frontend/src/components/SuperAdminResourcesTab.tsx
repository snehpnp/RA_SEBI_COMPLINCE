import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Upload, Trash2, FileText, Download } from 'lucide-react';

export default function SuperAdminResourcesTab({ triggerAlert }: { triggerAlert: (msg: string, isError?: boolean) => void }) {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await api.getResources();
      if (res.success) {
        setResources(res.data);
      }
    } catch (err: any) {
      triggerAlert(err.message || 'Failed to fetch resources', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || !file) {
      triggerAlert('Please provide title, category, and a file.', true);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('file', file);

      const res = await api.uploadResource(formData);
      if (res.success) {
        triggerAlert('Resource uploaded successfully!');
        setTitle('');
        setCategory('');
        setFile(null);
        const fileInput = document.getElementById('resourceFileInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchResources();
      } else {
        triggerAlert(res.message || 'Failed to upload resource', true);
      }
    } catch (err: any) {
      triggerAlert(err.message || 'Failed to upload resource', true);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      const res = await api.deleteResource(id);
      if (res.success) {
        triggerAlert('Resource deleted successfully!');
        fetchResources();
      } else {
        triggerAlert(res.message || 'Failed to delete resource', true);
      }
    } catch (err: any) {
      triggerAlert(err.message || 'Failed to delete resource', true);
    }
  };

  const getFileUrl = (url: string) => {
    return api.getDownloadUrl(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Upload New Resource</h3>
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Agreement Document"
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-4 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-4 text-sm text-slate-900 dark:text-white"
            >
              <option value="">Select Category</option>
              <option value="Agreement">Agreement</option>
              <option value="SEBI T&C">SEBI T&C</option>
              <option value="Audit Report Format">Audit Report Format</option>
              <option value="Periodic Report Format">Periodic Report Format</option>
              <option value="Compliance Matrix">Compliance Matrix</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">File</label>
            <input 
              id="resourceFileInput"
              type="file" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-600 dark:text-primary-400 hover:file:bg-primary-500/20"
            />
          </div>
          <div>
            <button 
              type="submit" 
              disabled={uploading}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Manage Resources</h3>
        {loading ? (
          <p className="text-slate-600 dark:text-slate-400">Loading resources...</p>
        ) : resources.length === 0 ? (
          <p className="text-slate-500 text-sm italic">No resources found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((res: any) => (
              <div key={res.id} className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-white/5 rounded-xl p-4 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-slate-900 dark:text-white font-medium text-sm line-clamp-1" title={res.title}>{res.title}</h4>
                      <span className="text-xs text-slate-600 dark:text-slate-400">{res.category}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(res.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-300 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-auto pt-4 border-t border-slate-300 dark:border-white/5">
                  <a href={getFileUrl(res.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center space-x-2 w-full text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 py-2.5 rounded-xl transition shadow-lg shadow-primary-600/20">
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
