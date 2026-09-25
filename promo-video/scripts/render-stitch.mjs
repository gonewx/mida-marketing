// 将 Stitch 导出的原始 HTML 以 2x 分辨率渲染为 PNG（build/screens/<id>.png）
// Tailwind Play CDN 在沙箱中不可达，因此从页面内的 tailwind.config 读取配置并用本地 tailwindcss@3 预编译。
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';
import { chromium } from 'playwright';
import { proxied } from './lib/net.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const htmlDir = path.join(root, 'stitch/html');
const outDir = path.join(root, 'build/screens');
await fs.mkdir(outDir, { recursive: true });

function extractConfig(html) {
  const m = html.match(/<script[^>]*id="tailwind-config"[^>]*>([\s\S]*?)<\/script>/)
    || html.match(/<script>\s*(tailwind\.config\s*=[\s\S]*?)<\/script>/);
  if (!m) return {};
  const sandbox = { tailwind: {} };
  vm.runInNewContext(m[1], sandbox);
  return sandbox.tailwind.config || {};
}

async function compile(html) {
  const cfg = extractConfig(html);
  const css = await postcss([
    tailwindcss({
      ...cfg,
      content: [{ raw: html, extension: 'html' }],
      plugins: [forms, containerQueries, ...(cfg.plugins || [])],
    }),
  ]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined });
  return css.css;
}

const only = process.argv.slice(2);
const files = (await fs.readdir(htmlDir)).filter((f) => f.endsWith('.html'))
  .filter((f) => !only.length || only.some((o) => f.startsWith(o)));
const manifestPath = path.join(outDir, 'manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8').catch(() => '{}'));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const f of files) {
  const id = f.replace('.html', '');
  let html = await fs.readFile(path.join(htmlDir, f), 'utf8');
  const css = await compile(html);
  html = html
    .replace(/<script[^>]*src="https:\/\/cdn\.tailwindcss\.com[^"]*"[^>]*><\/script>/g,
      `<script>window.tailwind={};</script><style>${css}</style>`)
    // Stitch 预览用的入场淡入动画会让截图半透明，关闭之
    .replace(/stitch-anim-[\w-]+/g, '');
  const tmp = path.join(outDir, `${id}.html`);
  await fs.writeFile(tmp, html);

  const desktop = id.startsWith('4193940950384e3a');
  const page = await browser.newPage({
    viewport: desktop ? { width: 1280, height: 800 } : { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await page.route('**/*', proxied);
  await page.goto('file://' + tmp, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '*{animation:none!important;transition:none!important} [style*="opacity: 0"]{opacity:1!important}' });
  await page.addScriptTag({ path: path.join(root, 'scripts/lib/clean.js') });
  await page.waitForTimeout(500);

  // 固定在底部的导航栏单独导出（视频中叠加在手机屏幕底部），整页截图中隐藏它，顶部固定栏改为随页面滚动
  const navHeight = await page.evaluate(() => {
    let h = 0;
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.height < 20 || r.width < innerWidth * 0.8) continue;
      if (r.top > innerHeight / 2) { h = Math.max(h, innerHeight - r.top); el.dataset.bottomFixed = '1'; }
      else el.dataset.topFixed = '1';
    }
    return Math.round(h);
  });
  if (navHeight) {
    await page.screenshot({ path: path.join(outDir, `${id}.nav.png`),
      clip: { x: 0, y: 844 - navHeight, width: 390, height: navHeight } });
  }
  await page.addStyleTag({ content: '[data-bottom-fixed]{display:none!important} [data-top-fixed]{position:absolute!important}' });
  await page.screenshot({ path: path.join(outDir, `${id}.png`), fullPage: true });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  manifest[id] = { width: desktop ? 1280 : 390, height, navHeight };
  await page.close();
  console.log('rendered', id, manifest[id]);
}
await browser.close();
await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
