/* Interactions: nav state, scroll reveals, track→form link, WhatsApp submit. */
(() => {
  'use strict';

  const WA_NUMBER = '972522420587';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- nav background on scroll ---------- */
  /* ---------- one-shot reveals ---------- */
  /* .hero__shot is the scroll-film's stage — GSAP owns its transform, so it
     must never enter the reveal system (both write transform). */
  document.querySelectorAll('.hero > *, .wrap > *, .card, .steps li').forEach(e=>{
    if (!e.closest('.hero__shot')) e.classList.add('reveal');
  });
  const items = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        // stagger siblings so a section arrives as a sequence, not a block
        const group = Array.from(entry.target.parentElement?.children || []);
        const i = Math.max(0, group.indexOf(entry.target));
        entry.target.style.transitionDelay = Math.min(i * 90, 360) + 'ms';
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(el => io.observe(el));
  }

  /* ---------- before/after slider (hero) ---------- */
  /* The range input is the real control — mouse drag, touch, and keyboard
     for free. It just mirrors its value into --pos on the stage. */
  const baStage = document.getElementById('ba-stage');
  const baRange = document.getElementById('ba-range');
  if (baStage && baRange) {
    const setPos = () => baStage.style.setProperty('--pos', baRange.value);
    baRange.addEventListener('input', setPos);
    setPos();
  }

  /* Lenis smoothing, wired into GSAP's ticker */
  if (!reduced && window.gsap && window.Lenis && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.065, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- marquee: GSAP scroll-scrub (nbnzia move) ---------- */
  /* The CSS keyframe roll stays as the no-GSAP fallback; when ScrollTrigger
     is live we take over and tie the roll to scroll position + velocity. */
  const track = document.querySelector('.marquee__track');
  if (track && !reduced && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    track.style.animation = 'none';                    // hand off from CSS

    // RTL: content flows right-to-left, so forward scroll rolls it rightward.
    // One copy is 1/3 of the track — wrap keeps the loop seamless both ways.
    const wrapX = gsap.utils.wrap(0, 33.333);
    const setX = gsap.quickSetter(track, 'xPercent');
    let pos = 0, vel = 0;

    ScrollTrigger.create({
      trigger: '.marquee-clip',
      start: 'top bottom',
      end: 'bottom top',
      onUpdate(self) { vel += self.getVelocity() / 900; }
    });

    // the band leans into fast scrolls; vel decays, so the lean settles itself
    const clip = document.querySelector('.marquee');
    const setSkew = gsap.quickSetter(clip, 'skewX', 'deg');
    gsap.ticker.add(() => {
      pos += 0.03 + Math.abs(vel) * 0.06;              // idle drift + scroll push
      vel *= 0.9;                                      // decay
      setX(wrapX(pos));
      setSkew(gsap.utils.clamp(-4, 4, -vel * 0.35));
    });
  }

  /* ---------- 3D cursor tilt on cards / shots / tiles ---------- */
  /* Pointer-fine only; writes transform directly, so these elements keep
     their CSS hovers to shadow/background and leave transform to us. */
  if (!reduced && matchMedia('(pointer: fine)').matches) {
    const MAX = 6; // degrees
    document.querySelectorAll('.card, .case .shot picture, .direct a').forEach(el => {
      let raf = null;
      const move = e => {
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - .5;
        const ny = (e.clientY - r.top) / r.height - .5;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          el.style.transform =
            `perspective(800px) rotateX(${(-ny * MAX).toFixed(2)}deg) rotateY(${(nx * MAX).toFixed(2)}deg) translateY(-4px)`;
          raf = null;
        });
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', () => {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        el.style.transition = 'transform 450ms cubic-bezier(.22,.61,.36,1)';
        el.style.transform = '';
        setTimeout(() => { el.style.transition = ''; }, 460);
      });
    });
  }

  /* ---------- track CTA preselects the matching chip ---------- */
  document.querySelectorAll('[data-track]').forEach(link => {
    link.addEventListener('click', () => {
      const want = link.dataset.track;
      const radio = document.querySelector(`input[name="need"][value="${CSS.escape(want)}"]`);
      if (radio) radio.checked = true;
    });
  });

  /* ---------- lead form → prefilled WhatsApp ---------- */
  const form = document.getElementById('lead-form');
  if (form) {
    const nameEl  = form.querySelector('#name');
    const phoneEl = form.querySelector('#phone');
    const aboutEl = form.querySelector('#about-biz');
    const hpEl    = form.querySelector('#website');
    const mountedAt = Date.now();

    const setErr = (input, msgEl, msg) => {
      msgEl.textContent = msg || '';
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    };

    // Israeli mobile/landline, with or without leading zero and separators
    const phoneOk = v => /^0?(5\d|[2-489])\d{7}$/.test(v.replace(/[\s-]/g, ''));

    form.addEventListener('submit', e => {
      e.preventDefault();

      // honeypot + time trap — no CAPTCHA friction
      if (hpEl.value !== '' || Date.now() - mountedAt < 2500) return;

      const errName  = form.querySelector('#err-name');
      const errPhone = form.querySelector('#err-phone');

      const okName  = setErr(nameEl,  errName,  nameEl.value.trim().length >= 2 ? '' : 'צריך שם כדי לדעת למי לחזור.');
      const okPhone = setErr(phoneEl, errPhone, phoneOk(phoneEl.value.trim())  ? '' : 'מספר טלפון לא תקין.');

      if (!okName)  { nameEl.focus();  return; }
      if (!okPhone) { phoneEl.focus(); return; }

      const need = form.querySelector('input[name="need"]:checked')?.value || 'עדיין לא החלטתי';
      const lines = [
        'היי יונתן, הגעתי מהאתר.',
        '',
        `שם: ${nameEl.value.trim()}`,
        `טלפון: ${phoneEl.value.trim()}`,
        `מה צריך: ${need}`
      ];
      const about = aboutEl.value.trim();
      if (about) lines.push('', `על העסק: ${about}`);

      const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
      const win = window.open(url, '_blank', 'noopener');

      // A dead form must never be a dead end (popup blocked → go directly).
      if (!win) location.href = url;
    });

    /* keep the sticky bar out of the way of the on-screen keyboard */
    [nameEl, phoneEl, aboutEl].forEach(el => {
      el.addEventListener('focus', () => document.body.classList.add('kb-open'));
      el.addEventListener('blur',  () => document.body.classList.remove('kb-open'));
    });
  }
})();
