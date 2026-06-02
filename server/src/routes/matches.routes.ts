import { Router } from 'express';
import { getMatches, likeUser, passUser } from '../controllers/matches.controller';

const router = Router();

router.get('/', getMatches);
router.post('/like/:userId', likeUser);
router.post('/pass/:userId', passUser);

export default router;
