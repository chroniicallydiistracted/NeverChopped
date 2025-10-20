
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

interface ESPNGame {
  game: any;
  plays: any[];
}

/**
 * Fetches ESPN game data using the Python pyespn library
 * @param gameId The ESPN game ID
 * @returns Promise<ESPNGame | null> The game data or null if an error occurred
 */
export async function fetchEspnGameData(gameId: string): Promise<ESPNGame | null> {
  try {
    const scriptPath = path.join(process.cwd(), 'py scripts/fetch_espn_data.py');
    const tempOutputPath = path.join(process.cwd(), `tmp/espn_${gameId}_${Date.now()}.json`);

    // Ensure tmp directory exists
    await fs.mkdir(path.dirname(tempOutputPath), { recursive: true });

    // Execute the Python script
    const { stdout, stderr } = await execAsync(`python "${scriptPath}" "${gameId}" "${tempOutputPath}"`);

    if (stderr) {
      console.error(`Python script error: ${stderr}`);
    }

    // Read the output file
    const data = await fs.readFile(tempOutputPath, 'utf8');

    // Clean up the temp file
    await fs.unlink(tempOutputPath).catch(() => {}); // Ignore errors if file doesn't exist

    // Parse and return the data
    return JSON.parse(data) as ESPNGame;
  } catch (error) {
    console.error(`Error fetching ESPN data for game ${gameId}:`, error);
    return null;
  }
}

/**
 * Fetches ESPN schedule data for a specific week
 * @param week The week number
 * @param year The season year
 * @returns Promise<any | null> The schedule data or null if an error occurred
 */
export async function fetchEspnSchedule(week: number, year: number): Promise<any | null> {
  try {
    const scriptPath = path.join(process.cwd(), 'py scripts/fetch_espn_schedule.py');
    const tempOutputPath = path.join(process.cwd(), `tmp/espn_schedule_${week}_${year}_${Date.now()}.json`);

    // Ensure tmp directory exists
    await fs.mkdir(path.dirname(tempOutputPath), { recursive: true });

    // Execute the Python script
    const { stdout, stderr } = await execAsync(`python "${scriptPath}" "${week}" "${year}" "${tempOutputPath}"`);

    if (stderr) {
      console.error(`Python script error: ${stderr}`);
    }

    // Read the output file
    const data = await fs.readFile(tempOutputPath, 'utf8');

    // Clean up the temp file
    await fs.unlink(tempOutputPath).catch(() => {}); // Ignore errors if file doesn't exist

    // Parse and return the data
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error fetching ESPN schedule for week ${week} of ${year}:`, error);
    return null;
  }
}

// Command line interface
if (require.main === module) {
  const gameId = process.argv[2];
  if (!gameId) {
    console.error('Please provide a game ID');
    process.exit(1);
  }

  fetchEspnGameData(gameId)
    .then(data => {
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.error('Failed to fetch data');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}
