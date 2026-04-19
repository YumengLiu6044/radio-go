import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import {
  generateFromPdf,
  generateFromText,
  generateFromUrl,
  type PodcastScript,
  type VoiceTypeApi,
  VOICE_TYPES,
  voiceSelectOptionLabel,
  voiceTypeLabel,
} from '../api/generate'
import { topics } from '../data/mockData'

type SourceTab = 'text' | 'url' | 'file'

/** Matches `ConvertTextRequest` / `ConvertUrlRequest` style values sent to the LLM. */
const STYLE_OPTIONS = ['Informative', 'Funny', 'Story-driven', 'Interview'] as const

const LENGTH_OPTIONS = [
  { label: 'Beginner', seconds: 90 },
  { label: 'Intermediate', seconds: 120 },
  { label: 'Expert', seconds: 200 },
] as const

const USER_ID = 'demo-user'

function getTopicLabel(topicId: string): string {
  return topics.find((t) => t.id === topicId)?.name ?? topicId
}

function parseApiError(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

export function CreatePodcast() {
  const [sourceTab, setSourceTab] = useState<SourceTab>('text')
  const [textContent, setTextContent] = useState('')
  const [urlValue, setUrlValue] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pdfFile, setPdfFile] = useState<File | null>(null)

  const [topicId, setTopicId] = useState(topics[0]?.id ?? '')
  const [style, setStyle] = useState<string>(STYLE_OPTIONS[0])
  const [lengthLabel, setLengthLabel] = useState<string>(LENGTH_OPTIONS[1].label)
  const [single, setSingle] = useState(false)
  const [voiceHost, setVoiceHost] = useState<VoiceTypeApi>(VOICE_TYPES[0].id)
  const [voiceGuest, setVoiceGuest] = useState<VoiceTypeApi>(VOICE_TYPES[3].id)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [script, setScript] = useState<PodcastScript | null>(null)

  const audioLength = LENGTH_OPTIONS.find((o) => o.label === lengthLabel)?.seconds ?? 120
  const topicName = getTopicLabel(topicId)

  const validateSource = useCallback((): string | null => {
    if (sourceTab === 'text') {
      if (!textContent.trim()) return 'Add some source text to generate a script.'
      return null
    }
    if (sourceTab === 'url') {
      const u = urlValue.trim()
      if (!u) return 'Enter a URL to scrape for content.'
      try {
        new URL(u)
      } catch {
        return 'Enter a valid URL (including https://).'
      }
      return null
    }
    if (sourceTab === 'file') {
      if (!pdfFile) return 'Choose a PDF file.'
      if (!pdfFile.name.toLowerCase().endsWith('.pdf')) return 'Please upload a PDF file.'
      return null
    }
    return null
  }, [sourceTab, textContent, urlValue, pdfFile])

  const runGenerate = useCallback(async () => {
    const v = validateSource()
    if (v) {
      setError(v)
      return
    }
    setError(null)
    setLoading(true)
    const basePayload = {
      user_id: USER_ID,
      voice_type_host: voiceHost,
      voice_type_guest: voiceGuest,
      audio_length: audioLength,
      topic: topicName,
      style,
      single,
    }
    try {
      let next: PodcastScript
      if (sourceTab === 'text') {
        next = await generateFromText({
          ...basePayload,
          text_body: textContent.trim(),
        })
      } else if (sourceTab === 'url') {
        next = await generateFromUrl({
          ...basePayload,
          urls: [urlValue.trim()],
        })
      } else {
        next = await generateFromPdf(pdfFile!, basePayload)
      }
      setScript(next)
    } catch (e) {
      setScript(null)
      setError(parseApiError(e))
    } finally {
      setLoading(false)
    }
  }, [
    validateSource,
    sourceTab,
    textContent,
    urlValue,
    pdfFile,
    voiceHost,
    voiceGuest,
    audioLength,
    topicName,
    style,
    single,
  ])

  const onTopicChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    if (v === '__add__') {
      window.alert('Mock: “Add new topic” would open here.')
      return
    }
    setTopicId(v)
  }

  const setPdfFromFileList = (list: FileList | null) => {
    const f = list?.[0]
    setPdfFile(f ?? null)
    setError(null)
  }

  /** Full form reset; later this can call the backend to produce MP3 and persist. */
  const resetToNewPodcast = useCallback(() => {
    setSourceTab('text')
    setTextContent('')
    setUrlValue('')
    setDragOver(false)
    setPdfFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setTopicId(topics[0]?.id ?? '')
    setStyle(STYLE_OPTIONS[0])
    setLengthLabel(LENGTH_OPTIONS[1].label)
    setSingle(false)
    setVoiceHost(VOICE_TYPES[0].id)
    setVoiceGuest(VOICE_TYPES[3].id)
    setLoading(false)
    setError(null)
    setScript(null)
  }, [])

  return (
    <div className="create-page">
      <header className="create-page-header">
        <h2 className="page-title">Create Podcast</h2>
        <p className="create-page-lead">Add your source material and tune the episode, then generate a script.</p>
      </header>

      <div className="create-source-stack">
        <div className="create-tabs" role="tablist">
          {(
            [
              ['text', 'Text'],
              ['url', 'URL'],
              ['file', 'File'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={sourceTab === id}
              className={`create-tab${sourceTab === id ? ' active' : ''}`}
              onClick={() => {
                setSourceTab(id)
                setError(null)
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="create-panel">
          {sourceTab === 'text' && (
            <textarea
              className="create-textarea"
              placeholder="Paste or type your source material…"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
            />
          )}
          {sourceTab === 'url' && (
            <div className="create-url-row">
              <input
                className="create-url-input"
                type="url"
                placeholder="https://example.com/article"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
              />
            </div>
          )}
          {sourceTab === 'file' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="create-file-input"
                onChange={(e) => setPdfFromFileList(e.target.files)}
              />
              <div
                role="button"
                tabIndex={0}
                className={`create-dropzone${dragOver ? ' drag' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  setPdfFromFileList(e.dataTransfer.files)
                }}
              >
                <div className="create-dropzone-icon" aria-hidden>
                  📤
                </div>
                <strong>{pdfFile ? pdfFile.name : 'Drop a PDF here or click to browse'}</strong>
                <div className="create-dropzone-hint">PDF only</div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="create-topic-row">
        <div className="config-block">
          <label htmlFor="topic-select">Topic</label>
          <select id="topic-select" className="config-select create-topic-select" value={topicId} onChange={onTopicChange}>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value="__add__">+ Add New Topic</option>
          </select>
        </div>
      </div>

      <div className="create-options-layout" aria-label="Episode options">
        <div className="create-options-stack">
          <div className="config-block">
            <label>Style</label>
            <div className="config-pills">
              {STYLE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`pill${style === s ? ' active' : ''}`}
                  onClick={() => setStyle(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="config-block">
            <label>Length</label>
            <div className="config-pills">
              {LENGTH_OPTIONS.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  className={`pill${lengthLabel === o.label ? ' active' : ''}`}
                  onClick={() => setLengthLabel(o.label)}
                  title={`About ${o.seconds} seconds`}
                >
                  {o.label} (~{o.seconds}s)
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="create-options-stack">
          <div className="config-block">
            <label>Format</label>
            <div className="config-pills">
              <button
                type="button"
                className={`pill${single ? ' active' : ''}`}
                onClick={() => setSingle(true)}
              >
                Solo
              </button>
              <button
                type="button"
                className={`pill${!single ? ' active' : ''}`}
                onClick={() => setSingle(false)}
              >
                Host &amp; guest
              </button>
            </div>
          </div>

          <div className="config-block">
            <div className="config-block-section-title">{single ? 'Voice type' : 'Voice types'}</div>
            {single ? (
              <div className="voice-picker">
                <label htmlFor="voice-narrator-select" className="voice-picker-label">
                  Narrator
                </label>
                <select
                  id="voice-narrator-select"
                  className="config-select voice-type-select"
                  value={voiceHost}
                  onChange={(e) => setVoiceHost(e.target.value as VoiceTypeApi)}
                >
                  {VOICE_TYPES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {voiceSelectOptionLabel(v.id)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="voice-pair-row">
                <div className="voice-picker">
                  <label htmlFor="voice-host-select" className="voice-picker-label">
                    Host
                  </label>
                  <select
                    id="voice-host-select"
                    className="config-select voice-type-select"
                    value={voiceHost}
                    onChange={(e) => setVoiceHost(e.target.value as VoiceTypeApi)}
                  >
                    {VOICE_TYPES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {voiceSelectOptionLabel(v.id)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="voice-picker">
                  <label htmlFor="voice-guest-select" className="voice-picker-label">
                    Guest
                  </label>
                  <select
                    id="voice-guest-select"
                    className="config-select voice-type-select"
                    value={voiceGuest}
                    onChange={(e) => setVoiceGuest(e.target.value as VoiceTypeApi)}
                  >
                    {VOICE_TYPES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {voiceSelectOptionLabel(v.id)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="create-error" role="alert">
          {error}
        </div>
      )}

      <div className="generate-wrap">
        <div className="generate-actions">
          <button type="button" className="generate-btn" disabled={loading} onClick={() => void runGenerate()}>
            {loading ? 'Generating script…' : 'Generate script'}
          </button>
          {script && (
            <>
              <button
                type="button"
                className="generate-btn generate-btn--secondary"
                disabled={loading}
                onClick={() => void runGenerate()}
              >
                Regenerate
              </button>
              <button
                type="button"
                className="generate-btn generate-btn--new-podcast"
                disabled={loading}
                onClick={resetToNewPodcast}
                title="Clear the form and start over"
              >
                Create Podcast
              </button>
            </>
          )}
        </div>
        {loading && (
          <div className="generate-loading">
            <div className="generate-loading-text">Generating script…</div>
          </div>
        )}
      </div>

      {script && script.lines.length > 0 && (
        <section className="script-preview" aria-label="Script preview">
          <div className="script-preview-header">
            <h3 className="script-preview-title">Script preview</h3>
            <span className="script-preview-count">{script.lines.length} lines</span>
          </div>
          <div className="script-preview-body">
            {script.lines.map((line, i) => (
              <div key={`${i}-${line.speaker}`} className={`script-line script-line--${line.speaker}`}>
                <div className="script-line-meta">
                  <span className="script-line-speaker">{line.speaker}</span>
                  <span className="script-line-voice">{voiceTypeLabel(line.voice_type)}</span>
                </div>
                <p className="script-line-text">{line.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
