import { episodesForTopic, topics, type Episode } from '../data/mockData'

type MyPodcastsProps = {
  playingEpisodeId: string | null
  onPlay: (episode: Episode) => void
  onCheatSheet: (episodeId: string) => void
  onPlayAll: (topicId: string) => void
}

export function MyPodcasts({ playingEpisodeId, onPlay, onCheatSheet, onPlayAll }: MyPodcastsProps) {
  return (
    <div>
      <h2 className="page-title">My Podcasts</h2>
      <p className="page-sub">Your library, organized by topic. Scroll sideways in each row.</p>

      {topics.map((topic) => {
        const eps = episodesForTopic(topic.id)
        if (eps.length === 0) return null
        return (
          <section key={topic.id} className="topic-section">
            <div className="topic-section-header">
              <h2>{topic.name}</h2>
              <button type="button" className="play-all" onClick={() => onPlayAll(topic.id)}>
                Play All
              </button>
            </div>
            <div className="carousel">
              {eps.map((ep) => (
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
                      <button type="button" className="ep-btn primary" onClick={() => onPlay(ep)}>
                        Play
                      </button>
                      <button type="button" className="ep-btn" onClick={() => onCheatSheet(ep.id)}>
                        Cheat Sheet
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
