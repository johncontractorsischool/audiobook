import { readFileSync, statSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const content = JSON.parse(readFileSync('dist/locales/ru.json', 'utf8'));
assert.equal(content.parts.length, 4);
assert.equal(content.tracks.length, 26);
assert.deepEqual(content.tracks.filter(t => t.number).map(t => t.number), Array.from({ length: 24 }, (_, i) => i + 1));
assert.equal(new Set(content.tracks.map(t => t.id)).size, 26);
for (const track of content.tracks) {
  assert.ok(track.title && track.duration > 0);
  for (const asset of [track.image, track.audio]) assert.ok(existsSync(`dist/${asset}`), asset);
  assert.equal(statSync(`dist/${track.audio}`).size, track.bytes);
  assert.ok(track.bytes < 25 * 1024 * 1024);
  if (track.number) {
    const part = content.parts.find(p => p.id === track.part);
    assert.ok(part && track.number >= part.start && track.number <= part.end);
  }
}
for (const asset of ['assets/hero.webp', 'assets/caveat.ttf', 'styles.css', 'app.js', 'player.js']) assert.ok(existsSync(`dist/${asset}`));
console.log('Verified all 4 parts, 24 chapters, foreword, afterword, and their audio/artwork.');
