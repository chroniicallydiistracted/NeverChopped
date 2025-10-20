const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs/promises');
const cors = require('cors');

const execAsync = promisify(exec);
const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

/**
 * API endpoint to fetch ESPN game data using the Python pyespn library
 */
app.get('/api/espn/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const scriptPath = path.join(process.cwd(), 'py scripts/fetch_espn_data.py');
    const tempOutputPath = path.join(process.cwd(), `tmp/espn_${gameId}_${Date.now()}.json`);

    // Ensure tmp directory exists
    await fs.mkdir(path.dirname(tempOutputPath), { recursive: true });

    // Execute the Python script
    const { stdout, stderr } = await execAsync(`python "${scriptPath}" "${gameId}" "${tempOutputPath}"`);

    if (stderr) {
      console.error(`Python script error: ${stderr}`);
      return res.status(500).json({ error: 'Failed to fetch data from ESPN' });
    }

    // Read the output file
    const data = await fs.readFile(tempOutputPath, 'utf8');

    // Clean up the temp file
    await fs.unlink(tempOutputPath).catch(() => {}); // Ignore errors if file doesn't exist

    // Parse and return the data
    const parsedData = JSON.parse(data);
    res.json(parsedData);
  } catch (error) {
    console.error(`Error fetching ESPN data:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * API endpoint to fetch ESPN schedule data for a specific week
 */
app.get('/api/espn/schedule/:week/:year', async (req, res) => {
  try {
    const { week, year } = req.params;
    const scriptPath = path.join(process.cwd(), 'py scripts/fetch_espn_schedule.py');
    const tempOutputPath = path.join(process.cwd(), `tmp/espn_schedule_${week}_${year}_${Date.now()}.json`);

    // Ensure tmp directory exists
    await fs.mkdir(path.dirname(tempOutputPath), { recursive: true });

    // Execute the Python script
    const { stdout, stderr } = await execAsync(`python "${scriptPath}" "${week}" "${year}" "${tempOutputPath}"`);

    if (stderr) {
      console.error(`Python script error: ${stderr}`);
      return res.status(500).json({ error: 'Failed to fetch schedule from ESPN' });
    }

    // Read the output file
    const data = await fs.readFile(tempOutputPath, 'utf8');

    // Clean up the temp file
    await fs.unlink(tempOutputPath).catch(() => {}); // Ignore errors if file doesn't exist

    // Parse and return the data
    const parsedData = JSON.parse(data);
    res.json(parsedData);
  } catch (error) {
    console.error(`Error fetching ESPN schedule:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`ESPN API server running on port ${PORT}`);
});
