'use client';

import { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit2, Check, X, Trash2, Power, PowerOff, Loader2, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';

export interface OccupationItem {
  id: string;
  _id?: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  isDefault: boolean;
  createdAt?: string;
}

export default function OccupationsManager() {
  const [occupations, setOccupations] = useState<OccupationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add state
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Toggling status state
  const [togglingId, setTogglingId] = useState<string | null>(null);
  // Deleting state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchOccupations = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminOccupations();
      if (res.success && Array.isArray(res.data)) {
        setOccupations(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load occupations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOccupations();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim().length < 2) {
      toast.error('Please enter a valid occupation title (min 2 characters).');
      return;
    }

    setAdding(true);
    try {
      const res = await api.createOccupation({ name: newName.trim() });
      if (res.success) {
        toast.success(`Occupation "${newName.trim()}" added successfully!`);
        setNewName('');
        fetchOccupations();
      } else {
        toast.error(res.message || 'Failed to add occupation.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add occupation.');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (item: OccupationItem) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim() || editingName.trim().length < 2) {
      toast.error('Title must be at least 2 characters.');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await api.updateOccupation(id, { name: editingName.trim() });
      if (res.success) {
        toast.success('Occupation title updated successfully!');
        setEditingId(null);
        setEditingName('');
        fetchOccupations();
      } else {
        toast.error(res.message || 'Failed to update occupation.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update occupation.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (item: OccupationItem) => {
    setTogglingId(item.id);
    try {
      const res = await api.toggleOccupationStatus(item.id);
      if (res.success) {
        const nextStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        toast.success(`"${item.name}" marked as ${nextStatus}!`);
        setOccupations(prev =>
          prev.map(o => (o.id === item.id ? { ...o, status: nextStatus } : o))
        );
      } else {
        toast.error(res.message || 'Failed to change status.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to change status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (item: OccupationItem) => {
    if (!confirm(`Are you sure you want to delete occupation "${item.name}"?`)) return;

    setDeletingId(item.id);
    try {
      const res = await api.deleteOccupation(item.id);
      if (res.success) {
        toast.success(`Occupation "${item.name}" removed successfully!`);
        setOccupations(prev => prev.filter(o => o.id !== item.id));
      } else {
        toast.error(res.message || 'Failed to delete occupation.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete occupation.');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = occupations.filter(o =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary-500" />
              Manage Occupations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Create and configure occupation choices available in Client Registration and Signup dropdowns.
            </p>
          </div>
          <button
            onClick={fetchOccupations}
            disabled={loading}
            className="self-start sm:self-auto p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Add New Occupation Form */}
        <form onSubmit={handleAdd} className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Briefcase className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Enter new occupation title (e.g. Architect, CA, Trader...)"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-primary-500/20 transition whitespace-nowrap"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>Add Occupation</span>
          </button>
        </form>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search occupations..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total: <strong>{filtered.length}</strong> occupation(s)
          </span>
        </div>

        {/* Occupations Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase text-[10px] tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Occupation Title</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary-500" />
                    Loading occupations...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-400 opacity-60" />
                    No occupations found. Add your first occupation above.
                  </td>
                </tr>
              ) : (
                filtered.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2 max-w-sm">
                          <input
                            type="text"
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-primary-500 rounded-lg py-1 px-2.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={savingEdit}
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition"
                            title="Save"
                          >
                            {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span>{item.name}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.isDefault ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                          System Default
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50">
                          Custom
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Edit Button */}
                        <button
                          onClick={() => startEdit(item)}
                          disabled={editingId === item.id}
                          className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Rename occupation"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Toggle Active/Inactive */}
                        <button
                          onClick={() => handleToggleStatus(item)}
                          disabled={togglingId === item.id}
                          className={`p-1.5 rounded-lg transition ${
                            item.status === 'ACTIVE'
                              ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={item.status === 'ACTIVE' ? 'Deactivate occupation' : 'Activate occupation'}
                        >
                          {togglingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : item.status === 'ACTIVE' ? (
                            <Power className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <PowerOff className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </button>

                        {/* Delete Button */}
                        {!item.isDefault && (
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                            title="Delete occupation"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Note on Historical Immutability */}
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Safety Note:</strong> Renaming or deactivating an occupation only affects future registrations. Previously onboarded clients retain their original occupation selection without alteration.
          </span>
        </div>
      </div>
    </div>
  );
}
