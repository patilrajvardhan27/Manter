import { Router } from 'express';
import { submitRating, getRatings, getCommunityFeed } from '../controllers/ratings.controller';

const router = Router();

router.get('/feed', getCommunityFeed);
router.post('/:userId', submitRating);
router.get('/:userId', getRatings);

export default router;
