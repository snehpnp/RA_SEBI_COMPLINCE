import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import SignatureSettingsComponent from '@/components/admin/SignatureSettingsTab';

export default function SignatureSettingsTab() {
  const { user, setUser, loadData, showMobilePreview, toggleMobilePreview } = useAdmin();
  return (
    <SignatureSettingsComponent
      user={user}
      setUser={setUser}
      loadData={loadData}
      showMobilePreview={showMobilePreview}
      toggleMobilePreview={toggleMobilePreview}
    />
  );
}
