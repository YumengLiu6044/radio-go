import { useCallback, useEffect, useRef, useState } from 'react'
import { isEpisodeAudioPlayable, topics, type Episode } from '../data/mockData'
import { useLibrary } from '../library/LibraryContext'

type MyPodcastsProps = {
  playingEpisodeId: string | null
  onPlay: (episode: Episode) => void
  onCheatSheet: (episodeId: string) => void
  onPlayAll: (topicId: string) => void
}

function TopicCarousel({
  topicName,
  eps,
  playingEpisodeId,
  onPlay,
  onCheatSheet,
  onPlayAll,
  topicId,
}: {
  topicName: string
  topicId: string
  eps: Episode[]
  playingEpisodeId: string | null
  onPlay: (episode: Episode) => void
  onCheatSheet: (episodeId: string) => void
  onPlayAll: (topicId: string) => void
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
            const prog = ep.synthProgress
            const pendingLabel =
              prog && prog.total > 0
                ? `Synthesizing ${prog.received}/${prog.total}`
                : 'Waiting for worker…'
            return (
            <article key={ep.id} className={`episode-card${playingEpisodeId === ep.id ? ' playing' : ''}`}>
              <div className="ep-thumb-wrap">
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
                  <button type="button" className="ep-btn" onClick={() => onCheatSheet(ep.id)}>
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

export function MyPodcasts({ playingEpisodeId, onPlay, onCheatSheet, onPlayAll }: MyPodcastsProps) {
  const { mergeForTopic, queueHint, setQueueHint } = useLibrary()

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

      {topics.map((topic) => {
        const eps = mergeForTopic(topic.id)
        if (eps.length === 0) return null
        return (
          <TopicCarousel
            key={topic.id}
            topicId={topic.id}
            topicName={topic.name}
            eps={eps}
            playingEpisodeId={playingEpisodeId}
            onPlay={onPlay}
            onCheatSheet={onCheatSheet}
            onPlayAll={onPlayAll}
          />
        )
      })}
    </div>
  )
}
