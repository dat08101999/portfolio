import { mkdir, writeFile } from 'node:fs/promises';

const output = new URL('../dist/assets/', import.meta.url);
await mkdir(output, { recursive: true });
const records = [];
for (const [slug, id, indexes] of [['pa', 6782149821, [0, 1, 2, 3]], ['lingo', 6745432034, [0, 1, 2, 3]], ['buddhism', 6504455597, [0]]]) {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=us`);
  const app = (await res.json()).results[0];
  if (!app) throw new Error(`No App Store record for ${id}`);
  const files = [];
  for (const index of indexes) {
    const source = app.screenshotUrls[index];
    const url = source.replace(/\/\d+x\d+bb\.(jpg|png)$/, '/1170x2532bb.png');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Asset download: ${response.status}`);
    const filename = `${slug}-${index + 1}.png`;
    await writeFile(new URL(filename, output), Buffer.from(await response.arrayBuffer()));
    files.push({ filename, source: url });
  }
  const icon = await fetch(app.artworkUrl512);
  await writeFile(new URL(`${slug}-icon.jpg`, output), Buffer.from(await icon.arrayBuffer()));
  records.push({ slug, id, name: app.trackName, bundleId: app.bundleId, releaseDate: app.releaseDate, url: app.trackViewUrl, screenshots: files });
  console.log(`${slug}: ${files.length} official screenshots`);
}
await writeFile(new URL('../../asset-sources.json', output), JSON.stringify({ retrieved: '2026-09-30', source: 'Apple iTunes Lookup API / official App Store listings', apps: records }, null, 2) + '\n');
const vendor = new URL('../dist/vendor/', import.meta.url);
await mkdir(vendor, { recursive: true });
for (const name of ['three.module.min.js', 'three.core.min.js']) {
  const response = await fetch(`https://cdn.jsdelivr.net/npm/three@0.180.0/build/${name}`);
  if (!response.ok) throw new Error(`Three.js ${name}: ${response.status}`);
  await writeFile(new URL(name, vendor), Buffer.from(await response.arrayBuffer()));
}
const license = await fetch('https://cdn.jsdelivr.net/npm/three@0.180.0/LICENSE');
await writeFile(new URL('THREE-LICENSE.txt', vendor), await license.text());
console.log('Three.js 0.180.0 saved locally');
