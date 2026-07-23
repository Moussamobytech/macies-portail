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

// Static routes
router.get('/all', authenticateToken, requireAdmin, getAllRequests);
router.get('/', authenticateToken, getClientRequests);
router.post('/', authenticateToken, createRequest);
router.post('/upload-token', generateUploadToken);

// Dynamic routes
router.get('/:id', authenticateToken, getRequestById);
router.get('/:id/messages', authenticateToken, getMessages);
router.post('/:id/messages', authenticateToken, sendMessage);
router.patch('/:id', authenticateToken, requireAdmin, updateRequestStatus);
router.post('/:id/deliver', authenticateToken, requireAdmin, deliverRequest);

export default router;
