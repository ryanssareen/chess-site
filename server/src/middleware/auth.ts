import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthedRequest } from '../types';

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Missing auth header' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
