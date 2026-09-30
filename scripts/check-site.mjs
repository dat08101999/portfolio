import { readFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('../dist/', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const css = await readFile(new URL('style.css', root), 'utf8');
const scene = await readFile(new URL('scene.js', root), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate element IDs');
const references = new Set();
for (const [, value] of html.matchAll(/(?:src|href|data-full)="([^"]+)"/g)) {
  if (value.startsWith('#')) assert(ids.includes(value.slice(1)), `Missing anchor: ${value}`);
  else if (!/^(https?:|data:|mailto:|tel:)/.test(value)) references.add(value);
}
for (const [, value] of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) references.add(value);
for (const [, value] of scene.matchAll(/loadAsync\('([^']+)'\)/g)) references.add(value);
references.add('vendor/three.module.min.js');
references.add('vendor/three.core.min.js');
for (const value of references) {
  assert(!value.startsWith('/'), `Root-relative path breaks GitHub project Pages: ${value}`);
  await access(new URL(value, root));
}
const selectedDates = [...html.matchAll(/class="project-index">\d+ \/ (\d+)/g)].map(match => Number(match[1]));
assert.deepEqual(selectedDates, [2026, 2025], 'Selected projects must be newest first');
const projectYears = [...html.matchAll(/data-project-year="(\d+)"/g)].map(match => Number(match[1]));
assert.equal(projectYears.length, 10, 'Expected ten individual project case studies');
assert.deepEqual(projectYears, [...projectYears].sort((a, b) => b - a), 'All project groups must remain newest first');
for (const id of ['gs25-pos', 'elise-fashion', 'bizfly-crm', 'bizfly-chat', 'nuoc-ngoc-tuan']) {
  const project = html.match(new RegExp(`<details[^>]+id="${id}"[\\s\\S]*?</details>`))?.[0];
  assert(project?.includes('project-ownership'), `${id} must explain personal responsibilities`);
  assert(project.includes('project-context'), `${id} must distinguish team context from personal scope`);
}
assert(html.includes('id="pa-ownership"') && html.includes('id="lingo-ownership"'), 'Featured projects need ownership sections');
assert(html.includes('prefers-reduced-motion') || css.includes('prefers-reduced-motion'));
assert(scene.includes("document.hidden") && scene.includes('IntersectionObserver'));
console.log(`Validated ${references.size} local resources, ${ids.length} unique IDs, project chronology and subpath-safe URLs.`);
