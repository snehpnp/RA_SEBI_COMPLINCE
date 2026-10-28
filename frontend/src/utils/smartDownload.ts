import api from '../services/api';
import toast from 'react-hot-toast';

export interface SmartDownloadOptions {
  blob: Blob;
  fileName: string;
  documentType?: string;
  tenantDetails?: any;
  userRole?: string;
  onAdminFallbackPrompt?: (fileSizeMb: number, proceedToDownload: () => void) => void;
  onStaffBlockedPrompt?: (fileSizeMb: number) => void;
}

/**
 * Centrally enforces organization file download & export security policies.
 * Ensures staff files are routed to Admin registered email, prevents leakage, and validates file sizes.
 */
export async function executeSmartDownload({
  blob,
  fileName,
  documentType = 'Corporate Report',
  tenantDetails,
  userRole,
  onAdminFallbackPrompt,
  onStaffBlockedPrompt
}: SmartDownloadOptions) {
  let policy = tenantDetails?.fileDownloadPolicy;
  let maxEmailSizeMb = tenantDetails?.maxEmailFileSizeMb;
  let resolvedRole = userRole;

  if (typeof window !== 'undefined') {
    if (!policy) {
      policy = (localStorage.getItem('fileDownloadPolicy') as any) || undefined;
    }
    if (!policy) {
      try {
        const storedTenant = JSON.parse(localStorage.getItem('tenantDetails') || '{}');
        policy = storedTenant?.fileDownloadPolicy;
        if (!maxEmailSizeMb) maxEmailSizeMb = storedTenant?.maxEmailFileSizeMb;
      } catch {}
    }
    if (!policy) {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        policy = storedUser?.tenant?.fileDownloadPolicy;
        if (!maxEmailSizeMb) maxEmailSizeMb = storedUser?.tenant?.maxEmailFileSizeMb;
        if (!resolvedRole) resolvedRole = storedUser?.role;
      } catch {}
    }
    if (!resolvedRole) {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        resolvedRole = storedUser?.role;
      } catch {}
    }
  }

  policy = policy || 'BOTH';
  maxEmailSizeMb = Number(maxEmailSizeMb) || 10;
  const fileSizeMb = parseFloat((blob.size / (1024 * 1024)).toFixed(2));
  const isAdmin = resolvedRole === 'ADMIN' || resolvedRole === 'SUPER_ADMIN';

  // Helper for direct browser download
  const downloadToBrowser = () => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      if (a.parentNode) {
        a.parentNode.removeChild(a);
      }
    }, 1000);
  };

  // CASE 1: System Download Only
  if (policy === 'SYSTEM') {
    downloadToBrowser();
    return;
  }

  // CASE 2: Send on Email OR Both
  // Check if file is oversized for email attachment
  if (fileSizeMb > maxEmailSizeMb) {
    if (isAdmin) {
      if (onAdminFallbackPrompt) {
        onAdminFallbackPrompt(fileSizeMb, downloadToBrowser);
      } else {
        const confirmDownload = window.confirm(
          `Document file size is large (${fileSizeMb} MB) and exceeds the email limit (${maxEmailSizeMb} MB). Do you want to download directly to your system instead?`
        );
        if (confirmDownload) {
          downloadToBrowser();
        }
      }
    } else {
      // Staff member: Strictly blocked from direct downloading
      if (onStaffBlockedPrompt) {
        onStaffBlockedPrompt(fileSizeMb);
      } else {
        toast.error(
          `Document file size (${fileSizeMb} MB) exceeds maximum email attachment limit. Direct system download is restricted for your role. Please contact Admin to receive this export.`,
          { duration: 6000 }
        );
      }
    }
    return;
  }

  // File size is within limits: Dispatch to Admin registered email
  const toastId = toast.loading('Dispatching document to Admin registered email...');
  try {
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('fileName', fileName);
    formData.append('documentType', documentType);

    const res = await api.post('/files/send-export-email', formData);

    if (res.data?.success) {
      toast.success(
        res.data.message || 'File has been dispatched to Admin registered email address.',
        { id: toastId, duration: 6000 }
      );
    } else {
      toast.error(res.data?.message || 'Failed to dispatch email.', { id: toastId });
    }
  } catch (err: any) {
    toast.error(
      err.response?.data?.message || 'Failed to send file to Admin email.',
      { id: toastId }
    );
  }

  // If policy is BOTH, also trigger browser download for authorized users
  if (policy === 'BOTH') {
    downloadToBrowser();
  }
}
