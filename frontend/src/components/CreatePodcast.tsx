import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { topics } from '../data/mockData'

type SourceTab = 'text' | 'url' | 'file' | 'record'

const STYLE_OPTIONS = ['Informative', 'Funny', 'Story-driven', 'Interview'] as const
const DEPTH_OPTIONS = ['Beginner', 'Intermediate', 'Expert'] as const

type VoiceOption = {
  id: string
  name: string
  flag: string
  region: string
  gender: string
}

const VOICES: VoiceOption[] = [
  { id: 'v1', name: 'Clara', flag: '🇬🇧', region: 'UK', gender: 'Female' },
  { id: 'v2', name: 'Marcus', flag: '🇺🇸', region: 'US', gender: 'Male' },
  { id: 'v3', name: 'James', flag: '🇦🇺', region: 'AUS', gender: 'Male' },
  { id: 'v4', name: 'Priya', flag: '🇮🇳', region: 'IND', gender: 'Female' },
  { id: 'v5', name: 'Alex', flag: '🇺🇸', region: 'US', gender: 'Non-binary' },
  { id: 'v6', name: 'Sienna', flag: '🇦🇺', region: 'AUS', gender: 'Female' },
]

const LOADING_MESSAGES = ['Writing script...', 'Generating audio...', 'Polishing narration...']

type CreatePodcastProps = {
  onGenerateComplete: () => void
}

export function CreatePodcast({ onGenerateComplete }: CreatePodcastProps) {
  const [sourceTab, setSourceTab] = useState<SourceTab>('text')
  const [textContent, setTextContent] = useState('')
  const [urlValue, setUrlValue] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSec, setRecordSec] = useState(0)
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [topicId, setTopicId] = useState(topics[0]?.id ?? '')
  const [style, setStyle] = useState<string>(STYLE_OPTIONS[0])
  const [depth, setDepth] = useState<string>(DEPTH_OPTIONS[0])
  const [voiceId, setVoiceId] = useState(VOICES[0]?.id ?? '')

  const [generating, setGenerating] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadMsgIndex, setLoadMsgIndex] = useState(0)

  useEffect(() => {
    if (!recording) return
    recordTimerRef.current = setInterval(() => {
      setRecordSec((s) => s + 1)
    }, 1000)
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    }
  }, [recording])

  const toggleRecord = () => {
    if (recording) {
      setRecording(false)
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    } else {
      setRecordSec(0)
      setRecording(true)
    }
  }

  const runGenerate = useCallback(() => {
    if (generating) return
    setGenerating(true)
    setLoadProgress(0)
    setLoadMsgIndex(0)

    const start = Date.now()
    const duration = 3000
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - start
      const p = Math.min(100, (elapsed / duration) * 100)
      setLoadProgress(p)
      setLoadMsgIndex(
        Math.min(LOADING_MESSAGES.length - 1, Math.floor((elapsed / duration) * LOADING_MESSAGES.length)),
      )
      if (elapsed >= duration) {
        clearInterval(interval)
        setGenerating(false)
        setLoadProgress(100)
        onGenerateComplete()
      }
    }, 60)
  }, [generating, onGenerateComplete])

  const onTopicChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    if (v === '__add__') {
      window.alert('Mock: “Add new topic” would open here.')
      return
    }
    setTopicId(v)
  }

  return (
    <div>
      <h2 className="page-title">Create Podcast</h2>
      <p className="page-sub">Paste text, a link, a file, or record — then tune style, depth, and voice.</p>

      <div className="create-tabs" role="tablist">
        {(
          [
            ['text', 'Text'],
            ['url', 'URL'],
            ['file', 'File'],
            ['record', 'Record'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={sourceTab === id}
            className={`create-tab${sourceTab === id ? ' active' : ''}`}
            onClick={() => setSourceTab(id)}
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
            <button type="button" className="create-fetch">
              Fetch
            </button>
          </div>
        )}
        {sourceTab === 'file' && (
          <div
            className={`create-dropzone${dragOver ? ' drag' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
            }}
          >
            <div className="create-dropzone-icon" aria-hidden>
              📤
            </div>
            <strong>Drop files here</strong>
            <div style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}>or click to browse (mock)</div>
          </div>
        )}
        {sourceTab === 'record' && (
          <div className="create-record">
            <button
              type="button"
              className={`create-record-btn${recording ? ' recording' : ''}`}
              onClick={toggleRecord}
            >
              {recording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <div className="create-timer">
              {Math.floor(recordSec / 60)
                .toString()
                .padStart(2, '0')}
              :{(recordSec % 60).toString().padStart(2, '0')}
            </div>
          </div>
        )}
      </div>

      <div className="config-grid">
        <div className="config-row">
          <label htmlFor="topic-select">Topic</label>
          <select id="topic-select" className="config-select" value={topicId} onChange={onTopicChange}>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value="__add__">+ Add New Topic</option>
          </select>
        </div>

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
          <label>Depth</label>
          <div className="config-pills">
            {DEPTH_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`pill${depth === d ? ' active' : ''}`}
                onClick={() => setDepth(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="config-block">
          <label>Voice</label>
          <div className="voice-grid">
            {VOICES.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`voice-card${voiceId === v.id ? ' selected' : ''}`}
                onClick={() => setVoiceId(v.id)}
              >
                <div className="voice-flag">{v.flag}</div>
                <div className="voice-name">{v.name}</div>
                <div className="voice-meta">
                  {v.region} · {v.gender}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="generate-wrap">
        <button type="button" className="generate-btn" disabled={generating} onClick={runGenerate}>
          {generating ? 'Generating…' : 'Generate'}
        </button>
        {generating && (
          <div className="generate-loading">
            <div className="generate-loading-bar">
              <div className="generate-loading-fill" style={{ width: `${loadProgress}%` }} />
            </div>
            <div className="generate-loading-text">{LOADING_MESSAGES[loadMsgIndex] ?? LOADING_MESSAGES[0]}</div>
          </div>
        )}
      </div>
    </div>
  )
}
