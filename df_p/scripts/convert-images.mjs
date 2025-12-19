#!/usr/bin/env node
/**
 * PNG -> WebP/AVIF 変換スクリプト
 * - 対象: assets/ およびその配下（assets/fishes など）
 * - 既存の .webp/.avif があり、かつ PNG より新しければスキップ
 * - 変換はデフォルトで WebP のみ。AVIF は環境変数 GENERATE_AVIF=1 のとき有効。
 *
 * 使い方:
 *   npm run img:convert
 *   # AVIF も出したい場合
 *   GENERATE_AVIF=1 npm run img:convert
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

const CWD = process.cwd();
const TARGET_DIRS = [
  path.resolve(CWD, 'assets')
];
const GENERATE_AVIF = process.env.GENERATE_AVIF === '1';

const WEBP_OPTIONS = {
  quality: 82,        // UIも背景もバランスの良い圧縮率
  alphaQuality: 90,
  effort: 6
};
const AVIF_OPTIONS = {
  quality: 50,        // AVIFは低ビットでも比較的高品質
  effort: 7
};

async function* walk(dir) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function isNewer(src, dest) {
  if (!(await exists(dest))) return true;
  const [a, b] = await Promise.all([fs.stat(src), fs.stat(dest)]);
  return a.mtimeMs > b.mtimeMs; // srcが新しければ再生成
}

async function convertOne(pngPath) {
  const dir = path.dirname(pngPath);
  const base = path.basename(pngPath, path.extname(pngPath));
  const webpPath = path.join(dir, `${base}.webp`);
  const avifPath = path.join(dir, `${base}.avif`);

  let wroteWebp = false;
  let wroteAvif = false;

  try {
    if (await isNewer(pngPath, webpPath)) {
      await sharp(pngPath).webp(WEBP_OPTIONS).toFile(webpPath);
      wroteWebp = true;
      console.log(`webp: ${path.relative(CWD, webpPath)}`);
    }
    if (GENERATE_AVIF && await isNewer(pngPath, avifPath)) {
      await sharp(pngPath).avif(AVIF_OPTIONS).toFile(avifPath);
      wroteAvif = true;
      console.log(`avif: ${path.relative(CWD, avifPath)}`);
    }
    return { ok: true, wroteWebp, wroteAvif };
  } catch (e) {
    console.warn(`convert error: ${path.relative(CWD, pngPath)} -> ${e?.message || e}`);
    return { ok: false, wroteWebp, wroteAvif };
  }
}

async function main() {
  const pngs = [];
  for (const td of TARGET_DIRS) {
    for await (const f of walk(td)) {
      const ext = path.extname(f).toLowerCase();
      if (ext === '.png') pngs.push(f);
    }
  }
  if (!pngs.length) {
    console.log('no png found under assets/.');
    return;
  }
  // 並列数を控えめに
  const CONC = Math.min(4, Math.max(1, cpuCountFallback(2)));
  let done = 0, ok = 0, webp = 0, avif = 0;

  const pool = new Array(CONC).fill(0).map(async () => {
    while (pngs.length) {
      const f = pngs.pop();
      if (!f) break;
      const r = await convertOne(f);
      done++;
      if (r.ok) ok++;
      if (r.wroteWebp) webp++;
      if (r.wroteAvif) avif++;
    }
  });
  await Promise.all(pool);
  console.log(`done: ${done}, success: ${ok}, wrote webp: ${webp}${GENERATE_AVIF ? `, wrote avif: ${avif}` : ''}`);
  console.log('Note: 参照の切替（<picture>/image-set）は別途対応が必要です。');
}

function cpuCountFallback(def = 2) {
  try {
    return os.cpus()?.length || def;
  } catch {
    return def;
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
