const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  activeProject: 0,
  soundOn: false,
  audioContext: null,
  lastScrollY: 0,
};

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const hideIntro = () => qs('.intro-screen')?.classList.add('loaded');
window.setTimeout(hideIntro, reducedMotion ? 0 : 1100);
window.addEventListener('load', () => window.setTimeout(hideIntro, reducedMotion ? 0 : 120));

qs('#year').textContent = new Date().getFullYear();

// Reveal elements only when they enter the viewport.
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);
qsa('.reveal').forEach((element) => revealObserver.observe(element));

// Header color, active navigation and reading progress.
const header = qs('.site-header');
const progressBar = qs('.scroll-progress span');
const nav = qs('.nav-pill');
const navLinks = qsa('.nav-pill a');
const navIndicator = qs('.nav-indicator');
const sections = qsa('[data-section-name]');

function setActiveNav(sectionName) {
  const activeLink = navLinks.find((link) => link.dataset.section === sectionName);
  if (!activeLink) return;
  navLinks.forEach((link) => link.classList.toggle('active', link === activeLink));

  if (window.innerWidth <= 900) {
    const index = navLinks.indexOf(activeLink);
    navIndicator.style.transform = `translateX(${index * 100}%)`;
    navIndicator.style.width = 'calc((100% - 12px) / 4)';
  } else {
    navIndicator.style.width = `${activeLink.offsetWidth}px`;
    navIndicator.style.transform = `translateX(${activeLink.offsetLeft - 6}px)`;
  }
}

function updateHeader() {
  const scrollY = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? scrollY / maxScroll : 0;
  progressBar.style.transform = `scaleX(${progress})`;
  header.classList.toggle('scrolled', scrollY > 40);

  header.classList.remove('hidden');
  state.lastScrollY = scrollY;

  const viewportPoint = scrollY + window.innerHeight * 0.33;
  let currentSection = sections[0];
  sections.forEach((section) => {
    if (section.offsetTop <= viewportPoint) currentSection = section;
  });
  const sectionName = currentSection.dataset.sectionName;
  setActiveNav(sectionName);
  header.classList.toggle('on-dark', currentSection.classList.contains('section-dark'));
}

let scrollTicking = false;
window.addEventListener(
  'scroll',
  () => {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        updateHeader();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  },
  { passive: true }
);
window.addEventListener('resize', () => setActiveNav(qs('.nav-pill a.active')?.dataset.section || 'home'));
setActiveNav('home');
updateHeader();

// Custom cursor and magnetic controls for precise desktop feedback.
const cursorDot = qs('.cursor-dot');
const cursorRing = qs('.cursor-ring');
let cursorX = 0;
let cursorY = 0;
let ringX = 0;
let ringY = 0;

if (window.matchMedia('(pointer: fine)').matches && !reducedMotion) {
  window.addEventListener('pointermove', (event) => {
    cursorX = event.clientX;
    cursorY = event.clientY;
    cursorDot.style.transform = `translate3d(${cursorX - 3.5}px, ${cursorY - 3.5}px, 0)`;
    document.body.classList.add('cursor-ready');
  });

  const animateCursor = () => {
    ringX += (cursorX - ringX) * 0.16;
    ringY += (cursorY - ringY) * 0.16;
    cursorRing.style.transform = `translate3d(${ringX - cursorRing.offsetWidth / 2}px, ${ringY - cursorRing.offsetHeight / 2}px, 0)`;
    requestAnimationFrame(animateCursor);
  };
  animateCursor();

  qsa('a, button, .project-card').forEach((element) => {
    element.addEventListener('pointerenter', () => document.body.classList.add('cursor-hover'));
    element.addEventListener('pointerleave', () => document.body.classList.remove('cursor-hover'));
  });

  qsa('.magnetic').forEach((element) => {
    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      element.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
    });
    element.addEventListener('pointerleave', () => {
      element.style.transform = '';
    });
  });
}

// Soft parallax inside the hero illustration.
const heroScene = qs('.hero-scene');
const parallaxLayers = qsa('[data-depth]', heroScene);
if (heroScene && !reducedMotion && window.matchMedia('(pointer: fine)').matches) {
  heroScene.addEventListener('pointermove', (event) => {
    const rect = heroScene.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    parallaxLayers.forEach((layer) => {
      const depth = Number(layer.dataset.depth || 0);
      const base = layer.classList.contains('orbit-label-one') ? ' rotate(-8deg)' :
        layer.classList.contains('orbit-label-two') ? ' rotate(8deg)' :
        layer.classList.contains('chip-code') ? ' rotate(3deg)' :
        layer.classList.contains('chip-live') ? ' rotate(-5deg)' : '';
      layer.style.transform = `translate(${x * depth * 34}px, ${y * depth * 27}px)${base}`;
    });
  });
  heroScene.addEventListener('pointerleave', () => {
    parallaxLayers.forEach((layer) => (layer.style.transform = ''));
  });
}

// Interactive project card deck.
const deck = qs('.project-deck');
const cards = qsa('.project-card', deck);
const descriptions = qsa('.deck-description');
const projectCurrent = qs('#project-current');
let drag = null;

function relativeIndex(index, activeIndex) {
  return (index - activeIndex + cards.length) % cards.length;
}

function renderDeck(animate = true) {
  cards.forEach((card, index) => {
    const relative = relativeIndex(index, state.activeProject);
    const positions = [
      { x: 0, y: 0, r: 0, s: 1, z: 8, opacity: 1 },
      { x: 34, y: 24, r: 4.4, s: 0.965, z: 7, opacity: 1 },
      { x: 61, y: 43, r: 8.4, s: 0.93, z: 6, opacity: 0.96 },
      { x: -30, y: 36, r: -5.2, s: 0.91, z: 5, opacity: 0.92 },
    ];
    const position = positions[relative];
    card.classList.toggle('is-active', relative === 0);
    card.setAttribute('aria-hidden', relative === 0 ? 'false' : 'true');
    card.style.zIndex = position.z;
    card.style.opacity = position.opacity;
    card.style.setProperty('--offset-x', `${position.x}px`);
    card.style.setProperty('--offset-y', `${position.y}px`);
    card.style.setProperty('--rotation', `${position.r}deg`);
    card.style.setProperty('--scale', position.s);

    const fanPositions = [
      { x: -11, y: -5, r: -1 },
      { x: 82, y: 35, r: 8 },
      { x: 139, y: 72, r: 14 },
      { x: -81, y: 55, r: -10 },
    ];
    card.style.setProperty('--fan-x', `${fanPositions[relative].x}px`);
    card.style.setProperty('--fan-y', `${fanPositions[relative].y}px`);
    card.style.setProperty('--fan-r', `${fanPositions[relative].r}deg`);
    if (!animate) card.style.transition = 'none';
  });

  descriptions.forEach((description, index) => description.classList.toggle('active', index === state.activeProject));
  projectCurrent.textContent = String(state.activeProject + 1).padStart(2, '0');

  if (!animate) {
    requestAnimationFrame(() => cards.forEach((card) => (card.style.transition = '')));
  }
}

function changeProject(direction) {
  state.activeProject = (state.activeProject + direction + cards.length) % cards.length;
  renderDeck();
  playTone(direction > 0 ? 420 : 350, 0.06);
}

qs('.deck-next').addEventListener('click', () => changeProject(1));
qs('.deck-prev').addEventListener('click', () => changeProject(-1));

deck.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') changeProject(1);
  if (event.key === 'ArrowLeft') changeProject(-1);
});

deck.addEventListener('pointerdown', (event) => {
  const activeCard = qs('.project-card.is-active', deck);
  if (!activeCard) return;
  drag = { card: activeCard, startX: event.clientX, currentX: event.clientX };
  activeCard.classList.add('dragging');
  activeCard.setPointerCapture(event.pointerId);
});

deck.addEventListener('pointermove', (event) => {
  if (!drag) return;
  drag.currentX = event.clientX;
  const delta = drag.currentX - drag.startX;
  drag.card.style.transform = `translate3d(${delta}px, ${Math.abs(delta) * 0.035}px, 0) rotate(${delta * 0.025}deg) scale(.99)`;
});

function finishDrag(event) {
  if (!drag) return;
  const delta = drag.currentX - drag.startX;
  drag.card.classList.remove('dragging');
  drag.card.style.transform = '';
  if (Math.abs(delta) > 75) changeProject(delta < 0 ? 1 : -1);
  else renderDeck();
  if (event.pointerId !== undefined && drag.card.hasPointerCapture(event.pointerId)) {
    drag.card.releasePointerCapture(event.pointerId);
  }
  drag = null;
}

deck.addEventListener('pointerup', finishDrag);
deck.addEventListener('pointercancel', finishDrag);
renderDeck(false);

// Optional sound feedback. It never starts before explicit user action.
const soundToggle = qs('.sound-toggle');
function playTone(frequency = 360, duration = 0.08) {
  if (!state.soundOn) return;
  state.audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = state.audioContext.createOscillator();
  const gain = state.audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.035, state.audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, state.audioContext.currentTime + duration);
  oscillator.connect(gain).connect(state.audioContext.destination);
  oscillator.start();
  oscillator.stop(state.audioContext.currentTime + duration);
}

soundToggle.addEventListener('click', () => {
  state.soundOn = !state.soundOn;
  soundToggle.setAttribute('aria-pressed', String(state.soundOn));
  soundToggle.setAttribute('aria-label', state.soundOn ? '关闭页面声音' : '开启页面声音');
  if (state.soundOn) playTone(520, 0.13);
});

qsa('a, button').forEach((control) => {
  control.addEventListener('click', () => playTone(460, 0.045));
});

// Copy contact address.
const copyEmail = qs('.copy-email');
const toast = qs('.toast');
let toastTimer;
copyEmail.addEventListener('click', async () => {
  const email = copyEmail.dataset.email;
  try {
    await navigator.clipboard.writeText(email);
  } catch {
    const input = document.createElement('textarea');
    input.value = email;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
  toast.classList.add('show');
  copyEmail.textContent = '已复制';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    copyEmail.textContent = '复制邮箱';
  }, 1800);
});
