'use client';

import { useState, useEffect } from 'react';
import { Bell, Target, FileText, CreditCard, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.getClientNotifications();
        if (res.success) {
          setNotifications(res.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifs();
  }, []);

  return (
    <div className="space-y-6 font-sans text-premium-text animate-in fade-in duration-500 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-premium-text/60 mt-1">Stay updated with market alerts and account activities.</p>
        </div>
        <button className="text-sm text-premium-primary hover:underline">Mark all as read</button>
      </div>

      <div className="bg-premium-cards border border-premium-border rounded-3xl p-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-premium-primary animate-spin mb-4" />
            <p className="text-sm text-premium-text/60">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-premium-text/40">
            <Bell className="w-12 h-12 mb-4 text-premium-border" />
            <p className="text-sm">You have no new notifications.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id || n._id} className={`p-4 rounded-2xl flex gap-4 transition-colors ${n.read || n.isRead ? 'hover:bg-premium-bg/50' : 'bg-premium-bg border border-premium-border/50'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                n.type === 'signal' ? 'bg-premium-success/20 text-premium-success' :
                n.type === 'report' ? 'bg-premium-primary/20 text-premium-primary' :
                n.type === 'payment' ? 'bg-premium-warning/20 text-premium-warning' :
                'bg-premium-success/20 text-premium-success'
              }`}>
                {n.type === 'signal' && <Target className="w-6 h-6" />}
                {n.type === 'report' && <FileText className="w-6 h-6" />}
                {n.type === 'payment' && <CreditCard className="w-6 h-6" />}
                {n.type === 'kyc' && <ShieldCheck className="w-6 h-6" />}
                {(!n.type || !['signal', 'report', 'payment', 'kyc'].includes(n.type)) && <Bell className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className={`font-semibold ${n.read || n.isRead ? 'text-premium-text/80' : 'text-premium-text'}`}>{n.title}</h4>
                  <span className="text-xs text-premium-text/50">{new Date(n.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
                <p className={`text-sm mt-1 ${n.read || n.isRead ? 'text-premium-text/60' : 'text-premium-text/90'}`}>{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
