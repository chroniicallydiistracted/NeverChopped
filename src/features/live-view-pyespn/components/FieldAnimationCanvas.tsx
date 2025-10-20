import { useEffect, useMemo, useState } from 'react';
import type { PyEspnPlay } from '../data/pyespn-types';
import { buildClockLabel, computeFieldGeometry, resolvePossession } from '../animation/fieldMath';

export interface FieldAnimationCanvasProps {
  play: PyEspnPlay | null;
}

const yardMarkers = [0, 10, 20, 30, 40, 50, 40, 30, 20, 10, 0];

const formatPossession = (play: PyEspnPlay | null) => {
  if (!play) return '';
  const team = resolvePossession(play);
  return team ? `${team} BALL` : '';
};

const getPlaySummary = (play: PyEspnPlay | null) => {
  if (!play) {
    return 'Awaiting play data';
  }
  const summary = play.shortText || play.text || 'Play information unavailable';
  const clock = buildClockLabel(play);
  const quarter = play.quarter ? `Q${play.quarter}` : 'Q?';
  return `${quarter} • ${clock} • ${summary}`;
};

const percentToStyle = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) {
    return '2%';
  }
  return `${value}%`;
};

const FieldAnimationCanvas = ({ play }: FieldAnimationCanvasProps) => {
  const geometry = useMemo(() => (play ? computeFieldGeometry(play) : { start: null, end: null, firstDown: null }), [play]);
  const [ballPosition, setBallPosition] = useState(geometry.start ?? 2);

  useEffect(() => {
    setBallPosition(geometry.start ?? 2);
    const id = window.requestAnimationFrame(() => {
      setBallPosition(geometry.end ?? geometry.start ?? 2);
    });
    return () => {
      window.cancelAnimationFrame(id);
    };
  }, [geometry.start, geometry.end, play?.id]);

  const possession = formatPossession(play);
  const summary = getPlaySummary(play);

  return (
    <div className="bg-gradient-to-r from-green-900 via-green-800 to-green-900 rounded-xl p-4 border border-green-500/40 shadow-inset">
      <div className="text-xs uppercase tracking-widest text-green-200/80 mb-2">{possession}</div>
      <div className="relative h-36 sm:h-44 md:h-48 lg:h-56 bg-green-950/40 rounded-lg overflow-hidden border border-green-500/20">
        <div className="absolute inset-0 flex text-[10px] sm:text-xs text-green-200/60 font-mono">
          {yardMarkers.map((marker, index) => (
            <div key={`marker-${marker}-${index}`} className="flex-1 flex flex-col">
              <div className="h-full border-l border-green-400/20" />
              <div className="text-center py-1">{marker}</div>
            </div>
          ))}
        </div>
        <div
          className="absolute top-4 bottom-4 w-3 sm:w-4 bg-orange-400 shadow-lg shadow-orange-500/40 rounded-full transition-all duration-700 ease-out"
          style={{ left: percentToStyle(ballPosition) }}
        />
        {geometry.firstDown !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/80"
            style={{ left: percentToStyle(geometry.firstDown) }}
          />
        )}
      </div>
      <p className="mt-3 text-sm text-green-50/90 leading-relaxed">{summary}</p>
    </div>
  );
};

export default FieldAnimationCanvas;
