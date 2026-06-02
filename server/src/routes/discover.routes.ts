import { Router } from 'express';
import { getDiscoverFeed } from '../controllers/discover.controller';

const router = Router();

router.get('/', getDiscoverFeed);

export default router;
