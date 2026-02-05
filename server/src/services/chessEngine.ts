import Stockfish from 'stockfish';

type Listener = (line: string) => void;

export class ChessEngine {
  private engine = Stockfish();
  private listeners: Listener[] = [];
  private ready = false;

  constructor() {
    this.engine.onmessage = (line: any) => {
      const text = typeof line === 'string' ? line : line?.data;
      if (!text) return;
      if (text === 'uciok') {
        this.ready = true;
      }
      this.listeners.forEach((fn) => fn(text));
    };
    this.engine.postMessage('uci');
  }

  private waitReady() {
    return new Promise<void>((resolve) => {
      if (this.ready) return resolve();
      const fn = (line: string) => {
        if (line === 'uciok') {
          this.listeners = this.listeners.filter((l) => l !== fn);
          resolve();
        }
      };
      this.listeners.push(fn);
    });
  }

  async bestMove(fen: string, depth = 12): Promise<{ move: string; bestLine: string; score: string }> {
    await this.waitReady();
    return new Promise((resolve) => {
      let bestLine = '';
      let score = '';
      const handler = (line: string) => {
        if (line.startsWith('info')) {
          const parts = line.split(' ');
          const scoreIdx = parts.indexOf('score');
          if (scoreIdx !== -1 && parts[scoreIdx + 1] === 'cp') {
            score = `${(parseInt(parts[scoreIdx + 2], 10) / 100).toFixed(2)}`;
          }
          const pvIdx = parts.indexOf('pv');
          if (pvIdx !== -1) {
            bestLine = parts.slice(pvIdx + 1).join(' ');
          }
        }
        if (line.startsWith('bestmove')) {
          const move = line.split(' ')[1];
          this.listeners = this.listeners.filter((l) => l !== handler);
          resolve({ move, bestLine, score });
        }
      };
      this.listeners.push(handler);
      this.engine.postMessage(`position fen ${fen}`);
      this.engine.postMessage(`go depth ${depth}`);
    });
  }
}

export const engine = new ChessEngine();
