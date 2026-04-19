import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCheatSheets } from '../cheatSheets/CheatSheetsContext'
import { isEpisodeAudioPlayable, type CheatSheet, type Episode } from '../data/mockData'
import { useLibrary } from '../library/LibraryContext'
import { useTopics } from '../topics/TopicsContext'

type MyPodcastsProps = {
  playingEpisodeId: string | null
  onPlay: (episode: Episode) => void
  onCheatSheet: (episodeId: string) => void
  onPlayAll: (topicId: string) => void
  onEpisodeRemoved: (episode: Episode) => void
}

function TopicCarousel({
  topicName,
  eps,
  playingEpisodeId,
  onPlay,
  onCheatSheet,
  onPlayAll,
  topicId,
  cheatSheetForEpisode,
  onEpisodeRemoved,
}: {
  topicName: string
  topicId: string
  eps: Episode[]
  playingEpisodeId: string | null
  onPlay: (episode: Episode) => void
  onCheatSheet: (episodeId: string) => void
  onPlayAll: (topicId: string) => void
  cheatSheetForEpisode: (episodeId: string) => CheatSheet | undefined
  onEpisodeRemoved: (episode: Episode) => void
}) {
  const scRef = useRef<HTMLDivElement | null>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const refresh = useCallback(() => {
    const el = scRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanLeft(scrollLeft > 4)
    setCanRight(scrollLeft + clientWidth < scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scRef.current
    if (!el) return
    refresh()
    const ro = new ResizeObserver(refresh)
    ro.observe(el)
    el.addEventListener('scroll', refresh, { passive: true })
    window.addEventListener('resize', refresh)
    const t = window.setTimeout(refresh, 200)
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', refresh)
      window.removeEventListener('resize', refresh)
      clearTimeout(t)
    }
  }, [eps.length, refresh])

  const scrollBy = (dir: number) => {
    scRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' })
  }

  return (
    <section className="topic-section">
      <div className="topic-section-header">
        <h2>{topicName}</h2>
        <button type="button" className="play-all" onClick={() => onPlayAll(topicId)}>
          Play All
        </button>
      </div>
      <div className="carousel-shell">
        {canLeft && (
          <button
            type="button"
            className="carousel-scroll-btn carousel-scroll-btn--left"
            aria-label="Scroll podcasts left"
            onClick={() => scrollBy(-1)}
          >
            ‹
          </button>
        )}
        <div ref={scRef} className="carousel">
          {eps.map((ep) => {
            const playable = isEpisodeAudioPlayable(ep)
            const hasCheat = Boolean(cheatSheetForEpisode(ep.id))
            const pendingLabel = 'Generating...'
            return (
            <article key={ep.id} className={`episode-card${playingEpisodeId === ep.id ? ' playing' : ''}`}>
              <div className="ep-thumb-wrap">
                <button
                  type="button"
                  className="ep-remove"
                  aria-label={`Remove ${ep.title} from library`}
                  title="Remove podcast and cheat sheet"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEpisodeRemoved(ep)
                  }}
                >
                  ×
                </button>
                <div className="ep-thumb" style={{ background: ep.cardBg }}>
                  {ep.emoji}
                </div>
                <span className="ep-badge">{ep.style}</span>
              </div>
              <div className="ep-body">
                <h3 className="ep-title">{ep.title}</h3>
                <div className="ep-meta">
                  {ep.durationMin} min • {ep.depth}
                </div>
                <div className="ep-actions">
                  <button
                    type="button"
                    className="ep-btn primary"
                    disabled={!playable}
                    title={
                      !playable
                        ? 'Run npm run inference (repo root) so SQS messages become audio parts in DynamoDB.'
                        : undefined
                    }
                    onClick={() => onPlay(ep)}
                  >
                    {playable ? 'Play' : pendingLabel}
                  </button>
                  <button
                    type="button"
                    className="ep-btn"
                    disabled={!hasCheat}
                    title={
                      hasCheat
                        ? undefined
                        : 'No cheat sheet for this episode yet. Cheat sheets are created when you publish a new episode from Create.'
                    }
                    onClick={() => {
                      if (hasCheat) onCheatSheet(ep.id)
                    }}
                  >
                    Cheat Sheet
                  </button>
                </div>
              </div>
            </article>
          )})}
        </div>
        {canRight && (
          <button
            type="button"
            className="carousel-scroll-btn carousel-scroll-btn--right"
            aria-label="Scroll podcasts right"
            onClick={() => scrollBy(1)}
          >
            ›
          </button>
        )}
      </div>
    </section>
  )
}

export function MyPodcasts({
  playingEpisodeId,
  onPlay,
  onCheatSheet,
  onPlayAll,
  onEpisodeRemoved,
}: MyPodcastsProps) {
  const { mergeForTopic, queueHint, setQueueHint, userEpisodes } = useLibrary()
  const { topicForDisplay, topicsForNav } = useTopics()
  const { cheatSheetForEpisode } = useCheatSheets()

  const sectionIds = useMemo(() => {
    const ids = new Set<string>()
    for (const t of topicsForNav) {
      if (mergeForTopic(t.id).length > 0) ids.add(t.id)
    }
    for (const ep of userEpisodes) {
      if (mergeForTopic(ep.topicId).length > 0) ids.add(ep.topicId)
    }
    return [...ids].sort((a, b) => {
      const hintA = userEpisodes.find((e) => e.topicId === a)?.topicDisplayName
      const hintB = userEpisodes.find((e) => e.topicId === b)?.topicDisplayName
      return topicForDisplay(b, hintB).name.localeCompare(topicForDisplay(a, hintA).name, undefined, {
        sensitivity: 'base',
      })
    })
  }, [topicsForNav, userEpisodes, mergeForTopic, topicForDisplay])

  return (
    <div>
      <h2 className="page-title">My Podcasts</h2>
      <p className="page-sub">Your library, organized by topic. Use the arrows to browse each row.</p>

      {queueHint && (
        <div className="library-queue-banner" role="status">
          <p>{queueHint}</p>
          <button type="button" className="library-queue-banner-dismiss" onClick={() => setQueueHint(null)}>
            Dismiss
          </button>
        </div>
      )}

      {sectionIds.map((id) => {
        const eps = mergeForTopic(id)
        if (eps.length === 0) return null
        const hint = userEpisodes.find((e) => e.topicId === id)?.topicDisplayName
        const meta = topicForDisplay(id, hint)
        return (
          <TopicCarousel
            key={id}
            topicId={id}
            topicName={meta.name}
            eps={eps}
            playingEpisodeId={playingEpisodeId}
            onPlay={onPlay}
            onCheatSheet={onCheatSheet}
            onPlayAll={onPlayAll}
            cheatSheetForEpisode={cheatSheetForEpisode}
            onEpisodeRemoved={onEpisodeRemoved}
          />
        )
      })}
    </div>
  )
}
