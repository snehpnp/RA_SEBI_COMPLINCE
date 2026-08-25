'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, PhoneCall, HelpCircle, Plus, Search, ChevronDown, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function SupportCenter() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'faqs'>('tickets');
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyText, setReplyText] = useState('');

  const fetchTickets = async () => {
    try {
      const res = await api.listTickets();
      if (res.success) {
        setTickets(res.data || []);
        if (res.data?.length > 0) {
           // update selected if exists
           if(selectedTicket) {
             const updated = res.data.find((t: any) => t.id === selectedTicket.id);
             setSelectedTicket(updated || res.data[0]);
           } else {
             setSelectedTicket(res.data[0]);
           }
        }
      }
    } catch (err) {
      console.error('Failed to fetch tickets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find(t => t.id === selectedTicket.id);
      if (updated) {
        api.getTicket(updated.id).then(res => {
          if (res.success) setSelectedTicket(res.data);
        }).catch(console.error);
      }
    }
  }, [tickets]);

  const handleSelectTicket = async (tkt: any) => {
    try {
      const res = await api.getTicket(tkt.id);
      if (res.success) {
        setSelectedTicket(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load ticket details', err);
    }
  };

  const hasOpenTicket = tickets.some(t => t.status === 'OPEN' || t.status === 'PENDING');

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasOpenTicket) return toast('You already have an open ticket.');
    setSubmitting(true);
    try {
      await api.createTicket({ subject: newSubject, message: newDesc, priority: 'MEDIUM', categoryId: null });
      setIsCreateModalOpen(false);
      setNewSubject('');
      setNewDesc('');
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    if (selectedTicket.status === 'CLOSED') return toast('Ticket is closed.');
    if (selectedTicket.status === 'PENDING') return toast('Please wait for admin response.');
    
    setSubmitting(true);
    try {
      const res = await api.replyTicket(selectedTicket.id, { message: replyText });
      if (res.success) {
        setReplyText('');
        // Refresh ticket details to get new message
        handleSelectTicket(selectedTicket);
        await fetchTickets();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-premium-text animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Support Center</h1>
          <p className="text-sm text-premium-text/60 mt-1">We are here to help. Raise a ticket or browse FAQs.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-2">
        <button 
          onClick={() => setActiveTab('tickets')}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'tickets' ? 'bg-premium-primary text-white shadow-lg shadow-premium-primary/20' : 'bg-premium-cards border border-premium-border text-premium-text/70 hover:text-premium-text'}`}
        >
          <MessageSquare className="w-4 h-4" /> My Tickets
        </button>
        <button 
          onClick={() => setActiveTab('faqs')}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'faqs' ? 'bg-premium-primary text-white shadow-lg shadow-premium-primary/20' : 'bg-premium-cards border border-premium-border text-premium-text/70 hover:text-premium-text'}`}
        >
          <HelpCircle className="w-4 h-4" /> FAQs
        </button>
      </div>

      {activeTab === 'tickets' && (
        <div className="flex flex-col md:flex-row gap-6 flex-1">
          {/* Ticket List */}
          <div className="md:w-1/3 flex flex-col gap-4">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              disabled={hasOpenTicket}
              className={`w-full bg-premium-cards border border-dashed py-4 rounded-2xl flex items-center justify-center gap-2 font-medium transition-colors ${hasOpenTicket ? 'border-premium-border text-premium-text/30 cursor-not-allowed' : 'border-premium-border hover:border-premium-primary text-premium-primary'}`}
              title={hasOpenTicket ? 'You can only have one open ticket at a time.' : 'Create new ticket'}
            >
              <Plus className="w-5 h-5" /> {hasOpenTicket ? 'Active Ticket Exists' : 'Create New Ticket'}
            </button>
            
            <div className="bg-premium-cards border border-premium-border rounded-2xl p-2 flex-1 overflow-y-auto max-h-[500px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-premium-primary animate-spin mb-2" />
                  <p className="text-xs text-premium-text/60">Loading tickets...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-premium-text/40 p-4 text-center">
                  <p className="text-sm">No tickets found</p>
                </div>
              ) : (
                tickets.map(tkt => (
                  <div key={tkt.id} onClick={() => handleSelectTicket(tkt)} className={`p-4 rounded-xl cursor-pointer border transition-all mb-2 ${selectedTicket?.id === tkt.id ? 'bg-premium-bg border-premium-primary' : 'hover:bg-premium-bg border-transparent hover:border-premium-border'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold font-mono text-premium-text/50">{tkt.ticketId || 'TKT'}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tkt.status === 'OPEN' ? 'bg-premium-warning/20 text-premium-warning' : tkt.status === 'PENDING' ? 'bg-amber-500/20 text-amber-500' : 'bg-premium-success/20 text-premium-success'}`}>
                        {tkt.status}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm line-clamp-1 mb-2">{tkt.subject}</h4>
                    <div className="flex justify-between items-center text-xs text-premium-text/50">
                      <span>{new Date(tkt.createdAt).toLocaleDateString()}</span>
                      <span>{tkt.messages?.length || 0} Replies</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Ticket Chat View */}
          <div className="md:w-2/3 bg-premium-cards border border-premium-border rounded-2xl flex flex-col h-[600px]">
            {selectedTicket ? (
              <>
                <div className="p-6 border-b border-premium-border flex justify-between items-center bg-premium-bg/50 rounded-t-2xl">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-bold font-mono text-premium-text/50">{selectedTicket.ticketId}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedTicket.status === 'OPEN' ? 'bg-premium-warning/20 text-premium-warning' : selectedTicket.status === 'PENDING' ? 'bg-amber-500/20 text-amber-500' : 'bg-premium-success/20 text-premium-success'}`}>{selectedTicket.status}</span>
                    </div>
                    <h3 className="font-bold">{selectedTicket.subject}</h3>
                  </div>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto space-y-6">                  {/* All Messages */}
                  {selectedTicket.messages?.map((msg: any, i: number) => {
                     const isClient = msg.sender?.role?.name === 'CLIENT';
                     return (
                        <div key={i} className={`flex gap-4 ${isClient ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isClient ? 'bg-premium-primary/20' : 'bg-amber-500/20'}`}>
                            {isClient ? <User className="w-4 h-4 text-premium-primary" /> : <ShieldCheck className="w-4 h-4 text-amber-500" />}
                          </div>
                          <div className={`p-4 rounded-2xl max-w-[80%] ${isClient ? 'bg-premium-primary text-white rounded-tr-none' : 'bg-premium-bg border border-premium-border rounded-tl-none'}`}>
                            <p className={`text-xs font-bold mb-1 ${isClient ? 'text-white/80' : 'text-premium-text/60'}`}>
                              {isClient ? 'You' : (msg.sender?.firstName ? `${msg.sender.firstName} ${msg.sender.lastName || ''}` : 'Support Team')}
                            </p>
                            <p className={`text-sm whitespace-pre-wrap ${isClient ? 'text-white' : 'text-premium-text'}`}>{msg.message}</p>
                            <p className={`text-[10px] mt-2 ${isClient ? 'text-white/50' : 'text-premium-text/40'}`}>
                              {new Date(msg.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                     )
                  })}
                </div>
                
                <div className="p-4 border-t border-premium-border bg-premium-bg/50 rounded-b-2xl">
                  {selectedTicket.status === 'CLOSED' ? (
                    <p className="text-center text-sm text-premium-text/50 py-2">This ticket is closed. You cannot reply.</p>
                  ) : selectedTicket.status === 'PENDING' ? (
                    <p className="text-center text-sm text-amber-500/70 py-2">Awaiting admin response. You cannot reply right now.</p>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleReply()}
                        placeholder="Type your message..." 
                        className="flex-1 bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-premium-primary focus:ring-1 focus:ring-premium-primary transition-all" 
                      />
                      <button onClick={handleReply} disabled={submitting || !replyText.trim()} className="bg-premium-primary hover:bg-premium-primary/90 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-premium-text/40">
                <MessageSquare className="w-12 h-12 mb-4 text-premium-border" />
                <p>Select a ticket to view conversation</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'faqs' && (
        <div className="bg-premium-cards border border-premium-border rounded-3xl p-8 max-w-3xl">
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-premium-text/40" />
            <input 
              type="text" 
              placeholder="Search frequently asked questions..." 
              className="w-full bg-premium-bg border border-premium-border rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-premium-primary focus:ring-1 focus:ring-premium-primary transition-all"
            />
          </div>
          
          <div className="space-y-4">
            {[
              "How to read risk-reward ratio in signals?",
              "What is the difference between Swing and Positional?",
              "How can I upgrade my subscription plan?",
              "Is there any refund policy?"
            ].map((q, i) => (
              <div key={i} className="border border-premium-border rounded-2xl p-5 hover:border-premium-primary/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">{q}</h4>
                  <ChevronDown className="w-5 h-5 text-premium-text/40 group-hover:text-premium-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-premium-cards border border-premium-border rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-6">Create Support Ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-premium-text/70 uppercase mb-2">Subject</label>
                <input required type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-sm focus:border-premium-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-premium-text/70 uppercase mb-2">Description</label>
                <textarea required rows={4} value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-sm focus:border-premium-primary focus:outline-none resize-none" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-6 py-3 bg-premium-bg border border-premium-border rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-premium-primary text-white rounded-xl font-bold flex justify-center items-center gap-2">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
