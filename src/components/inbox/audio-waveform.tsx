"use client";

import type { KeyboardEvent, MouseEvent } from "react";

import { cn } from "@/lib/utils";

const WAVEFORM_BARS = [
  5, 8, 12, 7, 15, 10, 18, 13, 21, 11, 16, 23, 14, 19, 10, 17, 22, 13,
  19, 10, 16, 20, 12, 17, 9, 14, 19, 11, 15, 8, 13, 7, 11, 6, 9, 5,
] as const;

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

type AudioWaveformProps = {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  outgoing?: boolean;
  disabled?: boolean;
  className?: string;
};

export function AudioWaveform({
  currentTime,
  duration,
  onSeek,
  outgoing = false,
  disabled = false,
  className,
}: AudioWaveformProps) {
  const progress =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const seekFromPointer = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );
    onSeek(ratio * duration);
  };

  const seekFromKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;

    let nextTime: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextTime = Math.min(duration, currentTime + 5);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextTime = Math.max(0, currentTime - 5);
    } else if (event.key === "Home") {
      nextTime = 0;
    } else if (event.key === "End") {
      nextTime = duration;
    }

    if (nextTime !== null) {
      event.preventDefault();
      onSeek(nextTime);
    }
  };

  const bars = (
    <div className="flex h-6 w-full items-center gap-px" aria-hidden="true">
      {WAVEFORM_BARS.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="min-w-0 flex-1 rounded-full"
          style={{ height }}
        />
      ))}
    </div>
  );

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Posição do áudio"
      aria-valuemin={0}
      aria-valuemax={Math.max(0, Math.round(duration))}
      aria-valuenow={Math.max(0, Math.round(currentTime))}
      aria-valuetext={`${formatAudioTime(currentTime)} de ${formatAudioTime(duration)}`}
      aria-disabled={disabled}
      onClick={seekFromPointer}
      onKeyDown={seekFromKeyboard}
      className={cn(
        "group relative h-6 min-w-0 cursor-pointer select-none outline-none",
        "focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2",
        disabled && "cursor-default opacity-60",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 [&_span]:bg-current",
          outgoing ? "text-current opacity-25" : "text-[var(--text-muted)] opacity-35",
        )}
      >
        {bars}
      </div>
      <div
        className={cn(
          "absolute inset-0 transition-[clip-path] duration-100 [&_span]:bg-current",
          outgoing ? "text-current" : "text-[var(--brand-primary)]",
        )}
        style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
      >
        {bars}
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm",
          "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
          outgoing ? "bg-current" : "bg-[var(--brand-primary)]",
        )}
        style={{ left: `${progress}%` }}
      />
    </div>
  );
}
