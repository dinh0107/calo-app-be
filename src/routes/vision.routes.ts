import { Router } from 'express';
import { analyzeFood } from '../controllers/vision.controller.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/analyze', optionalAuth, analyzeFood);

export default router;
