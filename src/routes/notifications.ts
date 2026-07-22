import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken); // Toutes les routes de notifications nécessitent d'être connecté

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

export default router;
