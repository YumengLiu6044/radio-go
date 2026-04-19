/**
 * Short silent MP4 “canvas” loops under public/episodes/ (ep-1.mp4 … ep-9.mp4).
 * Each uses a different lavfi source (bars, test patterns, Game of Life, etc.).
 * The app syncs video time as audioTime % duration so long tracks stay aligned.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegStatic from 'ffmpeg-static'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'public', 'episodes')

/** Clip length in seconds — keep small; player loops via modulo sync */
const CLIP_SEC = 18

/**
 * @type {Record<string, { lavfi: string; vf?: string }>}
 * lavfi: single -f lavfi -i graph (no duration; use -t on output)
 */
const EPISODE_SPECS = {
  'ep-1': { lavfi: 'testsrc2=size=960x540:rate=24' },
  /** mptestsrc only accepts rate here; scale up the built-in 512² pattern */
  'ep-2': {
    lavfi: 'mptestsrc=r=24',
    vf: 'scale=960:540:flags=bilinear,format=yuv420p',
  },
  /** Smooth multi-stop gradient motion (small on disk vs cellular automata) */
  'ep-3': { lavfi: 'gradients=s=960x540:r=24' },
  'ep-4': { lavfi: 'rgbtestsrc=size=960x540:rate=24' },
  'ep-5': {
    lavfi: 'smptehdbars=size=960x540:rate=24',
    vf: "hue=h='mod(t*42,360)',format=yuv420p",
  },
  'ep-6': { lavfi: 'yuvtestsrc=size=960x540:rate=24' },
  'ep-7': {
    lavfi: 'testsrc2=size=960x540:rate=24',
    vf: "hue=h='mod(t*55,360)',eq=contrast=1.08:brightness=0.02,format=yuv420p",
  },
  'ep-8': { lavfi: 'smptebars=size=960x540:rate=24' },
  'ep-9': { lavfi: 'sierpinski=s=960x540:r=20' },
}

const ffmpeg = ffmpegStatic
if (!ffmpeg || !fs.existsSync(ffmpeg)) {
  console.error('ffmpeg-static binary not found.')
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

for (const name of fs.readdirSync(outDir)) {
  if (name.endsWith('.mp4')) {
    fs.unlinkSync(path.join(outDir, name))
    console.log(`Removed old ${name}`)
  }
}

for (const [id, spec] of Object.entries(EPISODE_SPECS)) {
  const out = path.join(outDir, `${id}.mp4`)
  const args = ['-y', '-f', 'lavfi', '-i', spec.lavfi]
  if (spec.vf) args.push('-vf', spec.vf)
  args.push(
    '-t',
    String(CLIP_SEC),
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '26',
    '-pix_fmt',
    'yuv420p',
    out,
  )

  console.log(`Writing ${path.relative(path.join(__dirname, '..'), out)} (${CLIP_SEC}s, ${spec.lavfi.slice(0, 48)}…)…`)
  const r = spawnSync(ffmpeg, args, { stdio: 'inherit' })
  if (r.status !== 0) {
    console.error(`ffmpeg failed for ${id}`)
    process.exit(r.status ?? 1)
  }
}

console.log('Done.')
