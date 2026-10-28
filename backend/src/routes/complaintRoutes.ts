import { Router } from 'express';
import { getComplaints, createComplaint, resolveComplaint, deleteComplaint } from '../controllers/complaintController';

const router = Router();

router.get('/', getComplaints);
router.post('/', createComplaint);
router.put('/:id/resolve', resolveComplaint);
router.delete('/:id', deleteComplaint);

export default router;
