import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import { SebiPenaltiesMatrixView } from '@/components/SebiPenaltiesMatrixView';

export default function PenaltyMatrixTab() {
  const { setShowCalendarModal } = useAdmin();
  return (
    <div className="w-full space-y-6">
      <SebiPenaltiesMatrixView onOpenChecklistCalendar={() => setShowCalendarModal(true)} />
    </div>
  );
}
