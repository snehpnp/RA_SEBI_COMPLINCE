import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AdminProvider, useAdmin } from './AdminContext';
import AdminLayout from './AdminLayout';

// Tab Components
import DashboardTab from './tabs/DashboardTab';
import ActiveClientSummaryTab from './tabs/ActiveClientSummaryTab';
import StaffTab from './tabs/StaffTab';
import L2ApprovalsTab from './tabs/L2ApprovalsTab';
import PaymentsTab from './tabs/PaymentsTab';
import ChecklistTab from './tabs/ChecklistTab';
import PenaltyMatrixTab from './tabs/PenaltyMatrixTab';
import ComplianceTab from './tabs/ComplianceTab';
import VaultsTab from './tabs/VaultsTab';
import ClientsTab from './tabs/ClientsTab';
import ResearchTab from './tabs/ResearchTab';
import ResearchReportsTab from './tabs/ResearchReportsTab';
import DeliveryReportsTab from './tabs/DeliveryReportsTab';
import PlansTab from './tabs/PlansTab';
import CouponsTab from './tabs/CouponsTab';
import SettingsTab from './tabs/SettingsTab';
import PagesTab from './tabs/PagesTab';
import ComplaintReportTab from './tabs/ComplaintReportTab';
import SignatureSettingsTab from './tabs/SignatureSettingsTab';
import ResourcesTab from './tabs/ResourcesTab';
import TicketsTab from './tabs/TicketsTab';
import RolesTab from './tabs/RolesTab';
import AuditLogsTab from './tabs/AuditLogsTab';
import VideoKycTab from './tabs/VideoKycTab';
import ProfileTab from './tabs/ProfileTab';
import LegalTab from './tabs/LegalTab';
import ComplaintDataViewTab from './tabs/ComplaintDataViewTab';

function AdminContent() {
  const { activeTab, setActiveTab, hasPermission, user } = useAdmin();
  const { tab: routeTab } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Synchronize route param with activeTab
  useEffect(() => {
    if (routeTab && routeTab !== activeTab) {
      setActiveTab(routeTab);
    } else if (!routeTab && location.hash) {
      const hashTab = location.hash.replace('#', '');
      if (hashTab && hashTab !== activeTab) {
        setActiveTab(hashTab);
      }
    }
  }, [routeTab, location.hash]);

  // Synchronize tab change to URL
  useEffect(() => {
    if (activeTab && activeTab !== routeTab) {
      if (window.location.hash !== `#${activeTab}`) {
        window.history.replaceState(null, '', `#${activeTab}`);
      }
    }
  }, [activeTab, routeTab]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'activeClientSummary':
        return (hasPermission('ACCESS_ACTIVE_CLIENT_SUMMARY') || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')
          ? <ActiveClientSummaryTab />
          : <DashboardTab />;
      case 'staff':
        return <StaffTab />;
      case 'l2-approvals':
        return <L2ApprovalsTab />;
      case 'payments':
        return <PaymentsTab />;
      case 'checklist':
        return <ChecklistTab />;
      case 'penalty-matrix':
        return <PenaltyMatrixTab />;
      case 'compliance':
        return <ComplianceTab />;
      case 'vaults':
        return hasPermission('ACCESS_VAULTS') ? <VaultsTab /> : <DashboardTab />;
      case 'clients':
        return <ClientsTab />;
      case 'research':
        return hasPermission('ACCESS_RESEARCH') ? <ResearchTab /> : <DashboardTab />;
      case 'research-reports':
        return hasPermission('ACCESS_RESEARCH') ? <ResearchReportsTab /> : <DashboardTab />;
      case 'plans':
        return <PlansTab />;
      case 'coupons':
        return <CouponsTab />;
      case 'settings':
        return <SettingsTab />;
      case 'complaintReport':
        return <ComplaintReportTab />;
      case 'signature_settings':
        return <SignatureSettingsTab />;
      case 'resources':
        return <ResourcesTab />;
      case 'tickets':
        return hasPermission('ACCESS_TICKETS') ? <TicketsTab /> : <DashboardTab />;
      case 'roles':
        return hasPermission('ACCESS_ROLES') ? <RolesTab /> : <DashboardTab />;
      case 'auditLogs':
        return <AuditLogsTab />;
      case 'video_kyc':
        return <VideoKycTab />;
      case 'profile':
        return <ProfileTab />;
      case 'legalView':
        return <LegalTab />;
      case 'complaintDataView':
        return <ComplaintDataViewTab />;
      default:
        if (activeTab === 'delivery-reports' || activeTab.startsWith('deliveryReports_')) {
          return <DeliveryReportsTab />;
        }
        if (activeTab.startsWith('customPages')) {
          return <PagesTab />;
        }
        return <DashboardTab />;
    }
  };

  return (
    <AdminLayout>
      {renderActiveTab()}
    </AdminLayout>
  );
}

export default function AdminPage() {
  return (
    <AdminProvider>
      <AdminContent />
    </AdminProvider>
  );
}
