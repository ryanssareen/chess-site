import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../db';
import { config } from '../config';
import { signAuthToken } from '../services/jwt';
import { requireTrainingUser } from '../middleware/auth';
import { AuthedRequest } from '../types';
import { getFirebaseAuth } from '../services/firebaseAdmin';

const router = Router();

const credentialSchema = z.object({
  username: z.string().min(1).max(32),
  password: z.string().min(8).max(128)
});

const firebaseSchema = z.object({
  idToken: z.string().min(1)
});

const normalizeUsername = (value: string) => value.trim().toLowerCase();

const hasProvider = (current: string, provider: 'local' | 'google' | 'phone') =>
  current
    .split('+')
    .map((part) => part.trim())
    .includes(provider);

const mergeProvider = (current: string, provider: 'local' | 'google' | 'phone') => {
  const parts = new Set(
    current
      .split('+')
      .map((part) => part.trim())
      .filter(Boolean)
  );
  parts.add(provider);
  return Array.from(parts).sort().join('+');
};

const authPayload = (user: { id: string; username: string; rating: number; email?: string | null; provider?: string }) => ({
  id: user.id,
  username: user.username,
  rating: user.rating,
  email: user.email ?? null,
  provider: user.provider || 'local'
});

type FirebaseProvider = 'google' | 'phone';

function mapFirebaseProvider(provider: string | undefined): FirebaseProvider | null {
  if (provider === 'google.com') return 'google';
  if (provider === 'phone') return 'phone';
  return null;
}

async function authenticateWithFirebase(idToken: string, allowedProviders?: FirebaseProvider[]) {
  const decodedToken = await getFirebaseAuth().verifyIdToken(idToken, true);
  if (!decodedToken.uid) {
    throw new Error('INVALID_TOKEN_PAYLOAD');
  }

  const provider = mapFirebaseProvider(decodedToken.firebase?.sign_in_provider);
  if (!provider) {
    throw new Error('UNSUPPORTED_PROVIDER');
  }
  if (allowedProviders && !allowedProviders.includes(provider)) {
    throw new Error('PROVIDER_MISMATCH');
  }

  const email = typeof decodedToken.email === 'string' ? decodedToken.email : null;
  if (provider === 'google' && email && decodedToken.email_verified !== true) {
    throw new Error('UNVERIFIED_GOOGLE_EMAIL');
  }

  const existing = await prisma.user.findUnique({ where: { username: config.trainingUsername } });
  if (existing?.googleId && existing.googleId !== decodedToken.uid) {
    throw new Error('ACCOUNT_MISMATCH');
  }

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          googleId: decodedToken.uid,
          email: email || existing.email,
          provider: mergeProvider(existing.provider, provider)
        }
      })
    : await prisma.user.create({
        data: {
          username: config.trainingUsername,
          password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
          provider,
          googleId: decodedToken.uid,
          email
        }
      });

  const token = signAuthToken(user.id);
  return { token, user: authPayload(user) };
}

router.post('/register', async (req, res) => {
  const parsed = credentialSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid credentials payload' });
  }

  const username = normalizeUsername(parsed.data.username);
  if (username !== config.trainingUsername) {
    return res.status(403).json({ message: `Only ${config.trainingUsername} is allowed` });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const existing = await prisma.user.findUnique({ where: { username: config.trainingUsername } });

  if (existing && hasProvider(existing.provider, 'local')) {
    return res.status(409).json({ message: 'Training account already has a password login' });
  }

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          password: passwordHash,
          provider: mergeProvider(existing.provider, 'local')
        }
      })
    : await prisma.user.create({
        data: {
          username: config.trainingUsername,
          password: passwordHash,
          provider: 'local'
        }
      });

  const token = signAuthToken(user.id);
  return res.json({ token, user: authPayload(user) });
});

router.post('/login', async (req, res) => {
  const parsed = credentialSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid credentials payload' });
  }

  const username = normalizeUsername(parsed.data.username);
  if (username !== config.trainingUsername) {
    return res.status(403).json({ message: `Only ${config.trainingUsername} is allowed` });
  }

  const user = await prisma.user.findUnique({ where: { username: config.trainingUsername } });
  if (!user) {
    return res.status(404).json({ message: 'Training account not found. Register first.' });
  }

  const validPassword = await bcrypt.compare(parsed.data.password, user.password);
  if (!validPassword) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const token = signAuthToken(user.id);
  return res.json({ token, user: authPayload(user) });
});

router.post('/firebase', async (req, res) => {
  const parsed = firebaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'idToken is required' });
  }

  try {
    const session = await authenticateWithFirebase(parsed.data.idToken, ['google', 'phone']);
    return res.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid Firebase token';
    if (message.includes('not configured')) {
      return res.status(500).json({ message: 'Firebase auth is not configured on the server' });
    }
    if (message === 'PROVIDER_MISMATCH' || message === 'UNSUPPORTED_PROVIDER') {
      return res.status(401).json({ message: 'Unsupported sign-in provider for this platform' });
    }
    if (message === 'UNVERIFIED_GOOGLE_EMAIL') {
      return res.status(401).json({ message: 'Google account email is not verified' });
    }
    if (message === 'ACCOUNT_MISMATCH') {
      return res.status(403).json({ message: 'Firebase account does not match the training owner' });
    }
    return res.status(401).json({ message: 'Invalid Firebase token' });
  }
});

router.post('/google', async (req, res) => {
  const parsed = firebaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'idToken is required' });
  }

  try {
    const session = await authenticateWithFirebase(parsed.data.idToken, ['google']);
    return res.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid Firebase token';
    if (message.includes('not configured')) {
      return res.status(500).json({ message: 'Firebase auth is not configured on the server' });
    }
    if (message === 'PROVIDER_MISMATCH') {
      return res.status(401).json({ message: 'This endpoint only accepts Google sign-in tokens' });
    }
    if (message === 'ACCOUNT_MISMATCH') {
      return res.status(403).json({ message: 'Firebase account does not match the training owner' });
    }
    return res.status(401).json({ message: 'Invalid Firebase token' });
  }
});

router.post('/phone', async (req, res) => {
  const parsed = firebaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'idToken is required' });
  }

  try {
    const session = await authenticateWithFirebase(parsed.data.idToken, ['phone']);
    return res.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid Firebase token';
    if (message.includes('not configured')) {
      return res.status(500).json({ message: 'Firebase auth is not configured on the server' });
    }
    if (message === 'PROVIDER_MISMATCH') {
      return res.status(401).json({ message: 'This endpoint only accepts phone sign-in tokens' });
    }
    if (message === 'ACCOUNT_MISMATCH') {
      return res.status(403).json({ message: 'Firebase account does not match the training owner' });
    }
    return res.status(401).json({ message: 'Invalid Firebase token' });
  }
});

router.get('/me', requireTrainingUser, async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  return res.json({ user: authPayload(req.user) });
});

export default router;
