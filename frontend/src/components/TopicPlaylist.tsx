import { useMemo } from 'react'
import { isEpisodeAudioPlayable, type Episode, type Topic } from '../data/mockData'

type TopicPlaylistProps = {
  topic: Topic
  episodes: Episode[]
  playingEpisodeId: string | null
  shuffle: boolean
  onShuffleToggle: () => void
  onPlay: (episode: Episode) => void
  onPlayPlaylist: () => void
  onBack: () => void
}

function topicHash(topicId: string): number {
  let h = 0
  for (let i = 0; i < topicId.length; i++) {
    h = (Math.imul(31, h) + topicId.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** Stable pseudo-random pick of up to 4 episodes for the cover grid. */
function pickCoverEpisodes(topicId: string, list: Episode[]): Episode[] {
  if (list.length === 0) return []
  const seed = topicHash(topicId)
  const idxs = list.map((_, i) => i)
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = (seed + i * 17) % (i + 1)
    ;[idxs[i], idxs[j]] = [idxs[j], idxs[i]]
  }
  const n = Math.min(4, list.length)
  return idxs.slice(0, n).map((i) => list[i])
}

function formatPlaylistDuration(totalMin: number): string {
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (m === 0) return `${h} hr`
  return `${h} hr ${m} min`
}

function IconShuffle({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.85}
      />
    </svg>
  )
}

function IconPlayLarge() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

export function TopicPlaylist({
  topic,
  episodes,
  playingEpisodeId,
  shuffle,
  onShuffleToggle,
  onPlay,
  onPlayPlaylist,
  onBack,
}: TopicPlaylistProps) {
  const coverEps = useMemo(() => pickCoverEpisodes(topic.id, episodes), [topic.id, episodes])
  const totalMin = useMemo(() => episodes.reduce((s, e) => s + e.durationMin, 0), [episodes])
  const playableCount = useMemo(() => episodes.filter(isEpisodeAudioPlayable).length, [episodes])

  return (
    <div className="topic-playlist">
      <button type="button" className="topic-playlist-back" onClick={onBack}>
        ← My Podcasts
      </button>

      <header className="topic-playlist-hero">
        <div className="topic-playlist-hero-inner">
          <div className="topic-playlist-cover" aria-hidden>
            {coverEps.length === 0 ? (
              <div className="topic-playlist-cover-empty">🎙</div>
            ) : (
              <div className={`topic-playlist-cover-grid topic-playlist-cover-grid--${coverEps.length}`}>
                {coverEps.map((ep) => (
                  <div key={ep.id} className="topic-playlist-cover-cell" style={{ background: ep.cardBg }}>
                    <span className="topic-playlist-cover-emoji">{ep.emoji}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="topic-playlist-hero-text">
            <p className="topic-playlist-type">Playlist</p>
            <h1 className="topic-playlist-title">{topic.name}</h1>
            <p className="topic-playlist-meta">
              ContextCast · {episodes.length} episodes, {formatPlaylistDuration(totalMin)}
            </p>
            <div className="topic-playlist-actions">
              <button
                type="button"
                className={`topic-playlist-icon-btn${shuffle ? ' is-on' : ''}`}
                onClick={onShuffleToggle}
                aria-pressed={shuffle}
                title="Shuffle"
              >
                <IconShuffle active={shuffle} />
              </button>
              <button
                type="button"
                className="topic-playlist-play-btn"
                disabled={playableCount === 0}
                onClick={onPlayPlaylist}
                title={playableCount === 0 ? 'No episodes ready to play yet' : 'Play'}
              >
                <IconPlayLarge />
                <span>Play</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="topic-playlist-tracks" role="list">
        {episodes.map((ep) => {
          const playable = isEpisodeAudioPlayable(ep)
          return (
          <button
            key={ep.id}
            type="button"
            role="listitem"
            disabled={!playable}
            className={`topic-playlist-row${playingEpisodeId === ep.id ? ' is-playing' : ''}${!playable ? ' topic-playlist-row--pending' : ''}`}
            onClick={() => {
              if (playable) onPlay(ep)
            }}
          >
            <div className="topic-playlist-row-thumb" style={{ background: ep.cardBg }} aria-hidden>
              <span>{ep.emoji}</span>
            </div>
            <div className="topic-playlist-row-body">
              <span className="topic-playlist-row-title">{ep.title}</span>
              <span className="topic-playlist-row-sub">
                {ep.durationMin} min · {ep.depth} · {ep.style}
              </span>
            </div>
          </button>
        )})}
      </div>
    </div>
  )
}
