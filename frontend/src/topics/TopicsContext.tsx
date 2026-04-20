import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { SEED_TOPICS, type Topic } from '../data/mockData'
import { slugifyTopicName } from '../lib/topicIds'
import { useLibrary } from '../library/LibraryContext'

/** Bump version to drop old localStorage rows (fresh client state). */
const STORAGE_KEY = 'radio-go.custom-topics.v2'

const ACCENT_COLORS = [
  '#e07c4c',
  '#8b5cf6',
  '#14b8a6',
  '#ec4899',
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#64748b',
  '#b8956c',
  '#5b9bd5',
]

function pickColor(seed: string): string {
  let n = 0
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) | 0
  return ACCENT_COLORS[Math.abs(n) % ACCENT_COLORS.length]!
}

function loadCustomTopics(): Topic[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (t): t is Topic =>
        t &&
        typeof t === 'object' &&
        typeof (t as Topic).id === 'string' &&
        typeof (t as Topic).name === 'string' &&
        typeof (t as Topic).color === 'string',
    )
  } catch {
    return []
  }
}

function saveCustomTopics(rows: Topic[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
}

type AddTopicResult =
  | { kind: 'add'; next: Topic[]; topic: Topic }
  | { kind: 'existing'; topic: Topic }
  | { kind: 'error'; message: string }

function tryAddCustomTopic(prev: Topic[], trimmed: string): AddTopicResult {
  if (!trimmed) return { kind: 'error', message: 'Enter a topic name.' }
  if (trimmed.length > 80) return { kind: 'error', message: 'Topic name is too long (max 80 characters).' }

  for (const t of SEED_TOPICS) {
    if (t.name.toLowerCase() === trimmed.toLowerCase()) return { kind: 'existing', topic: t }
  }
  const dup = prev.find((t) => t.name.toLowerCase() === trimmed.toLowerCase())
  if (dup) return { kind: 'existing', topic: dup }

  const taken = new Set([...SEED_TOPICS.map((t) => t.id), ...prev.map((t) => t.id)])
  const base = slugifyTopicName(trimmed)
  let candidate = base
  let n = 2
  while (taken.has(candidate)) {
    candidate = `${base}-${n++}`
  }
  const topic: Topic = { id: candidate, name: trimmed, color: pickColor(candidate), count: 0 }
  return { kind: 'add', next: [...prev, topic], topic }
}

type TopicsContextValue = {
  /** Seed + custom topics with live episode counts (sidebar + grouping). */
  topicsForNav: Topic[]
  getTopic: (id: string) => Topic | undefined
  /** Always returns a Topic row (synthetic if unknown id). */
  topicForDisplay: (id: string, displayHint?: string) => Topic
  addCustomTopic: (name: string) => { ok: true; topic: Topic } | { ok: false; message: string }
}

const TopicsContext = createContext<TopicsContextValue | null>(null)

export function TopicsProvider({ children }: { children: ReactNode }) {
  const { mergeForTopic, userEpisodes } = useLibrary()
  const [customTopics, setCustomTopics] = useState<Topic[]>(() => loadCustomTopics())

  const seedIds = useMemo(() => new Set(SEED_TOPICS.map((t) => t.id)), [])

  const mergedCatalog = useMemo(() => {
    const customFiltered = customTopics.filter((t) => !seedIds.has(t.id))
    return [...SEED_TOPICS, ...customFiltered]
  }, [customTopics, seedIds])

  const topicsForNav = useMemo(() => {
    const withCounts = mergedCatalog.map((t) => ({
      ...t,
      count: mergeForTopic(t.id).length,
    }))
    return [...withCounts].sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }))
  }, [mergedCatalog, mergeForTopic])

  const getTopic = useCallback(
    (id: string) => mergedCatalog.find((t) => t.id === id),
    [mergedCatalog],
  )

  const topicForDisplay = useCallback(
    (id: string, displayHint?: string) => {
      const hit = mergedCatalog.find((t) => t.id === id)
      if (hit) {
        return { ...hit, count: mergeForTopic(id).length }
      }
      const label =
        displayHint?.trim() ||
        id
          .split('-')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ') ||
        id
      return { id, name: label, color: pickColor(id), count: mergeForTopic(id).length }
    },
    [mergedCatalog, mergeForTopic],
  )

  const ensureTopicFromEpisode = useCallback(
    (topicId: string, displayHint?: string) => {
      if (seedIds.has(topicId)) return
      setCustomTopics((prev) => {
        if (prev.some((t) => t.id === topicId)) return prev
        if (SEED_TOPICS.some((t) => t.id === topicId)) return prev
        const name =
          displayHint?.trim() ||
          topicId
            .split('-')
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
        const row: Topic = { id: topicId, name, color: pickColor(topicId), count: 0 }
        const next = [...prev, row]
        saveCustomTopics(next)
        return next
      })
    },
    [seedIds],
  )

  useEffect(() => {
    for (const ep of userEpisodes) {
      ensureTopicFromEpisode(ep.topicId, ep.topicDisplayName)
    }
  }, [userEpisodes, ensureTopicFromEpisode])

  const addCustomTopic = useCallback((name: string): { ok: true; topic: Topic } | { ok: false; message: string } => {
    const trimmed = name.trim()
    const r = tryAddCustomTopic(customTopics, trimmed)
    if (r.kind === 'error') return { ok: false, message: r.message }
    if (r.kind === 'existing') return { ok: true, topic: r.topic }
    setCustomTopics(r.next)
    saveCustomTopics(r.next)
    return { ok: true, topic: r.topic }
  }, [customTopics])

  const value = useMemo(
    () => ({
      topicsForNav,
      getTopic,
      topicForDisplay,
      addCustomTopic,
    }),
    [topicsForNav, getTopic, topicForDisplay, addCustomTopic],
  )

  return <TopicsContext.Provider value={value}>{children}</TopicsContext.Provider>
}

export function useTopics() {
  const ctx = useContext(TopicsContext)
  if (!ctx) throw new Error('useTopics must be used within TopicsProvider')
  return ctx
}
