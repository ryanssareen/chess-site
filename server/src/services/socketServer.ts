import { Server } from 'socket.io';
import { getGame, handleMove } from './gameService';
import { verifyAuthToken } from './jwt';
import { prisma } from '../db';
import { config } from '../config';

export function setupSocket(io: Server) {
  io.use((socket, next) => {
    const rawToken = socket.handshake.auth?.token;
    const token = typeof rawToken === 'string' ? rawToken : '';
    if (!token) {
      return next(new Error('Missing auth token'));
    }

    try {
      const payload = verifyAuthToken(token);
      socket.data.userId = payload.userId;
      return next();
    } catch (err) {
      return next(new Error('Invalid auth token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = String(socket.data.userId || '');
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    let user: { id: string; username: string; rating: number } | null = null;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, rating: true }
      });
      if (!user || user.username.trim().toLowerCase() !== config.trainingUsername) {
        socket.emit('status', { message: 'Access denied: training account required.' });
        socket.disconnect(true);
        return;
      }
    } catch (err) {
      socket.emit('status', { message: 'Failed to load user session' });
      socket.disconnect(true);
      return;
    }
    const sessionUser = user;
    if (!sessionUser) {
      socket.disconnect(true);
      return;
    }

    socket.on('joinGame', ({ gameId }) => {
      socket.join(gameId);
      const game = getGame(gameId);
      if (game) {
        const perspective =
          sessionUser.id === game.white.id ? 'white' : sessionUser.id === game.black.id ? 'black' : undefined;
        socket.emit('game', { ...game, perspective });
      }
    });

    socket.on('leaveGame', ({ gameId }) => socket.leave(gameId));

    socket.on('move', async ({ gameId, from, to, promotion }) => {
      const { game, error, aiMove } = await handleMove(gameId, { from, to, promotion }, sessionUser.id);
      if (error) return socket.emit('status', { message: error });
      if (game) {
        io.to(gameId).emit('move', { ...game.moves[game.moves.length - 1], clocks: game.clocks, lastMoveAt: game.lastMoveAt });
        if (game.status === 'finished') {
          io.to(gameId).emit('game', game);
        }
      }
      if (aiMove && aiMove.game) {
        io.to(gameId).emit('move', { ...aiMove.game.moves[aiMove.game.moves.length - 1], clocks: aiMove.game.clocks, lastMoveAt: aiMove.game.lastMoveAt });
        if (aiMove.game.status === 'finished') io.to(gameId).emit('game', aiMove.game);
      }
    });

    socket.on('queue', () => {
      socket.emit('status', { message: 'Online matchmaking is disabled for this training-only platform.' });
    });
  });
}
