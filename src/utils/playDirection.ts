type DirectionCategory = 'left' | 'middle' | 'right';

export interface PlayDirectionMetadata {
  kind: 'rush' | 'pass' | 'kick' | 'special' | 'unknown';
  category: DirectionCategory;
  isDeep: boolean;
  isShort: boolean;
}

const directionKeywords: Array<{ pattern: RegExp; category: DirectionCategory }> = [
  { pattern: /(left|outside left|left sideline|short left|deep left|left tackle|left guard|left end)/i, category: 'left' },
  { pattern: /(up the middle|middle|center|between the tackles|guard)/i, category: 'middle' },
  { pattern: /(right|outside right|right sideline|short right|deep right|right tackle|right guard|right end)/i, category: 'right' },
];

const deepKeywords = /(deep|long)/i;
const shortKeywords = /(short|screen|shovel|quick)/i;

function detectKind(playType?: string, description?: string | null): PlayDirectionMetadata['kind'] {
  const type = (playType || '').toLowerCase();
  if (type.includes('rush') || type.includes('kneel')) return 'rush';
  if (type.includes('pass') || type.includes('shovel') || type.includes('spike')) return 'pass';
  if (type.includes('kick') || type.includes('punt') || type.includes('field_goal')) return 'kick';
  if (type.includes('timeout') || type.includes('period')) return 'special';

  if (description) {
    const lower = description.toLowerCase();
    if (lower.includes('pass')) return 'pass';
    if (lower.includes('rush') || lower.includes('run') || lower.includes('kneel')) return 'rush';
    if (lower.includes('kick') || lower.includes('punt') || lower.includes('field goal')) return 'kick';
  }

  return 'unknown';
}

function detectCategory(description?: string | null): DirectionCategory {
  if (!description) return 'middle';
  const match = directionKeywords.find(entry => entry.pattern.test(description));
  return match ? match.category : 'middle';
}

export function inferPlayDirection(play: any): PlayDirectionMetadata {
  const description: string | null = play?.metadata?.description ?? null;
  const playType: string | undefined = play?.metadata?.play_type ?? play?.metadata?.type;
  const kind = detectKind(playType, description);
  const category = detectCategory(description);

  const isDeep = !!(description && deepKeywords.test(description));
  const isShort = !!(description && shortKeywords.test(description));

  return {
    kind,
    category,
    isDeep,
    isShort,
  };
}

export function categoryToVector(category: DirectionCategory): { x: number; y: number } {
  switch (category) {
    case 'left':
      return { x: -1, y: 1 };
    case 'right':
      return { x: 1, y: 1 };
    case 'middle':
    default:
      return { x: 0, y: 1 };
  }
}
