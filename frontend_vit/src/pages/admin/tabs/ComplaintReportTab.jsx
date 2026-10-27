import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import ComplaintReportAdmin from '@/components/admin/ComplaintReportAdmin';

export default function ComplaintReportTab() {
  return <ComplaintReportAdmin />;
}
