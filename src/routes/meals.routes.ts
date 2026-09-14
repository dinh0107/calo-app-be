import { Router } from 'express';
import {
  getMealsByDate,
  addMeal,
  deleteMeal,
  duplicateMeal,
  clearAllMeals,
} from '../controllers/meals.controller.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(optionalAuth);

router.get('/', getMealsByDate);
router.post('/', addMeal);
router.delete('/all', clearAllMeals);
router.delete('/:id', deleteMeal);
router.post('/:id/duplicate', duplicateMeal);

export default router;
