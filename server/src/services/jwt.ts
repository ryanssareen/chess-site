import jwt from 'jsonwebtoken';
import { config } from '../config';

type TokenPayload = {
  userId: string;
};

export function signAuthToken(userId: string) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '30d' });
}

export function verifyAuthToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}
