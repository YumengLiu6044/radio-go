/**
 * Use same-origin `/api` by default so Vite proxy handles backend calls in dev
 * (avoids browser CORS preflight issues). Override via VITE_API_BASE if needed.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '/api'

export type VoiceTypeApi = 'male' | 'female'

export type DialogueLine = {
  speaker: 'host' | 'guest'
  text: string
  voice_type: VoiceTypeApi
}

export type PodcastScript = {
  lines: DialogueLine[]
}

function joinUrl(path: string): string {
  const base = API_BASE || ''
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

function parseDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        if (e && typeof e === 'object' && 'msg' in e) return String((e as { msg: string }).msg)
        return JSON.stringify(e)
      })
      .join('; ')
  }
  if (detail && typeof detail === 'object' && 'message' in detail) {
    return String((detail as { message: string }).message)
  }
  return 'Request failed'
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: unknown }
    if (data.detail !== undefined) return parseDetail(data.detail)
  } catch {
    /* ignore */
  }
  return res.statusText || `HTTP ${res.status}`
}

async function postJsonWithFallback<TBody extends object, TResult>(
  paths: string[],
  body: TBody,
): Promise<TResult> {
  let lastError: string | null = null
  for (let i = 0; i < paths.length; i++) {
    const res = await fetch(joinUrl(paths[i]), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) return (await res.json()) as TResult
    const err = await readError(res)
    if (res.status !== 404 || i === paths.length - 1) throw new Error(err)
    lastError = err
  }
  throw new Error(lastError ?? 'Request failed')
}

async function postFormWithFallback<TResult>(paths: string[], body: FormData): Promise<TResult> {
  let lastError: string | null = null
  for (let i = 0; i < paths.length; i++) {
    const res = await fetch(joinUrl(paths[i]), {
      method: 'POST',
      body,
    })
    if (res.ok) return (await res.json()) as TResult
    const err = await readError(res)
    if (res.status !== 404 || i === paths.length - 1) throw new Error(err)
    lastError = err
  }
  throw new Error(lastError ?? 'Request failed')
}

export type GenerateBaseBody = {
  user_id: string
  voice_type_host: VoiceTypeApi
  voice_type_guest: VoiceTypeApi
  audio_length: number
  topic: string
  style: string
  single: boolean
}

export async function generateFromText(body: GenerateBaseBody & { text_body: string }): Promise<PodcastScript> {
  const data = await postJsonWithFallback<typeof body, { script: PodcastScript }>(
    ['/generate/generate-from-text', '/generate-from-text'],
    body,
  )
  return data.script
}

export async function generateFromUrl(body: GenerateBaseBody & { urls: string[] }): Promise<PodcastScript> {
  const data = await postJsonWithFallback<typeof body, { script: PodcastScript }>(
    ['/generate/generate-from-url', '/generate-from-url'],
    body,
  )
  return data.script
}

export async function generateFromPdf(
  file: File,
  fields: GenerateBaseBody,
): Promise<PodcastScript> {
  const form = new FormData()
  form.append('user_id', fields.user_id)
  form.append('voice_type_host', fields.voice_type_host)
  form.append('voice_type_guest', fields.voice_type_guest)
  form.append('audio_length', String(fields.audio_length))
  form.append('topic', fields.topic)
  form.append('style', fields.style)
  form.append('single', fields.single ? 'true' : 'false')
  form.append('file', file)

  const data = await postFormWithFallback<{ script: PodcastScript }>(
    ['/generate/generate-from-docs', '/generate-from-docs'],
    form,
  )
  return data.script
}
