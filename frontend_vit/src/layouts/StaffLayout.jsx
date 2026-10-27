import React from 'react';
import AdminLayout from '@/pages/admin/AdminLayout';

export default function StaffLayout({ children }) {
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}
