/* =========================
   main.js — disco by default
   ========================= */

// ===== DOM refs
const girl        = document.getElementById('girl');
const face        = document.getElementById('face');
const bar         = document.getElementById('bar');
const speech      = document.getElementById('speech');
const hearts      = document.getElementById('hearts');

const feedBtn     = document.getElementById('feed');
const infoBtn     = document.getElementById('info');       // переключатель Disco/Original
const shutupBtn   = document.getElementById('shutupBtn');

const confetti    = document.getElementById('confetti');

const video       = document.getElementById('wingstopVideo');
const altVideo    = document.getElementById('wingstopAltVideo'); // «постер»-ролик, когда основное не играет
const videoSource = video ? video.querySelector('source') : null;

// Disco overlay
const discoFX     = document.getElementById('discoFX');
const spotsBox    = document.getElementById('spots');

// ===== Media paths — ПРАВЬ ТУТ
const PRIMARY_VIDEO = "/images/wingstopgirl.mp4";      // оригинал
const ALT_VIDEO     = "/images/wingstopgirlrock.mp4";  // диско-видео (основное в диско-режиме)

// ===== Bottom strip text — ПРАВЬ ТУТ
// Пример: контракт «your_CA». Ниже форматируем с пробелами каждые 4 символа.
const CONTRACT_TEXT = "Coming soon";

// ===== State
let hunger = 75;              // 0..100
let satisfiedAt = 12000;      // ms — сколько времени после кормёжки «насыщена»
let lastFed = 0;

// ВАЖНО: стартуем в DISCO
let showingAlt = true;        // true = диско (ALT_VIDEO), false = оригинал
let switchingSrc = false;     // идёт ли переключение источника видео

// Глобальный звук сайта
let siteMuted = true;         // по умолчанию всё заглушено (совместимо с autoplay в браузерах)

const contractTextEl = document.getElementById('contractText');
const copyBtn        = document.getElementById('copyContract');

// Preload картинок
['/images/angry.png','/images/happy.png'].forEach(src => { const i=new Image(); i.src=src; });

// ===== Helpers
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function updateShutupUI(){
  if (!shutupBtn) return;
  if (siteMuted){
    shutupBtn.classList.add('is-muted');
    shutupBtn.setAttribute('aria-pressed','true');
    shutupBtn.innerHTML = '<span class="label">SHOUT ALL YOU WANT</span> <span class="ico">🔊</span>';
  } else {
    shutupBtn.classList.remove('is-muted');
    shutupBtn.setAttribute('aria-pressed','false');
    shutupBtn.innerHTML = '<span class="label">SHUT UP</span> <span class="ico">🔇</span>';
  }
}

function updateUI(){
  if (!bar || !girl || !face) return;
  const pct = Math.max(0, Math.min(100, hunger));
  bar.style.width = (100 - pct) + '%';
  bar.classList.toggle('ok', pct < 40);

  const isAngry = pct >= 40;
  girl.classList.toggle('angry', isAngry);
  girl.classList.toggle('happy', !isAngry);
  face.src = isAngry ? '/images/angry.png' : '/images/happy.png';

  // Подсветка «Feed», когда голодная
  if (feedBtn) {
    feedBtn.classList.toggle('attract', isAngry);
    feedBtn.classList.toggle('danger', pct > 39);
  }

  // Автовоспроизведение основного видео, когда героиня «злая»
  if (video){
    if (isAngry) {
      if (video.paused) video.play().catch(()=>{});
    } else {
      if (!video.paused) video.pause();
      video.currentTime = 0;
    }
  }

  syncMediaUI();
}

function spawnHearts(){
  if (!hearts) return;
  const w = hearts.clientWidth || 200;
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('div');
    el.className = 'heart';
    const left = Math.max(6, Math.random() * (w - 12));
    el.style.left = left + 'px';
    el.style.setProperty('--dur', (1.5 + Math.random() * 1.4) + 's');
    el.textContent = Math.random() > 0.5 ? '💚' : '💖';
    hearts.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }
}

function shootConfetti(){
  if (!confetti) return;
  const ctx = confetti.getContext('2d');
  const w = confetti.width = innerWidth;
  const h = confetti.height = innerHeight;
  let pieces = Array.from({length:160}, () => ({
    x: Math.random()*w, y: -20 - Math.random()*h, s: 4 + Math.random()*8,
    vy: 2 + Math.random()*3, vx: -1 + Math.random()*2, a: Math.random()*Math.PI,
    hue: Math.random()<.5 ? 150+Math.random()*60 : 30+Math.random()*40
  }));
  let raf = null;
  function frame(){
    ctx.clearRect(0,0,w,h);
    for (const p of pieces){
      p.x += p.vx; p.y += p.vy; p.a += 0.1;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a);
      ctx.fillStyle = `hsl(${p.hue} 90% 60%)`; ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*1.4); ctx.restore();
    }
    pieces = pieces.filter(p => p.y <= h + 40);
    if (pieces.length){ raf = requestAnimationFrame(frame); }
    else { ctx.clearRect(0,0,w,h); confetti.width = 0; confetti.height = 0; if (raf) cancelAnimationFrame(raf); }
  }
  frame();
}

function feed(amount=25){
  hunger = Math.max(0, hunger - amount);
  lastFed = Date.now();
  spawnHearts();
  if (hunger === 0) shootConfetti();
  updateUI();
}

// >>> NEW: принудительное включение звука по «важным» кликам
function forceUnmute(){
  if (siteMuted){
    siteMuted = false;
    setMutedAll(false);
    updateShutupUI();
    [video, altVideo].forEach(v => {
      if (!v) return;
      if (v.paused) v.play().catch(()=>{});
    });
  }
}

// Медленное нарастание «голода»
setInterval(()=>{
  const since = Date.now() - lastFed;
  const drift = since > satisfiedAt ? 2 : 0.5;
  hunger = Math.min(100, hunger + drift);
  updateUI();
}, 300);

// ===== Disco helpers
function createSpots(count=8){
  if (!spotsBox) return;
  spotsBox.innerHTML = '';
  for (let i=0;i<count;i++){
    const s = document.createElement('div');
    s.className = 'spot';
    const x1 = Math.round(-20 + Math.random()*20) + 'vw';
    const y1 = Math.round(Math.random()*100) + 'vh';
    const x2 = Math.round(20 + Math.random()*100) + 'vw';
    const y2 = Math.round(-10 + Math.random()*120) + 'vh';
    const dur = 10 + Math.random()*10;
    s.style.setProperty('--x-start', x1);
    s.style.setProperty('--y-start', y1);
    s.style.setProperty('--x-end',   x2);
    s.style.setProperty('--y-end',   y2);
    s.style.setProperty('--dur',     dur+'s');
    spotsBox.appendChild(s);
  }
}

function toggleDisco(on){
  document.body.classList.toggle('is-disco', !!on);
  if (on) createSpots(9);
  else if (spotsBox) spotsBox.innerHTML = '';
}

// ===== Video visibility / controls
function syncMediaUI(){
  if (!video) return;
  const notPlaying = video.paused || video.ended || video.readyState < 2;

  // во время switchingSrc постер не показываем
  const showAltPoster = notPlaying && !switchingSrc;

  if (altVideo){
    altVideo.style.display = showAltPoster ? 'block' : 'none';
    if (showAltPoster) { altVideo.play().catch(()=>{}); }
    else { altVideo.pause(); altVideo.currentTime = 0; }
  }

  video.style.display = notPlaying ? 'none' : 'block';
}

// ===== Events
// >>> UPDATED: Feed me — теперь включает звук
if (feedBtn) feedBtn.addEventListener('click', () => {
  forceUnmute();
  feed();
});

// Большая кнопка SHUT UP (глобальный mute)
if (shutupBtn){
  shutupBtn.addEventListener('click', () => {
    siteMuted = !siteMuted;
    setMutedAll(siteMuted);

    // если включаем звук — даём шанс стартануть роликам
    if (!siteMuted){
      [video, altVideo].forEach(v => {
        if (!v) return;
        if (v.paused) v.play().catch(()=>{});
      });
    }
    updateShutupUI();
  });
}

// Кнопка Disco/Original
// >>> UPDATED: теперь тоже включает звук в начале обработчика
if (infoBtn) infoBtn.addEventListener('click', () => {
  forceUnmute();

  if (!video || !videoSource) return;
  const wasPlaying = !video.paused && !video.ended;

  // на время смены источника скрываем «постер»
  switchingSrc = true;
  if (altVideo) {
    altVideo.pause();
    altVideo.currentTime = 0;
    altVideo.style.display = 'none';
  }

  // Переключаем режим
  showingAlt = !showingAlt;
  videoSource.src = showingAlt ? ALT_VIDEO : PRIMARY_VIDEO;
  video.load();

  // Диско-оверлей + состояние кнопки
  toggleDisco(showingAlt);
  infoBtn.classList.toggle('is-on', showingAlt);
  infoBtn.innerHTML = showingAlt
    ? '<span class="label">Original</span>'
    : '<span class="label">Disco</span><span class="ico">🪩</span>';

  // Подсветка «включи диско», когда он выключен
  infoBtn.classList.toggle('attract', !showingAlt);

  const onReady = () => {
    switchingSrc = false;
    syncMediaUI();
  };
  video.addEventListener('canplay', onReady, { once: true });

  if (wasPlaying) video.play().catch(()=>{});
  syncMediaUI();
});

// ===== One-way unmute (все кнопки, кроме SHUT UP, не должны включать звук, если SHUT UP активен)
function oneWayUnmute(){
  if (siteMuted) return; // если сайт в mute — ничего не делаем
  if (!video && !altVideo) return;
  setMutedAll(false);
}

function bindOneWayUnmute(){
  const btns = Array.from(document.querySelectorAll('button'))
    .filter(btn => btn !== shutupBtn);
  btns.forEach(btn => btn.addEventListener('click', oneWayUnmute, { capture: true }));
}

// ===== Общие утилиты медиа
function getActiveMedia(){
  if (!video && !altVideo) return null;
  const notPlaying = video ? (video.paused || video.ended || video.readyState < 2) : true;
  return (!notPlaying) ? video : altVideo;
}

function setMutedAll(muted){
  [video, altVideo].forEach(m => {
    if (!m) return;
    m.muted = muted;
  });
  // мягкий старт громкости, если включаем звук вручную
  if (!muted){
    [video, altVideo].forEach(m => {
      if (!m) return;
      try { if (m.volume === 0) m.volume = 0.6; } catch(_) {}
    });
  }
}

/* ===== Ripple на кнопки ===== */
function attachRipple(btn){
  if (!btn) return;
  btn.style.overflow = 'hidden';
  btn.addEventListener('click', (e)=>{
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = size + 'px';
    r.style.left = (e.clientX - rect.left - size/2) + 'px';
    r.style.top  = (e.clientY - rect.top  - size/2) + 'px';
    btn.appendChild(r);
    setTimeout(()=>r.remove(), 650);
  });
}
attachRipple(feedBtn);
attachRipple(infoBtn);
attachRipple(shutupBtn);

// ===== Bottom contract strip
function groupEvery(str, n=4){
  // с пробелами каждые n символов, игнорируя начальные/конечные пробелы
  const raw = (str || '').toString().replace(/\s+/g,'').trim();
  return raw.replace(new RegExp(`(.{${n}})`, 'g'), '$1 ').trim();
}

if (contractTextEl){
  const shown = groupEvery(CONTRACT_TEXT);
  contractTextEl.textContent = shown;
  contractTextEl.dataset.raw = CONTRACT_TEXT;
  contractTextEl.addEventListener('click', () => doCopy(contractTextEl.dataset.raw));
}

if (copyBtn){
  copyBtn.addEventListener('click', () => doCopy(contractTextEl?.dataset.raw || CONTRACT_TEXT));
}

async function doCopy(text){
  try{
    await navigator.clipboard.writeText(text);
    copiedUI(true);
  }catch{
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
    copiedUI(true);
  }
}
function copiedUI(){
  if (!copyBtn) return;
  copyBtn.classList.add('is-copied');
  copyBtn.textContent = 'COPIED!';
  setTimeout(()=>{
    copyBtn.classList.remove('is-copied');
    copyBtn.textContent = 'COPY';
  }, 1300);
}

/* =========================
   ИНИЦИАЛИЗАЦИЯ (диско по умолчанию)
   ========================= */

// 1) Сразу ставим диско-источник в основной <video> до первого рендера
if (video && videoSource) {
  videoSource.src = ALT_VIDEO;
  video.load(); // без проигрывания — updateUI() сам решит, когда играть
}

// 2) Включаем диско-оверлей
toggleDisco(true);

// 3) Приводим кнопку в состояние «Disco включён»
if (infoBtn) {
  infoBtn.classList.add('is-on');
  infoBtn.classList.remove('attract');
  infoBtn.innerHTML = '<span class="label">Original</span>';
  infoBtn.style.fontSize = "25px";
}

// 4) Применяем глобальный mute и синхронизируем большую кнопку
setMutedAll(siteMuted);
updateShutupUI();

// 5) Подписки на события медиаплеера (для корректной работы «постера»)
['play','playing','pause','ended','waiting','stalled','suspend','canplay'].forEach(ev=>{
  if (video) video.addEventListener(ev, syncMediaUI);
});

// 6) Привязываем «one-way unmute» после инициализации элементов
bindOneWayUnmute();

// 7) Первый рендер
updateUI();
syncMediaUI();

// 8) На старте — подсказка «включи диско» НЕ нужна, т.к. уже включено
if (infoBtn) infoBtn.classList.toggle('attract', !showingAlt);
// нет диско шара, чтобы он отображался изначально, а потом при переходе на оригинал пропадал





