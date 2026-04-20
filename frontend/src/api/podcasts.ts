import { API_BASE } from './generate'
import type { GenerateBaseBody, PodcastScript } from './generate'
import type { Episode } from '../data/mockData'
import { topicIdFromDynamoRow } from '../lib/topicIds'

export const DEMO_USER_ID = 'demo-user'

export type ConfirmPodcastBody = GenerateBaseBody & { script: PodcastScript }

function join(path: string): string {
  const base = API_BASE || ''
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: unknown }
    if (typeof data.detail === 'string') return data.detail
  } catch {
    /* ignore */
  }
  return res.statusText || `HTTP ${res.status}`
}

export async function confirmPodcast(body: ConfirmPodcastBody): Promise<{
  job_id: string
  user_id: string
  total_lines: number
  title: string
  topic: string
  topic_id?: string
  style: string
  length: number
}> {
  const url = join('/generate/confirm')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const ct = res.headers.get('content-type') ?? ''
  if (!res.ok) throw new Error(await readError(res))
  if (!ct.includes('application/json')) {
    const text = await res.text()
    throw new Error(
      `Expected JSON from ${url}, got ${ct || 'unknown type'}. ` +
        `Is the Vite dev server proxying /api to the FastAPI backend? First bytes: ${text.slice(0, 120)}`,
    )
  }
  return (await res.json()) as Awaited<ReturnType<typeof confirmPodcast>>
}

export type DynamoPodcastRow = {
  job_id: string
  user_id?: string
  title?: string
  topic?: string
  topic_id?: string
  /** Some JSON layers use camelCase */
  topicId?: string
  style?: string
  length?: number
  total_lines?: number
  /** Nova Reel pipeline (optional) */
  canvas_video_status?: string
  canvas_video_bucket?: string
  canvas_video_key?: string
  canvas_video_error?: string
}

export async function fetchUserPodcasts(userId: string): Promise<DynamoPodcastRow[]> {
  const res = await fetch(`${join('/streaming/podcasts')}?user_id=${encodeURIComponent(userId)}`)
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as DynamoPodcastRow[]
}

export type JobStatus = {
  job_id: string
  status: string
  parts_received: number
  total_lines: number
}

/** Presigned S3 URL for Nova Reel canvas MP4 when ready; null if still generating or pipeline disabled. */
export async function fetchCanvasVideoPresignedUrl(jobId: string): Promise<string | null> {
  const res = await fetch(`${join('/streaming/canvas-video-url')}?job_id=${encodeURIComponent(jobId)}`)
  if (res.status === 404) return null
  if (!res.ok) return null
  try {
    const data = (await res.json()) as { url?: string }
    return typeof data.url === 'string' && data.url.length > 0 ? data.url : null
  } catch {
    return null
  }
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${join('/streaming/status')}?job_id=${encodeURIComponent(jobId)}`)
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as Partial<JobStatus> & { job_id: string; status: string }
  return {
    job_id: data.job_id,
    status: data.status,
    parts_received: typeof data.parts_received === 'number' ? data.parts_received : 0,
    total_lines: typeof data.total_lines === 'number' ? data.total_lines : 0,
  }
}

const USER_GRADIENTS = [
  'linear-gradient(145deg, #e8eeff 0%, #dbe4ff 100%)',
  'linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%)',
  'linear-gradient(145deg, #fef3c7 0%, #fde68a 100%)',
]

function pickGradient(jobId: string): string {
  let n = 0
  for (let i = 0; i < jobId.length; i++) n = (n + jobId.charCodeAt(i)) * 31
  return USER_GRADIENTS[Math.abs(n) % USER_GRADIENTS.length]!
}

/** Lakers / NBA demo: only sports-tagged (or clearly sports-labeled) *generated* rows use the ball art. */
const SPORTS_DEMO_CARD_BG =
  'linear-gradient(145deg, #fff7ed 0%, #fed7aa 45%, #fb923c 100%)'

function rawTopicIdFromRow(row: DynamoPodcastRow): string | undefined {
  const a = row.topic_id
  const b = row.topicId
  const v = (typeof a === 'string' ? a : typeof b === 'string' ? b : '').trim()
  return v || undefined
}

function useSportsDemoPresentation(topicId: string, topicLabel?: string): boolean {
  if (topicId === 'sports') return true
  if (topicLabel && /sport|nba|lakers|basketball|hoops/i.test(topicLabel)) return true
  return false
}

export function dynamoRowToEpisode(row: DynamoPodcastRow, audioReady: boolean): Episode {
  const jobId = String(row.job_id)
  const topicName = typeof row.topic === 'string' ? row.topic.trim() : undefined
  const topicId = topicIdFromDynamoRow(rawTopicIdFromRow(row), topicName)
  const lengthSec = typeof row.length === 'number' ? row.length : Number(row.length ?? 120)
  const durationMin = Math.max(1, Math.round(lengthSec / 60))
  const totalLines = Math.max(
    1,
    typeof row.total_lines === 'number' ? row.total_lines : Number(row.total_lines ?? 1),
  )

  const sportsDemo = useSportsDemoPresentation(topicId, topicName)
  const emoji = sportsDemo ? '🏀' : '🎙️'
  const cardBg = sportsDemo ? SPORTS_DEMO_CARD_BG : pickGradient(jobId)

  return {
    id: jobId,
    topicId,
    topicDisplayName: topicName || undefined,
    title: String(row.title ?? 'Untitled episode'),
    emoji,
    cardBg,
    style: String(row.style ?? 'Generated'),
    durationMin,
    depth: 'Beginner',
    voiceName: 'TTS',
    voiceRegion: 'US',
    voiceGender: '—',
    audioSrc: `${join('/streaming/stream-url')}?job_id=${encodeURIComponent(jobId)}`,
    jobId,
    audioReady,
    synthProgress: audioReady ? undefined : { received: 0, total: totalLines },
  }
}

export async function pollJobUntilComplete(
  jobId: string,
  opts: { intervalMs?: number; maxAttempts?: number; onProgress?: (s: JobStatus) => void } = {},
): Promise<void> {
  const intervalMs = opts.intervalMs ?? 2000
  const maxAttempts = opts.maxAttempts ?? 150
  for (let i = 0; i < maxAttempts; i++) {
    const st = await getJobStatus(jobId)
    opts.onProgress?.(st)
    if (st.status === 'completed') return
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error(
    'Audio never finished: parts stayed at 0. Run the inference worker in another terminal: npm run inference ' +
      '(same AWS credentials and SQS_URL as the API).',
  )
}
