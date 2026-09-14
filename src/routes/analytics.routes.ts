import { Router } from 'express';
import { getTrends } from '../controllers/analytics.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/trends', getTrends);

export default router;
