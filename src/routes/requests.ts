import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { getClientRequests, createRequest, getAllRequests, updateRequestStatus, deliverRequest } from '../controllers/requestController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authenticateToken, getClientRequests);
router.post('/', authenticateToken, upload.array('files', 5), createRequest);

router.get('/all', authenticateToken, requireAdmin, getAllRequests);
router.patch('/:id', authenticateToken, requireAdmin, updateRequestStatus);
router.post('/:id/deliver', authenticateToken, requireAdmin, upload.single('file'), deliverRequest);

export default router;
