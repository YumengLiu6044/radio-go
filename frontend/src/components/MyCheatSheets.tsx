import { useEffect, useMemo, useState } from 'react'
import type { CheatSheet, Episode } from '../data/mockData'
import { useCheatSheets } from '../cheatSheets/CheatSheetsContext'
import { useTopics } from '../topics/TopicsContext'

type MyCheatSheetsProps = {
  scrollToEpisodeId: string | null
  onConsumedScroll: () => void
  onPlayEpisode: (episode: Episode) => void
  resolveEpisode: (episodeId: string) => Episode | undefined
  /** Jump to library (e.g. from a cheat sheet card). */
  onOpenMyPodcasts?: () => void
}

export function MyCheatSheets({
  scrollToEpisodeId,
  onConsumedScroll,
  onPlayEpisode,
  resolveEpisode,
  onOpenMyPodcasts,
}: MyCheatSheetsProps) {
  const { allSheets } = useCheatSheets()
  const { topicsForNav } = useTopics()
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [topicFilter, setTopicFilter] = useState<string>('all')

  /** Every catalog topic (seed + custom), same ordering as the sidebar. */
  const topicOptions = useMemo(
    () => topicsForNav.map((t) => ({ id: t.id, name: t.name })),
    [topicsForNav],
  )

  const visibleSheets = useMemo(() => {
    if (topicFilter === 'all') return allSheets
    return allSheets.filter((s) => s.topicId === topicFilter)
  }, [allSheets, topicFilter])

  useEffect(() => {
    if (!scrollToEpisodeId) return

    const sheet = allSheets.find((s) => s.episodeId === scrollToEpisodeId)
    if (sheet) setTopicFilter(sheet.topicId)

    const id = scrollToEpisodeId
    let clearHi: ReturnType<typeof setTimeout> | undefined
    const scrollTimer = window.setTimeout(() => {
      const el = document.getElementById(`cheat-ep-${id}`)
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
        setHighlightId(id)
        clearHi = window.setTimeout(() => setHighlightId(null), 2500)
      }
      onConsumedScroll()
    }, 50)

    return () => {
      clearTimeout(scrollTimer)
      if (clearHi) clearTimeout(clearHi)
    }
  }, [scrollToEpisodeId, allSheets, onConsumedScroll])

  return (
    <div>
      <h2 className="page-title">My Cheat Sheets</h2>
      <p className="page-sub">Key terms, concepts, and takeaways for episodes you’ve generated.</p>

      <div className="cheat-filter-row">
        <label htmlFor="cheat-topic-filter" className="cheat-filter-label">
          Topic
        </label>
        <select
          id="cheat-topic-filter"
          className="cheat-filter-select config-select"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
        >
          <option value="all">All topics</option>
          {topicOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="cheat-feed">
        {visibleSheets.length === 0 ? (
          <p className="page-sub">No cheat sheets for this topic yet.</p>
        ) : (
          visibleSheets.map((cs: CheatSheet) => {
            const ep = resolveEpisode(cs.episodeId)
            const isHi = highlightId === cs.episodeId
            return (
              <article
                key={cs.id}
                id={`cheat-ep-${cs.episodeId}`}
                className={`cheat-card${isHi ? ' highlight' : ''}`}
              >
                <div className="cheat-top">
                  <span className="cheat-dot" style={{ background: cs.topicDot }} aria-hidden />
                  <h3 className="cheat-top-title">{cs.title}</h3>
                  <div className="cheat-top-actions">
                    {ep && (
                      <button type="button" className="cheat-play-ep" onClick={() => onPlayEpisode(ep)}>
                        Play Episode
                      </button>
                    )}
                    {onOpenMyPodcasts && (
                      <button type="button" className="cheat-library-link" onClick={() => onOpenMyPodcasts()}>
                        My Podcasts
                      </button>
                    )}
                  </div>
                </div>
                <div className="cheat-body">
                  <div className="cheat-section-label">Key terms</div>
                  <div className="cheat-tags">
                    {cs.keyTerms.map((term) => (
                      <span key={term} className="cheat-tag">
                        {term}
                      </span>
                    ))}
                  </div>
                  <div className="cheat-section-label">Key concepts</div>
                  <ul className="cheat-list">
                    {cs.concepts.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  <div className="cheat-section-label">Takeaway</div>
                  <div className="cheat-takeaway">{cs.takeaway}</div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
