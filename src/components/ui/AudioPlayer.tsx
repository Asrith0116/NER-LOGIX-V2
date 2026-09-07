import { useState, useEffect } from 'react';
import { Play, Pause, Volume2, Globe, FileText } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl?: string;
  durationSeconds?: number;
  language?: string;
  transcript?: string;
  translatedSummary?: string;
  className?: string;
}

export function AudioPlayer({
  durationSeconds = 18,
  language = 'Assamese (অসমীয়া)',
  transcript = 'পাহাৰৰ পৰা মাটি আৰু ডাঙৰ শিল খহি ৰাস্তা সম্পূৰ্ণ বন্ধ হৈ পৰিছে। কোনো গাড়ী পাৰ হ’ব পৰা নাই।',
  translatedSummary = 'Major slope failure with heavy boulders completely blocking highway. Impassable for all vehicles.',
  className = '',
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 100 / (durationSeconds * 10);
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, durationSeconds]);

  const togglePlay = () => {
    if (progress >= 100) setProgress(0);
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={`p-3.5 rounded-xl bg-white border border-[#e4e4e3] space-y-3 ${className}`}>
      {/* Player Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-[#2563eb]" />
          <span className="text-xs font-bold text-[#1a1a19]">Field Voice Note Evidence</span>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
          <Globe className="w-2.5 h-2.5" />
          {language}
        </span>
      </div>

      {/* Audio Playback Bar & Simulated Waveform */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center hover:bg-[#1d4ed8] transition-colors shrink-0 shadow-xs cursor-pointer"
          aria-label={isPlaying ? 'Pause' : 'Play audio note'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        {/* Waveform Bars */}
        <div className="flex-1 flex items-center gap-0.5 h-7">
          {[40, 65, 85, 30, 95, 75, 45, 90, 60, 35, 80, 100, 70, 50, 85, 40, 95, 60, 30, 75, 90, 45, 80, 50, 65, 35].map(
            (heightPct, i) => {
              const active = (i / 26) * 100 <= progress;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors duration-150 ${
                    active ? 'bg-[#2563eb]' : 'bg-[#e4e4e3]'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              );
            }
          )}
        </div>

        <span className="text-[11px] font-mono text-[#8a8a87] shrink-0 tabular-nums">
          0:{Math.min(durationSeconds, Math.floor((progress / 100) * durationSeconds)).toString().padStart(2, '0')} / 0:{durationSeconds}
        </span>
      </div>

      {/* Multilingual Side-by-Side Transcripts */}
      <div className="pt-2 border-t border-[#f0f0ef] space-y-2 text-xs">
        {/* Original Transcript */}
        <div className="p-2 rounded-lg bg-[#fafaf9] border border-[#f0f0ef]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#8a8a87] uppercase tracking-wider mb-1">
            <FileText className="w-3 h-3 text-[#2563eb]" />
            <span>Original Regional Audio ({language})</span>
          </div>
          <p className="text-[#1a1a19] italic leading-relaxed">"{transcript}"</p>
        </div>

        {/* English Translation */}
        <div className="p-2 rounded-lg bg-[#eff6ff] border border-[#bfdbfe]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#1d4ed8] uppercase tracking-wider mb-1">
            <Globe className="w-3 h-3 text-[#1d4ed8]" />
            <span>AI English Translation</span>
          </div>
          <p className="text-[#1e3a8a] font-medium leading-relaxed">"{translatedSummary}"</p>
        </div>
      </div>
    </div>
  );
}
