import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { CreatePodcast } from './components/CreatePodcast'
import { MyCheatSheets } from './components/MyCheatSheets'
import { MyPodcasts } from './components/MyPodcasts'
import { PlayerBar, type NowPlayingState } from './components/PlayerBar'
import { Sidebar } from './components/Sidebar'
import { cheatSheetForEpisode, episodes, getTopicById, topics, type Episode } from './data/mockData'

type Page = 'create' | 'podcasts' | 'cheats'

function buildNowPlaying(episode: Episode, startSec = 0, playing = true): NowPlayingState {
  const topic = getTopicById(episode.topicId)
  return {
    episode,
    topicName: topic?.name ?? 'Topic',
    currentSec: startSec,
    isPlaying: playing,
  }
}

export default function App() {
  const [page, setPage] = useState<Page>('create')
  const [nowPlaying, setNowPlaying] = useState<NowPlayingState | null>(null)
  const [shuffle, setShuffle] = useState(false)
  const [volume, setVolume] = useState(0.85)
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false)
  const [scrollToCheatEpisodeId, setScrollToCheatEpisodeId] = useState<string | null>(null)

  const playingEpisodeId = nowPlaying?.episode.id ?? null

  useEffect(() => {
    if (!nowPlaying?.isPlaying) return
    const total = nowPlaying.episode.durationMin * 60
    const id = window.setInterval(() => {
      setNowPlaying((prev) => {
        if (!prev?.isPlaying) return prev
        const nextSec = prev.currentSec + 1
        if (nextSec >= total) {
          return { ...prev, currentSec: total, isPlaying: false }
        }
        return { ...prev, currentSec: nextSec }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [nowPlaying?.isPlaying, nowPlaying?.episode.durationMin])

  const onPlay = useCallback((episode: Episode) => {
    setNowPlaying(buildNowPlaying(episode, 0, true))
  }, [])

  const onGenerateComplete = useCallback(() => {
    setHasGeneratedOnce(true)
    setPage('podcasts')
  }, [])

  const goCheatForEpisode = useCallback((episodeId: string) => {
    setPage('cheats')
    setScrollToCheatEpisodeId(episodeId)
  }, [])

  const clearCheatScroll = useCallback(() => {
    setScrollToCheatEpisodeId(null)
  }, [])

  const cheatAvailable = nowPlaying ? Boolean(cheatSheetForEpisode(nowPlaying.episode.id)) && hasGeneratedOnce : false

  const onViewCheatSheet = useCallback(() => {
    if (!nowPlaying || !cheatAvailable) return
    goCheatForEpisode(nowPlaying.episode.id)
  }, [nowPlaying, cheatAvailable, goCheatForEpisode])

  const playAdjacent = useCallback(
    (delta: number) => {
      if (episodes.length === 0) return
      const curId = nowPlaying?.episode.id
      let idx = curId ? episodes.findIndex((e) => e.id === curId) : -1
      if (idx < 0) idx = 0
      else {
        idx = (idx + delta + episodes.length) % episodes.length
      }
      const ep = episodes[idx]
      if (ep) setNowPlaying(buildNowPlaying(ep, 0, true))
    },
    [nowPlaying?.episode.id],
  )

  const onSeek = useCallback((ratio: number) => {
    setNowPlaying((prev) => {
      if (!prev) return prev
      const total = prev.episode.durationMin * 60
      return { ...prev, currentSec: Math.min(total, Math.max(0, ratio * total)) }
    })
  }, [])

  const onTopicClick = useCallback((_topicId: string) => {
    setPage('podcasts')
  }, [])

  const onPlayAll = useCallback(
    (topicId: string) => {
      const first = episodes.find((e) => e.topicId === topicId)
      if (first) onPlay(first)
    },
    [onPlay],
  )

  return (
    <div className="app-shell">
      <Sidebar activePage={page} onNavigate={setPage} topics={topics} onTopicClick={onTopicClick} />

      <main className="app-main">
        {page === 'create' && <CreatePodcast onGenerateComplete={onGenerateComplete} />}
        {page === 'podcasts' && (
          <MyPodcasts
            playingEpisodeId={playingEpisodeId}
            onPlay={onPlay}
            onCheatSheet={goCheatForEpisode}
            onPlayAll={onPlayAll}
          />
        )}
        {page === 'cheats' && (
          <MyCheatSheets
            hasGeneratedOnce={hasGeneratedOnce}
            scrollToEpisodeId={scrollToCheatEpisodeId}
            onConsumedScroll={clearCheatScroll}
            onPlayEpisode={onPlay}
          />
        )}
      </main>

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
        onViewCheatSheet={onViewCheatSheet}
        cheatAvailable={cheatAvailable}
        onEpisodeTitleClick={() => setPage('podcasts')}
      />
    </div>
  )
}
