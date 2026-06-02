import { Router } from 'express';
import { getMe, updateProfile, getUserById, saveWeights, savePushToken } from '../controllers/users.controller';

const router = Router();

router.get('/me', getMe);
router.put('/me', updateProfile);
router.post('/me/weights', saveWeights);
router.post('/me/push-token', savePushToken);
router.get('/:id', getUserById);

export default router;
