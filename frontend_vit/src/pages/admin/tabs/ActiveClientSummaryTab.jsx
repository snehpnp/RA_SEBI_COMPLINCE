import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import ActiveClientSummary from '@/components/admin/ActiveClientSummary';

export default function ActiveClientSummaryTab() {
  const { setActiveTab } = useAdmin();
  return <ActiveClientSummary onBack={() => setActiveTab('dashboard')} />;
}
