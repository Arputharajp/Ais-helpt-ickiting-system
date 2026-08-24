import { Router } from 'express';
import { createCustomer, getCustomers } from '../controllers/customerController';
import { requireAuth, requireOrg } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth, requireOrg);

router.post('/', createCustomer);
router.get('/', getCustomers);

export default router;
