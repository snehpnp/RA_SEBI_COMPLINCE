'use client';

import React from 'react';
import { Battery, Wifi, Signal, ArrowUpRight, ArrowDownRight, Clock, Target, Shield, CheckCircle2, X } from 'lucide-react';

interface MobilePreviewProps {
  mode: 'ADD' | 'CLOSE' | 'CHECKLIST' | 'COMPLIANCE' | 'TABLE' | 'CARD' | 'STRATEGY';
  signals?: any[];
  newSignalData?: any;
  onSendAlert?: (trade: any, message: string) => Promise<boolean>;
  isViewOnly?: boolean;
  checklistItems?: any[];
  complianceItems?: any[];
  title?: string;
}

export default function MobilePreview({ mode, signals = [], newSignalData = {}, onSendAlert, isViewOnly = false, checklistItems = [], complianceItems = [], title }: MobilePreviewProps) {
  const [composingAlertFor, setComposingAlertFor] = React.useState<any>(null);
  const [alertMessage, setAlertMessage] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);

  const handleSend = async () => {
    if (!onSendAlert || !composingAlertFor || !alertMessage.trim()) return;
    setIsSending(true);
    const success = await onSendAlert(composingAlertFor, alertMessage);
    setIsSending(false);
    if (success) {
      setComposingAlertFor(null);
      setAlertMessage('');
    }
  };
  const [currentTime, setCurrentTime] = React.useState('12:00 PM');
  React.useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const renderTradeCard = (trade: any, index: number, isLivePreview: boolean = false) => {
    const isBuy = trade.entryType === 'BUY' || trade.callType === 'BUY';
    const isSell = trade.entryType === 'SELL' || trade.callType === 'SELL';
    const isNeutral = !isBuy && !isSell;
    const color = isNeutral ? 'text-slate-500' : isBuy ? 'text-emerald-500' : 'text-rose-500';
    const bgLight = isNeutral ? 'bg-slate-50 dark:bg-slate-500/10' : isBuy ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10';
    const Icon = isNeutral ? Clock : isBuy ? ArrowUpRight : ArrowDownRight;

    const stockName = (typeof trade.stock === 'object' && trade.stock?.symbol) ? trade.stock.symbol : (trade.stock || 'Select Stock');
    const entryPrice = trade.entryPrice ? `₹${trade.entryPrice}` : '---';
    
    const targets = [trade.target1, trade.target2, trade.target3].filter(Boolean);
      
    const sl = trade.stopLoss || trade.stoploss || '---';

    return (
      <div key={index} className="bg-white dark:bg-[#1A2235] rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden mb-4 opacity-0 animate-[slideUp_0.4s_ease-out_forwards]" style={{ animationDelay: `${index * 0.1}s` }}>
        {/* Header */}
        <div className={`px-4 py-3 border-b border-slate-100 dark:border-white/5 flex justify-between items-center ${bgLight}`}>
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 bg-white dark:bg-[#0f1523] rounded-lg shadow-sm ${color}`}>
              <Icon className="w-4 h-4" strokeWidth={3} />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{trade.stock?.symbol || trade.stockId}</h3>
              <div className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-0.5 flex items-center gap-1.5">
                {trade.segment}
                {trade.planName && (
                  <>
                    <span className="opacity-50">•</span>
                    <span className="text-indigo-500 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">{trade.planName}</span>
                  </>
                )}
              </div>
              { (trade.expiryDate || trade.strikePrice) && (
                <div className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-0.5 flex items-center gap-1.5">
                  {trade.expiryDate && <span>EXP: {new Date(trade.expiryDate).toLocaleDateString('en-GB')}</span>}
                  {trade.expiryDate && trade.strikePrice && <span className="opacity-50">•</span>}
                  {trade.strikePrice && <span className="text-amber-600 dark:text-amber-400">STRIKE: {trade.strikePrice} {trade.optionType || ''}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className={`text-xs font-black uppercase px-2 py-1 rounded-md bg-white dark:bg-[#0f1523] shadow-sm ${color}`}>
              {isNeutral ? 'TYPE' : isBuy ? 'BUY' : 'SELL'}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Entry</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{entryPrice}</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-white/10"></div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1 flex items-center justify-center gap-1"><Target className="w-3 h-3"/> Target</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {targets.length > 0 ? targets.map((t: any) => `₹${t}`).join(' / ') : '---'}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-white/10"></div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1 flex items-center justify-center gap-1"><Shield className="w-3 h-3"/> SL</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{sl ? `₹${sl}` : '---'}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 font-medium px-2">
            <span>{trade.tradeDuration || 'Duration N/A'}</span>
            <span>{trade.entryType === 'EXACT' ? 'Exact Entry' : trade.entryType === 'ABOVE' ? 'Entry Above' : trade.entryType === 'RANGE' ? 'Entry Range' : 'Entry Type N/A'}</span>
          </div>

          {trade.description && (
            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
              <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{trade.description}"</p>
            </div>
          )}

          {(() => {
            if (trade.closeStatus || trade.status === 'CLOSED') {
              const entry = parseFloat(trade.entryPrice);
              const exit = parseFloat(trade.exitPrice);
              const statusText = trade.closeStatus || 'Closed';
              
              if (!isNaN(entry) && !isNaN(exit) && entry > 0) {
                const isBuy = trade.entryType === 'BUY' || trade.callType === 'BUY';
                const pct = isBuy ? ((exit - entry) / entry) * 100 : ((entry - exit) / entry) * 100;
                const isProfit = pct >= 0;
                return (
                  <div 
                    onClick={(e) => { e.stopPropagation(); if (mode === 'TABLE' && onSendAlert) setComposingAlertFor(trade); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm border cursor-pointer hover:opacity-90 transition-opacity ${isProfit ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20'}`}>
                    <span className="uppercase tracking-wide">{statusText}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black">Exit: ₹{exit}</span>
                      <span className={`px-1.5 py-0.5 rounded-md ${isProfit ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-rose-100 dark:bg-rose-500/20'}`}>
                        {isProfit ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              }
              return (
                <div 
                  onClick={(e) => { e.stopPropagation(); if (mode === 'TABLE' && onSendAlert) setComposingAlertFor(trade); }}
                  className="w-full py-2.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold shadow-sm text-center border border-slate-200 dark:border-white/10 uppercase tracking-wide cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                  {statusText}
                </div>
              );
            }

            return (
              <button 
                onClick={(e) => { e.stopPropagation(); if (mode === 'TABLE' && onSendAlert) setComposingAlertFor(trade); }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold shadow-md transition-opacity ${mode === 'TABLE' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-900 dark:bg-primary-600 text-white hover:opacity-90'}`}>
                {mode === 'TABLE' ? 'Send Alert' : 'View Details'}
              </button>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[320px] h-[650px] bg-slate-900 rounded-[3rem] p-2.5 shadow-2xl relative border-[6px] border-slate-800 shrink-0 mx-auto">
      {/* Hardware Buttons */}
      <div className="absolute -left-[7px] top-[100px] w-1 h-[26px] bg-slate-800 rounded-l-md"></div>
      <div className="absolute -left-[7px] top-[140px] w-1 h-[50px] bg-slate-800 rounded-l-md"></div>
      <div className="absolute -left-[7px] top-[200px] w-1 h-[50px] bg-slate-800 rounded-l-md"></div>
      <div className="absolute -right-[7px] top-[160px] w-1 h-[70px] bg-slate-800 rounded-r-md"></div>

      {/* Screen Area */}
      <div className="w-full h-full bg-slate-50 dark:bg-[#0B101E] rounded-[2.5rem] overflow-hidden relative flex flex-col border border-white/10">
        {/* Notch */}
        <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
          <div className="w-32 h-6 bg-slate-900 rounded-b-3xl relative">
            <div className="absolute top-2 right-4 w-1.5 h-1.5 bg-slate-700 rounded-full"></div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-6 pt-2 pb-1 flex justify-between items-center text-[10px] font-medium text-slate-800 dark:text-white z-10">
          <span className="ml-2 mt-1">{currentTime}</span>
          <div className="flex items-center space-x-1.5 mt-1 mr-1">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* App Header */}
        <div className="px-5 py-4 bg-white dark:bg-[#1A2235] shadow-sm z-10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
              R
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {title ? title : (mode === 'CHECKLIST' 
                ? 'SEBI Checklist'
                : mode === 'COMPLIANCE' ? 'Compliance Desk' 
                : ((signals && signals.length > 0 && signals[0].status === 'CLOSED') ? 'Closed Trade Alerts' : 'Open Trade Alerts'))
              }
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar bg-slate-50 dark:bg-[#0B101E]">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.3); border-radius: 4px; }
          `}} />

          {mode === 'COMPLIANCE' ? (
            <div className="space-y-3">
              {complianceItems && complianceItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-3 py-10">
                  <CheckCircle2 className="w-8 h-8" />
                  <p className="text-xs font-medium">All Clear!</p>
                </div>
              ) : (
                complianceItems?.map((item: any, idx: number) => {
                  if (item._isOverview) {
                    let cardColor = "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1A2235]";
                    let titleColor = "text-slate-500 dark:text-slate-400";
                    let valueColor = "text-slate-900 dark:text-white";

                    if (item.colorType === 'primary') {
                      cardColor = "border-primary-500/30 bg-primary-50 dark:bg-primary-500/10";
                      titleColor = "text-primary-600 dark:text-primary-400";
                      valueColor = "text-primary-700 dark:text-primary-300";
                    } else if (item.colorType === 'rose') {
                      cardColor = "border-rose-500/30 bg-rose-50 dark:bg-rose-500/10";
                      titleColor = "text-rose-600 dark:text-rose-400";
                      valueColor = "text-rose-700 dark:text-rose-300";
                    } else if (item.colorType === 'emerald') {
                      cardColor = "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10";
                      titleColor = "text-emerald-600 dark:text-emerald-400";
                      valueColor = "text-emerald-700 dark:text-emerald-300";
                    } else if (item.colorType === 'amber') {
                      cardColor = "border-amber-500/30 bg-amber-50 dark:bg-amber-500/10";
                      titleColor = "text-amber-600 dark:text-amber-400";
                      valueColor = "text-amber-700 dark:text-amber-300";
                    }

                    return (
                      <div key={idx} className={`p-4 rounded-xl border shadow-sm flex flex-col items-center justify-center text-center ${cardColor}`}>
                        <span className={`text-[10px] font-black uppercase tracking-wider mb-2 ${titleColor}`}>
                          {item.title}
                        </span>
                        <h4 className={`text-3xl font-extrabold leading-none ${valueColor}`}>
                          {item.value}
                        </h4>
                        <p className={`text-xs mt-2 font-medium opacity-80 ${titleColor}`}>{item.suffix}</p>
                      </div>
                    );
                  }

                  let type = 'unknown';
                  if (item.type === 'ALERT_RESOLVED' || item.type === 'PENALTY_PAID' || item.type === 'CHECKLIST_UPDATE') type = 'combined_history';
                  else if (item.alertType) type = 'alert';
                  else if (item.amount !== undefined) type = 'penalty';
                  else if (item.clientName) type = 'complaint';
                  else if (item.action || item.newStatus) type = 'audit';

                  let titleStr = '';
                  let descStr = '';
                  let statusStr = item.status || item.newStatus || 'LOGGED';
                  let colorClass = 'border-l-slate-400';
                  let pillClass = 'bg-slate-100 text-slate-700 dark:bg-slate-500/30 dark:text-slate-300';

                  if (type === 'combined_history') {
                    titleStr = item.title;
                    descStr = item.desc;
                    if (item.type === 'ALERT_RESOLVED') {
                      colorClass = 'border-l-blue-500';
                      pillClass = 'bg-blue-100 text-blue-700 dark:bg-blue-500/30 dark:text-blue-300 font-bold';
                      statusStr = 'RESOLVED';
                    } else if (item.type === 'PENALTY_PAID') {
                      colorClass = 'border-l-emerald-500';
                      pillClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-300 font-bold';
                      statusStr = 'PAID';
                    } else {
                      colorClass = 'border-l-purple-500';
                      pillClass = 'bg-purple-100 text-purple-700 dark:bg-purple-500/30 dark:text-purple-300 font-bold';
                      statusStr = 'UPDATED';
                    }
                  } else if (type === 'alert') {
                    titleStr = item.alertType.replace(/_/g, ' ');
                    descStr = item.description || '';
                    if (item.severity === 'HIGH') {
                      colorClass = 'border-l-rose-500';
                      pillClass = 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
                    } else if (item.severity === 'MEDIUM') {
                      colorClass = 'border-l-amber-500';
                      pillClass = 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
                    }
                  } else if (type === 'combined_history') {
                    if (item.type === 'ALERT_RESOLVED') {
                      titleStr = item.alertType ? `Alert Resolved: ${item.alertType.replace(/_/g, ' ')}` : 'Alert Resolved';
                      descStr = item.resolutionNotes || item.message || 'Alert closed successfully.';
                      statusStr = 'RESOLVED';
                      colorClass = 'border-l-indigo-500';
                      pillClass = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400';
                    } else if (item.type === 'PENALTY_PAID') {
                      titleStr = item.audit?.requirement?.requirement || 'Penalty Paid';
                      descStr = `Penalty amount of ${item.amount ? `,1${item.amount}` : 'applicable fees'} paid.`;
                      statusStr = 'PAID';
                      colorClass = 'border-l-emerald-500';
                      pillClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
                    } else if (item.type === 'CHECKLIST_UPDATE') {
                      titleStr = item.requirement?.requirement || 'Checklist Update';
                      descStr = item.audit?.notes || 'Status updated to COMPLIANT.';
                      statusStr = 'COMPLIANT';
                      colorClass = 'border-l-emerald-500';
                      pillClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
                    } else {
                      titleStr = 'System Update';
                      descStr = 'Combined history item logged.';
                      statusStr = 'LOGGED';
                      colorClass = 'border-l-slate-500';
                      pillClass = 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400';
                    }
                  } else if (type === 'penalty') {
                    titleStr = item.audit?.requirement?.requirement ? item.audit.requirement.requirement : `Penalty: ₹${item.amount}`;
                    descStr = `Penalty: ₹${item.amount} (${item.reason || 'No details'})`;
                    statusStr = item.status === 'PENDING_PAYMENT' ? 'NON-COMPLIANT' : item.status === 'PAID' ? 'COMPLIANT' : item.status;
                    colorClass = item.status === 'PAID' ? 'border-l-emerald-500' : 'border-l-rose-500';
                    pillClass = item.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';
                  } else if (type === 'complaint') {
                    titleStr = item.clientName;
                    descStr = item.subject || '';
                    colorClass = item.status === 'CLOSED' ? 'border-l-emerald-500' : 'border-l-amber-500';
                    pillClass = item.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
                  } else if (type === 'audit') {
                    titleStr = item.action || 'Checklist Update';
                    descStr = item.details || (item.requirement ? item.requirement.requirement : '');
                    colorClass = statusStr === 'COMPLIANT' || statusStr === 'PENALTY_RESOLVED' || statusStr === 'PAID' ? 'border-l-emerald-500' : statusStr === 'NON_COMPLIANT' || statusStr === 'OVERDUE' ? 'border-l-rose-500' : 'border-l-slate-400';
                    pillClass = statusStr === 'COMPLIANT' || statusStr === 'PENALTY_RESOLVED' || statusStr === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : statusStr === 'NON_COMPLIANT' || statusStr === 'OVERDUE' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-500/30 dark:text-slate-300';
                  }

                  return (
                    <div key={item.id || idx} className={`p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#1A2235] border-l-[4px] ${colorClass}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {type}
                        </span>
                        <div className="flex items-center space-x-2">
                          {type === 'alert' && item.severity && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 ${item.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400' : item.severity === 'MEDIUM' ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400' : 'bg-blue-500/20 text-blue-700 dark:text-blue-400'}`}>
                              {item.severity}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 ${pillClass}`}>
                            {statusStr.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      {type === 'complaint' ? (
                        <>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-2">{titleStr}</h4>
                          <div className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                            <span className="font-bold">Sub:</span> {descStr}
                          </div>
                          <div className="text-xs text-slate-500 flex justify-between">
                            <span>Rcvd: {new Date(item.createdAt || item.receivedAt || item.timestamp).toLocaleDateString()}</span>
                            {item.deadlineAt && (
                              <span className={`font-bold ${Math.ceil((new Date(item.deadlineAt).getTime() - Date.now()) / (1000 * 3600 * 24)) < 0 && item.status !== 'CLOSED' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                Due: {new Date(item.deadlineAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-2">{titleStr}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{descStr}</p>
                          <div className="text-[10px] text-slate-500">
                            {new Date(item.createdAt || item.receivedAt || item.timestamp).toLocaleDateString()}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : mode === 'CHECKLIST' ? (
            <div className="space-y-3">
              {checklistItems && checklistItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-3 py-10">
                  <CheckCircle2 className="w-8 h-8" />
                  <p className="text-xs font-medium">No tasks to display</p>
                </div>
              ) : (
                checklistItems?.map((rawItem: any, idx: number) => {
                  const isHistory = !!rawItem.newStatus;
                  const reqObj = isHistory ? (rawItem.requirement || {}) : rawItem;
                  const status = isHistory ? rawItem.newStatus : (rawItem.audit?.status || 'PENDING');
                  const reqString = reqObj.requirement || '';
                  const serialNo = reqObj.serialNo || '';
                  const frequency = reqObj.frequency || '';
                  const severityLevel = reqObj.severityLevel || '';
                  const penaltyAmount = reqObj.penaltyAmount || '';
                  
                  let dateColorClass = 'opacity-80';
                  if (!isHistory && rawItem.currentPeriod?.dueDate) {
                    const dueDateMs = new Date(rawItem.currentPeriod.dueDate).getTime();
                    const daysLeft = Math.ceil((dueDateMs - Date.now()) / (1000 * 3600 * 24));
                    if (daysLeft < 0) dateColorClass = 'text-red-600 dark:text-red-500 font-bold';
                    else if (daysLeft <= 7) dateColorClass = 'text-rose-600 dark:text-rose-400 font-bold';
                    else if (daysLeft <= 30) dateColorClass = 'text-orange-600 dark:text-orange-400 font-bold';
                    else dateColorClass = 'text-emerald-600 dark:text-emerald-400 font-bold';
                  }
                  
                  const colors: Record<string, { border: string, pill: string }> = {
                    COMPLIANT: { border: 'border-l-emerald-500', pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
                    NON_COMPLIANT: { border: 'border-l-rose-500', pill: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' },
                    PENDING: { border: 'border-l-slate-400', pill: 'bg-slate-100 text-slate-700 dark:bg-slate-500/30 dark:text-slate-300' },
                    OVERDUE: { border: 'border-l-rose-500', pill: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' },
                    PENALTY_RESOLVED: { border: 'border-l-emerald-500', pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
                    PAID: { border: 'border-l-emerald-500', pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' }
                  };
                  const style = colors[status] || colors['PENDING'];
                  return (
                    <div key={rawItem.id || idx} className={`p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#1A2235] border-l-[4px] ${style.border}`}>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Task #{serialNo}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 ${style.pill}`}>
                          {status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed mb-3">
                        {reqString}
                      </p>
                      <div className="flex justify-between items-center mb-3">
                        {severityLevel && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${severityLevel === 'HIGH' ? 'bg-rose-500/20 text-rose-700 border-rose-500/50' : (severityLevel === 'MODERATE' || severityLevel === 'MEDIUM') ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>
                            {severityLevel}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-500">{penaltyAmount ? `${penaltyAmount}` : '—'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold pt-2 border-t border-black/5 dark:border-white/5">
                        <span className={`flex items-center gap-1 ${dateColorClass}`}>
                          <Clock className="w-3.5 h-3.5" /> 
                          {isHistory ? 
                            (rawItem.periodLabel || '—') : 
                            (rawItem.currentPeriod?.dueDate ? new Date(rawItem.currentPeriod.dueDate).toLocaleDateString() : 'Ongoing')
                          }
                        </span>
                        <span className="opacity-80">{frequency}</span>
                      </div>
                      {isHistory && (
                        <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-600 dark:text-slate-400 font-bold">Updated by {rawItem.updatedByName || 'System'}</span>
                            <span className="text-slate-500 font-medium">{new Date(rawItem.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                          {rawItem.officerRemarks && (
                            <div className="bg-white/50 dark:bg-black/20 p-2.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 font-medium italic">
                              "{rawItem.officerRemarks}"
                            </div>
                          )}
                          {rawItem.previousStatus && rawItem.newStatus && (
                            <div className="flex items-center space-x-2 text-[10px] font-black uppercase">
                              <span className="opacity-60">{rawItem.previousStatus.replace('_', ' ')}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-emerald-600 dark:text-emerald-400">{rawItem.newStatus.replace('_', ' ')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (mode === 'ADD' || mode === 'CLOSE') ? (
            <>
              <div className="text-center mb-6">
                <span className="inline-block px-3 py-1 bg-slate-200 dark:bg-white/10 rounded-full text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                  {mode === 'CLOSE' ? 'Live Preview (Closing)' : 'Live Preview (Draft)'}
                </span>
              </div>
              {renderTradeCard(newSignalData, 0, true)}
            </>
          ) : (
            <>
              {signals && signals.length > 0 ? (
                signals.map((trade, idx) => renderTradeCard(trade, idx))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-3">
                  <Clock className="w-8 h-8" />
                  <p className="text-xs font-medium">No active alerts to display</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Sheet for Send Alert */}
        {composingAlertFor && (
          <div className="absolute inset-x-0 bottom-0 z-30 bg-white dark:bg-[#1A2235] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] border-t border-slate-100 dark:border-white/5 p-5 animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{isViewOnly ? 'View Alerts' : 'Send Alert'}</h4>
              <button onClick={() => setComposingAlertFor(null)} className="p-1.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Alert History */}
            <div className="mb-3 max-h-32 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {composingAlertFor.messages && composingAlertFor.messages.length > 0 ? (
                composingAlertFor.messages.map((msg: any) => (
                  <div key={msg.id} className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-2.5 rounded-lg">
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">{msg.message}</p>
                    <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-end gap-1">
                      <Clock className="w-2.5 h-2.5" /> {new Date(msg.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-2 italic opacity-70">No previous alerts.</p>
              )}
            </div>

            {!isViewOnly && (
              <>
                <textarea
                  className="w-full bg-slate-50 dark:bg-[#0f1523] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none mb-3 text-slate-900 dark:text-white"
                  rows={3}
                  placeholder="e.g. Book partial profit..."
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                />
                <button
                  onClick={handleSend}
                  disabled={isSending || !alertMessage.trim()}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isSending ? 'Sending...' : 'Send Alert'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Bottom Navigation Bar (Mock) */}
        <div className="h-16 bg-white dark:bg-[#1A2235] border-t border-slate-100 dark:border-white/5 flex justify-around items-center px-4 shrink-0">
          <div className="w-10 h-10 flex flex-col items-center justify-center text-primary-600">
            <div className="w-5 h-5 bg-primary-600/20 rounded-md mb-1"></div>
            <div className="w-8 h-1 bg-primary-600 rounded-full"></div>
          </div>
          <div className="w-10 h-10 flex flex-col items-center justify-center opacity-30">
            <div className="w-5 h-5 bg-slate-400 rounded-md mb-1"></div>
          </div>
          <div className="w-10 h-10 flex flex-col items-center justify-center opacity-30">
            <div className="w-5 h-5 bg-slate-400 rounded-md mb-1"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
