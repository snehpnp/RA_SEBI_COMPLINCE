"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const thirdPartyController_1 = require("./thirdPartyController");
const router = (0, express_1.Router)();
// Dynamic routes supporting query params or headers
router.get('/clients', thirdPartyController_1.getThirdPartyClients);
router.get('/staff', thirdPartyController_1.getThirdPartyStaff);
router.get('/plans', thirdPartyController_1.getThirdPartyPlans);
router.get('/info', thirdPartyController_1.getThirdPartyInfo);
// Dynamic routes with :tenantId or :adminId param
router.get('/:tenantId/clients', thirdPartyController_1.getThirdPartyClients);
router.get('/:tenantId/staff', thirdPartyController_1.getThirdPartyStaff);
router.get('/:tenantId/plans', thirdPartyController_1.getThirdPartyPlans);
router.get('/:tenantId/info', thirdPartyController_1.getThirdPartyInfo);
exports.default = router;
