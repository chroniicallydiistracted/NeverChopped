import { useEffect, useMemo, useState } from 'react';
import type { FieldCalibration } from '../../../constants/fieldTeams';
import type { PyEspnPlay } from '../data/pyespn-types';
import { buildClockLabel, clamp, computeFieldGeometry, resolvePossession } from '../animation/fieldMath';

export interface FieldAnimationCanvasProps {
  play: PyEspnPlay | null;
  fieldImage: string | null;
  calibration: FieldCalibration;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
}

const yardMarkers = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

const createMapper = ({ leftPct, rightPct }: Pick<FieldCalibration, 'leftPct' | 'rightPct'>) => {
  const range = Math.max(rightPct - leftPct, 1);
  return (value: number | null): number | null => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }
    const normalized = clamp(Number(value));
    return leftPct + (normalized / 100) * range;
  };
};

const formatPossession = (play: PyEspnPlay | null) => {
  if (!play) return '';
  const team = resolvePossession(play);
  return team ? `${team} BALL` : '';
};

const formatDownDistance = (play: PyEspnPlay | null) => {
  const start = play?.start;
  if (!start) {
    return '—';
  }
  if (start.shortDownDistanceText) {
    return start.shortDownDistanceText;
  }
  if (start.downDistanceText) {
    return start.downDistanceText;
  }
  const downRaw = start.down;
  const distanceRaw = start.yardsToGo ?? start.distance;
  if (!Number.isFinite(Number(downRaw)) || !Number.isFinite(Number(distanceRaw))) {
    return '—';
  }
  const down = Number(downRaw);
  const distance = Number(distanceRaw);
  const suffix = down === 1 ? 'ST' : down === 2 ? 'ND' : down === 3 ? 'RD' : 'TH';
  return `${down}${suffix} & ${distance}`;
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

const buildFieldBackground = (fieldImage: string | null) =>
  fieldImage
    ? {
        backgroundImage: `url(${fieldImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: 'radial-gradient(circle at center, rgba(12, 74, 110, 0.45), rgba(10, 38, 61, 0.9))',
      };

const FieldAnimationCanvas = ({
  play,
  fieldImage,
  calibration,
  homeTeamCode,
  awayTeamCode,
}: FieldAnimationCanvasProps) => {
  const geometry = useMemo(
    () => (play ? computeFieldGeometry(play) : { start: null, end: null, firstDown: null }),
    [play],
  );
  const [ballPercent, setBallPercent] = useState<number | null>(geometry.start);

  useEffect(() => {
    setBallPercent(geometry.start);
    const id = window.requestAnimationFrame(() => {
      setBallPercent(geometry.end ?? geometry.start);
    });
    return () => {
      window.cancelAnimationFrame(id);
    };
  }, [geometry.start, geometry.end, play?.id]);

  const mapper = useMemo(
    () => createMapper({ leftPct: calibration.leftPct, rightPct: calibration.rightPct }),
    [calibration.leftPct, calibration.rightPct],
  );

  const mappedStart = geometry.start !== null ? mapper(geometry.start) : null;
  const mappedEnd = geometry.end !== null ? mapper(geometry.end) : null;
  const mappedFirstDown = geometry.firstDown !== null ? mapper(geometry.firstDown) : null;
  const mappedBall = ballPercent !== null ? mapper(ballPercent) : null;

  const markers = useMemo(() => {
    return yardMarkers
      .map(marker => ({ marker, left: mapper(marker) }))
      .filter((entry): entry is { marker: number; left: number } => entry.left !== null);
  }, [mapper]);

  const surfaceInsets = useMemo(
    () => ({
      top: `${calibration.verticalPaddingPct}%`,
      bottom: `${calibration.verticalPaddingPct}%`,
      left: 0,
      right: 0,
    }),
    [calibration.verticalPaddingPct],
  );

  const possession = formatPossession(play);
  const downDistance = formatDownDistance(play);
  const summary = getPlaySummary(play);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg shadow-slate-900/30">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-300/80">
        <span>{possession || 'PREGAME'}</span>
        <span>{downDistance}</span>
      </div>
      <div className="relative h-36 sm:h-48 lg:h-56 rounded-xl overflow-hidden border border-slate-700/60">
        <div className="absolute inset-0" style={buildFieldBackground(fieldImage)} />
        <div className="absolute inset-0 bg-slate-900/35" />
        <div className="absolute" style={surfaceInsets}>
          <div className="absolute inset-0">
            {markers.map(entry => (
              <div
                key={entry.marker}
                className="absolute inset-y-0 flex flex-col items-center"
                style={{ left: `${entry.left}%` }}
              >
                <div className="w-px flex-1 bg-white/15" />
                <div className="py-1 text-[10px] font-mono text-slate-100/80">
                  {entry.marker === 50 ? '50' : entry.marker < 50 ? entry.marker : 100 - entry.marker}
                </div>
              </div>
            ))}
          </div>
          {mappedFirstDown !== null && (
            <div
              className="absolute inset-y-0 border-l-2 border-yellow-400/80"
              style={{ left: `${mappedFirstDown}%` }}
            />
          )}
          {mappedStart !== null && mappedEnd !== null && (
            <div
              className="absolute top-1/2 h-1 -translate-y-1/2 bg-purple-400/80"
              style={{
                left: `${Math.min(mappedStart, mappedEnd)}%`,
                width: `${Math.abs(mappedEnd - mappedStart)}%`,
              }}
            />
          )}
          {mappedStart !== null && (
            <div
              className="absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80"
              style={{ left: `${mappedStart}%` }}
            />
          )}
          {mappedEnd !== null && (
            <div
              className="absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400/80 bg-emerald-400/40"
              style={{ left: `${mappedEnd}%` }}
            />
          )}
          {mappedBall !== null && (
            <div
              className="absolute top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400 shadow-lg shadow-orange-500/40 transition-all duration-700 ease-out"
              style={{ left: `${mappedBall}%` }}
            />
          )}
        </div>
        <div className="absolute inset-x-4 bottom-3 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-200/90">
          <span>{awayTeamCode ?? 'AWAY'}</span>
          <span>{homeTeamCode ?? 'HOME'}</span>
        </div>
      </div>
      <div className="text-sm text-slate-200/90 leading-relaxed">{summary}</div>
    </div>
  );
};

export default FieldAnimationCanvas;
