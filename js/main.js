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

  /* ---------- scroll-film hero: היה / נהיה ---------- */
  /* Old Wix site is wiped away by the new site in three lagged strips (RTL),
     then the frame docks into its resting tilt. Pinned scene — created FIRST:
     ScrollTrigger refresh order is creation order, and ambient triggers made
     before a pin spacer exist are silently mispositioned. */
  const film = document.getElementById('film');
  if (film && !reduced && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // Lenis smoothing, wired into GSAP's ticker (engine.md recipe)
    if (window.Lenis) {
      const lenis = new Lenis({ lerp: 0.065, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    const isMobile = matchMedia('(max-width: 47.99rem)').matches;
    const stage = film.querySelector('.film__stage');
    const newImg = film.querySelector('.film__new');
    const edge  = film.querySelector('.film__edge');
    const strips = ['a','b','c'].map(k => film.querySelector('.film__strip--' + k));
    const caps = [...film.querySelectorAll('.film__cap')];

    // film-on state: strips take over, finished frame hidden until the dock
    gsap.set(strips, { visibility: 'visible' });
    gsap.set(edge,   { visibility: 'visible', opacity: 0 });
    gsap.set(newImg, { autoAlpha: 0 });
    gsap.set(film,   { rotate: 0, scale: isMobile ? 1 : 1.05 });   // undocked

    // one progress object drives the three strip fronts + the sweep line
    const front = { a: 100, b: 100, c: 100 };
    const apply = () => {
      strips[0].style.clipPath = `inset(0 0 66.7% ${front.a}%)`;
      strips[1].style.clipPath = `inset(33.3% 0 33.3% ${front.b}%)`;
      strips[2].style.clipPath = `inset(66.7% 0 0 ${front.c}%)`;
      edge.style.insetInlineStart = 'auto';
      edge.style.left = `calc(${front.b}% - 1px)`;                 // wipe front
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: isMobile ? '+=150%' : '+=280%',
        pin: true,
        scrub: 1.4,
        anticipatePin: 1
      },
      defaults: { ease: 'none' }
    });

    tl.to(caps[0], { opacity: 1, y: 0, duration: .06 }, 0)
      .to(edge,    { opacity: 1, duration: .04 }, .10)
      .to(front, { a: 0, duration: .42, onUpdate: apply }, .12)   // top strip leads
      .to(front, { b: 0, duration: .42, onUpdate: apply }, .20)   // middle lags
      .to(front, { c: 0, duration: .42, onUpdate: apply }, .28)   // bottom last
      .to(caps[0], { opacity: 0, duration: .06 }, .22)
      .to(caps[1], { opacity: 1, y: 0, duration: .06 }, .30)
      .to(caps[2], { opacity: 1, y: 0, duration: .06 }, .50)
      .to(caps[3], { opacity: 1, y: 0, duration: .06 }, .66)
      .to(edge,    { opacity: 0, duration: .05 }, .72)
      // the dock: frame settles into its resting tilt, finished img on top
      .to(film,   { rotate: -3, scale: 1, duration: .22, ease: 'power2.inOut' }, .76)
      .to(newImg, { autoAlpha: 1, duration: .04 }, .94)
      .to(caps,   { opacity: 0, duration: .05 }, .93);
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
