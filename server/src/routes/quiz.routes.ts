import { Router } from 'express';
import { submitQuiz, getQuizStatus } from '../controllers/quiz.controller';

const router = Router();

router.get('/status', getQuizStatus);
router.post('/submit', submitQuiz);

export default router;
