export type StockfishMove = {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
  uci: string;
};

export type StockfishEvaluation = {
  bestMove?: StockfishMove;
  bestLineUci: string;
  score: string;
};

const ENGINE_BASENAME = 'stockfish-nnue-16-single';
const LOCAL_STOCKFISH_BASE = '/stockfish';
const CDN_STOCKFISH_BASE = 'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src';

const LEVEL_DEPTH: Record<number, number> = {
  1: 3,
  2: 6,
  4: 10,
  6: 14,
  8: 18,
  10: 20
};

const LEVEL_SKILL: Record<number, number> = {
  1: 0,
  2: 4,
  4: 8,
  6: 12,
  8: 18,
  10: 20
};

const LEVEL_ELO: Record<number, number> = {
  1: 700,
  2: 1000,
  4: 1400,
  6: 1800,
  8: 2300,
  10: 2900
};

type SearchResult = {
  move?: StockfishMove;
  bestLineUci: string;
  score: string;
};

type PendingRequest = {
  resolve: (result: SearchResult) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
  bestLineUci: string;
  score: string;
};

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

function formatCp(cp: number) {
  return (cp / 100).toFixed(2);
}

function valueForLevel(level: number, table: Record<number, number>) {
  const keys = Object.keys(table).map(Number);
  const nearest = keys.reduce((closest, current) => {
    return Math.abs(current - level) < Math.abs(closest - level) ? current : closest;
  }, keys[0]);
  return table[nearest];
}

function normalizeBase(base: string) {
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

function buildWorkerUrl(base: string) {
  const normalized = normalizeBase(base);
  const js = `${normalized}/${ENGINE_BASENAME}.js`;
  const wasm = `${normalized}/${ENGINE_BASENAME}.wasm`;
  return `${js}#${encodeURIComponent(wasm)}`;
}

function workerCandidates() {
  const candidates: string[] = [buildWorkerUrl(LOCAL_STOCKFISH_BASE)];

  if (typeof window !== 'undefined') {
    const [, firstSegment] = window.location.pathname.split('/');
    if (firstSegment) {
      candidates.push(buildWorkerUrl(`/${firstSegment}/stockfish`));
    }
  }

  candidates.push(buildWorkerUrl(CDN_STOCKFISH_BASE));
  return Array.from(new Set(candidates));
}

export class StockfishClient {
  private worker: Worker | null = null;
  private pending: PendingRequest | null = null;
  private readyPromise: Promise<void>;
  private destroyed = false;
  private ready = false;
  private workerUrl = '';

  constructor() {
    if (typeof window === 'undefined') {
      throw new Error('Stockfish client can only run in the browser');
    }

    this.readyPromise = this.initializeWithFallback();
  }

  async bestMove(fen: string, level: number) {
    await this.readyPromise;

    const depth = valueForLevel(level, LEVEL_DEPTH);
    const skill = valueForLevel(level, LEVEL_SKILL);
    const elo = valueForLevel(level, LEVEL_ELO);
    const result = await this.runSearch({
      fen,
      depth,
      limitStrength: level < 8,
      skill,
      elo
    });

    if (!result.move) {
      throw new Error('Stockfish did not return a legal move');
    }

    return result.move;
  }

  async evaluatePosition(fen: string, depth = 14): Promise<StockfishEvaluation> {
    await this.readyPromise;
    const boundedDepth = Math.max(8, Math.min(depth, 22));
    const result = await this.runSearch({
      fen,
      depth: boundedDepth,
      limitStrength: false
    });

    return {
      bestMove: result.move,
      bestLineUci: result.bestLineUci,
      score: result.score
    };
  }

  readyState() {
    return this.readyPromise;
  }

  getWorkerUrl() {
    return this.workerUrl;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.pending) {
      const current = this.pending;
      this.pending = null;
      clearTimeout(current.timeoutId);
      current.reject(new Error('Stockfish engine stopped'));
    }

    this.worker?.terminate();
    this.worker = null;
  }

  private async initializeWithFallback() {
    let lastError: Error | null = null;

    for (const url of workerCandidates()) {
      try {
        await this.attachWorker(url);
        this.workerUrl = url;
        this.ready = true;
        return;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        lastError = new Error(message);
      }
    }

    throw lastError || new Error('Stockfish failed to initialize');
  }

  private attachWorker(url: string) {
    return new Promise<void>((resolve, reject) => {
      if (this.destroyed) {
        reject(new Error('Stockfish was destroyed before init'));
        return;
      }

      const worker = new Worker(url);
      let settled = false;

      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        worker.terminate();
        reject(new Error(message));
      };

      const timeoutId = setTimeout(() => {
        fail(`Stockfish worker init timed out at ${url}`);
      }, 8000);

      worker.onmessage = (event) => {
        const line = typeof event.data === 'string' ? event.data : String(event.data || '');
        if (line === 'uciok') {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          this.worker = worker;
          this.worker.onmessage = (messageEvent) => {
            this.handleLine(typeof messageEvent.data === 'string' ? messageEvent.data : String(messageEvent.data || ''));
          };
          this.worker.onerror = () => {
            const error = new Error(`Stockfish worker crashed (${url})`);
            if (this.pending) {
              const current = this.pending;
              this.pending = null;
              clearTimeout(current.timeoutId);
              current.reject(error);
            }
          };
          resolve();
        }
      };

      worker.onerror = () => {
        fail(`Stockfish worker failed to load at ${url}`);
      };

      worker.postMessage('uci');
    });
  }

  private runSearch(params: {
    fen: string;
    depth: number;
    limitStrength: boolean;
    skill?: number;
    elo?: number;
  }) {
    if (!this.worker || !this.ready) {
      throw new Error('Stockfish is not ready');
    }
    if (this.pending) {
      throw new Error('Stockfish is already thinking');
    }

    return new Promise<SearchResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending = null;
        this.send('stop');
        reject(new Error('Stockfish timed out'));
      }, 20000);

      this.pending = {
        resolve,
        reject,
        timeoutId,
        bestLineUci: '',
        score: ''
      };

      this.send(`setoption name UCI_LimitStrength value ${params.limitStrength ? 'true' : 'false'}`);
      if (params.limitStrength && typeof params.skill === 'number' && typeof params.elo === 'number') {
        this.send(`setoption name Skill Level value ${params.skill}`);
        this.send(`setoption name UCI_Elo value ${params.elo}`);
      }
      this.send('setoption name MultiPV value 1');
      this.send('ucinewgame');
      this.send(`position fen ${params.fen}`);
      this.send(`go depth ${params.depth}`);
    });
  }

  private handleLine(line: string) {
    if (!line || !this.pending) return;

    if (line.startsWith('info ')) {
      this.captureInfo(line);
      return;
    }

    if (!line.startsWith('bestmove')) {
      return;
    }

    const request = this.pending;
    this.pending = null;
    clearTimeout(request.timeoutId);

    const [, uci] = line.trim().split(/\s+/);
    const move = uci && uci !== '(none)' && uci !== '0000' ? parseBestMove(uci) || undefined : undefined;

    request.resolve({
      move,
      bestLineUci: request.bestLineUci,
      score: request.score
    });
  }

  private captureInfo(line: string) {
    if (!this.pending) return;

    const tokens = line.trim().split(/\s+/);

    const scoreIndex = tokens.indexOf('score');
    if (scoreIndex !== -1) {
      const scoreType = tokens[scoreIndex + 1];
      const scoreValue = Number(tokens[scoreIndex + 2]);
      if (scoreType === 'cp' && Number.isFinite(scoreValue)) {
        this.pending.score = formatCp(scoreValue);
      }
      if (scoreType === 'mate' && Number.isFinite(scoreValue)) {
        const sign = scoreValue > 0 ? '' : '-';
        this.pending.score = `${sign}M${Math.abs(scoreValue)}`;
      }
    }

    const pvIndex = tokens.indexOf('pv');
    if (pvIndex !== -1) {
      this.pending.bestLineUci = tokens.slice(pvIndex + 1).join(' ');
    }
  }

  private send(command: string) {
    if (this.destroyed || !this.worker) return;
    this.worker.postMessage(command);
  }
}
