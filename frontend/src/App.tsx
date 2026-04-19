import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { CreatePodcast } from './components/CreatePodcast'
import { MyCheatSheets } from './components/MyCheatSheets'
import { MyPodcasts } from './components/MyPodcasts'
import { PlayerBar, type NowPlayingState } from './components/PlayerBar'
import { Sidebar, type AppPage } from './components/Sidebar'
import { fetchCanvasVideoPresignedUrl } from './api/podcasts'
import {
  canvasVideoSrcForEpisode,
  episodes,
  isEpisodeAudioPlayable,
  type Episode,
} from './data/mockData'
import { TopicPlaylist } from './components/TopicPlaylist'
import { useCheatSheets } from './cheatSheets/CheatSheetsContext'
import { useLibrary } from './library/LibraryContext'
import { useTopics } from './topics/TopicsContext'

export default function App() {
  const { topicForDisplay, topicsForNav } = useTopics()
  const { userEpisodes, mergeForTopic, dismissEpisodeFromLibrary, dismissedEpisodeIds } = useLibrary()
  const { cheatSheetForEpisode, removeCheatSheetForEpisode } = useCheatSheets()

  const buildNowPlaying = useCallback(
    (episode: Episode, startSec = 0, playing = true): NowPlayingState => {
      const topic = topicForDisplay(episode.topicId, episode.topicDisplayName)
      return {
        episode,
        topicName: topic.name,
        currentSec: startSec,
        isPlaying: playing,
      }
    },
    [topicForDisplay],
  )
  const allEpisodes = useMemo(() => {
    const dismissed = new Set(dismissedEpisodeIds)
    const ids = new Set(userEpisodes.map((e) => e.id))
    return [...userEpisodes, ...episodes.filter((e) => !ids.has(e.id) && !dismissed.has(e.id))]
  }, [userEpisodes, dismissedEpisodeIds])

  const resolveEpisode = useCallback(
    (episodeId: string) => allEpisodes.find((e) => e.id === episodeId),
    [allEpisodes],
  )

  const [page, setPage] = useState<AppPage>('create')
  const [playlistTopicId, setPlaylistTopicId] = useState<string | null>(null)
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [nowPlaying, setNowPlaying] = useState<NowPlayingState | null>(null)
  const [shuffle, setShuffle] = useState(false)
  const [volume, setVolume] = useState(0.85)
  const [scrollToCheatEpisodeId, setScrollToCheatEpisodeId] = useState<string | null>(null)
  const [videoCanvasOpen, setVideoCanvasOpen] = useState(false)
  const [canvasAuthUrl, setCanvasAuthUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasVideoRef = useRef<HTMLVideoElement | null>(null)
  const lastEpisodeIdRef = useRef<string | null>(null)

  const playingEpisodeId = nowPlaying?.episode.id ?? null
  const trackId = nowPlaying?.episode.id ?? null
  const trackSrc = nowPlaying?.episode.audioSrc ?? null
  const trackIsPlaying = nowPlaying?.isPlaying ?? false

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onMeta = () => {
      setNowPlaying((p) =>
        p && el.duration > 0 && Number.isFinite(el.duration) ? { ...p, durationSec: el.duration } : p,
      )
    }
    const onTime = () => {
      setNowPlaying((p) => (p ? { ...p, currentSec: el.currentTime } : p))
    }
    const onEnded = () => {
      setNowPlaying((p) => (p ? { ...p, isPlaying: false } : p))
    }
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('ended', onEnded)
    }
  }, [])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    if (!trackId || !trackSrc) {
      lastEpisodeIdRef.current = null
      el.pause()
      return
    }
    if (lastEpisodeIdRef.current !== trackId) {
      lastEpisodeIdRef.current = trackId
      el.src = trackSrc
      el.load()
    }
    el.volume = volume
    if (trackIsPlaying) void el.play().catch(() => {})
    else el.pause()
  }, [trackId, trackSrc, trackIsPlaying, volume])

  useEffect(() => {
    if (!nowPlaying) setVideoCanvasOpen(false)
  }, [nowPlaying])

  useEffect(() => {
    if (!videoCanvasOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [videoCanvasOpen])

  useEffect(() => {
    setCanvasAuthUrl(null)
  }, [nowPlaying?.episode.id])

  useEffect(() => {
    if (!videoCanvasOpen || !nowPlaying?.episode.jobId) return

    const jobId = nowPlaying.episode.jobId
    let cancelled = false
    setCanvasAuthUrl(null)

    const tick = async () => {
      const url = await fetchCanvasVideoPresignedUrl(jobId)
      if (cancelled) return
      if (url) setCanvasAuthUrl(url)
    }

    void tick()
    const intervalId = window.setInterval(tick, 5000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [videoCanvasOpen, nowPlaying?.episode.jobId])

  const canvasSrc = useMemo(() => {
    if (!nowPlaying) return null
    if (nowPlaying.episode.jobId && canvasAuthUrl) return canvasAuthUrl
    return canvasVideoSrcForEpisode(nowPlaying.episode)
  }, [nowPlaying, canvasAuthUrl])

  useEffect(() => {
    const v = canvasVideoRef.current
    const a = audioRef.current
    if (!videoCanvasOpen || !v || !a || !canvasSrc) return

    const loopedVideoTime = (audioTime: number, videoDuration: number) => {
      if (!Number.isFinite(videoDuration) || videoDuration < 0.1) return audioTime
      let x = audioTime % videoDuration
      if (x < 0) x += videoDuration
      return x
    }

    const wrapDistance = (p: number, q: number, period: number) => {
      const d = Math.abs(p - q)
      return Math.min(d, Math.max(0.01, period - d))
    }

    const syncTime = () => {
      const vd = v.duration
      if (!Number.isFinite(vd) || vd < 0.1) return
      const target = loopedVideoTime(a.currentTime, vd)
      if (wrapDistance(v.currentTime, target, vd) > 0.45) {
        v.currentTime = target
      }
    }

    const onAudioPlay = () => {
      void v.play().catch(() => {})
    }
    const onAudioPause = () => {
      v.pause()
    }

    const onVideoReady = () => {
      const vd = v.duration
      const at = a.currentTime
      if (Number.isFinite(vd) && vd > 0.1) {
        v.currentTime = loopedVideoTime(at, vd)
      } else {
        v.currentTime = at
      }
      if (!a.paused) void v.play().catch(() => {})
      else v.pause()
    }

    syncTime()
    if (!a.paused) void v.play().catch(() => {})
    else v.pause()

    v.addEventListener('loadeddata', onVideoReady)
    if (v.readyState >= 2) onVideoReady()

    a.addEventListener('timeupdate', syncTime)
    a.addEventListener('seeked', syncTime)
    a.addEventListener('play', onAudioPlay)
    a.addEventListener('pause', onAudioPause)
    return () => {
      v.removeEventListener('loadeddata', onVideoReady)
      a.removeEventListener('timeupdate', syncTime)
      a.removeEventListener('seeked', syncTime)
      a.removeEventListener('play', onAudioPlay)
      a.removeEventListener('pause', onAudioPause)
    }
  }, [videoCanvasOpen, trackIsPlaying, playingEpisodeId, canvasSrc])

  useEffect(() => {
    if (!videoCanvasOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVideoCanvasOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [videoCanvasOpen])

  const onPlay = useCallback(
    (episode: Episode) => {
      if (!isEpisodeAudioPlayable(episode)) return
      setNowPlaying(buildNowPlaying(episode, 0, true))
    },
    [buildNowPlaying],
  )

  const goCheatForEpisode = useCallback((episodeId: string) => {
    setPlaylistTopicId(null)
    setPage('cheats')
    setScrollToCheatEpisodeId(episodeId)
  }, [])

  const clearCheatScroll = useCallback(() => {
    setScrollToCheatEpisodeId(null)
  }, [])

  const onEpisodeRemoved = useCallback(
    (ep: Episode) => {
      dismissEpisodeFromLibrary(ep.id)
      removeCheatSheetForEpisode(ep.id)
      setNowPlaying((p) => (p?.episode.id === ep.id ? null : p))
      setScrollToCheatEpisodeId((id) => (id === ep.id ? null : id))
    },
    [dismissEpisodeFromLibrary, removeCheatSheetForEpisode],
  )

  const cheatAvailable = nowPlaying ? Boolean(cheatSheetForEpisode(nowPlaying.episode.id)) : false

  const onViewCheatSheet = useCallback(() => {
    if (!nowPlaying || !cheatAvailable) return
    goCheatForEpisode(nowPlaying.episode.id)
  }, [nowPlaying, cheatAvailable, goCheatForEpisode])

  const onViewCheatSheetFromPlayer = useCallback(() => {
    setVideoCanvasOpen(false)
    onViewCheatSheet()
  }, [onViewCheatSheet])

  const playAdjacent = useCallback(
    (delta: number) => {
      if (allEpisodes.length === 0) return
      if (!nowPlaying) {
        const first = allEpisodes.find(isEpisodeAudioPlayable) ?? allEpisodes[0]
        if (first) setNowPlaying(buildNowPlaying(first, 0, true))
        return
      }
      const pool = allEpisodes.filter(
        (e) => e.topicId === nowPlaying.episode.topicId && isEpisodeAudioPlayable(e),
      )
      if (pool.length === 0) return
      let idx = pool.findIndex((e) => e.id === nowPlaying.episode.id)
      if (idx < 0) idx = 0

      let nextIdx: number
      if (shuffle) {
        if (pool.length === 1) {
          nextIdx = 0
        } else {
          do {
            nextIdx = Math.floor(Math.random() * pool.length)
          } while (nextIdx === idx)
        }
      } else {
        nextIdx = (idx + delta + pool.length) % pool.length
      }
      const ep = pool[nextIdx]
      if (ep) setNowPlaying(buildNowPlaying(ep, 0, true))
    },
    [nowPlaying, shuffle, allEpisodes, buildNowPlaying],
  )

  const onSeek = useCallback(
    (ratio: number) => {
      const el = audioRef.current
      if (!el || !nowPlaying) return
      const dur =
        el.duration > 0 && Number.isFinite(el.duration)
          ? el.duration
          : nowPlaying.durationSec && nowPlaying.durationSec > 0
            ? nowPlaying.durationSec
            : nowPlaying.episode.durationMin * 60
      const t = Math.min(dur, Math.max(0, ratio * dur))
      el.currentTime = t
      setNowPlaying((prev) => (prev ? { ...prev, currentSec: t } : prev))
    },
    [nowPlaying],
  )

  const handleNavigate = useCallback((p: 'create' | 'podcasts' | 'cheats') => {
    setPlaylistTopicId(null)
    setPage(p)
  }, [])

  const onTopicClick = useCallback((topicId: string) => {
    setPlaylistTopicId(topicId)
    setPage('playlist')
  }, [])

  const handlePlayTopicPlaylist = useCallback(() => {
    if (!playlistTopicId) return
    const list = mergeForTopic(playlistTopicId).filter(isEpisodeAudioPlayable)
    if (list.length === 0) return
    if (shuffle) {
      setNowPlaying(buildNowPlaying(list[Math.floor(Math.random() * list.length)], 0, true))
    } else {
      setNowPlaying(buildNowPlaying(list[0], 0, true))
    }
  }, [playlistTopicId, shuffle, mergeForTopic, buildNowPlaying])

  const onPlayAll = useCallback(
    (topicId: string) => {
      const first = mergeForTopic(topicId).find(isEpisodeAudioPlayable)
      if (first) onPlay(first)
    },
    [onPlay, mergeForTopic],
  )

  return (
    <div className={`app-shell${navCollapsed ? ' app-shell--nav-collapsed' : ''}`}>
      <audio ref={audioRef} hidden playsInline />

      <Sidebar
        activePage={page}
        activeTopicId={page === 'playlist' ? playlistTopicId : null}
        onNavigate={handleNavigate}
        topics={topicsForNav}
        onTopicClick={onTopicClick}
        collapsed={navCollapsed}
        onToggleCollapsed={() => setNavCollapsed((c) => !c)}
      />

      <main className="app-main">
        {page === 'create' && <CreatePodcast onPublished={() => setPage('podcasts')} />}
        {page === 'podcasts' && (
          <MyPodcasts
            playingEpisodeId={playingEpisodeId}
            onPlay={onPlay}
            onCheatSheet={goCheatForEpisode}
            onPlayAll={onPlayAll}
            onEpisodeRemoved={onEpisodeRemoved}
          />
        )}
        {page === 'playlist' && playlistTopicId && (
          <TopicPlaylist
            topic={topicForDisplay(
              playlistTopicId,
              mergeForTopic(playlistTopicId).find((e) => e.topicDisplayName)?.topicDisplayName,
            )}
            episodes={mergeForTopic(playlistTopicId)}
            playingEpisodeId={playingEpisodeId}
            shuffle={shuffle}
            onShuffleToggle={() => setShuffle((s) => !s)}
            onPlay={onPlay}
            onCheatSheet={goCheatForEpisode}
            onPlayPlaylist={handlePlayTopicPlaylist}
            onEpisodeRemoved={onEpisodeRemoved}
            onBack={() => {
              setPlaylistTopicId(null)
              setPage('podcasts')
            }}
          />
        )}
        {page === 'cheats' && (
          <MyCheatSheets
            scrollToEpisodeId={scrollToCheatEpisodeId}
            onConsumedScroll={clearCheatScroll}
            onPlayEpisode={onPlay}
            resolveEpisode={resolveEpisode}
            onOpenMyPodcasts={() => {
              setPlaylistTopicId(null)
              setPage('podcasts')
            }}
          />
        )}
      </main>

      {videoCanvasOpen && nowPlaying ? (
        <div className="player-canvas-overlay" role="dialog" aria-label="Now playing with video backdrop">
          <video
            ref={canvasVideoRef}
            className="player-canvas-video"
            playsInline
            muted
            loop
            preload="metadata"
            aria-hidden={true}
            src={canvasSrc ?? undefined}
          />
          <div className="player-canvas-scrim" aria-hidden />
          <button
            type="button"
            className="player-canvas-close"
            onClick={() => setVideoCanvasOpen(false)}
            aria-label="Close video view"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
          <PlayerBar
            layout="canvas"
            nowPlaying={nowPlaying}
            shuffle={shuffle}
            onShuffleToggle={() => setShuffle((s) => !s)}
            onPrev={() => playAdjacent(-1)}
            onNext={() => playAdjacent(1)}
            onPlayPause={() => setNowPlaying((p) => (p ? { ...p, isPlaying: !p.isPlaying } : p))}
            onSeek={onSeek}
            volume={volume}
            onVolume={setVolume}
            onViewCheatSheet={onViewCheatSheetFromPlayer}
            cheatAvailable={cheatAvailable}
            onEpisodeTitleClick={() => {
              setVideoCanvasOpen(false)
              if (nowPlaying) {
                setPlaylistTopicId(nowPlaying.episode.topicId)
                setPage('playlist')
              }
            }}
          />
        </div>
      ) : (
        <PlayerBar
          nowPlaying={nowPlaying}
          shuffle={shuffle}
          onShuffleToggle={() => setShuffle((s) => !s)}
          onPrev={() => playAdjacent(-1)}
          onNext={() => playAdjacent(1)}
          onPlayPause={() => setNowPlaying((p) => (p ? { ...p, isPlaying: !p.isPlaying } : p))}
          onSeek={onSeek}
          volume={volume}
          onVolume={setVolume}
          onViewCheatSheet={onViewCheatSheetFromPlayer}
          cheatAvailable={cheatAvailable}
          onOpenCanvas={() => setVideoCanvasOpen(true)}
          onEpisodeTitleClick={() => {
            if (nowPlaying) {
              setPlaylistTopicId(nowPlaying.episode.topicId)
              setPage('playlist')
            }
          }}
        />
      )}
    </div>
  )
}
