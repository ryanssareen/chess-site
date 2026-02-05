import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { config } from '../config';
import { z } from 'zod';

const router = Router();

const schema = z.object({ username: z.string().min(3).max(20), password: z.string().min(6) });

router.post('/register', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const { username, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return res.status(409).json({ message: 'Username taken' });
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { username, password: hashed } });
  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });
  res.json({ id: user.id, username: user.username, rating: user.rating, token });
});

router.post('/login', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const { username, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });
  res.json({ id: user.id, username: user.username, rating: user.rating, token });
});

export default router;
