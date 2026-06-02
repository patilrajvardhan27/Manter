import { Router } from 'express';
import { getMe, updateProfile, getUserById } from '../controllers/users.controller';

const router = Router();

router.get('/me', getMe);
router.put('/me', updateProfile);
router.get('/:id', getUserById);

export default router;
