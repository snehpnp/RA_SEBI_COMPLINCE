import { Router } from 'express';
import {
  getThirdPartyClients,
  getThirdPartyStaff,
  getThirdPartyPlans,
  getThirdPartyInfo,
  getThirdPartyStats,
  getThirdPartyCompliance,
  runThirdPartyComplianceSweep
} from './thirdPartyController';

const router = Router();

// Enforce valid API Key header on all third-party routes
router.use((req, res, next) => {
  const apiKey = (req.headers['x-tenant-api-key'] as string) || (req.headers['x-api-key'] as string) || (req.query.apiKey as string);
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: A valid API key is required to access third-party services. Provide via x-tenant-api-key or x-api-key header.'
    });
  }
  next();
});

// Dynamic routes supporting query params or headers
router.get('/clients', getThirdPartyClients);
router.get('/staff', getThirdPartyStaff);
router.get('/plans', getThirdPartyPlans);
router.get('/info', getThirdPartyInfo);
router.get('/stats', getThirdPartyStats);
router.get('/compliance', getThirdPartyCompliance);
router.post('/compliance/sweep', runThirdPartyComplianceSweep);

// Dynamic routes with :tenantId or :adminId param
router.get('/:tenantId/clients', getThirdPartyClients);
router.get('/:tenantId/staff', getThirdPartyStaff);
router.get('/:tenantId/plans', getThirdPartyPlans);
router.get('/:tenantId/info', getThirdPartyInfo);
router.get('/:tenantId/stats', getThirdPartyStats);
router.get('/:tenantId/compliance', getThirdPartyCompliance);
router.post('/:tenantId/compliance/sweep', runThirdPartyComplianceSweep);

export default router;
