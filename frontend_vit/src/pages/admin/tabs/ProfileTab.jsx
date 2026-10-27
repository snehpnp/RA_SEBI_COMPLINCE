import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import AdminProfilePage from '@/pages/admin/profile/AdminProfilePage';
import StaffProfilePage from '@/pages/admin/profile/StaffProfilePage';
import PAProfilePage from '@/pages/admin/profile/PAProfilePage';

export default function ProfileTab() {
  const { user } = useAdmin();
  return (
    <>
      {user?.role === 'ADMIN' && <AdminProfilePage />}
      {(user?.role === 'STAFF' || user?.role === 'COMPLIANCE_OFFICER' || user?.role === 'RESEARCHER') && <StaffProfilePage />}
      {user?.role === 'PRINCIPAL_ANALYST' && <PAProfilePage />}
    </>
  );
}
