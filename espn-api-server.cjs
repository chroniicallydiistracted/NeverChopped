const { spawn } = require('child_process');
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function createCache(ttlMs) {
  const store = new Map();
  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) {
        return null;
      }
      if (Date.now() - entry.timestamp > ttlMs) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    set(key, value) {
      store.set(key, { value, timestamp: Date.now() });
    },
  };
}

const scheduleCache = createCache(5 * 60 * 1000);
const gameCache = createCache(30 * 1000);
const pbpCache = createCache(10 * 1000);
const playerCache = createCache(60 * 60 * 1000);

function runPy(script, args = []) {
  return new Promise((resolve, reject) => {
    const scriptName = path.basename(script);
    const proc = spawn('python', [script, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', chunk => {
      const text = chunk.toString();
      stderr += text;
      const lines = text.split(/\r?\n/).filter(Boolean);
      lines.forEach(line => {
        console.error(`[pyespn:${scriptName}] ${line}`);
      });
    });

    proc.on('close', code => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `python process exited with code ${code}`));
      }
    });

    proc.on('error', err => {
      console.error(`[pyespn:${scriptName}] failed to spawn python process`, err);
      reject(err);
    });
  });
}

const router = express.Router();

router.get('/schedule/:seasonType/:season/:week', async (req, res) => {
  const { seasonType, season, week } = req.params;
  const forceRefresh =
    req.query.force === 'true' || req.query.force === '1' || req.query.force === 'refresh';
  const cacheKey = `${seasonType}:${season}:${week}`.toLowerCase();
  try {
    if (!forceRefresh) {
      const cached = scheduleCache.get(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }
    }
    const script = path.join(process.cwd(), 'py/espn_schedule.py');
    const args = [seasonType, season, week];
    if (forceRefresh) {
      args.push('--force');
    }
    const raw = await runPy(script, args);
    const parsed = JSON.parse(raw || '{}');
    const normalized =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : { entries: Array.isArray(parsed) ? parsed : [], meta: null };
    scheduleCache.set(cacheKey, normalized);
    res.json(normalized);
  } catch (err) {
    console.error('Failed to fetch ESPN schedule', err);
    res.status(500).json({ error: 'Failed to fetch schedule from PyESPN' });
  }
});

router.get('/game/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const forceRefresh =
    req.query.force === 'true' || req.query.force === '1' || req.query.force === 'refresh';
  const cacheKey = String(eventId);
  try {
    if (!forceRefresh) {
      const cached = gameCache.get(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }
    }
    const script = path.join(process.cwd(), 'py/espn_game.py');
    const raw = await runPy(script, [eventId]);
    const data = JSON.parse(raw || '{}');
    gameCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch ESPN game info', err);
    res.status(500).json({ error: 'Failed to fetch game from PyESPN' });
  }
});

router.get('/game/:eventId/pbp', async (req, res) => {
  const { eventId } = req.params;
  const forceRefresh =
    req.query.force === 'true' || req.query.force === '1' || req.query.force === 'refresh';
  const cacheKey = String(eventId);
  try {
    if (!forceRefresh) {
      const cached = pbpCache.get(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }
    }
    const script = path.join(process.cwd(), 'py/espn_pbp.py');
    const raw = await runPy(script, [eventId]);
    const data = JSON.parse(raw || '{}');
    pbpCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch ESPN play-by-play', err);
    res.status(500).json({ error: 'Failed to fetch play-by-play from PyESPN' });
  }
});

router.get('/player/:playerId', async (req, res) => {
  const { playerId } = req.params;
  const forceRefresh =
    req.query.force === 'true' || req.query.force === '1' || req.query.force === 'refresh';
  const cacheKey = String(playerId);
  try {
    if (!forceRefresh) {
      const cached = playerCache.get(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }
    }
    const script = path.join(process.cwd(), 'py/espn_player.py');
    const raw = await runPy(script, [playerId]);
    const data = JSON.parse(raw || '{}');
    playerCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch ESPN player info', err);
    res.status(500).json({ error: 'Failed to fetch player from PyESPN' });
  }
});

app.use('/api/espn', router);

app.listen(PORT, () => {
  console.log(`ESPN API server running on port ${PORT}`);
});
