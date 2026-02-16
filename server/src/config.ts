import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'development-secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  trainingUsername: (process.env.TRAINING_USERNAME || 'ryansucksatlifetoo').trim().toLowerCase(),
  chessComUsername: (process.env.CHESS_COM_USERNAME || process.env.TRAINING_USERNAME || 'ryansucksatlifetoo')
    .trim()
    .toLowerCase(),
  firebaseProjectId: (process.env.FIREBASE_PROJECT_ID || '').trim(),
  firebaseClientEmail: (process.env.FIREBASE_CLIENT_EMAIL || '').trim(),
  firebasePrivateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
};
