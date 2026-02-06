import { Router } from 'express';

const router = Router();

router.get('/me', async (_req, res) => {
  res.json({ id: 'guest', username: 'Guest', rating: 1500, createdAt: new Date().toISOString() });
});

export default router;
