import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
import ClientVaultExplorer from '@/components/admin/vault/ClientVaultExplorer';

export default function VaultsTab() {
  const { user } = useAdmin();
  return (
    <ClientVaultExplorer 
      canDownload={!user?.permissions?.includes('MASK_VAULT_DATA')} 
      isMasked={Boolean(user?.permissions?.includes('MASK_VAULT_DATA'))} 
    />
  );
}
