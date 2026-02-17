export type StockfishMove = {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
  uci: string;
};

const WORKER_URL = `/stockfish/stockfish-nnue-16-single.js#${encodeURIComponent(
  '/stockfish/stockfish-nnue-16-single.wasm'
)}`;

const LEVEL_DEPTH: Record<number, number> = {
  1: 2,
  2: 4,
  4: 8,
  6: 10,
  8: 12,
  10: 14
};

const LEVEL_SKILL: Record<number, number> = {
  1: 0,
  2: 4,
  4: 8,
  6: 12,
  8: 16,
  10: 20
};

const LEVEL_ELO: Record<number, number> = {
  1: 800,
  2: 1000,
  4: 1300,
  6: 1700,
  8: 2100,
  10: 2500
};

type PendingRequest = {
  resolve: (move: StockfishMove) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

function valueForLevel(level: number, table: Record<number, number>) {
  const levelKeys = Object.keys(table).map(Number);
  const nearest = levelKeys.reduce((closest, current) => {
    return Math.abs(current - level) < Math.abs(closest - level) ? current : closest;
  }, levelKeys[0]);
  return table[nearest];
}

function parseBestMove(uci: string): StockfishMove | null {
  const match = uci.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);
  if (!match) return null;
  return {
    from: match[1],
    to: match[2],
    promotion: match[3] as StockfishMove['promotion'] | undefined,
    uci
  };
}

export class StockfishClient {
  private worker: Worker;
  private pending: PendingRequest | null = null;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (error: Error) => void;
  private isReady = false;
  private destroyed = false;

  constructor() {
    if (typeof window === 'undefined') {
      throw new Error('Stockfish client can only run in the browser');
    }

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    this.worker = new Worker(WORKER_URL);
    this.worker.onmessage = (event) => {
      this.handleLine(typeof event.data === 'string' ? event.data : String(event.data || ''));
    };
    this.worker.onerror = () => {
      const error = new Error('Stockfish worker failed');
      this.rejectPending(error);
      if (!this.isReady) {
        this.readyReject(error);
      }
    };
    this.send('uci');
  }

  ready() {
    return this.readyPromise;
  }

  async bestMove(fen: string, level: number) {
    if (this.destroyed) {
      throw new Error('Stockfish has been terminated');
    }
    if (this.pending) {
      throw new Error('Stockfish is already thinking');
    }

    await this.readyPromise;

    const depth = valueForLevel(level, LEVEL_DEPTH);
    const skill = valueForLevel(level, LEVEL_SKILL);
    const elo = valueForLevel(level, LEVEL_ELO);

    return new Promise<StockfishMove>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending = null;
        this.send('stop');
        reject(new Error('Stockfish timed out'));
      }, 15000);

      this.pending = { resolve, reject, timeoutId };

      this.send('setoption name UCI_LimitStrength value true');
      this.send(`setoption name Skill Level value ${skill}`);
      this.send(`setoption name UCI_Elo value ${elo}`);
      this.send('ucinewgame');
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.rejectPending(new Error('Stockfish engine was stopped'));
    this.worker.terminate();
  }

  private handleLine(line: string) {
    if (!line) return;

    if (line === 'uciok') {
      this.isReady = true;
      this.readyResolve();
      return;
    }

    if (!line.startsWith('bestmove') || !this.pending) {
      return;
    }

    const [, uci] = line.trim().split(/\s+/);
    const request = this.pending;
    this.pending = null;
    clearTimeout(request.timeoutId);

    if (!uci || uci === '(none)' || uci === '0000') {
      request.reject(new Error('Stockfish did not return a legal move'));
      return;
    }

    const move = parseBestMove(uci);
    if (!move) {
      request.reject(new Error(`Invalid Stockfish move: ${uci}`));
      return;
    }

    request.resolve(move);
  }

  private rejectPending(error: Error) {
    if (!this.pending) return;
    const request = this.pending;
    this.pending = null;
    clearTimeout(request.timeoutId);
    request.reject(error);
  }

  private send(command: string) {
    if (this.destroyed) return;
    this.worker.postMessage(command);
  }
}
