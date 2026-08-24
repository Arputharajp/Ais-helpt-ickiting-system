import { Router } from 'express';
import { createTicket, getTickets, getTicket, updateTicket, addMessage } from '../controllers/ticketController';
import { requireAuth, requireOrg } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth, requireOrg);

router.post('/', createTicket);
router.get('/', getTickets);
router.get('/:id', getTicket);
router.patch('/:id', updateTicket);
router.post('/:id/messages', addMessage);

export default router;
