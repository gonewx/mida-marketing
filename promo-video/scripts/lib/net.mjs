// 沙箱内 Chromium 不信任出口代理的 CA；外部请求改由 Node fetch 转发（走 HTTPS_PROXY + NODE_EXTRA_CA_CERTS），并缓存到 build/cache
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cacheDir = path.join(root, 'build/cache');
await fs.mkdir(cacheDir, { recursive: true });

export async function proxied(route) {
  const url = route.request().url();
  if (!/^https?:/.test(url)) return route.continue();
  const key = path.join(cacheDir, createHash('md5').update(url).digest('hex'));
  try {
    const meta = JSON.parse(await fs.readFile(key + '.json', 'utf8'));
    return route.fulfill({ status: meta.status, headers: meta.headers, body: await fs.readFile(key) });
  } catch {}
  const res = await fetch(url, { headers: { 'user-agent': route.request().headers()['user-agent'] } });
  const body = Buffer.from(await res.arrayBuffer());
  const headers = { 'content-type': res.headers.get('content-type') || 'application/octet-stream', 'access-control-allow-origin': '*' };
  if (res.ok) {
    await fs.writeFile(key, body);
    await fs.writeFile(key + '.json', JSON.stringify({ status: res.status, headers }));
  }
  return route.fulfill({ status: res.status, headers, body });
}
