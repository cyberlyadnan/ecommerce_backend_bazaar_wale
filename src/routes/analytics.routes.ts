import { Router } from 'express';
import { recordEventHandler } from '../controllers/analytics.controller';

const router = Router();

router.post('/events', recordEventHandler);

export default router;
