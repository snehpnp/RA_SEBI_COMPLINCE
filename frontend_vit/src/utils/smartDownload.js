import api from '../services/api';
import toast from 'react-hot-toast';

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
}) {
  const policy = tenantDetails?.fileDownloadPolicy || 'BOTH'; // 'SYSTEM' | 'EMAIL' | 'BOTH'
  const maxEmailSizeMb = tenantDetails?.maxEmailFileSizeMb || 10;
  const fileSizeMb = parseFloat((blob.size / (1024 * 1024)).toFixed(2));
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  // Helper for direct browser download
  const downloadToBrowser = () => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
        alert(
          `Document file size (${fileSizeMb} MB) exceeds maximum email attachment limit. Direct system download is restricted for your role. Please contact Admin to receive this export.`
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

    const res = await api.post('/files/send-export-email', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (res.data?.success) {
      toast.success(
        res.data.message || 'File has been dispatched to Admin registered email address.',
        { id: toastId, duration: 6000 }
      );
    } else {
      toast.error(res.data?.message || 'Failed to dispatch email.', { id: toastId });
    }
  } catch (err) {
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
