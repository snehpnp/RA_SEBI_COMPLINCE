'use client';

import React, { useState, useEffect } from 'react';
import { Send, Plus, Check, ExternalLink, RefreshCw, Layers, ShieldCheck, Link as LinkIcon } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface TelegramGroupOption {
  _id: string;
  id?: string;
  name: string;
  chatId: string;
  inviteLink?: string | null;
  type?: string;
  isDefault?: boolean;
}

interface TelegramGroupSelectorProps {
  chatId: string;
  inviteLink: string;
  groupName?: string;
  onChange: (values: { chatId: string; inviteLink: string; groupName: string }) => void;
}

export default function TelegramGroupSelector({
  chatId,
  inviteLink,
  groupName,
  onChange
}: TelegramGroupSelectorProps) {
  const [groups, setGroups] = useState<TelegramGroupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await api.getTelegramGroups();
      if (res?.success && res.data) {
        setGroups(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load telegram groups in selector:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  // Sync selected group dropdown state with incoming props
  useEffect(() => {
    if (!chatId) {
      setSelectedGroupId('');
      setIsCustomMode(false);
      return;
    }

    const matched = groups.find(g => String(g.chatId).trim() === String(chatId).trim());
    if (matched) {
      setSelectedGroupId(matched._id || matched.id!);
      setIsCustomMode(false);
    } else if (chatId) {
      setSelectedGroupId('custom');
      setIsCustomMode(true);
    }
  }, [chatId, groups]);

  const handleSelectGroup = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedGroupId(val);

    if (val === '') {
      setIsCustomMode(false);
      onChange({ chatId: '', inviteLink: '', groupName: '' });
    } else if (val === 'custom') {
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
      const matched = groups.find(g => (g._id || g.id) === val);
      if (matched) {
        onChange({
          chatId: matched.chatId,
          inviteLink: matched.inviteLink || '',
          groupName: matched.name
        });
      }
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-[#0088cc]/5 dark:bg-[#0088cc]/10 border border-[#0088cc]/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-[#0088cc] text-white rounded-lg shadow-sm">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Plan Telegram Channel / Group</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Assigned Telegram group will receive signals and show connect button for subscribed clients.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadGroups}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          title="Refresh Telegram Groups"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0088cc]' : ''}`} />
        </button>
      </div>

      {/* Group Selector Dropdown */}
      <div>
        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
          Select Registered Telegram Group
        </label>
        <select
          value={selectedGroupId}
          onChange={handleSelectGroup}
          className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs font-semibold focus:border-[#0088cc] outline-none"
        >
          <option value="">-- No Specific Group (Uses Global Default) --</option>
          {groups.map(g => (
            <option key={g._id || g.id} value={g._id || g.id}>
              👥 {g.name} ({g.chatId}) {g.isDefault ? '⭐ Default' : ''}
            </option>
          ))}
          <option value="custom">✏️ + Custom / Enter Manual Chat ID</option>
        </select>
      </div>

      {/* Manual / Custom Chat ID Inputs (Shown if custom selected or if no group chosen) */}
      {isCustomMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 animate-fade-in">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Custom Telegram Group Chat ID
            </label>
            <input
              type="text"
              value={chatId}
              onChange={e => onChange({ chatId: e.target.value, inviteLink, groupName: groupName || '' })}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-mono"
              placeholder="e.g. -1001234567890 or -5455721319"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Group Invite Link
            </label>
            <input
              type="text"
              value={inviteLink}
              onChange={e => onChange({ chatId, inviteLink: e.target.value, groupName: groupName || '' })}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs"
              placeholder="e.g. https://t.me/+AbCdEfGhIj"
            />
          </div>
        </div>
      )}

      {/* Status indicator if group is active */}
      {chatId && !isCustomMode && (
        <div className="flex items-center justify-between text-[11px] bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-500 font-bold" />
            Connected to <b>{groupName || chatId}</b>
          </span>
          {inviteLink ? (
            <span className="text-[#0088cc] font-medium truncate max-w-[150px]">
              {inviteLink}
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 text-[10px]">
              (Bot will auto-generate invite link)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
