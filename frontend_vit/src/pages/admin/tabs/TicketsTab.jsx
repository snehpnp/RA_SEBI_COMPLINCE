import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import TicketManagement from '@/components/admin/TicketManagement';

export default function TicketsTab() {
  const { isStaff, user, hasPermission } = useAdmin();
  return (
    <div className="space-y-6">
      <TicketManagement isStaff={isStaff} user={user} hasPermission={hasPermission} />
    </div>
  );
}
