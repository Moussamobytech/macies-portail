import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { 
  createRequest, 
  getClientRequests, 
  getAllRequests, 
  updateRequestStatus, 
  deliverRequest,
  generateUploadToken,
  getRequestById,
  getMessages,
  sendMessage
} from '../controllers/requestController';

const router = Router();

router.get('/', authenticateToken, getClientRequests);
router.get('/:id', authenticateToken, getRequestById);
router.get('/:id/messages', authenticateToken, getMessages);
router.post('/:id/messages', authenticateToken, sendMessage);
router.post('/', authenticateToken, createRequest);
router.post('/upload-token', generateUploadToken);

router.get('/all', authenticateToken, requireAdmin, getAllRequests);
router.patch('/:id', authenticateToken, requireAdmin, updateRequestStatus);
router.post('/:id/deliver', authenticateToken, requireAdmin, deliverRequest);

export default router;
