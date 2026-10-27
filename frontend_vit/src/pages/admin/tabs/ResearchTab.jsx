import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import SignalManagement from '@/components/SignalManagement';

export default function ResearchTab() {
  const { isStaff, user, hasPermission, adminPlans, showMobilePreview } = useAdmin();
  return (
    <SignalManagement
      adminPlans={adminPlans}
      user={user}
      hasPermission={hasPermission}
      showMobilePreview={showMobilePreview}
      isStaff={isStaff}
    />
  );
}
