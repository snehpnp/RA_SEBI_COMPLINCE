import { useState, useEffect, useMemo, useRef } from 'react';
import { MessageSquare, CheckCircle2, ShieldCheck, Loader2, User } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
export default function TicketManagement({ adminTickets, fetchAdminTickets, adminTicketStatusFilter, setAdminTicketStatusFilter }) {
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [closing, setClosing] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const messagesEndRef = useRef(null);
    // Memoized filtered tickets to prevent infinite re-render loops
    const filteredTickets = useMemo(() => {
        if (!Array.isArray(adminTickets))
            return [];
        return adminTickets.filter(t => adminTicketStatusFilter === 'ALL' || t.status === adminTicketStatusFilter);
    }, [adminTickets, adminTicketStatusFilter]);
    // Initial auto-selection of the first ticket
    useEffect(() => {
        if (filteredTickets.length > 0) {
            // If no ticket selected, or selected ticket is no longer in the filtered list
            const exists = selectedTicket && filteredTickets.some(t => t.id === selectedTicket.id);
            if (!exists) {
                handleSelectTicket(filteredTickets[0]);
            }
        }
        else {
            setSelectedTicket(null);
        }
    }, [filteredTickets.length, adminTicketStatusFilter]);
    // Smooth scroll to bottom on message list update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedTicket?.messages?.length, selectedTicket?.id]);
    const handleSelectTicket = async (tkt) => {
        if (!tkt?.id)
            return;
        setLoadingDetails(true);
        try {
            const res = await api.getAdminTicket(tkt.id);
            if (res.success && res.data) {
                setSelectedTicket(res.data);
            }
            else {
                // Fallback to basic ticket data if fetch fails
                setSelectedTicket(tkt);
            }
        }
        catch (err) {
            console.error('Error fetching ticket details:', err);
            setSelectedTicket(tkt);
        }
        finally {
            setLoadingDetails(false);
        }
    };
    const handleReply = async () => {
        if (!replyText.trim() || !selectedTicket)
            return;
        if (selectedTicket.status === 'CLOSED')
            return toast.error('Ticket is closed.');
        setSubmitting(true);
        try {
            const res = await api.replyAdminTicket(selectedTicket.id, { message: replyText.trim() });
            if (res.success) {
                setReplyText('');
                toast.success('Reply sent successfully');
                // Refresh ticket details cleanly
                const fresh = await api.getAdminTicket(selectedTicket.id);
                if (fresh.success && fresh.data) {
                    setSelectedTicket(fresh.data);
                }
                await fetchAdminTickets();
            }
            else {
                toast.error(res.message || 'Failed to reply');
            }
        }
        catch (err) {
            toast.error(err.message || 'Failed to reply');
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleClose = async () => {
        if (!selectedTicket)
            return;
        if (selectedTicket.status === 'CLOSED')
            return toast.error('Already closed');
        setClosing(true);
        try {
            const res = await api.closeAdminTicket(selectedTicket.id);
            if (res.success) {
                toast.success('Ticket closed successfully');
                setSelectedTicket((prev) => prev ? { ...prev, status: 'CLOSED' } : null);
                await fetchAdminTickets();
            }
            else {
                toast.error(res.message || 'Failed to close ticket');
            }
        }
        catch (err) {
            toast.error(err.message || 'Failed to close ticket');
        }
        finally {
            setClosing(false);
        }
    };
    return (<div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-180px)]">
      {/* Ticket List (Left Column) */}
      <div className="md:w-1/3 flex flex-col gap-4">
        {/* Filters */}
        <div className="flex bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 rounded-xl overflow-hidden p-1 shadow-sm">
          {['ALL', 'PENDING', 'OPEN', 'CLOSED'].map((status) => (<button key={status} onClick={() => {
                setAdminTicketStatusFilter(status);
            }} className={`flex-1 text-xs py-2 font-bold rounded-lg transition-all ${adminTicketStatusFilter === status
                ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800'}`}>
              {status}
            </button>))}
        </div>

        {/* List */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/60 rounded-2xl p-3 flex-1 overflow-y-auto shadow-xl shadow-slate-200/20 dark:shadow-none [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full">
          {filteredTickets.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-slate-500 p-4 text-center">
              <MessageSquare className="w-10 h-10 mb-2 opacity-20"/>
              <p className="text-sm font-medium">No tickets found</p>
            </div>) : (filteredTickets.map(tkt => {
            const isSelected = selectedTicket?.id === tkt.id;
            return (<div key={tkt.id} onClick={() => handleSelectTicket(tkt)} className={`p-4 rounded-xl cursor-pointer border transition-all mb-3 ${isSelected
                    ? 'bg-primary-50/50 dark:bg-primary-900/10 border-primary-500/50 ring-1 ring-primary-500/20 shadow-sm'
                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 hover:border-primary-500/30 hover:bg-white dark:hover:bg-slate-800/50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400">
                      {tkt.ticketId || 'TKT'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tkt.status === 'OPEN'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    : tkt.status === 'PENDING'
                        ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                      {tkt.status}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm line-clamp-1 mb-2 text-slate-900 dark:text-white">
                    {tkt.subject}
                  </h4>
                  <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                    <span>{new Date(tkt.createdAt).toLocaleDateString()}</span>
                    <span>{tkt.client?.firstName} {tkt.client?.lastName}</span>
                  </div>
                </div>);
        }))}
        </div>
      </div>

      {/* Ticket Chat View (Right Column) */}
      <div className="md:w-2/3 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/60 rounded-2xl flex flex-col shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden">
        {selectedTicket ? (<>
            <div className="p-5 border-b border-slate-200 dark:border-slate-800/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400">
                    {selectedTicket.ticketId}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedTicket.status === 'OPEN'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                : selectedTicket.status === 'PENDING'
                    ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                    {selectedTicket.status}
                  </span>
                  {loadingDetails && (<span className="flex items-center gap-1 text-[11px] text-primary-500">
                      <Loader2 className="w-3 h-3 animate-spin"/>
                      Loading...
                    </span>)}
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">{selectedTicket.subject}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Client: {selectedTicket.client?.firstName} {selectedTicket.client?.lastName} ({selectedTicket.client?.email})
                </p>
              </div>
              {selectedTicket.status !== 'CLOSED' && (<button onClick={handleClose} disabled={closing} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
                  {closing ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
                  Close Ticket
                </button>)}
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50 dark:bg-slate-900/20 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full">
              {/* All Messages */}
              {Array.isArray(selectedTicket.messages) && selectedTicket.messages.length > 0 ? (selectedTicket.messages.map((msg, i) => {
                const isAdmin = msg.sender?.role?.name !== 'CLIENT';
                return (<div key={i} className={`flex gap-4 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${isAdmin ? 'bg-primary-100 dark:bg-primary-500/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        {isAdmin ? (<ShieldCheck className="w-4 h-4 text-primary-600 dark:text-primary-400"/>) : (<User className="w-4 h-4 text-slate-600 dark:text-slate-400"/>)}
                      </div>
                      <div className={`p-4 rounded-2xl max-w-[80%] shadow-sm ${isAdmin
                        ? 'bg-primary-600 text-white rounded-tr-none shadow-primary-500/20'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none'}`}>
                        <p className={`text-xs font-bold mb-1 ${isAdmin ? 'text-primary-100' : 'text-slate-900 dark:text-slate-100'}`}>
                          {isAdmin
                        ? msg.sender?.firstName
                            ? `${msg.sender.firstName} ${msg.sender.lastName || ''}`
                            : 'Admin / Staff'
                        : msg.sender?.firstName || selectedTicket.client?.firstName || 'Client'}
                        </p>
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isAdmin ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          {msg.message}
                        </p>
                        <p className={`text-[10px] mt-2 font-mono ${isAdmin ? 'text-primary-200' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>);
            })) : (<div className="text-center py-8 text-xs text-slate-400 italic">
                  No messages yet in this ticket.
                </div>)}
              <div ref={messagesEndRef}/>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/40">
              {selectedTicket.status === 'CLOSED' ? (<p className="text-center text-sm text-slate-500 py-2 font-medium">This ticket has been closed.</p>) : (<div className="flex gap-3">
                  <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReply()} placeholder="Type your reply here..." className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all text-slate-900 dark:text-white placeholder-slate-400 shadow-inner"/>
                  <button onClick={handleReply} disabled={submitting || !replyText.trim()} className="bg-primary-600 hover:bg-primary-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:shadow-none text-white px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center min-w-[120px] shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Send'}
                  </button>
                </div>)}
            </div>
          </>) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20"/>
            <p className="font-medium text-slate-500">Select a ticket to view conversation</p>
          </div>)}
      </div>
    </div>);
}
