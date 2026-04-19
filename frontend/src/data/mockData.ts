export type Topic = {
  id: string
  name: string
  color: string
  count: number
}

export type Episode = {
  id: string
  topicId: string
  title: string
  emoji: string
  cardBg: string
  style: string
  durationMin: number
  depth: string
  voiceName: string
  voiceRegion: 'US' | 'UK' | 'AUS' | 'IND'
  voiceGender: string
  /** Local file under `public/episodes/` or API URL for generated episodes */
  audioSrc: string
  /** Set for user-generated episodes (Dynamo job id) */
  jobId?: string
  /** false while TTS pipeline is still producing parts; omit on mock episodes (treated as ready) */
  audioReady?: boolean
  /** Dynamo `book-parts` rows received (inference worker); omit on mocks */
  synthProgress?: { received: number; total: number }
}

/** Mock episodes omit `audioReady` (treated as playable). */
export function isEpisodeAudioPlayable(ep: Episode): boolean {
  return ep.audioReady !== false
}

export type CheatSheet = {
  id: string
  episodeId: string
  title: string
  topicId: string
  topicDot: string
  keyTerms: string[]
  concepts: string[]
  takeaway: string
}

export const topics: Topic[] = [
  { id: 'history', name: 'History', color: '#b8956c', count: 2 },
  { id: 'science', name: 'Science', color: '#5b9bd5', count: 2 },
]

export const episodes: Episode[] = [
  {
    id: 'ep-1',
    topicId: 'history',
    title: 'Fall of Rome in 15 Minutes',
    emoji: '🏛️',
    cardBg: 'linear-gradient(145deg, #f0e6d8 0%, #e8dcc8 100%)',
    style: 'Story-driven',
    durationMin: 12,
    depth: 'Expert',
    voiceName: 'Clara',
    voiceRegion: 'UK',
    voiceGender: 'Female',
    audioSrc: '/episodes/ep-1.mp3',
  },
  {
    id: 'ep-2',
    topicId: 'history',
    title: 'Industrial Revolution Explained',
    emoji: '⚙️',
    cardBg: 'linear-gradient(145deg, #e8ecf4 0%, #dce3f0 100%)',
    style: 'Informative',
    durationMin: 18,
    depth: 'Intermediate',
    voiceName: 'Marcus',
    voiceRegion: 'US',
    voiceGender: 'Male',
    audioSrc: '/episodes/ep-2.mp3',
  },
  {
    id: 'ep-3',
    topicId: 'science',
    title: 'Quantum Basics Without Math',
    emoji: '⚛️',
    cardBg: 'linear-gradient(145deg, #e6eef8 0%, #d8e4f4 100%)',
    style: 'Informative',
    durationMin: 14,
    depth: 'Beginner',
    voiceName: 'Clara',
    voiceRegion: 'UK',
    voiceGender: 'Female',
    audioSrc: '/episodes/ep-3.mp3',
  },
  {
    id: 'ep-4',
    topicId: 'science',
    title: 'Climate Models Demystified',
    emoji: '🌍',
    cardBg: 'linear-gradient(145deg, #e4f0f4 0%, #d4e6ec 100%)',
    style: 'Story-driven',
    durationMin: 20,
    depth: 'Expert',
    voiceName: 'James',
    voiceRegion: 'AUS',
    voiceGender: 'Male',
    audioSrc: '/episodes/ep-4.mp3',
  },
]

export const cheatSheetsData: CheatSheet[] = [
  {
    id: 'cs-1',
    episodeId: 'ep-1',
    title: 'Fall of Rome in 15 Minutes',
    topicId: 'history',
    topicDot: '#b8956c',
    keyTerms: ['Diocletian', 'Constantinople', 'Germanic tribes', 'Inflation', 'Legions'],
    concepts: [
      'Political fragmentation outpaced military strength in the late empire.',
      'Economic stress from debased currency and heavy taxation eroded urban life.',
      'The eastern empire survived by adapting administration and trade routes.',
    ],
    takeaway:
      'Rome’s “fall” was a long restructuring: institutions failed gradually, not in a single battle.',
  },
  {
    id: 'cs-3',
    episodeId: 'ep-3',
    title: 'Quantum Basics Without Math',
    topicId: 'science',
    topicDot: '#5b9bd5',
    keyTerms: ['Superposition', 'Measurement', 'Entanglement', 'Qubit'],
    concepts: [
      'Quantum states are probabilities until measured.',
      'Entanglement links outcomes across particles, not “secret signals.”',
      'Engineering qubits means fighting decoherence at scale.',
    ],
    takeaway:
      'Quantum weirdness is a feature of how we describe small systems—not magic, but strict rules.',
  },
]

export function getTopicById(id: string): Topic | undefined {
  return topics.find((t) => t.id === id)
}

export function episodesForTopic(topicId: string): Episode[] {
  return episodes.filter((e) => e.topicId === topicId)
}

export function cheatSheetForEpisode(episodeId: string): CheatSheet | undefined {
  return cheatSheetsData.find((c) => c.episodeId === episodeId)
}

/** Silent canvas MP4 paired with `audioSrc` (e.g. ep-3.mp3 → ep-3.mp4). */
export function canvasVideoSrcForEpisode(episode: Episode): string {
  const m = episode.audioSrc.match(/(ep-\d+)\.mp3$/i)
  const base = m?.[1] ?? 'ep-1'
  return `/episodes/${base}.mp4`
}
