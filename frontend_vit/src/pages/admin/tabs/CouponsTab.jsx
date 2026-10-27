import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import CouponsManager from '@/components/CouponsManager';

export default function CouponsTab() {
  return <CouponsManager />;
}
