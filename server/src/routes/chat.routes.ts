import { Router } from 'express';
import { getChatHistory } from '../controllers/chat.controller';

const router = Router();

router.get('/history/:matchId', getChatHistory);

export default router;
