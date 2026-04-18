import type { MouseEvent } from 'react'
import type { Episode } from '../data/mockData'

export type NowPlayingState = {
  episode: Episode
  topicName: string
  currentSec: number
  isPlaying: boolean
}

type PlayerBarProps = {
  nowPlaying: NowPlayingState | null
  shuffle: boolean
  onShuffleToggle: () => void
  onPrev: () => void
  onNext: () => void
  onPlayPause: () => void
  onSeek: (ratio: number) => void
  volume: number
  onVolume: (v: number) => void
  onViewCheatSheet: () => void
  cheatAvailable: boolean
  onEpisodeTitleClick?: () => void
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

function IconShuffle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconPrev() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
    </svg>
  )
}

function IconNext() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 18h2V6h-2v12zM6 18l8.5-6L6 6v12z" />
    </svg>
  )
}

function IconPlay() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function IconPause() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  )
}

function IconVolume() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" />
    </svg>
  )
}

export function PlayerBar({
  nowPlaying,
  shuffle,
  onShuffleToggle,
  onPrev,
  onNext,
  onPlayPause,
  onSeek,
  volume,
  onVolume,
  onViewCheatSheet,
  cheatAvailable,
  onEpisodeTitleClick,
}: PlayerBarProps) {
  if (!nowPlaying) {
    return (
      <footer className="player-bar">
        <div className="player-bar-empty">No track selected</div>
      </footer>
    )
  }

  const { episode, currentSec, isPlaying } = nowPlaying
  const totalSec = episode.durationMin * 60
  const ratio = totalSec > 0 ? currentSec / totalSec : 0

  const onBarClick = (e: MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width)
    onSeek(rect.width > 0 ? x / rect.width : 0)
  }

  return (
    <footer className="player-bar">
      <div className="player-track">
        <button type="button" className="player-track-title" onClick={onEpisodeTitleClick}>
          {episode.title}
        </button>
        <div className="player-track-meta">
          {nowPlaying.topicName} | {episode.voiceName}
        </div>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button
            type="button"
            className={`player-ctrl${shuffle ? ' shuffle-on' : ''}`}
            onClick={onShuffleToggle}
            aria-pressed={shuffle}
            title="Shuffle"
          >
            <IconShuffle />
          </button>
          <button type="button" className="player-ctrl" onClick={onPrev} title="Previous">
            <IconPrev />
          </button>
          <button type="button" className="player-play" onClick={onPlayPause} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <IconPause /> : <IconPlay />}
          </button>
          <button type="button" className="player-ctrl" onClick={onNext} title="Next">
            <IconNext />
          </button>
        </div>
        <div className="player-progress-row">
          <span className="player-time">{formatTime(currentSec)}</span>
          <div className="player-slider-wrap" role="slider" tabIndex={0} aria-valuenow={currentSec} aria-valuemax={totalSec} onClick={onBarClick} onKeyDown={(e) => e.preventDefault()}>
            <div className="player-slider-fill" style={{ width: `${ratio * 100}%` }} />
          </div>
          <span className="player-time end">{formatTime(totalSec)}</span>
        </div>
      </div>

      <div className="player-right">
        <button type="button" className="player-cheat-btn" onClick={onViewCheatSheet} disabled={!cheatAvailable}>
          View Cheat Sheet
        </button>
        <div className="player-volume">
          <button type="button" className="player-vol-icon" aria-label="Volume">
            <IconVolume />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => onVolume(Number(e.target.value) / 100)}
            className="player-vol-slider"
            aria-label="Volume level"
          />
        </div>
      </div>
    </footer>
  )
}
