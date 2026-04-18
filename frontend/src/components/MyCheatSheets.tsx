import { useEffect, useState } from 'react'
import { cheatSheetsData, episodes, type Episode } from '../data/mockData'

type MyCheatSheetsProps = {
  hasGeneratedOnce: boolean
  scrollToEpisodeId: string | null
  onConsumedScroll: () => void
  onPlayEpisode: (episode: Episode) => void
}

export function MyCheatSheets({
  hasGeneratedOnce,
  scrollToEpisodeId,
  onConsumedScroll,
  onPlayEpisode,
}: MyCheatSheetsProps) {
  const [highlightId, setHighlightId] = useState<string | null>(null)

  useEffect(() => {
    if (!scrollToEpisodeId) return
    const id = scrollToEpisodeId
    const el = document.getElementById(`cheat-ep-${id}`)
    let clearHi: ReturnType<typeof setTimeout> | undefined
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      setHighlightId(id)
      clearHi = window.setTimeout(() => setHighlightId(null), 2500)
    }
    onConsumedScroll()
    return () => {
      if (clearHi) clearTimeout(clearHi)
    }
  }, [scrollToEpisodeId, onConsumedScroll])

  if (!hasGeneratedOnce) {
    return (
      <div>
        <h2 className="page-title">My Cheat Sheets</h2>
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden>
            📋
          </div>
          <h2>No cheat sheets yet</h2>
          <p>Generate a podcast from the Create page to unlock summaries, key terms, and takeaways here.</p>
        </div>
      </div>
    )
  }

  const sheets = cheatSheetsData

  return (
    <div>
      <h2 className="page-title">My Cheat Sheets</h2>
      <p className="page-sub">Key terms, concepts, and takeaways for episodes you’ve generated.</p>

      <div className="cheat-feed">
        {sheets.map((cs) => {
          const ep = episodes.find((e) => e.id === cs.episodeId)
          const isHi = highlightId === cs.episodeId
          return (
            <article key={cs.id} id={`cheat-ep-${cs.episodeId}`} className={`cheat-card${isHi ? ' highlight' : ''}`}>
              <div className="cheat-top">
                <span className="cheat-dot" style={{ background: cs.topicDot }} aria-hidden />
                <h3 className="cheat-top-title">{cs.title}</h3>
                {ep && (
                  <button type="button" className="cheat-play-ep" onClick={() => onPlayEpisode(ep)}>
                    Play Episode
                  </button>
                )}
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
        })}
      </div>
    </div>
  )
}
