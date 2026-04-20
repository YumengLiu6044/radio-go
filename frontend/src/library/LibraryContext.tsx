import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { episodesForTopic, type Episode } from '../data/mockData'
import {
  DEMO_USER_ID,
  dynamoRowToEpisode,
  fetchUserPodcasts,
  getJobStatus,
} from '../api/podcasts'

const DISMISSED_KEY = 'radio-go.library-dismissed.v1'

function loadDismissedIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}

function persistDismissedIds(ids: string[]) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids))
}

type LibraryContextValue = {
  userEpisodes: Episode[]
  /** Episodes the user removed from the library (persisted); excluded from `mergeForTopic` and refetches. */
  dismissedEpisodeIds: readonly string[]
  refreshLibrary: () => Promise<void>
  mergeForTopic: (topicId: string) => Episode[]
  addOrReplaceUserEpisode: (ep: Episode) => void
  dismissEpisodeFromLibrary: (episodeId: string) => void
  markEpisodeAudioReady: (jobId: string) => void
  setEpisodeSynthProgress: (jobId: string, received: number, total: number) => void
  /** Shown after a successful confirm; TTS only finishes when the inference worker drains SQS. */
  queueHint: string | null
  setQueueHint: (hint: string | null) => void
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [userEpisodes, setUserEpisodes] = useState<Episode[]>([])
  const [queueHint, setQueueHint] = useState<string | null>(null)
  const [dismissedEpisodeIds, setDismissedEpisodeIds] = useState<string[]>(() => loadDismissedIds())
  const dismissedRef = useRef<Set<string>>(new Set(dismissedEpisodeIds))

  useEffect(() => {
    dismissedRef.current = new Set(dismissedEpisodeIds)
  }, [dismissedEpisodeIds])

  const refreshLibrary = useCallback(async () => {
    try {
      const rows = await fetchUserPodcasts(DEMO_USER_ID)
      const enriched = await Promise.all(
        rows.map(async (row) => {
          const jobId = String(row.job_id)
          let audioReady = false
          let received = 0
          let total = 0
          try {
            const st = await getJobStatus(jobId)
            audioReady = st.status === 'completed'
            received = st.parts_received
            total = st.total_lines
          } catch {
            audioReady = false
          }
          const ep = dynamoRowToEpisode(row, audioReady)
          const rowTotal =
            typeof row.total_lines === 'number' ? row.total_lines : Number(row.total_lines ?? total)
          const t = Math.max(1, total || rowTotal)
          return {
            ...ep,
            synthProgress: audioReady ? undefined : { received, total: t },
          }
        }),
      )
      // GSI `user_id_index` can lag briefly after confirm; keep pending local rows until they appear.
      setUserEpisodes((prev) => {
        const apiIds = new Set(enriched.map((e) => e.id))
        const orphanPending = prev.filter(
          (e) => e.audioReady === false && e.jobId && !apiIds.has(e.id),
        )
        const dismissed = dismissedRef.current
        return [...enriched, ...orphanPending].filter((e) => !dismissed.has(e.id))
      })
    } catch {
      setUserEpisodes([])
    }
  }, [])

  useEffect(() => {
    void refreshLibrary()
  }, [refreshLibrary])

  const dismissedSet = useMemo(() => new Set(dismissedEpisodeIds), [dismissedEpisodeIds])

  const mergeForTopic = useCallback(
    (topicId: string) => {
      const mine = userEpisodes.filter((e) => e.topicId === topicId && !dismissedSet.has(e.id))
      const seed = episodesForTopic(topicId).filter((e) => !dismissedSet.has(e.id))
      return [...mine, ...seed]
    },
    [userEpisodes, dismissedSet],
  )

  const addOrReplaceUserEpisode = useCallback((ep: Episode) => {
    setUserEpisodes((prev) => [ep, ...prev.filter((e) => e.id !== ep.id)])
  }, [])

  const dismissEpisodeFromLibrary = useCallback((episodeId: string) => {
    setDismissedEpisodeIds((prev) => {
      if (prev.includes(episodeId)) return prev
      const next = [...prev, episodeId]
      persistDismissedIds(next)
      return next
    })
    setUserEpisodes((prev) => prev.filter((e) => e.id !== episodeId))
  }, [])

  const markEpisodeAudioReady = useCallback((jobId: string) => {
    setUserEpisodes((prev) =>
      prev.map((e) =>
        e.jobId === jobId ? { ...e, audioReady: true, synthProgress: undefined } : e,
      ),
    )
  }, [])

  const setEpisodeSynthProgress = useCallback((jobId: string, received: number, total: number) => {
    const t = Math.max(1, total)
    setUserEpisodes((prev) =>
      prev.map((e) =>
        e.jobId === jobId ? { ...e, synthProgress: { received, total: t } } : e,
      ),
    )
  }, [])

  const value = useMemo(
    () => ({
      userEpisodes,
      dismissedEpisodeIds,
      refreshLibrary,
      mergeForTopic,
      addOrReplaceUserEpisode,
      dismissEpisodeFromLibrary,
      markEpisodeAudioReady,
      setEpisodeSynthProgress,
      queueHint,
      setQueueHint,
    }),
    [
      userEpisodes,
      dismissedEpisodeIds,
      refreshLibrary,
      mergeForTopic,
      addOrReplaceUserEpisode,
      dismissEpisodeFromLibrary,
      markEpisodeAudioReady,
      setEpisodeSynthProgress,
      queueHint,
    ],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
  return ctx
}
