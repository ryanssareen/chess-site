import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../db';
import { config } from '../config';
import { z } from 'zod';

const router = Router();
const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

const schema = z.object({ username: z.string().min(3).max(20), password: z.string().min(6) });
const googleSchema = z.object({ idToken: z.string().min(10) });

async function uniqueUsername(base: string) {
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 18) || 'player';
  let candidate = slug;
  let counter = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await prisma.user.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
    candidate = `${slug}${counter++}`;
  }
}

router.post('/register', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const { username, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return res.status(409).json({ message: 'Username taken' });
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { username, password: hashed, provider: 'local' } });
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

router.post('/google', async (req, res) => {
  if (!googleClient) return res.status(500).json({ message: 'Google auth not configured' });
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: config.googleClientId
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      return res.status(401).json({ message: 'Unable to verify Google token' });
    }

    const googleId = payload.sub;
    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      const baseUsername = payload.name || payload.email.split('@')[0] || 'player';
      const username = await uniqueUsername(baseUsername);
      // store a random password hash so the field is non-null
      const randomPass = await bcrypt.hash(googleId + config.jwtSecret, 10);
      user = await prisma.user.create({
        data: {
          username,
          email: payload.email,
          googleId,
          provider: 'google',
          password: randomPass
        }
      });
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });
    res.json({ id: user.id, username: user.username, rating: user.rating, token });
  } catch (err) {
    console.error('Google auth error', err);
    res.status(401).json({ message: 'Google authentication failed' });
  }
});

export default router;
