import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgressStore, AudiobookPlayer, formatTime } from '../dist/player.js';

const tracks = [{ id: 'one', audio: 'one.mp3', duration: 3600 }, { id: 'two', audio: 'two.mp3', duration: 7200 }];
function memory() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}
class Audio extends EventTarget {
  currentTime = 0; duration = 3600; paused = true; ended = false; readyState = 0; error = null;
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  async play() { this.paused = false; this.dispatchEvent(new Event('play')); }
  load() { this.currentTime = 0; this.readyState = 0; }
  removeAttribute() { this.src = ''; }
  metadata(duration) { this.duration = duration; this.readyState = 1; this.dispatchEvent(new Event('loadedmetadata')); }
}
test('restores exact fractional position after reopening, independently by language', () => {
  const storage = memory();
  const store = createProgressStore(storage, 'ru', tracks);
  store.save('two', 3478.425);
  store.setRate(1.5);
  const restored = createProgressStore(storage, 'ru', tracks);
  assert.equal(restored.data.currentId, 'two');
  assert.equal(restored.get('two').position, 3478.425);
  assert.equal(restored.data.rate, 1.5);
  assert.equal(createProgressStore(storage, 'en', tracks).data.currentId, null);
});
test('recovers malformed data and clamps invalid positions', () => {
  const storage = memory();
  storage.setItem('vorontsov-audiobook:v1:ru', '{broken');
  assert.equal(createProgressStore(storage, 'ru', tracks).data.currentId, null);
  storage.setItem('vorontsov-audiobook:v1:ru', JSON.stringify({ version: 1, currentId: 'missing', rate: 99, tracks: { one: { position: 9999 }, two: { position: -5 } } }));
  const store = createProgressStore(storage, 'ru', tracks);
  assert.equal(store.data.currentId, null);
  assert.equal(store.get('one').position, 3600);
  assert.equal(store.get('two').position, 0);
  assert.equal(store.data.rate, 1);
});
test('blocked storage preserves current-session listening without crashing', () => {
  let warned = 0;
  const storage = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Denied'); } };
  const store = createProgressStore(storage, 'ru', tracks, () => warned++);
  store.save('one', 15.25);
  assert.equal(store.get('one').position, 15.25);
  assert.equal(warned, 1);
  assert.equal(store.available, false);
});
test('restoration waits for media metadata and does not autoplay', async () => {
  const store = createProgressStore(memory(), 'ru', tracks);
  store.save('two', 3478.425);
  const audio = new Audio();
  const player = new AudiobookPlayer(audio, tracks, store);
  await player.select('two');
  audio.dispatchEvent(new Event('timeupdate'));
  assert.equal(store.get('two').position, 3478.425);
  audio.metadata(7200);
  assert.equal(audio.currentTime, 3478.425);
  assert.equal(audio.paused, true);
});
test('switching chapters saves the old position and restores the chosen chapter', async () => {
  const store = createProgressStore(memory(), 'ru', tracks);
  store.save('two', 96.5);
  const audio = new Audio();
  const player = new AudiobookPlayer(audio, tracks, store);
  await player.select('one', { autoplay: true });
  audio.metadata(3600);
  audio.currentTime = 123.45;
  await player.select('two', { autoplay: true });
  audio.metadata(7200);
  assert.equal(store.get('one').position, 123.45);
  assert.equal(audio.currentTime, 96.5);
  assert.equal(player.current.id, 'two');
  assert.equal(audio.src, 'two.mp3');
});
test('a seek made before loading is retained and reset cannot be undone by late events', async () => {
  const store = createProgressStore(memory(), 'ru', tracks);
  const audio = new Audio();
  const player = new AudiobookPlayer(audio, tracks, store);
  await player.select('one');
  player.seek(945.2);
  audio.metadata(3600);
  assert.equal(audio.currentTime, 945.2);
  player.reset();
  audio.dispatchEvent(new Event('pause'));
  audio.dispatchEvent(new Event('timeupdate'));
  assert.equal(store.data.currentId, null);
  assert.deepEqual(store.data.tracks, {});
});
test('completed chapters restart from zero and a completed chapter advances to the next', async () => {
  const store = createProgressStore(memory(), 'ru', tracks);
  store.save('one', 3600, true);
  const audio = new Audio();
  const player = new AudiobookPlayer(audio, tracks, store);
  await player.select('one', { autoplay: true });
  audio.metadata(3600);
  assert.equal(audio.currentTime, 0);
  audio.currentTime = 3600;
  audio.ended = true;
  audio.dispatchEvent(new Event('ended'));
  assert.equal(store.get('one').completed, true);
  assert.equal(player.current.id, 'two');
  assert.equal(player.position, 0);
});
test('time formatting handles hour-long chapters and invalid values', () => {
  assert.equal(formatTime(3980), '1:06:20');
  assert.equal(formatTime(59.95), '0:59');
  assert.equal(formatTime(NaN), '0:00');
});
