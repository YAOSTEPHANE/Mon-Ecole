/**
 * Voix off + musique de fond pour la vidéo promo Mon Ecole.
 * La voix est découpée par plan (sync avec scripts/marketing-timeline.mjs).
 *
 * Usage : node scripts/add-marketing-audio.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSyncedTimeline, concatVoiceSegments, loadSyncedTimeline } from './marketing-tts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'marketing', 'video');
const VO_MP3 = path.join(OUT, 'voix-off.mp3');
const MUSIC_MP3 = path.join(OUT, 'musique-fond.mp3');
const MIX_MP3 = path.join(OUT, 'mix-audio.mp3');
const VIDEO_IN = path.join(OUT, 'mon-ecole-promo.mp4');
const VIDEO_OUT = path.join(OUT, 'mon-ecole-promo-avec-son.mp4');
const VIDEO_LAND_IN = path.join(OUT, 'mon-ecole-promo-16x9.mp4');
const VIDEO_LAND_OUT = path.join(OUT, 'mon-ecole-promo-16x9-avec-son.mp4');
const TIMELINE_JSON = path.join(OUT, 'timeline-sync.json');

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

function generateBackgroundMusic(durationSec) {
  const d = Math.ceil(durationSec + 2);
  console.log('\n🎵 Musique de fond (ambiance légère)…');
  run(
    `ffmpeg -y -f lavfi -i "sine=frequency=146.83:duration=${d}" -f lavfi -i "sine=frequency=220:duration=${d}" -f lavfi -i "sine=frequency=293.66:duration=${d}" -filter_complex "[0:a][1:a][2:a]amix=inputs=3:duration=first,volume=0.045,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, d - 4)}:d=4" -c:a libmp3lame -q:a 6 "${MUSIC_MP3}"`,
  );
  console.log('   →', MUSIC_MP3);
}

function mixAudioTracks(videoDuration) {
  const d = videoDuration.toFixed(3);
  console.log('\n🔊 Mixage voix + musique…');
  run(
    `ffmpeg -y -i "${VO_MP3}" -i "${MUSIC_MP3}" -filter_complex "[0:a]apad=whole_dur=${d},atrim=0:${d},asetpts=N/SR/TB,volume=1.0[vo];[1:a]atrim=0:${d},asetpts=N/SR/TB,volume=0.5[mu];[vo][mu]amix=inputs=2:duration=first:dropout_transition=2,atrim=0:${d},afade=t=out:st=${Math.max(0, videoDuration - 1.5).toFixed(3)}:d=1.5[aout]" -map "[aout]" -c:a libmp3lame -q:a 4 "${MIX_MP3}"`,
  );
  console.log('   →', MIX_MP3);
}

function muxVideo(videoIn, videoOut) {
  const videoDur = probeDuration(videoIn);
  run(
    `ffmpeg -y -i "${videoIn}" -i "${MIX_MP3}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -t ${videoDur.toFixed(3)} "${videoOut}"`,
  );
}

function main() {
  if (!fs.existsSync(VIDEO_IN)) {
    throw new Error(`Vidéo source introuvable. Lancez d'abord : node scripts/generate-marketing-video.mjs --video-only`);
  }

  const sync = fs.existsSync(TIMELINE_JSON) ? loadSyncedTimeline() : buildSyncedTimeline();
  console.log('\n🎙️ Assemblage voix off (segments synchronisés)…');
  concatVoiceSegments(sync.plans);

  const videoDur = probeDuration(VIDEO_IN);
  const voDur = probeDuration(VO_MP3);
  console.log(`\n⏱ Durée vidéo : ${videoDur.toFixed(1)} s | voix off : ${voDur.toFixed(1)} s`);
  if (Math.abs(videoDur - voDur) > 1.5) {
    console.warn('⚠ Écart audio/vidéo > 1,5 s — relancez generate-marketing-video.mjs --video-only');
  }

  generateBackgroundMusic(videoDur);
  mixAudioTracks(videoDur);

  console.log('\n📽 Mux vidéo + audio…');
  muxVideo(VIDEO_IN, VIDEO_OUT);
  if (fs.existsSync(VIDEO_LAND_IN)) {
    muxVideo(VIDEO_LAND_IN, VIDEO_LAND_OUT);
  }

  console.log('\n✅ Vidéos avec son :');
  console.log('   ', VIDEO_OUT);
  if (fs.existsSync(VIDEO_LAND_OUT)) console.log('   ', VIDEO_LAND_OUT);
}

main();
