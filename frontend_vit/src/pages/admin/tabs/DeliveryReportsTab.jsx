import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import TradeDeliveryReports from '@/components/admin/TradeDeliveryReports';

export default function DeliveryReportsTab() {
  const { activeTab } = useAdmin();
  const subChannel = activeTab === 'deliveryReports_telegram' ? 'TELEGRAM' :
    activeTab === 'deliveryReports_sms' ? 'SMS' :
    activeTab === 'deliveryReports_inapp' ? 'INAPP' : 'ALL';
  return (
    <div className="mx-6 space-y-6 animate-fade-in">
      <TradeDeliveryReports channel={subChannel} />
    </div>
  );
}
