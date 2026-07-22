import { Router } from 'express';
import { createOrder, getUserOrders, getAllOrders, deliverOrder } from '../controllers/orderController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Client routes
router.post('/', createOrder);
router.get('/my-orders', getUserOrders);

// Admin routes
router.get('/all', requireAdmin, getAllOrders);
router.patch('/:id/deliver', requireAdmin, deliverOrder);

export default router;
