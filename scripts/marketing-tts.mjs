/**
 * Génération TTS par segment (synchronisation vidéo ↔ voix off).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MARKETING_TIMELINE,
  flattenTimeline,
  fullVoiceoverText,
} from './marketing-timeline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'marketing', 'video');
const VO_SEG_DIR = path.join(OUT, 'vo-segments');
const VO_TEXT_FILE = path.join(OUT, 'voix-off.txt');
const TIMELINE_JSON = path.join(OUT, 'timeline-sync.json');

const TTS_VOICE = process.env.TTS_VOICE ?? 'fr-FR-DeniseNeural';
const TTS_RATE = process.env.TTS_RATE ?? '-4%';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, shell: true });
}

function runOut(cmd) {
  return execSync(cmd, { cwd: ROOT, shell: true, encoding: 'utf8' }).trim();
}

function probeDuration(file) {
  return Number(
    runOut(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
    ),
  );
}

function ensureEdgeTts() {
  try {
    runOut('python -m edge_tts --version');
  } catch {
    console.log('Installation de edge-tts…');
    run('python -m pip install edge-tts');
  }
}

function synthesizeSegment(text, outMp3) {
  const tmpText = `${outMp3}.txt`;
  fs.writeFileSync(tmpText, text.replace(/\s+/g, ' ').trim(), 'utf8');
  run(
    `python -m edge_tts --voice "${TTS_VOICE}" --rate="${TTS_RATE}" --file "${tmpText}" --write-media "${outMp3}"`,
  );
}

/**
 * Génère un MP3 par bloc timeline et retourne les plans avec durées + clips aplatis.
 */
export function buildSyncedTimeline() {
  ensureEdgeTts();
  ensureDir(VO_SEG_DIR);

  const plansWithDuration = [];

  console.log('\n🎙️ Voix off par segment (sync vidéo)…');
  for (let i = 0; i < MARKETING_TIMELINE.length; i++) {
    const block = MARKETING_TIMELINE[i];
    const mp3 = path.join(VO_SEG_DIR, `${String(i + 1).padStart(2, '0')}-${block.id}.mp3`);
    synthesizeSegment(block.vo, mp3);
    const durationSec = probeDuration(mp3);
    plansWithDuration.push({ ...block, mp3, durationSec });
    console.log(`   ${block.id}: ${durationSec.toFixed(1)} s`);
  }

  const clips = flattenTimeline(plansWithDuration);
  const totalVideoSec = clips.reduce((s, c) => s + c.durationSec, 0);

  fs.writeFileSync(VO_TEXT_FILE, fullVoiceoverText(), 'utf8');
  fs.writeFileSync(
    TIMELINE_JSON,
    JSON.stringify({ plans: plansWithDuration, clips, totalVideoSec }, null, 2),
    'utf8',
  );

  console.log(`\n⏱ Durée vidéo cible (sync) : ${totalVideoSec.toFixed(1)} s`);
  return { plans: plansWithDuration, clips, totalVideoSec };
}

export function loadSyncedTimeline() {
  if (!fs.existsSync(TIMELINE_JSON)) {
    return buildSyncedTimeline();
  }
  return JSON.parse(fs.readFileSync(TIMELINE_JSON, 'utf8'));
}

export function concatVoiceSegments(plans) {
  const listFile = path.join(VO_SEG_DIR, 'concat.txt');
  fs.writeFileSync(
    listFile,
    plans.map((p) => `file '${p.mp3.replace(/\\/g, '/')}'`).join('\n'),
    'utf8',
  );
  const out = path.join(OUT, 'voix-off.mp3');
  run(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${out}"`);
  return out;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildSyncedTimeline();
}
