"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const complaintController_1 = require("../controllers/complaintController");
const router = (0, express_1.Router)();
router.get('/', complaintController_1.getComplaints);
router.post('/', complaintController_1.createComplaint);
router.put('/:id/resolve', complaintController_1.resolveComplaint);
exports.default = router;
