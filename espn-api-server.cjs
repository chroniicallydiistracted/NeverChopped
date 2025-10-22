const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function runPy(script, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python', [script, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    proc.on('close', code => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `python process exited with code ${code}`));
      }
    });

    proc.on('error', err => {
      reject(err);
    });
  });
}

const router = express.Router();

router.get('/schedule/:seasonType/:season/:week', async (req, res) => {
  const { seasonType, season, week } = req.params;
  try {
    const script = path.join(process.cwd(), 'py/espn_schedule.py');
    const raw = await runPy(script, [seasonType, season, week]);
    const data = JSON.parse(raw || '[]');
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch ESPN schedule', err);
    res.status(500).json({ error: 'Failed to fetch schedule from PyESPN' });
  }
});

router.get('/game/:eventId', async (req, res) => {
  const { eventId } = req.params;
  try {
    const script = path.join(process.cwd(), 'py/espn_game.py');
    const raw = await runPy(script, [eventId]);
    const data = JSON.parse(raw || '{}');
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch ESPN game info', err);
    res.status(500).json({ error: 'Failed to fetch game from PyESPN' });
  }
});

router.get('/game/:eventId/pbp', async (req, res) => {
  const { eventId } = req.params;
  try {
    const script = path.join(process.cwd(), 'py/espn_pbp.py');
    const raw = await runPy(script, [eventId]);
    const data = JSON.parse(raw || '{}');
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch ESPN play-by-play', err);
    res.status(500).json({ error: 'Failed to fetch play-by-play from PyESPN' });
  }
});

router.get('/player/:playerId', async (req, res) => {
  const { playerId } = req.params;
  try {
    const script = path.join(process.cwd(), 'py/espn_player.py');
    const raw = await runPy(script, [playerId]);
    const data = JSON.parse(raw || '{}');
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
