import { Router } from 'express';
import {
  getWaterLog,
  logWater,
  resetWater,
  getReminderConfig,
  updateReminderConfig,
} from '../controllers/water.controller.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(optionalAuth);

router.get('/log', getWaterLog);
router.post('/log', logWater);
router.post('/reset', resetWater);
router.get('/reminder-config', getReminderConfig);
router.put('/reminder-config', updateReminderConfig);

export default router;
