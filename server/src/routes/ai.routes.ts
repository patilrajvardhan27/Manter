import { Router } from 'express';
import { analyzeMatchConversation, getUserRedFlagStats } from '../controllers/ai.controller';

const router = Router();

// POST /ai/analyze/:matchId  — full conversation analysis (women only)
router.post('/analyze/:matchId', analyzeMatchConversation);

// GET /ai/stats/:userId  — aggregate red flag stats for a man's profile
router.get('/stats/:userId', getUserRedFlagStats);

export default router;
