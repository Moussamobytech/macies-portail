import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { getAdminStats, getAdminClients } from '../controllers/adminController';

const router = Router();

router.get('/stats', authenticateToken, requireAdmin, getAdminStats);
router.get('/clients', authenticateToken, requireAdmin, getAdminClients);

export default router;
