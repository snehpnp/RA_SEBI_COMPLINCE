import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import VideoKycDesk from '@/components/admin/VideoKycDesk';

export default function VideoKycTab() {
  return <VideoKycDesk />;
}
