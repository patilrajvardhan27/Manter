import { Router } from 'express';
import { register, login, refresh } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { RegisterSchema, LoginSchema } from '../../../shared/schemas/auth.schema';

const router = Router();

router.post('/register', validate(RegisterSchema), register);
router.post('/login', validate(LoginSchema), login);
router.post('/refresh', refresh);

export default router;
