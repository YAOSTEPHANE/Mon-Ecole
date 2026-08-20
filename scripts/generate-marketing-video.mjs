/**
 * Captures checklist complète Mon Ecole + montage vidéo promo (9:16).
 * Prérequis : npm run dev actif, comptes seed (password123).
 *
 * Usage : node scripts/generate-marketing-video.mjs
 *         node scripts/generate-marketing-video.mjs --video-only
 */
import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSyncedTimeline } from './marketing-tts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'marketing', 'video');
const CAP = path.join(OUT, 'captures');
const SLIDES = path.join(OUT, 'slides');
const BASE = process.env.MARKETING_BASE_URL ?? 'http://localhost:3000';
const PASSWORD = process.env.TEST_PASSWORD ?? 'password123';

const USERS = {
  admin: 'admin@school.com',
  parent: 'parent1@school.com',
  teacher: 'teacher1@school.com',
  student: 'student1@school.com',
};

/** Ordre = checklist marketing (public → parent → élève → enseignant → admin). */
const CAPTURE_ORDER = [
  '01-accueil-hero',
  '02-accueil-palmares',
  '03-pre-inscription',
  '04-a-propos',
  '05-widget-chat',
  '06-widget-orientation',
  '07-login',
  '08-parent-overview',
  '09-parent-notes',
  '10-parent-bulletins',
  '11-parent-absences',
  '12-parent-paiements',
  '13-parent-messages',
  '14-student-overview',
  '15-student-emploi-du-temps',
  '16-student-devoirs',
  '17-teacher-overview',
  '18-teacher-notation',
  '19-teacher-appel',
  '20-teacher-messagerie',
  '21-admin-dashboard',
  '22-admin-admissions',
  '23-admin-presences',
  '24-admin-frais',
  '25-admin-paiements',
  '26-admin-visiteurs-chat',
];

const CAPTURE_DURATIONS = {
  '01-accueil-hero': 3,
  '02-accueil-palmares': 3,
  '03-pre-inscription': 3,
  '04-a-propos': 3,
  '05-widget-chat': 2,
  '06-widget-orientation': 2,
  '07-login': 2,
  '08-parent-overview': 3,
  '09-parent-notes': 3,
  '10-parent-bulletins': 3,
  '11-parent-absences': 3,
  '12-parent-paiements': 3,
  '13-parent-messages': 3,
  '14-student-overview': 3,
  '15-student-emploi-du-temps': 3,
  '16-student-devoirs': 3,
  '17-teacher-overview': 3,
  '18-teacher-notation': 3,
  '19-teacher-appel': 3,
  '20-teacher-messagerie': 3,
  '21-admin-dashboard': 3,
  '22-admin-admissions': 3,
  '23-admin-presences': 3,
  '24-admin-frais': 3,
  '25-admin-paiements': 3,
  '26-admin-visiteurs-chat': 3,
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, shell: true });
}

async function loginAs(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('#login-email').waitFor({ state: 'visible', timeout: 60_000 });
  await page.locator('#login-email').fill(email);
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.locator('#login-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/(admin|teacher|parent|student|staff|educator|super-admin)(?:\?|$|\/)/, {
    timeout: 90_000,
  });
  await page.waitForTimeout(2500);
}

async function shot(page, name) {
  const file = path.join(CAP, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  ✓ ${name}.png`);
}

async function goShot(page, url, name, waitMs = 2800) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForTimeout(waitMs);
  await shot(page, name);
}

async function captureAll() {
  ensureDir(CAP);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    locale: 'fr-FR',
  });
  const page = await context.newPage();

  console.log('\n📸 Site public…');
  await goShot(page, BASE, '01-accueil-hero', 1800);

  await page.evaluate(() => {
    document.getElementById('resultats')?.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(1200);
  await shot(page, '02-accueil-palmares');

  await page.goto(`${BASE}/pre-inscription`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const nomField = page.getByPlaceholder(/Nom de famille|Nom/i).first();
  if (await nomField.isVisible().catch(() => false)) {
    await nomField.fill('Kouamé');
  }
  await page.waitForTimeout(500);
  await shot(page, '03-pre-inscription');

  await goShot(page, `${BASE}/a-propos`, '04-a-propos');

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const widgetBtn = page.getByRole('button', { name: /Ouvrir chat/i });
  if (await widgetBtn.isVisible().catch(() => false)) {
    await widgetBtn.click();
    await page.waitForTimeout(800);
    await shot(page, '05-widget-chat');
    await page.getByRole('button', { name: /^Orientation$/i }).click();
    await page.waitForTimeout(600);
    await shot(page, '06-widget-orientation');
  } else {
    console.warn('  ⚠ widget visiteur absent (utilisateur connecté ?)');
  }

  await goShot(page, `${BASE}/login`, '07-login', 1200);

  console.log('\n📸 Espace parent…');
  await loginAs(page, USERS.parent);
  await goShot(page, `${BASE}/parent`, '08-parent-overview');
  await goShot(page, `${BASE}/parent?tab=grades`, '09-parent-notes', 3500);
  await goShot(page, `${BASE}/parent?tab=report-cards`, '10-parent-bulletins', 3500);
  await goShot(page, `${BASE}/parent?tab=absences`, '11-parent-absences', 3500);
  await goShot(page, `${BASE}/parent?tab=payments`, '12-parent-paiements', 3500);
  await goShot(page, `${BASE}/parent?tab=communication`, '13-parent-messages', 3500);

  console.log('\n📸 Espace élève…');
  await context.clearCookies();
  await loginAs(page, USERS.student);
  await goShot(page, `${BASE}/student`, '14-student-overview');
  await goShot(page, `${BASE}/student?tab=schedule`, '15-student-emploi-du-temps', 3500);
  await goShot(page, `${BASE}/student?tab=assignments`, '16-student-devoirs', 3500);

  console.log('\n📸 Espace enseignant…');
  await context.clearCookies();
  await loginAs(page, USERS.teacher);
  await goShot(page, `${BASE}/teacher`, '17-teacher-overview');
  await goShot(page, `${BASE}/teacher?tab=grades`, '18-teacher-notation', 3500);
  await goShot(page, `${BASE}/teacher?tab=attendance`, '19-teacher-appel', 3500);
  await goShot(page, `${BASE}/teacher?tab=messaging`, '20-teacher-messagerie', 3500);

  console.log('\n📸 Administration…');
  await context.clearCookies();
  await loginAs(page, USERS.admin);
  await goShot(page, `${BASE}/admin`, '21-admin-dashboard');
  await goShot(page, `${BASE}/admin?tab=admissions`, '22-admin-admissions');
  await goShot(page, `${BASE}/admin?tab=attendance`, '23-admin-presences');
  await goShot(page, `${BASE}/admin?tab=fees`, '24-admin-frais');
  await goShot(page, `${BASE}/admin?tab=payments`, '25-admin-paiements');

  await page.goto(`${BASE}/admin?tab=communication`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Visiteurs site' }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Chat site public' }).click();
  await page.waitForTimeout(2000);
  await shot(page, '26-admin-visiteurs-chat');

  await browser.close();

  const missing = CAPTURE_ORDER.filter((n) => !fs.existsSync(path.join(CAP, `${n}.png`)));
  if (missing.length > 0) {
    console.warn('\n⚠ Captures manquantes:', missing.join(', '));
  }
  console.log(`\n✅ ${CAPTURE_ORDER.length - missing.length}/${CAPTURE_ORDER.length} captures →`, CAP);
}

function homePhotoDataUrl(filename) {
  const filePath = path.join(ROOT, 'web', 'public', 'home', filename);
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase() === '.png' ? 'png' : 'jpeg';
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

async function renderTitleSlides() {
  ensureDir(SLIDES);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

  const cards = [
    {
      file: 't01.png',
      photo: 'split-campus.jpg',
      title: 'Dans un établissement',
      sub: 'Trois questions se posent.',
    },
    {
      file: 't02.png',
      photo: 'role-parent.jpg',
      title: 'Absence. Frais. Devoir.',
      sub: "Personne n'a encore la réponse.",
    },
    {
      file: 't03.png',
      photo: 'admissions-desk.jpg',
      title: 'Trop de canaux',
      sub: 'Notes · Messages · Papiers',
    },
    {
      file: 't04.png',
      photo: 'hero-platform.jpg',
      title: 'Mon Ecole',
      sub: "Une plateforme pour toute l'école",
    },
    {
      file: 't06.png',
      photo: 'role-student.jpg',
      title: "L'élève pointe.",
      sub: 'Les parents sont prévenus.',
    },
    {
      file: 't07.png',
      photo: 'experience-familles.jpg',
      title: 'E-mail et SMS',
      sub: 'Dès l’entrée ou la sortie.',
    },
    {
      file: 't08.png',
      photo: 'experience-academique.jpg',
      title: 'Les atouts',
      lines: [
        'Pointage → notification parents',
        'Notes, bulletins, absences',
        'Frais et paiements',
        'Site public et pré-inscription',
        'Chat et orientation',
        'Pilotage direction',
      ],
    },
    {
      file: 't05.png',
      photo: 'gallery-assembly.jpg',
      title: "Former aujourd'hui",
      sub: "C'est aussi s'organiser mieux.",
    },
  ];

  console.log('\n🎬 Cartes titre (photos réelles)…');
  for (const card of cards) {
    const extra = card.lines?.length
      ? `<ul>${card.lines.map((line) => `<li>${line}</li>`).join('')}</ul>`
      : card.sub
        ? `<p>${card.sub}</p>`
        : '';
    const photoSrc = homePhotoDataUrl(card.photo);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      html,body{width:1080px;height:1920px;overflow:hidden;font-family:Segoe UI,Arial,sans-serif;color:#fff}
      .photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}
      .veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,10,22,.28) 0%,rgba(8,10,22,.55) 38%,rgba(8,10,22,.88) 100%)}
      .copy{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center;padding:0 72px 220px}
      h1{font-size:62px;font-weight:700;line-height:1.15;margin-bottom:28px;text-shadow:0 8px 28px rgba(0,0,0,.45)}
      p{font-size:38px;line-height:1.35;opacity:.95;text-shadow:0 6px 20px rgba(0,0,0,.4)}
      ul{list-style:none;text-align:left;max-width:860px;font-size:34px;line-height:1.5}
      li{margin:8px 0;padding:10px 16px;border-radius:14px;background:rgba(7,8,26,.42);backdrop-filter:blur(6px)}
      li::before{content:"●  ";color:#d4af37}
    </style></head><body>
      <img class="photo" src="${photoSrc}" alt="">
      <div class="veil"></div>
      <div class="copy"><h1>${card.title}</h1>${extra}</div>
    </body></html>`;
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const img = document.querySelector('img.photo');
      return Boolean(img && img.complete && img.naturalWidth > 0);
    });
    await page.screenshot({ path: path.join(SLIDES, card.file) });
    console.log(`  ✓ ${card.file} (${card.photo})`);
  }

  await browser.close();
}

function normalizeCapture(src, dest) {
  run(
    `ffmpeg -y -loop 1 -i "${src}" -vf "scale=1080:-1,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0f0f14" -frames:v 1 -update 1 "${dest}"`,
  );
}

function imageToClip(src, dest, seconds) {
  run(
    `ffmpeg -y -loop 1 -i "${src}" -c:v libx264 -t ${seconds} -pix_fmt yuv420p -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0f0f14" -r 30 "${dest}"`,
  );
}

function buildVideo(clips) {
  const normalized = path.join(OUT, 'normalized');
  const segDir = path.join(OUT, 'segments');
  ensureDir(normalized);
  ensureDir(segDir);

  console.log('\n🎬 Normalisation captures (9:16)…');
  for (const name of CAPTURE_ORDER) {
    const src = path.join(CAP, `${name}.png`);
    if (fs.existsSync(src)) {
      normalizeCapture(src, path.join(normalized, `${name}.png`));
    }
  }

  const segments = [];
  let idx = 0;
  const addClip = (imgPath, seconds) => {
    if (!fs.existsSync(imgPath)) {
      console.warn(`  ⚠ plan ignoré (image absente) : ${imgPath}`);
      return;
    }
    const out = path.join(segDir, `seg-${String(idx++).padStart(3, '0')}.mp4`);
    imageToClip(imgPath, out, seconds);
    segments.push(out);
  };

  console.log('\n🎬 Montage synchronisé (durée = voix off par plan)…');
  for (const clip of clips) {
    const imgPath = clip.slide
      ? path.join(SLIDES, clip.slide)
      : path.join(normalized, `${clip.capture}.png`);
    addClip(imgPath, clip.durationSec);
    console.log(
      `  ✓ ${clip.planId} — ${clip.slide ?? clip.capture} (${clip.durationSec.toFixed(1)} s)`,
    );
  }

  const listFile = path.join(OUT, 'concat.txt');
  fs.writeFileSync(
    listFile,
    segments.map((s) => `file '${s.replace(/\\/g, '/')}'`).join('\n'),
    'utf8',
  );

  const outVideo = path.join(OUT, 'mon-ecole-promo.mp4');
  run(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outVideo}"`);

  const outLandscape = path.join(OUT, 'mon-ecole-promo-16x9.mp4');
  run(
    `ffmpeg -y -i "${outVideo}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0f0f14" -c:v libx264 -pix_fmt yuv420p "${outLandscape}"`,
  );

  console.log('\n✅ Vidéos générées :');
  console.log('   ', outVideo);
  console.log('   ', outLandscape);
}

async function main() {
  ensureDir(OUT);
  if (!process.argv.includes('--video-only')) {
    await captureAll();
  }
  await renderTitleSlides();
  const { clips } = buildSyncedTimeline();
  buildVideo(clips);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
