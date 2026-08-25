'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle2, ShieldCheck, Loader2, User } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function TicketManagement({ 
  adminTickets, 
  fetchAdminTickets, 
  adminTicketStatusFilter, 
  setAdminTicketStatusFilter 
}: { 
  adminTickets: any[], 
  fetchAdminTickets: () => Promise<void>,
  adminTicketStatusFilter: string,
  setAdminTicketStatusFilter: (status: any) => void
}) {
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);

  // Automatically select a ticket if one isn't selected but exists in the filtered list
  const filteredTickets = adminTickets.filter(t => adminTicketStatusFilter === 'ALL' || t.status === adminTicketStatusFilter);

  useEffect(() => {
    if (filteredTickets.length > 0 && !selectedTicket) {
      setSelectedTicket(filteredTickets[0]);
    } else if (selectedTicket) {
      // update selected ticket with new data from fetch
      const updated = filteredTickets.find(t => t.id === selectedTicket.id);
      if (updated) {
        // Fetch full ticket to get messages
        api.getAdminTicket(updated.id).then(res => {
          if(res.success) setSelectedTicket(res.data);
        }).catch(console.error);
      }
    }
  }, [filteredTickets]);

  const handleSelectTicket = async (tkt: any) => {
    try {
      const res = await api.getAdminTicket(tkt.id);
      if (res.success) {
        setSelectedTicket(res.data);
      } else {
        toast.error('Failed to load ticket details');
      }
    } catch (err: any) {
      toast.error('Failed to load ticket details');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    if (selectedTicket.status === 'CLOSED') return toast.error('Ticket is closed.');
    
    setSubmitting(true);
    try {
      const res = await api.replyAdminTicket(selectedTicket.id, { message: replyText });
      if (res.success) {
        setReplyText('');
        toast.success('Reply sent successfully');
        // Refresh the current ticket to get the new message
        handleSelectTicket(selectedTicket);
        // Refresh the list to update counts
        await fetchAdminTickets();
      } else {
        toast.error(res.message || 'Failed to reply');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!selectedTicket) return;
    if (selectedTicket.status === 'CLOSED') return toast.error('Already closed');

    setClosing(true);
    try {
      const res = await api.closeAdminTicket(selectedTicket.id);
      if (res.success) {
        toast.success('Ticket closed successfully');
        await fetchAdminTickets();
      } else {
        toast.error(res.message || 'Failed to close ticket');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to close ticket');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-180px)]">
      {/* Ticket List */}
      <div className="md:w-1/3 flex flex-col gap-4">
        {/* Filters */}
        <div className="flex bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl overflow-hidden p-1 shadow-sm">
          {['ALL', 'PENDING', 'OPEN', 'CLOSED'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setAdminTicketStatusFilter(status);
                setSelectedTicket(null);
              }}
              className={`flex-1 text-xs py-2 font-semibold rounded-lg transition-colors ${adminTicketStatusFilter === status ? 'bg-primary-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {status}
            </button>
          ))}
        </div>
        
        {/* List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-2xl p-2 flex-1 overflow-y-auto shadow-sm">
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4 text-center">
              <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">No tickets found</p>
            </div>
          ) : (
            filteredTickets.map(tkt => (
              <div 
                key={tkt.id} 
                onClick={() => handleSelectTicket(tkt)} 
                className={`p-4 rounded-xl cursor-pointer border transition-all mb-2 ${selectedTicket?.id === tkt.id ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500' : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-300 dark:hover:border-slate-700'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400">{tkt.ticketId || 'TKT'}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tkt.status === 'OPEN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : tkt.status === 'PENDING' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                    {tkt.status}
                  </span>
                </div>
                <h4 className="font-semibold text-sm line-clamp-1 mb-2 text-slate-900 dark:text-white">{tkt.subject}</h4>
                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                  <span>{new Date(tkt.createdAt).toLocaleDateString()}</span>
                  <span>{tkt.client?.firstName} {tkt.client?.lastName}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Ticket Chat View */}
      <div className="md:w-2/3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-2xl flex flex-col shadow-sm">
        {selectedTicket ? (
          <>
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400">{selectedTicket.ticketId}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedTicket.status === 'OPEN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : selectedTicket.status === 'PENDING' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">{selectedTicket.subject}</h3>
                <p className="text-xs text-slate-500 mt-1">Client: {selectedTicket.client?.firstName} {selectedTicket.client?.lastName} ({selectedTicket.client?.email})</p>
              </div>
              {selectedTicket.status !== 'CLOSED' && (
                <button 
                  onClick={handleClose}
                  disabled={closing}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Close Ticket
                </button>
              )}
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50 dark:bg-[#0b101a]">
              {/* All Messages (including initial) */}
              {selectedTicket.messages?.map((msg: any, i: number) => {
                 const isAdmin = msg.sender?.role?.name !== 'CLIENT';
                 return (
                    <div key={i} className={`flex gap-4 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? 'bg-primary-100 dark:bg-primary-500/20' : 'bg-blue-100 dark:bg-blue-500/20'}`}>
                        {isAdmin ? <ShieldCheck className="w-4 h-4 text-primary-600 dark:text-primary-400" /> : <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <div className={`p-4 rounded-2xl max-w-[80%] ${isAdmin ? 'bg-primary-500 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-tl-none'}`}>
                        <p className={`text-xs font-bold mb-1 ${isAdmin ? 'text-primary-100' : 'text-slate-800 dark:text-slate-200'}`}>
                          {isAdmin ? (msg.sender?.firstName ? `${msg.sender.firstName} ${msg.sender.lastName || ''}` : 'Admin / Staff') : (msg.sender?.firstName || selectedTicket.client?.firstName || 'Client')}
                        </p>
                        <p className={`text-sm whitespace-pre-wrap ${isAdmin ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{msg.message}</p>
                        <p className={`text-[10px] mt-2 ${isAdmin ? 'text-primary-200' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                 )
              })}
            </div>
            
            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
              {selectedTicket.status === 'CLOSED' ? (
                <p className="text-center text-sm text-slate-500 py-2 font-medium">This ticket has been closed.</p>
              ) : (
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleReply()}
                    placeholder="Type your reply here..." 
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all text-slate-900 dark:text-white" 
                  />
                  <button 
                    onClick={handleReply} 
                    disabled={submitting || !replyText.trim()} 
                    className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center min-w-[100px] shadow-md shadow-primary-500/20"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reply'}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium text-slate-500">Select a ticket to view conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
