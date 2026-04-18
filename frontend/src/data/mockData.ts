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
  /** Local file under `public/episodes/` */
  audioSrc: string
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
  { id: 'history', name: 'History', color: '#b8956c', count: 11 },
  { id: 'science', name: 'Science', color: '#5b9bd5', count: 10 },
  { id: 'business', name: 'Business', color: '#70ad47', count: 9 },
]

const baseEpisodes: Episode[] = [
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
    topicId: 'history',
    title: 'Ancient Egypt: Beyond Pyramids',
    emoji: '📜',
    cardBg: 'linear-gradient(145deg, #f4ecd8 0%, #ebe0c4 100%)',
    style: 'Funny',
    durationMin: 10,
    depth: 'Beginner',
    voiceName: 'Priya',
    voiceRegion: 'IND',
    voiceGender: 'Female',
    audioSrc: '/episodes/ep-3.mp3',
  },
  {
    id: 'ep-4',
    topicId: 'history',
    title: 'World War II: Pacific Theater',
    emoji: '🌊',
    cardBg: 'linear-gradient(145deg, #dde8f0 0%, #cfdce8 100%)',
    style: 'Interview',
    durationMin: 22,
    depth: 'Expert',
    voiceName: 'James',
    voiceRegion: 'AUS',
    voiceGender: 'Male',
    audioSrc: '/episodes/ep-4.mp3',
  },
  {
    id: 'ep-5',
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
    audioSrc: '/episodes/ep-5.mp3',
  },
  {
    id: 'ep-6',
    topicId: 'science',
    title: 'CRISPR: Promise and Pitfalls',
    emoji: '🧬',
    cardBg: 'linear-gradient(145deg, #e8f2ec 0%, #d8ebe2 100%)',
    style: 'Interview',
    durationMin: 16,
    depth: 'Intermediate',
    voiceName: 'Marcus',
    voiceRegion: 'US',
    voiceGender: 'Male',
    audioSrc: '/episodes/ep-6.mp3',
  },
  {
    id: 'ep-7',
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
    audioSrc: '/episodes/ep-7.mp3',
  },
  {
    id: 'ep-8',
    topicId: 'business',
    title: 'Unit Economics for Startups',
    emoji: '📊',
    cardBg: 'linear-gradient(145deg, #ecf4e8 0%, #ddecd6 100%)',
    style: 'Informative',
    durationMin: 11,
    depth: 'Intermediate',
    voiceName: 'Priya',
    voiceRegion: 'IND',
    voiceGender: 'Female',
    audioSrc: '/episodes/ep-8.mp3',
  },
  {
    id: 'ep-9',
    topicId: 'business',
    title: 'Negotiation: Win Without Burning Bridges',
    emoji: '🤝',
    cardBg: 'linear-gradient(145deg, #f2f0e8 0%, #e8e4d8 100%)',
    style: 'Funny',
    durationMin: 15,
    depth: 'Beginner',
    voiceName: 'Clara',
    voiceRegion: 'UK',
    voiceGender: 'Female',
    audioSrc: '/episodes/ep-9.mp3',
  },
]

const CARD_BG_ROT: string[] = [
  'linear-gradient(145deg, #f0e6d8 0%, #e8dcc8 100%)',
  'linear-gradient(145deg, #e8ecf4 0%, #dce3f0 100%)',
  'linear-gradient(145deg, #f4ecd8 0%, #ebe0c4 100%)',
  'linear-gradient(145deg, #dde8f0 0%, #cfdce8 100%)',
  'linear-gradient(145deg, #e6eef8 0%, #d8e4f4 100%)',
  'linear-gradient(145deg, #e8f2ec 0%, #d8ebe2 100%)',
  'linear-gradient(145deg, #e4f0f4 0%, #d4e6ec 100%)',
  'linear-gradient(145deg, #ecf4e8 0%, #ddecd6 100%)',
  'linear-gradient(145deg, #f2f0e8 0%, #e8e4d8 100%)',
]

const STYLE_ROT = ['Informative', 'Funny', 'Story-driven', 'Interview'] as const
const DEPTH_ROT = ['Beginner', 'Intermediate', 'Expert'] as const

const MORE_EPISODES: { topicId: 'history' | 'science' | 'business'; title: string; emoji: string }[] = [
  { topicId: 'history', title: 'Byzantium in Ten Dates', emoji: '🏰' },
  { topicId: 'history', title: 'The Silk Road: Spices and Ideas', emoji: '🐪' },
  { topicId: 'history', title: 'Cold War: Myths vs Archives', emoji: '🛰️' },
  { topicId: 'history', title: 'Medieval Law You Still Use', emoji: '⚖️' },
  { topicId: 'history', title: 'Age of Sail: Navigation Stories', emoji: '⛵' },
  { topicId: 'history', title: 'Decolonization in One Hour', emoji: '🌍' },
  { topicId: 'history', title: 'Bronze Age Collapse Theories', emoji: '🔥' },
  { topicId: 'science', title: 'Neuroplasticity After 30', emoji: '🧠' },
  { topicId: 'science', title: 'Fusion: Where the Bottlenecks Are', emoji: '⚡' },
  { topicId: 'science', title: 'Microplastics: What We Actually Know', emoji: '🔬' },
  { topicId: 'science', title: 'Black Holes for Commuters', emoji: '🕳️' },
  { topicId: 'science', title: 'Sleep Science in Plain English', emoji: '😴' },
  { topicId: 'science', title: 'Antibiotic Resistance Roadmap', emoji: '💊' },
  { topicId: 'science', title: 'Carbon Removal at Scale', emoji: '🌿' },
  { topicId: 'business', title: 'Cap Tables Without the Jargon', emoji: '📑' },
  { topicId: 'business', title: 'Pricing Psychology for SaaS', emoji: '💳' },
  { topicId: 'business', title: 'Board Meetings That Don’t Waste Time', emoji: '🪑' },
  { topicId: 'business', title: 'Hiring Loops That Lose Candidates', emoji: '🧩' },
  { topicId: 'business', title: 'Runway Math for Founders', emoji: '🛫' },
  { topicId: 'business', title: 'Brand vs Performance Marketing', emoji: '📣' },
  { topicId: 'business', title: 'ESG Without the Buzzwords', emoji: '♻️' },
]

const VOICE_ROT: {
  voiceName: string
  voiceRegion: 'US' | 'UK' | 'AUS' | 'IND'
  voiceGender: string
}[] = [
  { voiceName: 'Clara', voiceRegion: 'UK', voiceGender: 'Female' },
  { voiceName: 'Marcus', voiceRegion: 'US', voiceGender: 'Male' },
  { voiceName: 'Priya', voiceRegion: 'IND', voiceGender: 'Female' },
  { voiceName: 'James', voiceRegion: 'AUS', voiceGender: 'Male' },
]

const extraEpisodes: Episode[] = MORE_EPISODES.map((row, i) => {
  const n = 10 + i
  const v = VOICE_ROT[i % VOICE_ROT.length]
  return {
    id: `ep-${n}`,
    topicId: row.topicId,
    title: row.title,
    emoji: row.emoji,
    cardBg: CARD_BG_ROT[i % CARD_BG_ROT.length],
    style: STYLE_ROT[i % STYLE_ROT.length],
    durationMin: 8 + (i % 15),
    depth: DEPTH_ROT[i % DEPTH_ROT.length],
    voiceName: v.voiceName,
    voiceRegion: v.voiceRegion,
    voiceGender: v.voiceGender,
    audioSrc: `/episodes/ep-${((n - 1) % 9) + 1}.mp3`,
  }
})

export const episodes: Episode[] = [...baseEpisodes, ...extraEpisodes]

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
    id: 'cs-2',
    episodeId: 'ep-2',
    title: 'Industrial Revolution Explained',
    topicId: 'history',
    topicDot: '#b8956c',
    keyTerms: ['Steam power', 'Textiles', 'Urbanization', 'Factory system'],
    concepts: [
      'Productivity gains concentrated in a few key industries first.',
      'Migration to cities created new labor markets and social tensions.',
      'Technology diffusion depended on capital, coal, and transport networks.',
    ],
    takeaway:
      'The revolution was as much about organization and energy as about inventions.',
  },
  {
    id: 'cs-5',
    episodeId: 'ep-5',
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
    id: 'cs-8',
    episodeId: 'ep-8',
    title: 'Unit Economics for Startups',
    topicId: 'business',
    topicDot: '#70ad47',
    keyTerms: ['CAC', 'LTV', 'Contribution margin', 'Payback period'],
    concepts: [
      'Unit economics tests whether one customer relationship can profit.',
      'Growth amplifies good—or bad—margins quickly.',
      'Segmentation matters: blended averages hide broken cohorts.',
    ],
    takeaway:
      'If each unit doesn’t work on paper, scale is just a faster way to lose money.',
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
