import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { FileText, Download } from 'lucide-react';

export default function AdminResourcesTab({ triggerAlert }: { triggerAlert: (msg: string, isError?: boolean) => void }) {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  const getFileUrl = (url: string) => {
    return api.getDownloadUrl(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/5 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Resources</h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">Download templates, formats, and other resources provided by the Super Admin.</p>
        
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
