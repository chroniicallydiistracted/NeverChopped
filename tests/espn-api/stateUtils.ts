import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type JsonValue = Record<string, any> | Array<any> | string | number | boolean | null;
export type FakeState = {
  events?: Record<string, Record<string, Array<Record<string, JsonValue>>>>;
  players?: Record<string, Record<string, JsonValue>>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statePath = path.resolve(__dirname, 'fakes', 'pyespn', '_state.json');

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

let cachedDefaultState: FakeState | null = null;

export const getFakeStatePath = () => statePath;

export async function readFakeState(): Promise<FakeState> {
  const raw = await fs.readFile(statePath, 'utf8');
  return JSON.parse(raw) as FakeState;
}

export async function getDefaultFakeState(): Promise<FakeState> {
  if (!cachedDefaultState) {
    cachedDefaultState = await readFakeState();
  }
  return clone(cachedDefaultState);
}

export async function writeFakeState(state: FakeState): Promise<void> {
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export async function resetFakeState(): Promise<void> {
  const defaultState = await getDefaultFakeState();
  await writeFakeState(defaultState);
}

export async function updateFakeEvent(
  eventId: string | number,
  mutate: (event: Record<string, JsonValue>) => void,
): Promise<void> {
  const state = await readFakeState();
  const targetId = String(eventId);
  const events = state.events ?? {};
  let changed = false;

  Object.values(events).forEach(weeks => {
    Object.values(weeks ?? {}).forEach(eventList => {
      if (!Array.isArray(eventList)) {
        return;
      }
      eventList.forEach(event => {
        if (!event || typeof event !== 'object') {
          return;
        }
        if (String(event.event_id ?? event['event_id']) === targetId) {
          mutate(event as Record<string, JsonValue>);
          changed = true;
        }
      });
    });
  });

  if (changed) {
    await writeFakeState(state);
  }
}

export async function updateFakePlayer(
  playerId: string | number,
  mutate: (player: Record<string, JsonValue>) => void,
): Promise<void> {
  const state = await readFakeState();
  const targetId = String(playerId);
  const players = state.players ?? {};
  const player = players[targetId];
  if (player) {
    mutate(player);
    await writeFakeState(state);
  }
}
