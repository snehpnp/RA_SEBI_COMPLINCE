'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Loader2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ComplaintsCenter({ profile }: { profile: any }) {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComplaints = async () => {
    try {
      const res = await api.request('/client/complaints');
      // getComplaints currently returns the array directly since it's res.json(complaints) on the backend without wrapping in { data: [] } maybe? 
      // Let's handle both Array or { success, data } object
      if (Array.isArray(res)) {
        setComplaints(res);
      } else if (res && Array.isArray(res.data)) {
        setComplaints(res.data);
      } else {
        setComplaints([]);
      }
    } catch (err) {
      console.error('Failed to fetch complaints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleRaiseComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newDesc) return toast.error('Subject and Description are required.');
    setSubmitting(true);
    try {
      await api.request('/client/complaints', {
        method: 'POST',
        body: JSON.stringify({ 
          subject: newSubject, 
          description: newDesc,
          source: 'CLIENT_PORTAL'
        })
      });
      setIsCreateModalOpen(false);
      setNewSubject('');
      setNewDesc('');
      toast.success('Complaint raised successfully. Admin has been notified.');
      fetchComplaints();
    } catch (err: any) {
      toast.error(err.message || 'Failed to raise complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-premium-text animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-premium-warning" /> 
            Raise Complaints
          </h1>
          <p className="text-sm text-premium-text/60 mt-1">Register grievances or complaints regarding our services.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-premium-warning hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" /> Raise New Complaint
        </button>
      </div>

      <div className="bg-premium-cards border border-premium-border rounded-2xl p-4 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
            <Loader2 className="w-8 h-8 text-premium-warning animate-spin mb-4" />
            <p className="text-sm text-premium-text/60">Loading complaints...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-premium-text/40">
            <ShieldAlert className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No Complaints Found</p>
            <p className="text-sm">You haven't raised any complaints yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map(comp => (
              <div key={comp.id} className="p-6 rounded-2xl border border-premium-border bg-premium-bg/50 flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${comp.status === 'OPEN' ? 'bg-premium-warning/20 text-premium-warning border border-premium-warning/20' : 'bg-premium-success/20 text-premium-success border border-premium-success/20'}`}>
                      {comp.status}
                    </span>
                    <span className="text-xs text-premium-text/40 font-mono">ID: {comp.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{comp.subject}</h3>
                  <p className="text-sm text-premium-text/70 whitespace-pre-wrap">{comp.description}</p>
                  {comp.status === 'CLOSED' && comp.resolutionNote && (
                     <div className="mt-4 p-4 rounded-xl bg-premium-success/10 border border-premium-success/20">
                       <p className="text-xs font-bold text-premium-success uppercase mb-1">Resolution Note</p>
                       <p className="text-sm text-white">{comp.resolutionNote}</p>
                     </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 text-right text-xs text-premium-text/50 min-w-[150px]">
                  <p><strong>Raised On:</strong> <br/>{new Date(comp.createdAt).toLocaleString()}</p>
                  {comp.resolvedAt && <p className="mt-2"><strong>Resolved On:</strong> <br/>{new Date(comp.resolvedAt).toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-premium-cards border border-premium-border rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-premium-warning to-amber-600" />
            <h2 className="text-xl font-bold mb-2 text-premium-text">Raise a Complaint</h2>
            <p className="text-xs text-premium-text/60 mb-6">Please provide detailed information about your grievance. Our compliance officer will review and take necessary action.</p>
            
            <form onSubmit={handleRaiseComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-premium-text/70 uppercase mb-2">Subject *</label>
                <input required type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Briefly describe the issue" className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-sm focus:border-premium-warning focus:ring-1 focus:ring-premium-warning outline-none text-premium-text" />
              </div>
              <div>
                <label className="block text-xs font-bold text-premium-text/70 uppercase mb-2">Description *</label>
                <textarea required rows={5} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Provide full details here..." className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-sm focus:border-premium-warning focus:ring-1 focus:ring-premium-warning outline-none resize-none text-premium-text" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-6 py-3 bg-premium-bg border border-premium-border hover:bg-white/5 transition-colors rounded-xl font-bold text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-premium-warning hover:bg-amber-600 transition-colors text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 disabled:opacity-50">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
