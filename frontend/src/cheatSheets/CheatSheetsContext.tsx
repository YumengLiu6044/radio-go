import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { cheatSheetForEpisode as mockCheatSheetForEpisode, cheatSheetsData, type CheatSheet } from '../data/mockData'

/** Bump version to drop old localStorage rows (fresh client state). */
const STORAGE_KEY = 'radio-go.cheat-sheets.v2'
/** Episode ids whose cheat sheets are hidden (e.g. removed podcast, including mock catalog). */
const HIDDEN_EPISODES_KEY = 'radio-go.cheat-hidden-episodes.v1'

function loadHiddenEpisodeIds(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_EPISODES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}

function persistHiddenEpisodeIds(ids: string[]) {
  localStorage.setItem(HIDDEN_EPISODES_KEY, JSON.stringify(ids))
}

function loadStored(): CheatSheet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidCheatSheet)
  } catch {
    return []
  }
}

function isValidCheatSheet(x: unknown): x is CheatSheet {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.episodeId === 'string' &&
    typeof o.title === 'string' &&
    typeof o.topicId === 'string' &&
    typeof o.topicDot === 'string' &&
    Array.isArray(o.keyTerms) &&
    Array.isArray(o.concepts) &&
    typeof o.takeaway === 'string'
  )
}

function persist(rows: CheatSheet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
}

type CheatSheetsContextValue = {
  generatedSheets: CheatSheet[]
  addCheatSheet: (sheet: CheatSheet) => void
  removeCheatSheetForEpisode: (episodeId: string) => void
  cheatSheetForEpisode: (episodeId: string) => CheatSheet | undefined
  /** Generated first (newest), then mock sheets without duplicate episodeId. */
  allSheets: CheatSheet[]
}

const CheatSheetsContext = createContext<CheatSheetsContextValue | null>(null)

export function CheatSheetsProvider({ children }: { children: ReactNode }) {
  const [generatedSheets, setGeneratedSheets] = useState<CheatSheet[]>(() => loadStored())
  const [hiddenEpisodeIds, setHiddenEpisodeIds] = useState<string[]>(() => loadHiddenEpisodeIds())

  const hiddenSet = useMemo(() => new Set(hiddenEpisodeIds), [hiddenEpisodeIds])

  const addCheatSheet = useCallback((sheet: CheatSheet) => {
    setHiddenEpisodeIds((prev) => {
      if (!prev.includes(sheet.episodeId)) return prev
      const next = prev.filter((id) => id !== sheet.episodeId)
      persistHiddenEpisodeIds(next)
      return next
    })
    setGeneratedSheets((prev) => {
      const next = [sheet, ...prev.filter((s) => s.episodeId !== sheet.episodeId)]
      persist(next)
      return next
    })
  }, [])

  const removeCheatSheetForEpisode = useCallback((episodeId: string) => {
    setGeneratedSheets((prev) => {
      const next = prev.filter((s) => s.episodeId !== episodeId)
      persist(next)
      return next
    })
    setHiddenEpisodeIds((prev) => {
      if (prev.includes(episodeId)) return prev
      const next = [...prev, episodeId]
      persistHiddenEpisodeIds(next)
      return next
    })
  }, [])

  const cheatSheetForEpisode = useCallback(
    (episodeId: string) => {
      if (hiddenSet.has(episodeId)) return undefined
      return (
        generatedSheets.find((s) => s.episodeId === episodeId) ?? mockCheatSheetForEpisode(episodeId)
      )
    },
    [generatedSheets, hiddenSet],
  )

  const allSheets = useMemo(() => {
    const genIds = new Set(generatedSheets.map((s) => s.episodeId))
    const mocks = cheatSheetsData.filter((m) => !genIds.has(m.episodeId))
    return [...generatedSheets, ...mocks].filter((s) => !hiddenSet.has(s.episodeId))
  }, [generatedSheets, hiddenSet])

  const value = useMemo(
    () => ({
      generatedSheets,
      addCheatSheet,
      removeCheatSheetForEpisode,
      cheatSheetForEpisode,
      allSheets,
    }),
    [generatedSheets, addCheatSheet, removeCheatSheetForEpisode, cheatSheetForEpisode, allSheets],
  )

  return <CheatSheetsContext.Provider value={value}>{children}</CheatSheetsContext.Provider>
}

export function useCheatSheets() {
  const ctx = useContext(CheatSheetsContext)
  if (!ctx) throw new Error('useCheatSheets must be used within CheatSheetsProvider')
  return ctx
}
