import type { Topic } from '../data/mockData'

type Page = 'create' | 'podcasts' | 'cheats'

type SidebarProps = {
  activePage: Page
  onNavigate: (page: Page) => void
  topics: Topic[]
  onTopicClick: (topicId: string) => void
}

function IconCreate() {
  return (
    <svg className="app-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  )
}

function IconLibrary() {
  return (
    <svg className="app-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h8" strokeLinecap="round" />
    </svg>
  )
}

function IconSheet() {
  return (
    <svg className="app-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
    </svg>
  )
}

export function Sidebar({ activePage, onNavigate, topics, onTopicClick }: SidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="app-brand">
        <div className="app-brand-mark" aria-hidden>
          🎙
        </div>
        <h1>ContextCast</h1>
      </div>

      <nav className="app-nav" aria-label="Primary">
        <button
          type="button"
          className={activePage === 'create' ? 'active' : ''}
          onClick={() => onNavigate('create')}
        >
          <IconCreate />
          Create Podcast
        </button>
        <button
          type="button"
          className={activePage === 'podcasts' ? 'active' : ''}
          onClick={() => onNavigate('podcasts')}
        >
          <IconLibrary />
          My Podcasts
        </button>
        <button
          type="button"
          className={activePage === 'cheats' ? 'active' : ''}
          onClick={() => onNavigate('cheats')}
        >
          <IconSheet />
          My Cheat Sheets
        </button>
      </nav>

      <div className="app-topics-label">Topics</div>
      <div className="app-topic-list">
        {topics.map((t) => (
          <button key={t.id} type="button" className="app-topic-link" onClick={() => onTopicClick(t.id)}>
            <span className="app-topic-dot" style={{ background: t.color }} aria-hidden />
            <span className="app-topic-name">{t.name}</span>
            <span className="app-topic-badge">{t.count}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
