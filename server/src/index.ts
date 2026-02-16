import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import matchRoutes from './routes/match';
import profileRoutes from './routes/profile';
import historyRoutes from './routes/history';
import analysisRoutes from './routes/analysis';
import { config } from './config';
import { setupSocket } from './services/socketServer';

const app = express();
app.use(express.json());
app.use(cors({ origin: config.corsOrigin, credentials: true }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/analysis', analysisRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] }
});
setupSocket(io);

server.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
