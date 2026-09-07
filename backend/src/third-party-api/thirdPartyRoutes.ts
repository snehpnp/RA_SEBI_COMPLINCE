import { Router } from 'express';
import {
  getThirdPartyClients,
  getThirdPartyStaff,
  getThirdPartyPlans,
  getThirdPartyInfo
} from './thirdPartyController';

const router = Router();

// Dynamic routes supporting query params or headers
router.get('/clients', getThirdPartyClients);
router.get('/staff', getThirdPartyStaff);
router.get('/plans', getThirdPartyPlans);
router.get('/info', getThirdPartyInfo);

// Dynamic routes with :tenantId or :adminId param
router.get('/:tenantId/clients', getThirdPartyClients);
router.get('/:tenantId/staff', getThirdPartyStaff);
router.get('/:tenantId/plans', getThirdPartyPlans);
router.get('/:tenantId/info', getThirdPartyInfo);

export default router;
