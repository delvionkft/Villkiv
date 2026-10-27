(() => {
  'use strict';

  const root = document.documentElement;
  const LEAD_KEY = 'villkiv-lead';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (reduceMotion.matches ? 'auto' : 'smooth');

  /* ---------------------------------------------------------------------
     Mobil menü
     --------------------------------------------------------------------- */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('fomenu');
  const desktopNav = window.matchMedia('(min-width: 960px)');

  const setMenu = (open, { returnFocus = false } = {}) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.nav-toggle__label').textContent = open ? 'Bezárás' : 'Menü';
    nav.classList.toggle('is-open', open);
    if (!open && returnFocus) toggle.focus();
  };

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false, { returnFocus: true });
    });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('is-open') && !e.target.closest('.site-header')) setMenu(false);
    });
    desktopNav.addEventListener('change', (e) => {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------------------------------------------------------------------
     Ajánlatkérő űrlapok: 7 lépés, két példány (hero alatt és lábléc felett)
     - A két példány közös állapotot használ: amit az egyikben megadsz, a
       másik is tudja, és ugyanannál a kérdésnél tart.
     - Egérrel/érintéssel választott válasz után magától továbblép;
       billentyűzettel a „Tovább” gomb visz tovább (a nyilak nem léptetnek).
     - Siker (köszönőoldal) csak az EmailJS 2xx válasza után.
     --------------------------------------------------------------------- */
  const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';
  const TIMEOUT_MS = 15000;
  const clean = (v) => v.replace(/\s+/g, ' ').trim();
  const phoneDigits = (v) => v.replace(/[\s\-()./]/g, '');
  const PICK = 'Válassz egy lehetőséget.';
  const RULES = {
    segitseg: (v) => (v ? '' : PICK),
    cel: (v) => (v ? '' : PICK),
    ingatlan: (v) => (v ? '' : PICK),
    szamla: (v) => (v ? '' : PICK),
    idozites: (v) => (v ? '' : PICK),
    telepules: (v) => (clean(v).length >= 2 ? '' : 'Add meg a települést vagy az irányítószámot.'),
    nev: (v) => (clean(v).length >= 2 ? '' : 'Add meg a teljes neved.'),
    telefon: (v) => {
      if (!clean(v)) return 'Add meg a telefonszámod.';
      return /^\+?\d{8,15}$/.test(phoneDigits(v))
        ? ''
        : 'Ellenőrizd a telefonszámot – például: +36 30 123 4567 vagy 06 30 123 4567.';
    },
    email: (v) => {
      if (!clean(v)) return 'Add meg az e-mail-címed.';
      return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(v.trim())
        ? ''
        : 'Ellenőrizd az e-mail-címet – például: nev@pelda.hu.';
    },
    adatkezeles: (v) => (v ? '' : 'Jelöld be, hogy elolvastad az adatkezelési tájékoztatót.'),
  };

  // Az EmailJS-azonosítók egy helyen, a <html> elemen vannak (mindkét űrlap ezeket használja)
  const emailjsConfig = () => {
    const get = (k) => (root.dataset[k] || '').trim();
    const cfg = { key: get('emailjsPublicKey'), service: get('emailjsService'), template: get('emailjsTemplate') };
    return cfg.key && cfg.service && cfg.template ? cfg : null;
  };

  const valueOf = (form, name) => {
    const el = form.elements[name];
    if (!el) return '';
    if (el instanceof RadioNodeList) return el.value;
    if (el.type === 'checkbox') return el.checked ? el.value : '';
    return el.value;
  };

  const shared = { step: 0 };
  const leads = [...document.querySelectorAll('form[data-lead-form]')].map((form) => {
    const steps = [...form.querySelectorAll('[data-step]')];
    return {
      form,
      steps,
      names: steps.map((s) => [...new Set([...s.querySelectorAll('input[name]')].map((i) => i.name))]),
      back: form.querySelector('[data-back]'),
      submit: form.querySelector('.form__submit'),
      submitLabel: form.querySelector('.form__submit-label'),
      status: form.querySelector('.form__status'),
      busy: false,
    };
  });

  const showError = (lead, name, message) => {
    const errorEl = lead.form.querySelector(`[data-error-for="${name}"]`);
    if (errorEl) errorEl.textContent = message;
    lead.form.querySelectorAll(`[name="${name}"]`).forEach((el) => {
      if (message) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    });
  };

  // Ellenőrzi a lépést, megjeleníti a hibákat; az első hibás mező nevét adja vissza
  const validateStep = (lead, i) => {
    let first = null;
    lead.names[i].forEach((name) => {
      const message = RULES[name] ? RULES[name](valueOf(lead.form, name)) : '';
      showError(lead, name, message);
      if (message && !first) first = name;
    });
    return first;
  };

  const focusField = (lead, name, options) => {
    const el = lead.form.elements[name];
    const target = el instanceof RadioNodeList ? [...el].find((r) => r.checked) || el[0] : el;
    target?.focus(options);
  };

  const render = (lead) => {
    const last = lead.steps.length - 1;
    lead.steps.forEach((s, i) => {
      const current = i === shared.step;
      s.classList.toggle('is-current', current);
      s.inert = !current;
    });
    lead.back.hidden = shared.step === 0;
    if (!lead.busy) lead.submitLabel.textContent = shared.step === last ? 'Ajánlatot kérek' : 'Tovább';
    lead.form.style.setProperty('--progress', String((shared.step + 1) / lead.steps.length));
  };

  const go = (lead, i, { focus = true } = {}) => {
    shared.step = Math.max(0, Math.min(i, lead.steps.length - 1));
    leads.forEach(render);
    if (!focus) return;
    // Ha az űrlap teteje kicsúszott a képből (mobilon), visszagörgetünk a kérdéshez
    if (lead.form.getBoundingClientRect().top < 0) lead.form.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    focusField(lead, lead.names[shared.step][0], { preventScroll: true });
  };

  // A másik példányba is átírjuk a választ, és ott töröljük az elavult hibát
  const syncFrom = (src, name) => {
    const a = src.form.elements[name];
    leads.forEach((lead) => {
      if (lead === src) return;
      const b = lead.form.elements[name];
      if (!a || !b) return;
      if (a instanceof RadioNodeList) [...b].forEach((r) => { r.checked = r.value === a.value; });
      else if (a.type === 'checkbox') b.checked = a.checked;
      else b.value = a.value;
      showError(lead, name, '');
    });
  };

  const setSending = (lead, sending) => {
    lead.busy = sending;
    lead.submit.disabled = sending;
    lead.back.disabled = sending;
    lead.submitLabel.textContent = sending ? 'Küldés folyamatban…' : 'Ajánlatot kérek';
    lead.form.setAttribute('aria-busy', String(sending));
  };

  const showFailure = (lead, detail) => {
    lead.status.className = 'form__status is-error';
    lead.status.replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = 'Az ajánlatkérést nem sikerült elküldeni.';
    const p = document.createElement('span');
    p.textContent = `${detail} A megadott válaszaid megmaradtak, így újra megpróbálhatod, vagy keress minket közvetlenül: +36 20 504 33 00, mernok@villkiv.hu.`;
    lead.status.append(strong, p);
  };

  const send = async (lead) => {
    const { form, status } = lead;
    const cfg = emailjsConfig();
    if (!cfg) {
      showFailure(lead, 'Az űrlap még nincs bekötve, ezért most nem tud üzenetet továbbítani.');
      return;
    }
    // Spamcsapda: valódi látogató nem tölti ki. Ilyenkor nem küldünk, és sikert sem jelzünk.
    if (form.elements._gotcha && form.elements._gotcha.value) {
      showFailure(lead, 'Az üzenetet a rendszer automatikusnak ítélte.');
      return;
    }

    setSending(lead, true);
    status.className = 'form__status is-sending';
    status.textContent = 'Küldés folyamatban…';
    let succeeded = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      // Az EmailJS-sablon változói: a mezők nevei + oldal (honnan jött) + reply_to
      const params = {};
      new FormData(form).forEach((value, key) => {
        if (!key.startsWith('_')) params[key] = clean(String(value));
      });
      params.oldal = location.href.split('#')[0];
      params.reply_to = params.email || '';
      const response = await fetch(EMAILJS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: cfg.service, template_id: cfg.template, user_id: cfg.key, template_params: params }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // Csak igazolt továbbítás után irányítunk a köszönőoldalra
      succeeded = true;
      status.textContent = 'Elküldve, átirányítás…';
      const service = form.querySelector('input[type="hidden"][name="szolgaltatas"]')?.value || '';
      const next = form.dataset.success || 'koszonjuk.html';
      // A köszönőoldal csak ezzel a jelzéssel számol konverziót (közvetlen megnyitásnál nem)
      try { sessionStorage.setItem(LEAD_KEY, '1'); } catch { /* privát mód: konverzió nélkül */ }
      location.assign(service ? `${next}?szolgaltatas=${encodeURIComponent(service)}` : next);
    } catch (err) {
      const timedOut = err && err.name === 'AbortError';
      showFailure(
        lead,
        timedOut
          ? 'A szerver nem válaszolt időben.'
          : navigator.onLine === false
            ? 'Úgy tűnik, nincs internetkapcsolat.'
            : 'Hiba történt a továbbítás közben.',
      );
    } finally {
      clearTimeout(timer);
      if (!succeeded) setSending(lead, false);
    }
  };

  leads.forEach((lead) => {
    const { form } = lead;
    form.classList.add('offer--wizard');
    render(lead);

    // Választás után: frissítjük a hibát és a másik példányt
    const onValue = (e) => {
      const { name } = e.target;
      if (!name || name.startsWith('_') || e.target.type === 'hidden') return;
      syncFrom(lead, name);
      if (form.querySelector(`[name="${name}"][aria-invalid="true"]`)) showError(lead, name, RULES[name]?.(valueOf(form, name)) || '');
    };
    form.addEventListener('input', onValue);
    form.addEventListener('change', onValue);

    // Egérrel/érintéssel választott válasz után továbblépünk (billentyűzettel nem)
    let pointerAt = 0;
    form.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.opt')) pointerAt = Date.now();
    });
    form.addEventListener('click', (e) => {
      const radio = e.target.closest('.opt__input');
      if (!radio || Date.now() - pointerAt > 1000) return;
      pointerAt = 0;
      const step = lead.steps.indexOf(radio.closest('[data-step]'));
      setTimeout(() => {
        if (shared.step === step && !validateStep(lead, step)) go(lead, step + 1);
      }, 260);
    });

    lead.back.addEventListener('click', () => go(lead, shared.step - 1));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (lead.busy) return;
      const last = lead.steps.length - 1;
      const bad = validateStep(lead, shared.step);
      if (bad) {
        focusField(lead, bad);
        return;
      }
      if (shared.step < last) {
        go(lead, shared.step + 1);
        return;
      }
      // Utolsó lépés: biztonság kedvéért minden lépést újra ellenőrzünk
      for (let i = 0; i < lead.steps.length; i++) {
        const missing = validateStep(lead, i);
        if (missing) {
          go(lead, i, { focus: false });
          focusField(lead, missing);
          return;
        }
      }
      send(lead);
    });
  });

  // Az „Ajánlatot kérek” gombok a legközelebbi űrlaphoz visznek, az aktuális kérdésre
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-lead-cta]');
    if (!link || !leads.length) return;
    const lead = leads.reduce((best, cur) =>
      Math.abs(cur.form.getBoundingClientRect().top) < Math.abs(best.form.getBoundingClientRect().top) ? cur : best,
    );
    e.preventDefault();
    lead.form.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    focusField(lead, lead.names[shared.step][0], { preventScroll: true });
    const section = lead.form.closest('section');
    try {
      if (section && location.hash !== `#${section.id}`) history.pushState(null, '', `#${section.id}`);
    } catch {
      /* beágyazott vagy korlátozott környezetben az URL frissítése elhagyható */
    }
  });

  /* ---------------------------------------------------------------------
     Finom megjelenés görgetéskor
     --------------------------------------------------------------------- */
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const items = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
    );
    // A listák elemei sorban, kis késleltetéssel jelennek meg
    document.querySelectorAll('[data-stagger]').forEach((list) => {
      [...list.children].forEach((child, i) => child.style.setProperty('--i', String(i)));
    });
    items.forEach((el) => {
      // Ami már látszik betöltéskor, azt nem rejtjük el
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-visible');
      else io.observe(el);
    });
    root.classList.add('reveal-ready');
  }

  /* ---------------------------------------------------------------------
     Görgetéskövetés: fejléccsík, aktív menüpont, idővonalak
     --------------------------------------------------------------------- */
  const progressBar = document.querySelector('.scroll-progress__bar');
  const navLinks = [...document.querySelectorAll('.site-nav__list a[href^="#"]')];
  const spySections = navLinks
    .map((a) => ({ link: a, section: document.getElementById(a.getAttribute('href').slice(1)) }))
    .filter((x) => x.section);
  const headerEl = document.querySelector('.site-header');

  const timelines = [...document.querySelectorAll('[data-timeline]')].map((wrap) => ({
    wrap,
    track: wrap.querySelector('.timeline__track'),
    items: [...wrap.querySelectorAll('.timeline__item')],
    nums: [...wrap.querySelectorAll('.timeline__num')],
    vertical: false,
    centers: [],
  }));

  // A vezetéket a lépésszámok középpontjai közé illesztjük (elrendezésfüggő)
  const layoutTimelines = () => {
    timelines.forEach((t) => {
      if (!t.track || t.nums.length < 2) return;
      const base = t.wrap.getBoundingClientRect();
      t.centers = t.nums.map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top };
      });
      const first = t.centers[0];
      const last = t.centers[t.centers.length - 1];
      t.vertical = Math.abs(last.y - first.y) > Math.abs(last.x - first.x);
      Object.assign(t.track.style, t.vertical
        ? { left: `${first.x - 1}px`, top: `${first.y}px`, width: '2px', height: `${last.y - first.y}px` }
        : { left: `${first.x}px`, top: `${first.y - 1}px`, width: `${last.x - first.x}px`, height: '2px' });
      t.track.classList.toggle('is-vertical', t.vertical);
      t.track.classList.add('is-ready');
    });
  };

  const updateTimelines = () => {
    const vh = window.innerHeight;
    timelines.forEach((t) => {
      if (!t.centers.length) return;
      let p;
      if (reduceMotion.matches) {
        p = 1;
      } else if (t.vertical) {
        // Függőleges: a vezeték a képernyő kb. 60%-áig töltődik
        const top = t.wrap.getBoundingClientRect().top;
        const first = t.centers[0].y;
        const span = t.centers[t.centers.length - 1].y - first;
        p = (vh * 0.6 - (top + first)) / span;
      } else {
        // Vízszintes: a képernyő alsó negyedétől a közepéig töltődik fel
        const top = t.wrap.getBoundingClientRect().top + t.centers[0].y;
        p = (vh * 0.85 - top) / (vh * 0.4);
      }
      p = Math.min(1, Math.max(0, p));
      t.track.style.setProperty('--p', p.toFixed(4));
      t.track.style.setProperty('--spark', p > 0 && p < 1 ? '1' : '0');
      const n = t.items.length;
      t.items.forEach((item, i) => item.classList.toggle('is-on', p > 0 && p >= i / (n - 1) - 0.001));
    });
  };

  const updateSpy = () => {
    const line = (headerEl ? headerEl.getBoundingClientRect().bottom : 0) + window.innerHeight * 0.3;
    let current = null;
    spySections.forEach((x) => {
      if (x.section.getBoundingClientRect().top <= line) current = x;
    });
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom && spySections.length) current = spySections[spySections.length - 1];
    spySections.forEach((x) => {
      if (x === current) x.link.setAttribute('aria-current', 'true');
      else x.link.removeAttribute('aria-current');
    });
  };

  const updateProgress = () => {
    if (!progressBar) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressBar.style.setProperty('--scroll', p.toFixed(4));
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateProgress();
      updateSpy();
      updateTimelines();
    });
  };
  const onResize = () => {
    layoutTimelines();
    onScroll();
  };

  layoutTimelines();
  updateProgress();
  updateSpy();
  updateTimelines();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('load', onResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(onResize);
    timelines.forEach((t) => ro.observe(t.wrap));
  }
  reduceMotion.addEventListener?.('change', onScroll);

  /* ---------------------------------------------------------------------
     Sötét felületek: az egérmutatót követő fény (csak egérrel, mozgással)
     A fény külön rétegen van, és csak ennek a változóit írjuk (@property,
     nem öröklődő), így egérmozdulatonként nem számolódik újra a szekció.
     --------------------------------------------------------------------- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion.matches) {
    document.querySelectorAll('.hero, .pv, .contact').forEach((el) => {
      const glow = document.createElement('span');
      glow.className = 'spotlight';
      glow.setAttribute('aria-hidden', 'true');
      el.prepend(glow);
      let frame = 0;
      let x = 0;
      let y = 0;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        x = e.clientX - r.left;
        y = e.clientY - r.top;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          glow.style.setProperty('--mx', `${Math.round(x)}px`);
          glow.style.setProperty('--my', `${Math.round(y)}px`);
          glow.style.setProperty('--spot', '1');
        });
      });
      el.addEventListener('pointerleave', () => glow.style.setProperty('--spot', '0'));
    });
  }

  /* ---------------------------------------------------------------------
     Köszönőoldal: a választott szolgáltatáshoz illő tanács
     --------------------------------------------------------------------- */
  const tips = document.querySelectorAll('[data-tip]');
  if (tips.length) {
    const chosen = new URLSearchParams(location.search).get('szolgaltatas');
    const SERVICES = ['erintesvedelem', 'napelem', 'mindketto'];
    const show = chosen === 'mindketto' ? ['erintesvedelem', 'napelem'] : [chosen];
    if (SERVICES.includes(chosen)) {
      tips.forEach((t) => { t.hidden = !show.includes(t.dataset.tip); });
    }
  }

  /* ---------------------------------------------------------------------
     Sütisáv és Meta Pixel
     A Pixel ID a <html data-meta-pixel> attribútumban van. Üresen nincs se
     Pixel, se sütisáv. Kitöltve a Pixel CSAK „Elfogadom” után töltődik be;
     a döntést 180 napig őrizzük, a láblécben bármikor módosítható.
     --------------------------------------------------------------------- */
  const PIXEL_ID = (root.dataset.metaPixel || '').trim();
  const CONSENT_KEY = 'villkiv-suti';
  const CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000;

  // A köszönőoldalon a konverzió jelzését azonnal felhasználjuk, hogy frissítéskor ne számoljon újra
  let leadPending = false;
  if (document.body.classList.contains('page-thanks')) {
    try {
      leadPending = sessionStorage.getItem(LEAD_KEY) === '1';
      sessionStorage.removeItem(LEAD_KEY);
    } catch { /* tárolás nélkül nincs konverzió */ }
  }

  const readConsent = () => {
    try {
      const c = JSON.parse(localStorage.getItem(CONSENT_KEY));
      if (c && c.v === 1 && Date.now() - c.t < CONSENT_MAX_AGE) return c.marketing ? 'granted' : 'denied';
    } catch { /* nincs vagy sérült: újra megkérdezzük */ }
    return null;
  };
  const saveConsent = (marketing) => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: 1, marketing, t: Date.now() }));
    } catch { /* tárolás nélkül a következő oldalon újra kérdezünk */ }
  };

  const loadPixel = () => {
    if (!/^\d{6,20}$/.test(PIXEL_ID) || window.fbq) return;
    // A Meta hivatalos betöltőkódja, olvashatóan
    const fbq = function () {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      else fbq.queue.push(arguments);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.append(script);
    // Automatikus eseményfelismerés ki: csak az általunk küldött eseményeket mérjük
    fbq('set', 'autoConfig', false, PIXEL_ID);
    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');
    if (leadPending) fbq('track', 'Lead');
  };

  // Visszavonáskor a Meta első féltől származó sütijeit is töröljük (minden domainszinten)
  const clearPixelCookies = () => {
    const parts = location.hostname.split('.');
    const domains = [''];
    for (let i = 0; i < parts.length - 1; i++) domains.push(`; domain=.${parts.slice(i).join('.')}`);
    ['_fbp', '_fbc'].forEach((name) => {
      domains.forEach((d) => { document.cookie = `${name}=; Max-Age=0; path=/${d}`; });
    });
  };

  if (PIXEL_ID) {
    let banner = null;
    let opener = null;

    const closeBanner = () => {
      if (!banner) return;
      const hadFocus = banner.contains(document.activeElement);
      banner.hidden = true;
      if (hadFocus && opener) opener.focus();
      opener = null;
    };

    const decide = (marketing) => {
      const before = readConsent();
      saveConsent(marketing);
      closeBanner();
      if (marketing) loadPixel();
      else if (before === 'granted' || window.fbq) {
        // A már betöltött Pixelt csak újratöltéssel lehet leállítani
        clearPixelCookies();
        location.reload();
      }
    };

    const buildBanner = () => {
      banner = document.createElement('aside');
      banner.className = 'consent';
      banner.setAttribute('aria-labelledby', 'suti-cim');
      banner.innerHTML = `
        <div class="consent__inner">
          <div class="consent__text">
            <p class="consent__title" id="suti-cim">Sütik</p>
            <p>A hirdetéseink méréséhez a Meta Pixelt használnánk, ami sütiket helyez el. Csak akkor kapcsoljuk be, ha elfogadod – az oldal nélküle is teljesen működik. <a href="cookie.html">Részletek</a></p>
          </div>
          <div class="consent__actions">
            <button class="consent__btn" type="button" data-consent="deny">Elutasítom</button>
            <button class="consent__btn" type="button" data-consent="grant">Elfogadom</button>
          </div>
        </div>`;
      banner.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-consent]');
        if (btn) decide(btn.dataset.consent === 'grant');
      });
      document.body.append(banner);
    };

    const openBanner = (from) => {
      if (!banner) buildBanner();
      opener = from || null;
      banner.hidden = false;
      if (from) banner.querySelector('[data-consent]').focus();
    };

    document.querySelectorAll('[data-consent-only]').forEach((el) => { el.hidden = false; });
    document.querySelectorAll('[data-consent-open]').forEach((btn) => {
      btn.addEventListener('click', () => openBanner(btn));
    });

    const consent = readConsent();
    if (consent === 'granted') loadPixel();
    else if (consent === null) openBanner();
  }

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
