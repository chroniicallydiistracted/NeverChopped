
interface ESPNGame {
  game: any;
  plays: any[];
}

/**
 * Fetches ESPN game data using the API server
 * @param gameId The ESPN game ID
 * @returns Promise<ESPNGame | null> The game data or null if an error occurred
 */
export async function fetchEspnGameData(gameId: string): Promise<ESPNGame | null> {
  try {
    const response = await fetch(`/api/espn/game/${gameId}`);

    if (!response.ok) {
      console.error(`API request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data as ESPNGame;
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
    const response = await fetch(`/api/espn/schedule/${week}/${year}`);

    if (!response.ok) {
      console.error(`API request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching ESPN schedule for week ${week} of ${year}:`, error);
    return null;
  }
}
