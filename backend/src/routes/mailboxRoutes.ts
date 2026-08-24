import { Router } from 'express';
import { getMailbox, saveMailbox, disableMailbox, testConnection, syncMailbox } from '../controllers/mailboxController';
import { requireAuth, requireOrg } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth, requireOrg);

router.get('/', getMailbox);
router.post('/', saveMailbox);
router.post('/disable', disableMailbox);
router.post('/test', testConnection);
router.post('/sync', syncMailbox);

export default router;
