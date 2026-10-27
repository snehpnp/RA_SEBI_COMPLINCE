import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import CustomPageView from '@/components/client/CustomPageView';

export default function ComplaintDataViewTab() {
  return <CustomPageView page={{ slug: 'complaint-status', title: 'Complaint Data' }} />;
}
