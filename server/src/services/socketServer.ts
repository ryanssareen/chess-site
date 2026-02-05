import { Server } from 'socket.io';
import { getGame, handleMove, createGame } from './gameService';
import { nanoid } from 'nanoid';

export function setupSocket(io: Server) {
  const waiting: Record<string, { socketId: string; user: { id: string; username: string; rating: number } } | null> = {};

  io.on('connection', (socket) => {
    const user = { id: socket.handshake.auth?.userId || nanoid(), username: socket.handshake.auth?.username || 'Guest', rating: 1500 };

    socket.on('joinGame', ({ gameId }) => {
      socket.join(gameId);
      const game = getGame(gameId);
      if (game) {
        const perspective = user.id === game.white.id ? 'white' : user.id === game.black.id ? 'black' : undefined;
        socket.emit('game', { ...game, perspective });
      }
    });

    socket.on('leaveGame', ({ gameId }) => socket.leave(gameId));

    socket.on('move', async ({ gameId, from, to, promotion }) => {
      const { game, error, aiMove } = await handleMove(gameId, { from, to, promotion }, user.id);
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

    socket.on('queue', ({ timeControl, rated }) => {
      const existing = waiting[timeControl];
      if (existing) {
        const whiteFirst = Math.random() > 0.5;
        const game = createGame(whiteFirst ? existing.user : user, whiteFirst ? user : existing.user, timeControl, rated);
        const otherSocket = io.sockets.sockets.get(existing.socketId);
        socket.join(game.id);
        otherSocket?.join(game.id);
        const yourColor = game.white.id === user.id ? 'white' : 'black';
        const theirColor = game.white.id === existing.user.id ? 'white' : 'black';
        socket.emit('game', { ...game, perspective: yourColor });
        otherSocket?.emit('game', { ...game, perspective: theirColor });
        waiting[timeControl] = null;
      } else {
        waiting[timeControl] = { socketId: socket.id, user };
        socket.emit('status', { message: 'Waiting for opponent...' });
      }
    });
  });
}
