export function formatTime(seconds) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor(value / 60) % 60;
  const rest = String(value % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}

export function createProgressStore(storage, locale, tracks, onUnavailable = () => {}) {
  const key = `vorontsov-audiobook:v1:${locale}`;
  const ids = new Set(tracks.map(track => track.id));
  let data = { version: 1, currentId: null, rate: 1, tracks: {} };
  let available = true;
  const fail = () => { if (available) { available = false; onUnavailable(); } };
  try {
    const parsed = JSON.parse(storage.getItem(key));
    if (parsed?.version === 1 && parsed.tracks && typeof parsed.tracks === 'object') {
      data.currentId = ids.has(parsed.currentId) ? parsed.currentId : null;
      if ([0.75, 1, 1.25, 1.5, 1.75, 2].includes(parsed.rate)) data.rate = parsed.rate;
      for (const track of tracks) {
        const value = parsed.tracks[track.id];
        if (value && Number.isFinite(value.position) && value.position >= 0) {
          data.tracks[track.id] = {
            position: Math.min(value.position, track.duration),
            completed: value.completed === true,
            updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : 0,
          };
        }
      }
    }
  } catch (error) {
    // Malformed local data is recoverable. Blocked browser storage is reported.
    if (!(error instanceof SyntaxError)) fail();
  }
  function persist() {
    try { storage.setItem(key, JSON.stringify(data)); } catch { fail(); }
  }
  return {
    get data() { return data; },
    get available() { return available; },
    get(id) { return data.tracks[id] || { position: 0, completed: false }; },
    save(id, position, completed = false) {
      if (!ids.has(id) || !Number.isFinite(position)) return;
      const track = tracks.find(item => item.id === id);
      data.currentId = id;
      data.tracks[id] = { position: Math.min(Math.max(0, position), track.duration), completed, updatedAt: Date.now() };
      persist();
    },
    setRate(rate) {
      if (![0.75, 1, 1.25, 1.5, 1.75, 2].includes(rate)) return;
      data.rate = rate;
      persist();
    },
    reset() {
      data = { version: 1, currentId: null, rate: data.rate, tracks: {} };
      persist();
    },
  };
}

export class AudiobookPlayer extends EventTarget {
  constructor(audio, tracks, store) {
    super();
    this.audio = audio;
    this.tracks = tracks;
    this.store = store;
    this.current = null;
    this.pendingPosition = null;
    this.generation = 0;
    this.suppressSave = false;
    this.error = null;
    audio.playbackRate = store.data.rate;
    audio.addEventListener('loadedmetadata', () => {
      if (!this.current) return;
      if (this.pendingPosition !== null) {
        const duration = Number.isFinite(audio.duration) ? audio.duration : this.current.duration;
        audio.currentTime = Math.min(this.pendingPosition, Math.max(0, duration - 0.05));
        this.pendingPosition = null;
      }
      audio.playbackRate = this.store.data.rate;
      this.emit();
    });
    audio.addEventListener('timeupdate', () => { this.save(); this.emit(); });
    for (const event of ['play', 'pause', 'seeked', 'durationchange', 'volumechange', 'waiting', 'canplay', 'playing']) {
      audio.addEventListener(event, () => {
        if (event === 'pause' || event === 'seeked') this.save();
        this.emit();
      });
    }
    audio.addEventListener('ended', () => {
      if (!this.current) return;
      this.store.save(this.current.id, this.current.duration, true);
      this.emit();
      const next = this.tracks[this.index + 1];
      if (next) this.select(next.id, { autoplay: true, position: 0 });
    });
    audio.addEventListener('error', () => {
      if (!this.current) return;
      this.error = 'audioError';
      this.emit();
    });
  }
  get index() { return this.tracks.findIndex(track => track.id === this.current?.id); }
  get position() { return this.pendingPosition ?? this.audio.currentTime ?? 0; }
  get playing() { return !!this.current && !this.audio.paused && !this.audio.ended; }
  emit() { this.dispatchEvent(new Event('change')); }
  save() {
    if (!this.current || this.suppressSave || this.pendingPosition !== null || this.audio.error) return;
    this.store.save(this.current.id, this.audio.currentTime, this.audio.ended);
  }
  async select(id, { autoplay = false, position } = {}) {
    const track = this.tracks.find(item => item.id === id);
    if (!track) return;
    const generation = ++this.generation;
    this.save();
    this.audio.pause();
    this.current = track;
    const saved = this.store.get(id);
    const start = position ?? (saved.completed ? 0 : saved.position);
    this.pendingPosition = Math.max(0, Math.min(start, track.duration));
    this.error = null;
    this.audio.src = track.audio;
    this.audio.load();
    this.store.save(id, this.pendingPosition, false);
    this.emit();
    if (autoplay) await this.play(generation);
  }
  async play(generation = this.generation) {
    this.error = null;
    this.emit();
    try { await this.audio.play(); }
    catch (error) {
      if (generation !== this.generation || error.name === 'AbortError') return;
      this.error = error.name === 'NotAllowedError' ? 'playBlocked' : 'audioError';
      this.emit();
    }
  }
  toggle(id = this.current?.id) {
    if (!id) return;
    if (this.current?.id !== id) return this.select(id, { autoplay: true });
    if (this.playing) this.audio.pause();
    else if (this.audio.error) this.select(id, { autoplay: true, position: this.position });
    else this.play();
  }
  seek(value) {
    if (!this.current || !Number.isFinite(value)) return;
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : this.current.duration;
    const position = Math.min(Math.max(0, value), Math.max(0, duration - 0.05));
    if (this.pendingPosition !== null || this.audio.readyState === 0) this.pendingPosition = position;
    else this.audio.currentTime = position;
    this.store.save(this.current.id, position, false);
    this.emit();
  }
  move(offset) {
    const target = this.tracks[this.index + offset];
    if (target) return this.select(target.id, { autoplay: this.playing });
  }
  setRate(value) { this.store.setRate(value); this.audio.playbackRate = this.store.data.rate; this.emit(); }
  reset() {
    this.suppressSave = true;
    this.audio.pause();
    this.current = null;
    this.pendingPosition = null;
    this.audio.removeAttribute('src');
    this.audio.load();
    this.store.reset();
    this.suppressSave = false;
    this.error = null;
    this.generation++;
    this.emit();
  }
}
