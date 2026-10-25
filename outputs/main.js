import MatterScene from './scene.js';
import { projects } from './projects.js';
import { initDevices } from './devices.js';

initDevices();

// Phones draw these marks as color emoji. A text-presentation selector keeps the drawn symbol.
const textSymbols = /[←↑→↓↔↗↘↵↺⌂⌕⌘▤▦▮▰▷◉○●◫☷✓✕✳⧉Ⅱ]/g;
function keepTextSymbols(node) {
  if (!node) return;
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.nodeValue;
    if (!value || !textSymbols.test(value)) { textSymbols.lastIndex = 0; return; }
    textSymbols.lastIndex = 0;
    const next = value.replace(textSymbols, (mark, index, source) => source.charCodeAt(index + mark.length) === 0xfe0e ? mark : mark + '\uFE0E');
    if (next !== value) node.nodeValue = next;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
  [...node.childNodes].forEach(keepTextSymbols);
}
keepTextSymbols(document.body);
new MutationObserver(records => {
  records.forEach(record => {
    if (record.type === 'characterData') keepTextSymbols(record.target);
    record.addedNodes.forEach(keepTextSymbols);
  });
}).observe(document.body, { childList: true, subtree: true, characterData: true });

const $ = (s, scope = document) => scope.querySelector(s);
const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
const body = document.body;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const ease = t => 1 - Math.pow(1 - t, 5);
body.classList.add('has-js');

let paused = motionPreference.matches;
let frame = 0;
let lastTime = 0;
let elapsed = 0;
let introTime = 0;
let introDone = false;
let resizeNeeded = true;
let drawNeeded = true;
let scrollAnimation = null;
let quality = 1;
let slowFrames = 0;
let cachedDpr = devicePixelRatio;
const pointer = { x: innerWidth * .65, y: innerHeight * .45, active: false };
const follower = { x: pointer.x, y: pointer.y, size: 22 };
const normalized = { x: 0, y: 0 };
const cursor = $('.custom-cursor');
const cursorLabel = $('span', cursor);
const art = $('.hero-art');
const canvas = $('#matter-canvas');
const scene = new MatterScene(canvas);
let artRect = art.getBoundingClientRect();
let heroHeight = $('.hero').offsetHeight;
let maxScroll = 1;
let activeMagnet = null;
let activeCover = null;
let cursorState = { text: '', link: false };
let modalEntrance = null;
const magnets = $$('.magnetic').map(element => ({ element, x: 0, y: 0, tx: 0, ty: 0 }));
const covers = $$('.project-cover:not(.device-cover)').map(element => ({ element, x: 0, y: 0, tx: 0, ty: 0 }));

// The complete heading stays available to assistive technology.
let letterIndex = 0;
const letters = [];
$$('[data-split]').forEach(line => {
  const text = line.textContent;
  line.textContent = '';
  [...text].forEach(character => {
    if (character === ' ') { line.append(' '); return; }
    const mask = document.createElement('span');
    const letter = document.createElement('span');
    mask.className = 'char-mask';
    letter.className = 'char';
    letter.textContent = character;
    mask.append(letter);
    line.append(mask);
    letters.push({ element: letter, mask, index: letterIndex++, x: 0, y: 0, r: 0, heat: 0 });
    if (!motionPreference.matches) {
      letter.style.transform = 'translate3d(0, 110%, 0)';
      letter.style.opacity = '0';
      letter.style.filter = 'blur(8px)';
    }
  });
});
const arrivals = $$('.hero-topline, .hero-title-meta, .hero-copy, .scene-caption, .hero-footer');
const hero = $('.hero');
const heroHeading = $('.hero-heading');
const headlineMain = $('.headline-main');
const headlineSerif = $('.headline-serif');
let sceneIntro = motionPreference.matches ? 1 : 0;
const wave = { x: 0, age: 9, strength: 0 };
hero.addEventListener('pointerdown', event => {
  if (paused || motionPreference.matches || event.target.closest('a, button')) return;
  wave.x = clamp(event.clientX / innerWidth * 2 - 1, -1, 1) * 2.6;
  wave.age = 0;
  wave.strength = 1;
  drawNeeded = true;
});
const reveals = $$('.reveal').map(element => ({ element, visible: false, t: 0, done: false }));
const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const item = reveals.find(item => item.element === entry.target);
    if (item) item.visible = true;
    revealObserver.unobserve(entry.target);
  });
}, { threshold: .1 }) : null;
reveals.forEach(item => {
  if (revealObserver) revealObserver.observe(item.element);
  else item.visible = true;
});

function updateMotionControl() {
  const reduced = motionPreference.matches;
  const button = $('[data-motion-toggle]');
  button.disabled = reduced;
  button.setAttribute('aria-pressed', String(paused || reduced));
  button.setAttribute('aria-label', reduced ? 'Уменьшенное движение включено в системе' : paused ? 'Продолжить анимацию' : 'Приостановить анимацию');
  $('[data-motion-label]').textContent = reduced ? 'Меньше движения' : paused ? 'Продолжить' : 'Пауза';
  $('[data-motion-icon]').textContent = paused || reduced ? '▷' : 'Ⅱ';
  body.dataset.paused = String(paused || reduced);
  resizeNeeded = true;
  drawNeeded = true;
}
$('[data-motion-toggle]').addEventListener('click', () => { paused = !paused; updateMotionControl(); });
motionPreference.addEventListener('change', () => {
  paused = motionPreference.matches;
  updateMotionControl();
  resizeNeeded = true;
});
updateMotionControl();

function resize() {
  artRect = art.getBoundingClientRect();
  heroHeight = $('.hero').offsetHeight;
  maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const dpr = Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.7 : 2) * quality;
  scene.resize(artRect.width, artRect.height, dpr);
  resizeNeeded = false;
  drawNeeded = true;
  cachedDpr = devicePixelRatio;
}
window.addEventListener('resize', () => { resizeNeeded = true; }, { passive: true });
new ResizeObserver(() => { resizeNeeded = true; }).observe(art);
document.fonts.ready.then(() => { resizeNeeded = true; });

function setPointerTarget(event) {
  if (event.pointerType === 'touch') return;
  const first = !pointer.active;
  pointer.active = true;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  if (first) { follower.x = pointer.x; follower.y = pointer.y; }
  body.classList.toggle('has-pointer', finePointer.matches && !motionPreference.matches);
  const target = event.target instanceof Element ? event.target : null;
  body.classList.toggle('in-device-demo', Boolean(target?.closest('[data-device]')));
  const labelTarget = target?.closest('[data-cursor]');
  cursorState.text = labelTarget?.dataset.cursor || '';
  cursorState.link = Boolean(target?.closest('a, button, input')) && !labelTarget;
  cursorLabel.textContent = cursorState.text;
  cursor.classList.toggle('is-label', !!cursorState.text);
  cursor.classList.toggle('is-link', cursorState.link);
  const magnetElement = target?.closest('.magnetic');
  activeMagnet = magnets.find(item => item.element === magnetElement) || null;
  const coverElement = target?.closest('.project-cover');
  activeCover = covers.find(item => item.element === coverElement) || null;
  if (activeMagnet) {
    const r = activeMagnet.element.getBoundingClientRect();
    activeMagnet.tx = (pointer.x - r.left - r.width / 2) * .11;
    activeMagnet.ty = (pointer.y - r.top - r.height / 2) * .13;
  }
  if (activeCover) {
    const r = activeCover.element.getBoundingClientRect();
    activeCover.tx = (pointer.x - r.left) / r.width - .5;
    activeCover.ty = (pointer.y - r.top) / r.height - .5;
  }
  drawNeeded = true;
}
window.addEventListener('pointermove', setPointerTarget, { passive: true });
function leavePointer() {
  pointer.active = false;
  body.classList.remove('has-pointer');
  body.classList.remove('in-device-demo');
  activeMagnet = null;
  activeCover = null;
  drawNeeded = true;
}
document.documentElement.addEventListener('pointerleave', leavePointer);
window.addEventListener('blur', leavePointer);

function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  const inset = id === 'home' ? 0 : 42;
  const destination = clamp(target.getBoundingClientRect().top + scrollY - inset, 0, Math.max(0, document.documentElement.scrollHeight - innerHeight));
  if (motionPreference.matches || paused) { window.scrollTo(0, destination); scrollAnimation = null; }
  else scrollAnimation = { from: scrollY, to: destination, t: 0 };
  history.pushState(null, '', `#${id}`);
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}
$$('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  const id = link.getAttribute('href').slice(1);
  if (!document.getElementById(id)) return;
  event.preventDefault();
  scrollToSection(id);
}));
['wheel', 'touchstart'].forEach(type => addEventListener(type, () => { scrollAnimation = null; }, { passive: true }));
addEventListener('keydown', event => {
  if (['ArrowDown', 'ArrowUp', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key) && !$('.command-dialog').open) scrollAnimation = null;
});
addEventListener('scroll', () => { drawNeeded = true; }, { passive: true });

// Filtering keeps all case details and source links available in the palette.
$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  $$('[data-filter]').forEach(item => { const active = item === button; item.classList.toggle('is-active', active); item.setAttribute('aria-pressed', String(active)); });
  $$('.project[data-category]').forEach(project => { project.hidden = button.dataset.filter !== 'all' && project.dataset.category !== button.dataset.filter; });
  $('.project-grid').classList.toggle('is-filtered', button.dataset.filter !== 'all');
  resizeNeeded = true;
}));

const caseDialog = $('#case-dialog');
let caseId = projects[0].id;
let caseOpener = null;
function fillCase(id) {
  const project = projects.find(project => project.id === id);
  if (!project) return false;
  caseId = id;
  $('[data-case-index]').textContent = `PROJECT / ${String(projects.indexOf(project) + 1).padStart(2, '0')}`;
  $('#case-title').textContent = project.title;
  $('[data-case-type]').textContent = project.type;
  $('[data-case-description]').textContent = project.shortdesc;
  $('[data-case-role]').textContent = project.role;
  $('[data-case-task]').textContent = project.task;
  $('[data-case-solution]').textContent = project.solution;
  const stack = $('[data-case-stack]');
  stack.replaceChildren(...project.stack.map(text => { const e = document.createElement('span'); e.textContent = text; return e; }));
  const sources = $('[data-case-sources]');
  sources.replaceChildren(...project.sources.map(source => {
    const a = document.createElement('a'); a.href = source.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = `${source.label} ↗`; return a;
  }));
  caseDialog.scrollTop = 0;
  return true;
}
function openCase(id, opener = document.activeElement) {
  if (!fillCase(id)) return;
  caseOpener = opener;
  if (commandDialog.open) closeCommand(false);
  if (!caseDialog.open) caseDialog.showModal();
  modalEntrance = { element: $('.case-dialog-shell'), t: 0 };
  body.classList.add('modal-open');
  $('[data-close-case]').focus();
}
function closeCase(restore = true) {
  if (caseDialog.open) caseDialog.close();
  if (!commandDialog.open) body.classList.remove('modal-open');
  if (restore && caseOpener?.isConnected) caseOpener.focus({ preventScroll: true });
}
$$('[data-case]').forEach(button => button.addEventListener('click', () => openCase(button.dataset.case, button)));
$('[data-close-case]').addEventListener('click', () => closeCase());
caseDialog.addEventListener('cancel', event => { event.preventDefault(); closeCase(); });
caseDialog.addEventListener('click', event => { if (event.target === caseDialog) { const r = caseDialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeCase(); } });
$('[data-next-case]').addEventListener('click', () => { fillCase(projects[(projects.findIndex(project => project.id === caseId) + 1) % projects.length].id); $('#case-title').setAttribute('tabindex', '-1'); $('#case-title').focus({ preventScroll: true }); });

const commandDialog = $('#command-dialog');
const commandInput = $('#command-input');
let commandOpener = null;
let commandIndex = 0;
let results = [];
const destinations = [
  { title: 'Первый экран', subtitle: 'Frontend with feeling', target: 'home', terms: 'начало frontend home', kind: 'section' },
  { title: 'Избранные проекты', subtitle: 'Личные проекты и командная работа', target: 'work', terms: 'работы projects кейсы', kind: 'section' },
  { title: 'Рабочие продукты', subtitle: 'Extra Space · Workflow · BS Holding · Oi-Qaragai', target: 'experience', terms: 'опыт experience fiztex физтех вклад tmk techno horizon extraspace workflow narxoz oi-qaragai', kind: 'section' },
  { title: 'Обо мне', subtitle: 'Айбек Ыскак · Алматы', target: 'about', terms: 'about разработчик резюме айбек ыскак aibek алматы equator tmk навыки стек', kind: 'section' },
  { title: 'Контакты', subtitle: 'Почта и телефон', target: 'contact', terms: 'контакты связаться почта телефон', kind: 'section' },
  ...projects.map(project => ({ title: project.title, subtitle: project.category, target: project.id, terms: `${project.shortdesc} ${project.stack.join(' ')} ${project.id}`, kind: 'project' }))
];
function renderCommands() {
  const words = commandInput.value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  results = destinations.filter(item => words.every(word => `${item.title} ${item.subtitle} ${item.terms}`.toLocaleLowerCase().includes(word)));
  commandIndex = 0;
  $('[data-result-count]').textContent = `${results.length} РЕЗУЛЬТАТОВ`;
  const container = $('#command-results');
  container.replaceChildren();
  if (!results.length) {
    const message = document.createElement('p'); message.className = 'command-empty'; message.textContent = 'Пока ничего. Попробуйте React, FinAssist или «вклад».'; container.append(message);
  }
  results.forEach((item, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'command-result'; button.id = `command-option-${index}`; button.setAttribute('role', 'option'); button.tabIndex = -1;
    const icon = document.createElement('span'); icon.className = 'command-result-icon'; icon.textContent = item.kind === 'project' ? '↗' : '#';
    const text = document.createElement('span'); const title = document.createElement('b'); title.textContent = item.title; const subtitle = document.createElement('small'); subtitle.textContent = item.subtitle; text.append(title, subtitle);
    const arrow = document.createElement('span'); arrow.textContent = '↵'; button.append(icon, text, arrow);
    button.addEventListener('pointermove', () => { commandIndex = index; selectCommand(); });
    button.addEventListener('click', () => activateCommand(index)); container.append(button);
  });
  selectCommand();
}
function selectCommand() {
  $$('.command-result').forEach((button, index) => { const active = index === commandIndex; button.classList.toggle('is-active', active); button.setAttribute('aria-selected', String(active)); });
  commandInput.setAttribute('aria-activedescendant', results.length ? `command-option-${commandIndex}` : '');
}
function openCommand() {
  if (caseDialog.open) closeCase(false);
  commandOpener = document.activeElement;
  commandInput.value = '';
  renderCommands();
  commandDialog.showModal(); body.classList.add('modal-open'); commandInput.focus();
  modalEntrance = { element: commandDialog, t: 0 };
}
function closeCommand(restore = true) {
  commandDialog.close();
  if (!caseDialog.open) body.classList.remove('modal-open');
  if (restore && commandOpener?.isConnected) commandOpener.focus({ preventScroll: true });
}
function activateCommand(index) {
  const item = results[index];
  if (!item) return;
  closeCommand(false);
  if (item.kind === 'project') openCase(item.target, $('[data-open-command]'));
  else scrollToSection(item.target);
}
$$('[data-open-command]').forEach(button => button.addEventListener('click', openCommand));
$('[data-close-command]').addEventListener('click', () => closeCommand());
commandInput.addEventListener('input', renderCommands);
commandInput.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!results.length) return; commandIndex = (commandIndex + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length; selectCommand(); $(`#command-option-${commandIndex}`)?.scrollIntoView({ block: 'nearest' }); }
  if (event.key === 'Enter') { event.preventDefault(); activateCommand(commandIndex); }
});
commandDialog.addEventListener('cancel', event => { event.preventDefault(); closeCommand(); });
commandDialog.addEventListener('click', event => { if (event.target === commandDialog) { const r = commandDialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeCommand(); } });
addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (commandDialog.open) closeCommand(); else openCommand(); } });

// Career starts January 2025; the month in progress counts, as on the resume.
const today = new Date();
const careerMonths = (today.getFullYear() - 2025) * 12 + today.getMonth() + 1;
$$('[data-experience-years]').forEach(element => { element.textContent = (Math.floor(careerMonths * 10 / 12) / 10).toLocaleString('ru-RU'); });
$$('[data-experience]').forEach(element => { element.textContent = `'${Math.floor(careerMonths / 12)} г. ${careerMonths % 12} мес.'`; });

function animateUI(dt) {
  const instant = paused || motionPreference.matches;
  const smoothing = instant ? 1 : 1 - Math.exp(-12 * dt);
  if (modalEntrance) {
    modalEntrance.t += dt;
    const p = instant ? 1 : ease(clamp(modalEntrance.t / .42));
    modalEntrance.element.style.opacity = String(p);
    modalEntrance.element.style.transform = `translate3d(0,${(1 - p) * 16}px,0) scale(${.985 + p * .015})`;
    if (p === 1) modalEntrance = null;
  }
  if (!introDone) {
    introTime += dt;
    letters.forEach(({ element, index }) => {
      const p = instant ? 1 : clamp((introTime - .12 - index * .026) / 1.1);
      const e = ease(p);
      element.style.transform = `translate3d(0, ${(1 - e) * 110}%, 0)`;
      element.style.filter = p === 1 ? 'none' : `blur(${(1 - e) * 8}px)`;
      element.style.opacity = String(clamp(p * 5));
    });
    arrivals.forEach((element, i) => { const p = instant ? 1 : ease(clamp((introTime - .25 - i * .045) / .95)); element.style.opacity = p; element.style.translate = `0 ${(1 - p) * 12}px`; });
    introDone = instant || introTime > 1.3 + letters.length * .026;
    if (introDone) hero.classList.add('intro-done');
  } else {
    animateLetters(instant, smoothing);
  }
  sceneIntro = instant ? 1 : Math.min(1, sceneIntro + dt / 2.6);
  if (wave.strength) { wave.age += dt; if (wave.age > 4) wave.strength = 0; }
  if (finePointer.matches && !instant) {
    hero.style.setProperty('--glow-x', `${follower.x}px`);
    hero.style.setProperty('--glow-y', `${follower.y + scrollY}px`);
  }
  animateUIRest(dt, instant, smoothing);
}

// Letters lean away from the cursor and warm up as it passes over the heading.
function animateLetters(instant, smoothing) {
  const near = pointer.active && finePointer.matches && !instant && scrollY < heroHeight * .6;
  const rects = near ? letters.map(item => item.mask.getBoundingClientRect()) : null;
  letters.forEach((item, index) => {
    let tx = 0, ty = 0, tr = 0, th = 0;
    if (near) {
      const r = rects[index];
      const dx = r.left + r.width / 2 - pointer.x;
      const dy = r.top + r.height / 2 - pointer.y;
      const distance = Math.hypot(dx, dy) || 1;
      const force = Math.exp(-(distance * distance) / (2 * 120 * 120));
      tx = dx / distance * force * 6;
      ty = -force * 14 + dy / distance * force * 3;
      tr = dx / distance * force * 4;
      th = force * .9;
    }
    item.x += (tx - item.x) * smoothing * .6;
    item.y += (ty - item.y) * smoothing * .6;
    item.r += (tr - item.r) * smoothing * .6;
    item.heat += (th - item.heat) * smoothing * .6;
    item.element.style.transform = `translate3d(${item.x.toFixed(2)}px,${item.y.toFixed(2)}px,0) rotate(${item.r.toFixed(2)}deg)`;
    item.element.style.setProperty('--heat', item.heat.toFixed(3));
  });
}

function animateUIRest(dt, instant, smoothing) {
  reveals.forEach(item => {
    if (!item.visible || item.done) return;
    item.t += dt;
    const p = instant ? 1 : clamp(item.t / .85);
    item.element.style.opacity = ease(p);
    item.element.style.translate = `0 ${(1 - ease(p)) * 25}px`;
    item.done = p === 1;
  });
  if (pointer.active && finePointer.matches && !motionPreference.matches) {
    follower.x += (pointer.x - follower.x) * smoothing; follower.y += (pointer.y - follower.y) * smoothing;
    const targetSize = cursorState.text ? 80 : cursorState.link ? 43 : 22;
    follower.size += (targetSize - follower.size) * smoothing;
    cursor.style.width = `${follower.size}px`; cursor.style.height = `${follower.size}px`;
    cursor.style.transform = `translate3d(${follower.x}px,${follower.y}px,0) translate(-50%,-50%)`;
  }
  magnets.forEach(item => { const active = item === activeMagnet && !instant; item.x += ((active ? item.tx : 0) - item.x) * smoothing; item.y += ((active ? item.ty : 0) - item.y) * smoothing; item.element.style.transform = `translate3d(${item.x}px,${item.y}px,0)`; });
  covers.forEach(item => {
    const active = item === activeCover && !instant;
    item.x += ((active ? item.tx : 0) - item.x) * smoothing;
    item.y += ((active ? item.ty : 0) - item.y) * smoothing;
    item.element.style.transform = `perspective(1200px) rotateX(${-item.y * 5}deg) rotateY(${item.x * 5}deg)`;
    const phone = $('.phone-composition', item.element);
    if (phone) phone.style.transform = `translate3d(${item.x * 20}px,${item.y * 15}px,0) rotate(${11 + item.x * 13}deg)`;
    const orbit = $('.ai-orbit', item.element);
    if (orbit) orbit.style.transform = `rotate(${25 + item.x * 30}deg)`;
  });
}

function tick(timestamp) {
  const realDt = lastTime ? (timestamp - lastTime) / 1000 : 1 / 60;
  const dt = Math.min(realDt, .05); lastTime = timestamp;
  if (resizeNeeded || Math.abs(cachedDpr - devicePixelRatio) > .01) resize();
  if (scrollAnimation) {
    scrollAnimation.t += dt; const p = clamp(scrollAnimation.t / 1.1); window.scrollTo(0, scrollAnimation.from + (scrollAnimation.to - scrollAnimation.from) * ease(p)); if (p === 1) scrollAnimation = null;
  }
  if (!paused && !motionPreference.matches) elapsed += dt;
  animateUI(dt);
  $('.page-progress i').style.transform = `scaleX(${clamp(scrollY / maxScroll)})`;
  const heroVisible = scrollY < heroHeight;
  if (heroVisible) {
    normalized.x = clamp(pointer.x / innerWidth * 2 - 1, -1, 1); normalized.y = clamp(1 - pointer.y / innerHeight * 2, -1, 1);
    const heroProgress = clamp(scrollY / heroHeight);
    if (!paused || drawNeeded) {
      scene.update(dt, elapsed, normalized, heroProgress, paused || motionPreference.matches, sceneIntro, wave);
      drawNeeded = sceneIntro < 1 || wave.strength > 0;
    }
    const still = paused || motionPreference.matches;
    art.style.transform = still ? '' : `translate3d(0,${scrollY * .12}px,0)`;
    heroHeading.style.transform = still ? '' : `translate3d(0,${-scrollY * .09}px,0)`;
    heroHeading.style.opacity = String(clamp(1 - heroProgress * 1.15));
    headlineMain.style.translate = still ? '' : `${-heroProgress * 9}vw 0`;
    headlineSerif.style.translate = still ? '' : `${heroProgress * 12}vw 0`;
    $('[data-coord-x]').textContent = (pointer.x / innerWidth).toFixed(3); $('[data-coord-y]').textContent = (pointer.y / innerHeight).toFixed(3);
    if (!paused && realDt > .023 && realDt < .1) slowFrames++; else slowFrames = Math.max(0, slowFrames - .5);
    if (slowFrames > 100 && quality > .65) { quality = Math.max(.65, quality - .12); resizeNeeded = true; slowFrames = 0; }
  }
  frame = requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
  else if (!frame) { drawNeeded = true; frame = requestAnimationFrame(tick); }
});
frame = requestAnimationFrame(tick);
