import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import AdminResourcesTabComponent from '@/components/AdminResourcesTab';

export default function ResourcesTab() {
  return (
    <div className="animate-fade-in">
      <AdminResourcesTabComponent triggerAlert={(msg) => toast(msg)} />
    </div>
  );
}
