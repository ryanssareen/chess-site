import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'development-secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
};
