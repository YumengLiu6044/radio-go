import { API_BASE } from './generate'
import type { GenerateBaseBody, PodcastScript } from './generate'
import type { Episode } from '../data/mockData'
import { topics } from '../data/mockData'

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
  style?: string
  length?: number
  total_lines?: number
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

export function dynamoRowToEpisode(row: DynamoPodcastRow, audioReady: boolean): Episode {
  const jobId = String(row.job_id)
  const topicId = row.topic_id ?? topics.find((t) => t.name === row.topic)?.id ?? 'history'
  const lengthSec = typeof row.length === 'number' ? row.length : Number(row.length ?? 120)
  const durationMin = Math.max(1, Math.round(lengthSec / 60))
  const totalLines = Math.max(
    1,
    typeof row.total_lines === 'number' ? row.total_lines : Number(row.total_lines ?? 1),
  )

  return {
    id: jobId,
    topicId,
    title: String(row.title ?? 'Untitled episode'),
    emoji: '🎙️',
    cardBg: pickGradient(jobId),
    style: String(row.style ?? 'Generated'),
    durationMin,
    depth: 'Generated',
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
