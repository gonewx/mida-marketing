// 逐帧渲染 composition/index.html → H.264 MP4（1920×1080 / 30fps），并混入 build/music.wav
// 用法：
//   node scripts/render-video.mjs                  渲染整片到 out/MiDa-launch-film.mp4，封面图到 out/cover.jpg
//   node scripts/render-video.mjs --stills 3,12.5  只导出这些秒数的静帧到 build/stills/
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { proxied } from './lib/net.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FPS = 30;
const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;

const ffmpeg = process.env.FFMPEG || execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.route('**/*', proxied);
await page.goto('file://' + path.join(root, 'composition/index.html'), { waitUntil: 'networkidle', timeout: 120000 });
await page.evaluate(() => window.ready);
const duration = await page.evaluate(() => window.DURATION);

if (stillsArg) {
  const dir = path.join(root, 'build/stills');
  await fs.mkdir(dir, { recursive: true });
  for (const t of stillsArg.split(',').map(Number)) {
    await page.evaluate((t) => window.seek(t), t);
    await page.screenshot({ path: path.join(dir, `t${String(t).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 85 });
  }
  console.log('stills written to', dir);
} else {
  const out = path.join(root, 'out/MiDa-launch-film.mp4');
  const raw = path.join(root, 'build/film-raw.mp4');
  const cover = path.join(root, 'out/cover.jpg');
  await fs.mkdir(path.dirname(out), { recursive: true });
  // 封面图：第 0 秒即封面镜头，另存为 JPG 供平台上传，并内嵌进 MP4
  await page.evaluate(() => window.seek(0));
  await page.screenshot({ path: cover, type: 'jpeg', quality: 92 });
  const music = path.join(root, 'build/music.wav');
  const hasMusic = await fs.access(music).then(() => true, () => false);
  const ff = spawn(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    ...(hasMusic ? ['-i', music] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    ...(hasMusic ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    raw,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(duration * FPS);
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.seek(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg exit ' + c)))));
  // 内嵌封面（attached_pic），文件管理器 / 部分播放器用它做缩略图
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', raw, '-i', cover,
    '-map', '0', '-map', '1', '-c', 'copy', '-c:v:1', 'mjpeg', '-disposition:v:1', 'attached_pic',
    '-movflags', '+faststart', out]);
  await fs.rm(raw);
  console.log('video written to', out, '\ncover written to', cover);
}
await browser.close();
