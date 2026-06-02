import { Router } from 'express';
import { reportUser, blockUser, unblockUser } from '../controllers/safety.controller';

const router = Router();

router.post('/report', reportUser);
router.post('/block/:userId', blockUser);
router.delete('/block/:userId', unblockUser);

export default router;
