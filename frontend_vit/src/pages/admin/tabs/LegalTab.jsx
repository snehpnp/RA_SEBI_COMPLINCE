import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import Legal from '@/components/client/Legal';

export default function LegalTab() {
  const { adminPagesList, setActiveTab } = useAdmin();
  return (
    <Legal
      pages={(adminPagesList || []).filter(p => p.slug !== 'complaint-status' && (p.status === 'ACTIVE' || !p.status))}
      onReadDocument={(page) => {
        if (page.type === 'URL' && page.externalUrl) {
          window.open(page.externalUrl, '_blank');
        } else {
          setActiveTab(`customPages_${page.slug}`);
        }
      }}
    />
  );
}
