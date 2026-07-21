import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { getAdminStats, getAdminClients, getAdminLogs } from '../controllers/adminController';

const router = Router();

router.get('/stats', authenticateToken, requireAdmin, getAdminStats);
router.get('/clients', authenticateToken, requireAdmin, getAdminClients);
router.get('/logs', authenticateToken, requireAdmin, getAdminLogs);

export default router;
