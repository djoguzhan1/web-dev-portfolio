import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { mkdir, copyFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const rawDir = path.join(root, 'fiverr-screenshots', '_raw');
const outDir = path.join(root, 'fiverr-screenshots');

const FIVERR_PORTFOLIO = { width: 1024, height: 768 };
const FIVERR_GIG = { width: 1280, height: 769 };

const pages = [
  {
    id: 'hvac',
    file: path.join(root, 'demos', 'hvac-landing', 'index.html'),
    shots: [
      { name: 'hvac-desktop-hero', width: 1280, height: 800, fullPage: false },
      { name: 'hvac-desktop-stats', width: 1280, height: 800, fullPage: false, scrollY: 750 },
      { name: 'hvac-mobile', width: 390, height: 1200, fullPage: false, deviceScaleFactor: 2 },
    ],
  },
  {
    id: 'plumbing',
    file: path.join(root, 'demos', 'plumbing-landing', 'index.html'),
    shots: [
      { name: 'plumbing-desktop-hero', width: 1280, height: 800, fullPage: false },
      { name: 'plumbing-desktop-services', width: 1280, height: 800, fullPage: false, scrollTo: '.stats' },
      { name: 'plumbing-mobile', width: 390, height: 1200, fullPage: false, deviceScaleFactor: 2 },
    ],
  },
  {
    id: 'portfolio',
    file: path.join(root, 'index.html'),
    shots: [
      { name: 'portfolio-desktop-hero', width: 1280, height: 800, fullPage: false },
      { name: 'portfolio-demos', width: 1280, height: 900, fullPage: false, scrollTo: '#demos' },
      { name: 'portfolio-mobile', width: 390, height: 1200, fullPage: false, deviceScaleFactor: 2 },
    ],
  },
];

function fileUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/');
}

async function toFiverrPortfolio(input, output, mode = 'cover') {
  if (mode === 'contain-mobile') {
    const resized = await sharp(input)
      .resize(520, FIVERR_PORTFOLIO.height - 80, { fit: 'contain', background: { r: 15, g: 23, b: 42 } })
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: FIVERR_PORTFOLIO.width,
        height: FIVERR_PORTFOLIO.height,
        channels: 3,
        background: { r: 15, g: 23, b: 42 },
      },
    })
      .composite([{ input: resized, gravity: 'centre' }])
      .png({ quality: 90 })
      .toFile(output);
    return;
  }
  await sharp(input)
    .resize(FIVERR_PORTFOLIO.width, FIVERR_PORTFOLIO.height, {
      fit: 'cover',
      position: 'top',
    })
    .png({ quality: 90 })
    .toFile(output);
}

async function toFiverrGig(input, output) {
  await sharp(input)
    .resize(FIVERR_GIG.width, FIVERR_GIG.height, {
      fit: 'cover',
      position: 'top',
    })
    .png({ quality: 90 })
    .toFile(output);
}

async function captureShot(page, url, shot) {
  await page.setViewport({
    width: shot.width,
    height: shot.height,
    deviceScaleFactor: shot.deviceScaleFactor || 1,
  });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 600)));

  if (shot.scrollTo) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ block: 'start' });
    }, shot.scrollTo);
    await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
  }
  if (shot.scrollY) {
    await page.evaluate((y) => window.scrollTo(0, y), shot.scrollY);
    await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
  }

  const outPath = path.join(rawDir, `${shot.name}.png`);
  await page.screenshot({ path: outPath, fullPage: !!shot.fullPage, type: 'png' });
  return outPath;
}

async function main() {
  await mkdir(rawDir, { recursive: true });
  await mkdir(path.join(outDir, '1-hvac-portfolio'), { recursive: true });
  await mkdir(path.join(outDir, '2-plumbing-portfolio'), { recursive: true });
  await mkdir(path.join(outDir, '3-portfolio-hub'), { recursive: true });
  await mkdir(path.join(outDir, 'gig-gallery'), { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  const raw = {};

  for (const entry of pages) {
    const url = fileUrl(entry.file);
    const page = await browser.newPage();
    raw[entry.id] = [];
    for (const shot of entry.shots) {
      const p = await captureShot(page, url, shot);
      raw[entry.id].push({ shot, path: p });
      console.log('Captured', path.basename(p));
    }
    await page.close();
  }

  await browser.close();

  // HVAC portfolio project — upload order matters (1st = thumbnail)
  await toFiverrPortfolio(raw.hvac[0].path, path.join(outDir, '1-hvac-portfolio', '01-THUMBNAIL-desktop-hero-1024x768.png'));
  await toFiverrPortfolio(raw.hvac[2].path, path.join(outDir, '1-hvac-portfolio', '02-mobile-view-1024x768.png'), 'contain-mobile');
  await toFiverrPortfolio(raw.hvac[1].path, path.join(outDir, '1-hvac-portfolio', '03-stats-section-1024x768.png'));

  // Plumbing portfolio project
  await toFiverrPortfolio(raw.plumbing[0].path, path.join(outDir, '2-plumbing-portfolio', '01-THUMBNAIL-desktop-hero-1024x768.png'));
  await toFiverrPortfolio(raw.plumbing[2].path, path.join(outDir, '2-plumbing-portfolio', '02-mobile-view-1024x768.png'), 'contain-mobile');
  await toFiverrPortfolio(raw.plumbing[1].path, path.join(outDir, '2-plumbing-portfolio', '03-stats-services-1024x768.png'));

  // Portfolio hub project
  await toFiverrPortfolio(raw.portfolio[0].path, path.join(outDir, '3-portfolio-hub', '01-THUMBNAIL-desktop-hero-1024x768.png'));
  await toFiverrPortfolio(raw.portfolio[1].path, path.join(outDir, '3-portfolio-hub', '02-live-demos-section-1024x768.png'));
  await toFiverrPortfolio(raw.portfolio[2].path, path.join(outDir, '3-portfolio-hub', '03-mobile-view-1024x768.png'), 'contain-mobile');

  // Gig gallery images (1280x769)
  await toFiverrGig(raw.hvac[0].path, path.join(outDir, 'gig-gallery', 'landing-gig-image-1-hvac-1280x769.png'));
  await toFiverrGig(raw.plumbing[0].path, path.join(outDir, 'gig-gallery', 'landing-gig-image-2-plumbing-1280x769.png'));
  await toFiverrGig(raw.portfolio[0].path, path.join(outDir, 'gig-gallery', 'wordpress-gig-image-portfolio-1280x769.png'));

  console.log('\nFiverr-ready files in:', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
