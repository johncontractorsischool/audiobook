import { AudiobookPlayer, createProgressStore, formatTime } from './player.js';
import { languages, messages } from './locales.js';

const $ = id => document.getElementById(id);
const icons = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 12 8-12 8Z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zm8 0h4v16h-4z" fill="currentColor"/></svg>',
  volume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>',
  muted: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4V4Zm5 5 6 6m0-6-6 6"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5"/></svg>',
};
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let toastTimer;
function toast(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 8500);
}

async function start() {
  const requested = new URL(location.href).searchParams.get('lang') || 'ru';
  const locale = languages.find(language => language.code === requested && language.available)?.code || 'ru';
  const t = messages[locale];
  const response = await fetch(`locales/${locale}.json`);
  if (!response.ok) throw new Error('Content unavailable');
  const content = await response.json();
  const tracks = content.tracks;
  document.documentElement.lang = locale;
  document.title = `${content.title} — ${content.author}`;
  $('author').textContent = content.author;
  $('footer-author').textContent = content.author;
  $('footer-title').textContent = content.title;
  document.querySelector('.hero-caption').textContent = content.author;
  document.querySelector('.skip-link').textContent = t.skipLink;
  if (content.description) document.querySelector('meta[name="description"]').content = content.description;
  for (const [id, text] of Object.entries({
    'menu-toggle': t.languageChoice, 'language-menu': t.languageMenu,
    'part-nav': t.partNavigation, 'resume-banner': t.resumeRegion,
    'player-dock': t.playerRegion, 'dock-range': t.seekGeneral,
    speed: t.speedControl, previous: t.previous, next: t.next,
    backward: t.backward, forward: t.forward,
  })) $(id).setAttribute('aria-label', text);
  // Keep the supplied Russian title's intentional line break.
  if (locale !== 'ru') $('book-title').textContent = content.title;
  for (const [id, text] of Object.entries({
    memoir: t.memoir, 'hero-cta': t.listen, 'library-title': t.listen,
    'library-description': t.description, 'resume-label': t.saved,
    'resume-button': t.resume, 'note-title': t.noteTitle, 'note-text': t.note,
    'storage-detail': t.storageDetail, 'reset-progress': t.reset,
    'footer-link': t.contents, 'speed-label': t.speed,
  })) $(id).textContent = text;
  $('book-stats').textContent = t.stats(tracks.reduce((sum, track) => sum + track.duration, 0));
  $('language-menu').innerHTML = languages.map(language => language.available
    ? `<a href="?lang=${language.code}" lang="${language.code}" ${language.code === locale ? 'aria-current="page"' : ''}>${language.label}</a>`
    : `<span class="language-soon" lang="${language.code}">${language.label} <small lang="${locale}">${t.soon}</small></span>`).join('');
  $('menu-toggle').addEventListener('click', () => {
    const open = $('menu-toggle').getAttribute('aria-expanded') !== 'true';
    $('menu-toggle').setAttribute('aria-expanded', String(open));
    $('language-menu').classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      $('menu-toggle').setAttribute('aria-expanded', 'false');
      $('language-menu').classList.remove('is-open');
    }
  });
  let storage;
  try { storage = window.localStorage; }
  catch { storage = { getItem() { throw new Error(); }, setItem() { throw new Error(); } }; }
  const store = createProgressStore(storage, locale, tracks, () => {
    $('note-text').textContent = t.storageUnavailable;
    toast(t.storageError);
  });
  const audio = $('audio');
  const player = new AudiobookPlayer(audio, tracks, store);
  const label = track => track.number ? `${t.chapter} ${track.number}` : track.title;
  const fullTitle = track => track.number ? `${label(track)}. ${track.title}` : track.title;

  function card(track) {
    const kicker = track.number ? label(track) : track.id === 'preface' ? t.introduction : t.conclusion;
    return `<article class="chapter-card" id="${track.id}" data-track="${track.id}" aria-labelledby="title-${track.id}">
      <div class="chapter-top"><img class="chapter-art" src="${track.image}" alt="" width="104" height="96" loading="lazy"><div class="chapter-copy"><p class="chapter-kicker">${escape(kicker)}</p><h3 class="chapter-title" id="title-${track.id}">${escape(track.title)}</h3><p class="chapter-status"></p></div></div>
      <div class="card-player"><button class="play-button" data-action="play" aria-label="${escape(`${t.play}: ${fullTitle(track)}`)}">${icons.play}</button><span class="time current-time">0:00</span><input type="range" min="0" max="${track.duration}" step="0.1" value="0" aria-label="${escape(`${t.seek}: ${fullTitle(track)}`)}"><span class="time duration">${formatTime(track.duration)}</span><button class="icon-button mute-button" data-action="mute" aria-label="${t.mute}">${icons.volume}</button></div>
      <a class="download-link" href="${track.audio}" download="Leonid-Vorontsov-${locale}-${track.id}.mp3" aria-label="${escape(`${t.download}: ${fullTitle(track)}`)}">${icons.download}<span>${t.download} ${t.mp3}</span><span class="download-size">(${t.size(track.bytes)})</span></a>
    </article>`;
  }
  const preface = tracks.find(track => track.id === 'preface');
  const afterword = tracks.find(track => track.id === 'afterword');
  $('part-nav').innerHTML = `<a href="#preface">${t.preface}</a>` + content.parts.map(part => `<a href="#part-${part.id}">${t.part} ${part.id}</a>`).join('') + `<a href="#afterword">${t.afterword}</a>`;
  $('chapter-list').innerHTML = `<div class="bookend">${card(preface)}</div>` + content.parts.map(part => `<section class="part-section" id="part-${part.id}" aria-labelledby="part-title-${part.id}"><header class="part-heading"><span class="part-number">${t.part} ${part.id}</span><div><h2 id="part-title-${part.id}">${escape(part.title)}</h2><p class="part-count">${t.chapterRange(part.start, part.end)}</p></div></header><div class="chapter-grid">${tracks.filter(track => track.part === part.id).map(card).join('')}</div></section>`).join('') + `<div class="bookend afterword">${card(afterword)}</div>`;
  $('chapter-list').setAttribute('aria-busy', 'false');

  const cards = new Map(tracks.map(track => [track.id, $(track.id)]));
  function rangeValue(input, value, duration) {
    input.value = String(value);
    input.max = String(duration);
    input.style.setProperty('--fill', `${duration ? Math.min(100, value / duration * 100) : 0}%`);
    input.setAttribute('aria-valuetext', `${formatTime(value)} ${t.of} ${formatTime(duration)}`);
  }
  let previousError = null;
  let previousTrack = null;
  function render() {
    for (const track of tracks) {
      const node = cards.get(track.id);
      const current = player.current?.id === track.id;
      const playing = current && player.playing;
      const saved = store.get(track.id);
      const value = current ? player.position : saved.position;
      const play = node.querySelector('[data-action="play"]');
      const expectedIcon = playing ? 'pause' : 'play';
      if (play.dataset.icon !== expectedIcon) { play.innerHTML = icons[expectedIcon]; play.dataset.icon = expectedIcon; }
      play.setAttribute('aria-label', `${playing ? t.pause : t.play}: ${fullTitle(track)}`);
      node.classList.toggle('is-current', current);
      node.querySelector('.current-time').textContent = formatTime(value);
      rangeValue(node.querySelector('input'), value, track.duration);
      node.querySelector('.chapter-status').textContent = saved.completed ? `✓ ${t.completed}` : saved.position > 0 && !current ? `${t.stopped} ${formatTime(saved.position)}` : '';
      const mute = node.querySelector('[data-action="mute"]');
      const muteState = audio.muted ? 'muted' : 'volume';
      if (mute.dataset.icon !== muteState) { mute.innerHTML = icons[muteState]; mute.dataset.icon = muteState; }
      mute.setAttribute('aria-label', audio.muted ? t.unmute : t.mute);
    }
    const last = tracks.find(track => track.id === store.data.currentId);
    $('resume-banner').hidden = !last || store.get(last.id).completed;
    $('reset-progress').hidden = !Object.keys(store.data.tracks).length;
    if (last) {
      $('resume-title').textContent = fullTitle(last);
      $('resume-time').textContent = `${formatTime(store.get(last.id).position)} ${t.of} ${formatTime(last.duration)}`;
      $('resume-button').textContent = player.current?.id === last.id && player.playing ? t.pause : t.resume;
    }
    const current = player.current;
    $('player-dock').hidden = !current;
    document.body.classList.toggle('has-player', !!current);
    if (current) {
      $('dock-image').src = current.image;
      $('dock-label').textContent = current.part ? `${t.part} ${current.part} · ${label(current)}` : t.memoir;
      $('dock-title').textContent = current.title;
      $('dock-play').innerHTML = icons[player.playing ? 'pause' : 'play'];
      $('dock-play').setAttribute('aria-label', player.playing ? t.pause : t.play);
      $('dock-current').textContent = formatTime(player.position);
      $('dock-duration').textContent = formatTime(current.duration);
      rangeValue($('dock-range'), player.position, current.duration);
      $('previous').disabled = player.index === 0;
      $('next').disabled = player.index === tracks.length - 1;
      $('speed').value = String(store.data.rate);
      if (previousTrack !== current.id && 'mediaSession' in navigator && 'MediaMetadata' in window) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: fullTitle(current), artist: content.author, album: content.title, artwork: [{ src: new URL(current.image, location.href).href, type: current.image.endsWith('.png') ? 'image/png' : 'image/webp' }] });
      }
      previousTrack = current.id;
    }
    if (player.error && player.error !== previousError) toast(t[player.error]);
    previousError = player.error;
  }
  for (const track of tracks) {
    const node = cards.get(track.id);
    node.querySelector('[data-action="play"]').addEventListener('click', () => player.toggle(track.id));
    node.querySelector('[data-action="mute"]').addEventListener('click', () => { audio.muted = !audio.muted; });
    node.querySelector('input').addEventListener('input', event => {
      const value = Number(event.target.value);
      if (player.current?.id !== track.id) player.select(track.id, { position: value });
      else player.seek(value);
    });
  }
  $('resume-button').addEventListener('click', () => player.toggle(store.data.currentId));
  $('dock-play').addEventListener('click', () => player.toggle());
  $('dock-range').addEventListener('input', event => player.seek(Number(event.target.value)));
  $('backward').addEventListener('click', () => player.seek(player.position - 15));
  $('forward').addEventListener('click', () => player.seek(player.position + 15));
  $('previous').addEventListener('click', () => player.move(-1));
  $('next').addEventListener('click', () => player.move(1));
  $('speed').addEventListener('change', event => player.setRate(Number(event.target.value)));
  $('reset-progress').addEventListener('click', () => { player.reset(); render(); toast(t.resetDone); });
  player.addEventListener('change', render);
  window.addEventListener('pagehide', () => player.save());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') player.save(); });
  window.addEventListener('beforeunload', () => player.save());
  $('part-nav').addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    $('part-nav').querySelectorAll('a').forEach(item => item.classList.toggle('active', item === link));
  });
  if ('mediaSession' in navigator) {
    for (const [action, handler] of Object.entries({
      play: () => player.play(), pause: () => audio.pause(),
      previoustrack: () => player.move(-1), nexttrack: () => player.move(1),
      seekbackward: detail => player.seek(player.position - (detail.seekOffset || 15)),
      seekforward: detail => player.seek(player.position + (detail.seekOffset || 15)),
      seekto: detail => player.seek(detail.seekTime),
    })) { try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* Browser-dependent controls. */ } }
  }
  render();
  // Restore the displayed position without loading 26 files or autoplaying.
  if (store.data.currentId) {
    const saved = store.get(store.data.currentId);
    if (!saved.completed) await player.select(store.data.currentId);
  }
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

start().catch(error => {
  console.error(error);
  $('chapter-list').textContent = 'Не удалось загрузить оглавление. Пожалуйста, обновите страницу.';
  $('chapter-list').setAttribute('aria-busy', 'false');
});
