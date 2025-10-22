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
const baseStatePath = path.resolve(__dirname, 'fakes', 'pyespn', '_state.json');

const resolveStatePath = () => {
  const override = process.env.PYESPN_FAKE_STATE_PATH;
  return override ? path.resolve(override) : baseStatePath;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

let cachedDefaultState: FakeState | null = null;

const ensureStateFile = async () => {
  const targetPath = resolveStatePath();
  try {
    await fs.access(targetPath);
    return;
  } catch {
    // fall through to create file
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const defaultState = await getDefaultFakeState();
  await fs.writeFile(targetPath, `${JSON.stringify(defaultState, null, 2)}\n`, 'utf8');
};

export const getFakeStatePath = () => resolveStatePath();

export async function readFakeState(): Promise<FakeState> {
  await ensureStateFile();
  const raw = await fs.readFile(resolveStatePath(), 'utf8');
  return JSON.parse(raw) as FakeState;
}

export async function getDefaultFakeState(): Promise<FakeState> {
  if (!cachedDefaultState) {
    const raw = await fs.readFile(baseStatePath, 'utf8');
    cachedDefaultState = JSON.parse(raw) as FakeState;
  }
  return clone(cachedDefaultState);
}

export async function writeFakeState(state: FakeState): Promise<void> {
  const targetPath = resolveStatePath();
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
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
