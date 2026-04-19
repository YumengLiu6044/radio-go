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
  /** Human label from API when `topicId` is not in the static seed list */
  topicDisplayName?: string
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

/** Built-in topics (counts are recomputed in the app from episodes + library). */
export const SEED_TOPICS: Topic[] = [
  { id: 'history', name: 'History', color: '#b8956c', count: 0 },
  { id: 'science', name: 'Science', color: '#5b9bd5', count: 0 },
  { id: 'sports', name: 'Sports', color: '#2d9d78', count: 0 },
  { id: 'technology', name: 'Technology', color: '#6366f1', count: 0 },
  { id: 'business', name: 'Business', color: '#c27803', count: 0 },
  { id: 'arts', name: 'Arts & culture', color: '#db2777', count: 0 },
]

/** @deprecated Use SEED_TOPICS or useTopics().topicsForNav — kept for imports that expect `topics`. */
export const topics = SEED_TOPICS

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
  {
    id: 'ep-5',
    topicId: 'sports',
    title: 'Moneyball and Modern Analytics',
    emoji: '⚾',
    cardBg: 'linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%)',
    style: 'Interview',
    durationMin: 16,
    depth: 'Intermediate',
    voiceName: 'Brooks',
    voiceRegion: 'US',
    voiceGender: 'Male',
    audioSrc: '/episodes/ep-1.mp3',
  },
  {
    id: 'ep-6',
    topicId: 'sports',
    title: 'The Science of Marathon Training',
    emoji: '🏃',
    cardBg: 'linear-gradient(145deg, #fef3c7 0%, #fde68a 100%)',
    style: 'Informative',
    durationMin: 11,
    depth: 'Beginner',
    voiceName: 'Elena',
    voiceRegion: 'UK',
    voiceGender: 'Female',
    audioSrc: '/episodes/ep-2.mp3',
  },
  {
    id: 'ep-7',
    topicId: 'technology',
    title: 'How Large Language Models Learn',
    emoji: '🤖',
    cardBg: 'linear-gradient(145deg, #eef2ff 0%, #e0e7ff 100%)',
    style: 'Informative',
    durationMin: 22,
    depth: 'Expert',
    voiceName: 'Avery',
    voiceRegion: 'US',
    voiceGender: 'Neutral',
    audioSrc: '/episodes/ep-3.mp3',
  },
  {
    id: 'ep-8',
    topicId: 'business',
    title: 'Unit Economics for Startups',
    emoji: '📈',
    cardBg: 'linear-gradient(145deg, #fff7ed 0%, #ffedd5 100%)',
    style: 'Interview',
    durationMin: 15,
    depth: 'Intermediate',
    voiceName: 'Nia',
    voiceRegion: 'US',
    voiceGender: 'Female',
    audioSrc: '/episodes/ep-4.mp3',
  },
  {
    id: 'ep-9',
    topicId: 'arts',
    title: 'Jazz Harmony in Five Minutes',
    emoji: '🎷',
    cardBg: 'linear-gradient(145deg, #fce7f3 0%, #fbcfe8 100%)',
    style: 'Funny',
    durationMin: 9,
    depth: 'Beginner',
    voiceName: 'Clara',
    voiceRegion: 'UK',
    voiceGender: 'Female',
    audioSrc: '/episodes/ep-1.mp3',
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
  {
    id: 'cs-2',
    episodeId: 'ep-2',
    title: 'Industrial Revolution Explained',
    topicId: 'history',
    topicDot: '#b8956c',
    keyTerms: ['Steam power', 'Textiles', 'Urbanization', 'Coal', 'Factory system'],
    concepts: [
      'Mechanization shifted production from homes to mills and raised output per worker.',
      'Transport networks (canals, rails) linked regions and lowered the cost of goods.',
      'Social change followed wages, child labor debates, and new middle-class roles.',
    ],
    takeaway:
      'The revolution was as much about organization and energy as about machines: scale changed daily life.',
  },
  {
    id: 'cs-4',
    episodeId: 'ep-4',
    title: 'Climate Models Demystified',
    topicId: 'science',
    topicDot: '#5b9bd5',
    keyTerms: ['Forcings', 'Ensembles', 'CMIP', 'Paleoclimate', 'Uncertainty'],
    concepts: [
      'Models encode physics (fluid motion, radiation, chemistry) at coarse grids to project trends.',
      'Multi-model ensembles show where different codes agree, highlighting robust signals.',
      'Scenarios explore futures (emissions paths), not prophecies—inputs drive outcomes.',
    ],
    takeaway:
      'Treat models as structured stress tests: useful for ranges and mechanisms, not single-year weather bets.',
  },
  {
    id: 'cs-5',
    episodeId: 'ep-5',
    title: 'Moneyball and Modern Analytics',
    topicId: 'sports',
    topicDot: '#2d9d78',
    keyTerms: ['On-base percentage', 'Replacement level', 'Scouting', 'Small sample', 'WAR'],
    concepts: [
      'Better metrics can reveal undervalued skills when markets overweight tradition.',
      'Data complements eyes: measurement reduces blind spots but never replaces context.',
      'Adoption spreads until edges shrink—teams then hunt the next inefficiency.',
    ],
    takeaway:
      'Analytics wins when it asks clearer questions than the scoreboard alone.',
  },
  {
    id: 'cs-6',
    episodeId: 'ep-6',
    title: 'The Science of Marathon Training',
    topicId: 'sports',
    topicDot: '#2d9d78',
    keyTerms: ['VO2 max', 'Taper', 'Progressive overload', 'Glycogen', 'Cadence'],
    concepts: [
      'Adaptation needs stress plus recovery; mileage spikes without rest invite injury.',
      'Easy days build aerobic base; intensity sharpens speed and lactate handling.',
      'Taper lets supercompensation show up fresh on race day.',
    ],
    takeaway:
      'Marathons reward patience: consistency beats hero weeks.',
  },
  {
    id: 'cs-7',
    episodeId: 'ep-7',
    title: 'How Large Language Models Learn',
    topicId: 'technology',
    topicDot: '#6366f1',
    keyTerms: ['Pretraining', 'Tokens', 'Attention', 'Fine-tuning', 'Alignment'],
    concepts: [
      'Models compress statistical patterns from huge text into weights that predict likely continuations.',
      'Attention routes context so distant words can influence the next token choice.',
      'Post-training shapes behavior—helpful, honest, harmless goals are layered on base capabilities.',
    ],
    takeaway:
      'LLMs are next-token engines with emergent skills; guardrails and evaluation matter as much as scale.',
  },
  {
    id: 'cs-8',
    episodeId: 'ep-8',
    title: 'Unit Economics for Startups',
    topicId: 'business',
    topicDot: '#c27803',
    keyTerms: ['CAC', 'LTV', 'Contribution margin', 'Burn', 'Payback'],
    concepts: [
      'Unit economics asks whether one customer relationship pays for itself before scale hides leaks.',
      'LTV must exceed CAC with sensible margins or growth amplifies losses.',
      'Contribution margin shows what each sale funds after variable costs.',
    ],
    takeaway:
      'If the spreadsheet does not work on a per-unit basis, volume is not a strategy—it is a magnifier.',
  },
  {
    id: 'cs-9',
    episodeId: 'ep-9',
    title: 'Jazz Harmony in Five Minutes',
    topicId: 'arts',
    topicDot: '#db2777',
    keyTerms: ['ii–V–I', 'Extensions', 'Voice leading', 'Tritone sub', 'Comping'],
    concepts: [
      'Functional harmony moves tension (dominant) toward resolution (tonic).',
      'Extensions (9ths, 11ths) color chords without abandoning the underlying progression.',
      'Smooth voice leading keeps jumps small so lines feel conversational.',
    ],
    takeaway:
      'Jazz harmony is ear training plus grammar: learn a few moves deeply, then bend them.',
  },
]

export function getTopicById(id: string): Topic | undefined {
  return SEED_TOPICS.find((t) => t.id === id)
}

export function episodesForTopic(topicId: string): Episode[] {
  return episodes.filter((e) => e.topicId === topicId)
}

export function cheatSheetForEpisode(episodeId: string): CheatSheet | undefined {
  return cheatSheetsData.find((c) => c.episodeId === episodeId)
}

/** No bundled template loops; canvas uses Nova presigned URL for generated jobs only. */
export function canvasVideoSrcForEpisode(_episode: Episode): string | null {
  return null
}
