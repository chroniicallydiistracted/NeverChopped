import { PauseCircle, PlayCircle, RefreshCcw, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

export interface PlaybackControlsProps {
  isPlaying: boolean;
  canStepBackward: boolean;
  canStepForward: boolean;
  speedLabel: string;
  onTogglePlay: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onRefresh: () => void;
}

const PlaybackControls = ({
  isPlaying,
  canStepBackward,
  canStepForward,
  speedLabel,
  onTogglePlay,
  onStepBackward,
  onStepForward,
  onReset,
  onRefresh,
}: PlaybackControlsProps) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
      <button
        onClick={onStepBackward}
        disabled={!canStepBackward}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
          canStepBackward
            ? 'border-slate-600 text-white hover:bg-slate-800/60'
            : 'border-slate-700 text-slate-500 cursor-not-allowed'
        }`}
      >
        <SkipBack className="w-4 h-4" /> Prev
      </button>
      <button
        onClick={onTogglePlay}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors"
      >
        {isPlaying ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button
        onClick={onStepForward}
        disabled={!canStepForward}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
          canStepForward
            ? 'border-slate-600 text-white hover:bg-slate-800/60'
            : 'border-slate-700 text-slate-500 cursor-not-allowed'
        }`}
      >
        Next <SkipForward className="w-4 h-4" />
      </button>
      <button
        onClick={onReset}
        className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 text-white hover:bg-slate-800/60"
      >
        <RotateCcw className="w-4 h-4" /> Reset
      </button>
      <button
        onClick={onRefresh}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 text-white hover:bg-slate-800/60"
      >
        <RefreshCcw className="w-4 h-4" /> Refresh
      </button>
      <span className="text-xs uppercase tracking-widest text-slate-400">Speed: {speedLabel}</span>
    </div>
  );
};

export default PlaybackControls;
