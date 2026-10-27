import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import PagesManagement from '@/components/admin/PagesManagement';

export default function PagesTab() {
  const { isStaff, activeTab, setAdminPagesList } = useAdmin();
  const pageSlug = activeTab && activeTab.startsWith('customPages_') ? activeTab.split('_')[1] : null;
  return <PagesManagement readOnly={isStaff} pageSlug={pageSlug} onPagesUpdate={(pages) => setAdminPagesList(pages)} />;
}
