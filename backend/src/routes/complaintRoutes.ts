import { Router } from 'express';
import { getComplaints, createComplaint, resolveComplaint } from '../controllers/complaintController';

const router = Router();

router.get('/', getComplaints);
router.post('/', createComplaint);
router.put('/:id/resolve', resolveComplaint);

export default router;
