import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { getClientRequests, createRequest, getAllRequests, updateRequestStatus } from '../controllers/requestController';

const router = Router();

router.get('/', authenticateToken, getClientRequests);
router.post('/', authenticateToken, createRequest);

router.get('/all', authenticateToken, requireAdmin, getAllRequests);
router.patch('/:id', authenticateToken, requireAdmin, updateRequestStatus);

export default router;
