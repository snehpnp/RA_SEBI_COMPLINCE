'use client';

import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  ArrowUpDown, 
  Filter,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function FaqManagement() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Delete Confirm State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminFaqs();
      if (res && res.success) {
        setFaqs(res.data || []);
      } else {
        toast.error(res?.message || 'Failed to load FAQs');
      }
    } catch (err: any) {
      console.error('Error fetching FAQs:', err);
      toast.error(err.message || 'Error fetching FAQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const openAddModal = () => {
    setEditingFaq(null);
    setFormQuestion('');
    setFormAnswer('');
    setFormCategory('General');
    setFormOrder(faqs.length + 1);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (faq: FaqItem) => {
    setEditingFaq(faq);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormCategory(faq.category || 'General');
    setFormOrder(faq.order ?? 0);
    setFormIsActive(faq.isActive ?? true);
    setIsModalOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim()) {
      return toast.error('Please enter a question');
    }
    if (!formAnswer.trim()) {
      return toast.error('Please enter an answer');
    }

    setModalSubmitting(true);
    try {
      if (editingFaq) {
        const res = await api.updateFaq(editingFaq.id, {
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          category: formCategory.trim(),
          order: Number(formOrder) || 0,
          isActive: formIsActive
        });
        if (res && res.success) {
          toast.success('FAQ updated successfully!');
          setIsModalOpen(false);
          await fetchFaqs();
        } else {
          toast.error(res?.message || 'Failed to update FAQ');
        }
      } else {
        const res = await api.createFaq({
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          category: formCategory.trim(),
          order: Number(formOrder) || 0,
          isActive: formIsActive
        });
        if (res && res.success) {
          toast.success('New FAQ added successfully!');
          setIsModalOpen(false);
          await fetchFaqs();
        } else {
          toast.error(res?.message || 'Failed to create FAQ');
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Operation failed');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleStatus = async (faq: FaqItem) => {
    const nextStatus = !faq.isActive;
    try {
      // Optimistic update
      setFaqs(prev => prev.map(f => f.id === faq.id ? { ...f, isActive: nextStatus } : f));
      const res = await api.updateFaq(faq.id, { isActive: nextStatus });
      if (res && res.success) {
        toast.success(`FAQ set to ${nextStatus ? 'Active' : 'Inactive'}`);
      } else {
        toast.error('Failed to update status');
        await fetchFaqs();
      }
    } catch (err: any) {
      toast.error('Error changing status');
      await fetchFaqs();
    }
  };

  const handleDeleteFaq = async (id: string) => {
    try {
      setDeletingId(id);
      const res = await api.deleteFaq(id);
      if (res && res.success) {
        toast.success('FAQ deleted successfully');
        setFaqs(prev => prev.filter(f => f.id !== id));
      } else {
        toast.error(res?.message || 'Failed to delete FAQ');
      }
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  // Extract unique categories
  const categories = ['ALL', ...Array.from(new Set(faqs.map(f => f.category || 'General')))];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = categoryFilter === 'ALL' || faq.category === categoryFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      faq.question.toLowerCase().includes(q) || 
      faq.answer.toLowerCase().includes(q) ||
      (faq.category && faq.category.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <HelpCircle className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">FAQ Knowledge Base Manager</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create, edit, and organize frequently asked questions displayed in the Client Support Portal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchFaqs}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition"
            title="Refresh FAQs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-primary-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New FAQ</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search questions or keywords..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/60 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 hide-scrollbar">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                categoryFilter === cat
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 hover:border-primary-500/40'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ List Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800/60 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-500" />
          <p className="text-xs">Loading FAQ directory...</p>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800/60 text-slate-400 text-center">
          <HelpCircle className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-700" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No FAQs found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {searchQuery || categoryFilter !== 'ALL'
              ? 'Try changing your search query or category filter.'
              : 'Click "Add New FAQ" to create your first question.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq, index) => {
            const isExpanded = expandedId === faq.id;
            return (
              <div
                key={faq.id}
                className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* FAQ Header Row */}
                <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
                  <div
                    className="flex-1 cursor-pointer flex items-start gap-3.5"
                    onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                  >
                    <span className="shrink-0 mt-0.5 w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-mono font-bold flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      {faq.order ?? index + 1}
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {faq.category || 'General'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            faq.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                          }`}
                        >
                          {faq.isActive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </>
                          ) : (
                            'Hidden'
                          )}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        {faq.question}
                      </h4>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(faq)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border ${
                        faq.isActive
                          ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                          : 'border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={faq.isActive ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {faq.isActive ? 'Active' : 'Draft'}
                    </button>

                    <button
                      onClick={() => openEditModal(faq)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary-500/40 text-slate-600 dark:text-slate-400 hover:text-primary-600 transition"
                      title="Edit FAQ"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteFaq(faq.id)}
                      disabled={deletingId === faq.id}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-red-500/40 text-slate-600 dark:text-slate-400 hover:text-red-600 transition"
                      title="Delete FAQ"
                    >
                      {deletingId === faq.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Answer Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/30">
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans mt-3">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit FAQ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/60 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingFaq ? 'Edit FAQ Item' : 'Create New FAQ Item'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Live synchronized with the client support portal.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveFaq} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Question <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How to read risk-reward ratio in signals?"
                  value={formQuestion}
                  onChange={e => setFormQuestion(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Answer <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Write clear, comprehensive guidance for the client..."
                  value={formAnswer}
                  onChange={e => setFormAnswer(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none font-sans leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    list="category-suggestions"
                    placeholder="General, Signals, Plans..."
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <datalist id="category-suggestions">
                    <option value="Signals & Trading" />
                    <option value="Subscription & Billing" />
                    <option value="Compliance & Legal" />
                    <option value="Support & Grievances" />
                    <option value="General" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formOrder}
                    onChange={e => setFormOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={e => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Publish this FAQ immediately to Client Portal
                  </span>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                >
                  {modalSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save FAQ'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
