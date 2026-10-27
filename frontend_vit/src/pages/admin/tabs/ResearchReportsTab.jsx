import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import AdminResearchReports from '@/components/admin/AdminResearchReports';

export default function ResearchReportsTab() {
  return <AdminResearchReports />;
}
