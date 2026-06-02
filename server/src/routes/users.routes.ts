import { Router } from 'express';
import { getMe, updateProfile, getUserById, saveWeights } from '../controllers/users.controller';

const router = Router();

router.get('/me', getMe);
router.put('/me', updateProfile);
router.post('/me/weights', saveWeights);
router.get('/:id', getUserById);

export default router;
