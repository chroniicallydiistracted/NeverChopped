#!/usr/bin/env -S node --enable-source-maps
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.resolve(ROOT, 'assets/uniform_parts');
const DEST = path.resolve(ROOT, 'public/uniform_parts');

async function copyRecursive(src: string, dest: string) {
  const stat = await fs.promises.stat(src);
  if (stat.isDirectory()) {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src);
    for (const entry of entries) {
      await copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.copyFile(src, dest);
  }
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Source not found: ${SRC}`);
    process.exit(1);
  }
  await copyRecursive(SRC, DEST);
  console.log(`Synced helmet/uniform parts to ${DEST}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
