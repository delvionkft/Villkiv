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
     Szolgáltatás előválasztása a CTA-gombokról (és ?szolgaltatas= paraméterből)
     --------------------------------------------------------------------- */
  const form = document.getElementById('ajanlat-urlap');
  const contact = document.getElementById('kapcsolat');
  const SERVICES = ['erintesvedelem', 'napelem', 'mindketto'];

  const selectService = (value) => {
    if (!form || !SERVICES.includes(value)) return null;
    const radio = form.querySelector(`input[type="radio"][name="szolgaltatas"][value="${value}"]`);
    if (!radio) return null;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    return radio;
  };

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-service]');
    if (!link || !contact || !form) return;
    // Több szolgáltatásnál a megfelelő választógombot jelöljük ki; egyetlen
    // szolgáltatásnál (rejtett mező) az első kitöltendő mezőre visszük a fókuszt.
    const target = selectService(link.dataset.service) || form.querySelector('input:not([type="hidden"]):not([tabindex="-1"])');
    if (!target) return;
    e.preventDefault();
    contact.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    target.focus({ preventScroll: true });
    try {
      if (location.hash !== '#kapcsolat') history.pushState(null, '', '#kapcsolat');
    } catch {
      /* beágyazott vagy korlátozott környezetben az URL frissítése elhagyható */
    }
  });

  const preset = new URLSearchParams(location.search).get('szolgaltatas');
  if (preset) selectService(preset);

  /* ---------------------------------------------------------------------
     Űrlap: ellenőrzés és beküldés
     --------------------------------------------------------------------- */
  if (form) {
    const summary = document.getElementById('urlap-hibak');
    const status = form.querySelector('.form__status');
    const submit = form.querySelector('.form__submit');
    const submitLabel = form.querySelector('.form__submit-label');
    const serviceSet = document.getElementById('szolgaltatas-mezo');
    const pointsSet = document.getElementById('pontok-mezo');
    const pointInputs = pointsSet ? [...pointsSet.querySelectorAll('input')] : [];
    const POINT_NAMES = pointInputs.map((i) => i.name);
    const pointInvalid = (i) => i.validity.badInput || (i.value !== '' && !/^\d{1,3}$/.test(i.value.trim())) ||
      (i.value !== '' && Number(i.value) > Number(i.max));

    // A mérési pontok csak érintésvédelemnél kellenek; elrejtve nem is küldjük el őket
    const syncPoints = () => {
      if (!pointsSet) return;
      const v = form.querySelector('input[name="szolgaltatas"]:checked')?.value;
      const show = v === 'erintesvedelem' || v === 'mindketto';
      pointsSet.hidden = !show;
      pointInputs.forEach((i) => { i.disabled = !show; });
    };
    const MESSAGE_MIN = 10;
    const MESSAGE_MAX = 1000;
    const TIMEOUT_MS = 15000;

    const clean = (v) => v.replace(/\s+/g, ' ').trim();
    const phoneDigits = (v) => v.replace(/[\s\-()./]/g, '');

    const rules = {
      szolgaltatas: () =>
        form.querySelector('input[name="szolgaltatas"]:checked') ? '' : 'Válaszd ki, melyik szolgáltatás érdekel.',
      nev: (v) => (clean(v).length >= 2 ? '' : 'Add meg a neved.'),
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
      telepules: (v) => (clean(v).length >= 2 ? '' : 'Add meg, melyik településen van az ingatlan.'),
      fogyasztas: (v) =>
        clean(v).length >= 2 ? '' : 'Add meg az éves fogyasztást vagy a havi villanyszámlát – ha nem tudod pontosan, egy becslés is elég.',
      uzenet: (v) => {
        if (!clean(v)) return 'Írj pár szót a tetőről vagy az elképzelésedről.';
        if (clean(v).length < MESSAGE_MIN) return `Írj legalább ${MESSAGE_MIN} karaktert – például a tető típusát vagy tájolását.`;
        return v.length <= MESSAGE_MAX ? '' : `Az üzenet legfeljebb ${MESSAGE_MAX} karakter lehet.`;
      },
      pontok: () =>
        !pointsSet || pointsSet.hidden || !pointInputs.some(pointInvalid)
          ? ''
          : 'A darabszámot egész számmal add meg (dugalj, lámpa, kapcsoló: 0–999, elosztó: 0–99).',
      adatkezeles: () =>
        form.elements.adatkezeles.checked ? '' : 'Jelöld be, hogy elolvastad az adatkezelési tájékoztatót.',
    };
    if (!form.elements.adatkezeles) delete rules.adatkezeles;
    // Egyszolgáltatásos oldalon (rejtett szolgaltatas mező) nincs mit választani
    if (!form.querySelector('input[type="radio"][name="szolgaltatas"]')) delete rules.szolgaltatas;

    const valueOf = (name) => (name === 'szolgaltatas' || name === 'pontok' ? '' : form.elements[name].value);

    const LABELS = {
      szolgaltatas: 'Szolgáltatás',
      nev: 'Név',
      telefon: 'Telefonszám',
      email: 'E-mail-cím',
      telepules: 'Ingatlan települése',
      fogyasztas: 'Éves fogyasztás vagy havi villanyszámla',
      uzenet: 'Rövid üzenet',
      pontok: 'Mérési pontok',
      adatkezeles: 'Adatkezelési tájékoztató',
    };

    const touched = new Set();

    const showError = (name, message) => {
      const errorEl = document.getElementById(`${name}-hiba`);
      if (errorEl) errorEl.textContent = message;
      if (name === 'szolgaltatas') {
        serviceSet?.classList.toggle('is-invalid', Boolean(message));
        form.querySelectorAll('input[name="szolgaltatas"]').forEach((r) => {
          if (message) r.setAttribute('aria-invalid', 'true');
          else r.removeAttribute('aria-invalid');
        });
      } else if (name === 'pontok') {
        pointInputs.forEach((i) => {
          if (message && pointInvalid(i)) i.setAttribute('aria-invalid', 'true');
          else i.removeAttribute('aria-invalid');
        });
      } else {
        const input = form.elements[name];
        if (message) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      }
    };

    const validateField = (name) => {
      const message = rules[name](valueOf(name));
      showError(name, message);
      return message;
    };

    const validateAll = () =>
      Object.keys(rules)
        .map((name) => ({ name, message: validateField(name) }))
        .filter((r) => r.message);

    const renderSummary = (errors) => {
      const list = summary.querySelector('ul');
      list.replaceChildren(
        ...errors.map(({ name, message }) => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          const first = name === 'pontok' ? pointInputs.find(pointInvalid) || pointInputs[0] : null;
          a.href = name === 'szolgaltatas' ? '#szolgaltatas-mezo' : first ? `#${first.id}` : `#${name}`;
          a.textContent = `${LABELS[name]}: ${message}`;
          a.addEventListener('click', (e) => {
            e.preventDefault();
            const target =
              name === 'szolgaltatas'
                ? form.querySelector('input[name="szolgaltatas"]')
                : first || form.elements[name];
            target.focus();
          });
          li.append(a);
          return li;
        }),
      );
      summary.hidden = errors.length === 0;
    };

    // Élő ellenőrzés: csak az után jelez, hogy a mezőt egyszer már elhagyták
    form.addEventListener('focusout', (e) => {
      const name = POINT_NAMES.includes(e.target.name) ? 'pontok' : e.target.name;
      if (!rules[name] || name === 'szolgaltatas') return;
      // A jelölőnégyzetet csak beküldési kísérlet után jelezzük hibásnak, puszta átlépéskor nem
      if (e.target.type === 'checkbox' && !touched.has(name)) return;
      if (e.target.value !== '' || e.target.validity?.badInput || touched.has(name)) {
        touched.add(name);
        validateField(name);
      }
    });
    form.addEventListener('input', (e) => {
      const name = POINT_NAMES.includes(e.target.name) ? 'pontok' : e.target.name;
      if (name === 'uzenet') updateCount();
      if (touched.has(name)) validateField(name);
      if (!summary.hidden) renderSummary(validateAllSilently());
    });
    form.addEventListener('change', (e) => {
      if (e.target.name === 'szolgaltatas' && rules.szolgaltatas) {
        syncPoints();
        validateField('szolgaltatas');
        if (touched.has('pontok')) validateField('pontok');
        if (!summary.hidden) renderSummary(validateAllSilently());
      }
    });

    // A hibalistát frissíti, de a mezők hibajelzését csak a már érintett mezőknél mutatja
    function validateAllSilently() {
      return Object.keys(rules)
        .map((name) => {
          return { name, message: rules[name](valueOf(name)) };
        })
        .filter((r) => r.message);
    }

    syncPoints();

    const counter = form.querySelector('[data-count-for="uzenet"]');
    function updateCount() {
      if (counter) counter.textContent = `${form.elements.uzenet.value.length} / ${MESSAGE_MAX}`;
    }
    updateCount();

    // Végpont:
    // 1) EmailJS – ha a <form> data-emailjs-* attribútumai ki vannak töltve
    //    (public key, service ID, template ID; ezek nyilvánosak, nem titkosak);
    // 2) az action attribútumban megadott teljes https:// URL (pl. Formspree).
    // Egyik sincs → az űrlap hibát jelez, és sosem mutat hamis sikert.
    const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';
    const endpoint = () => {
      const { emailjsPublicKey: key, emailjsService: service, emailjsTemplate: template } = form.dataset;
      if (key && service && template) return { url: EMAILJS_URL, emailjs: { key, service, template } };
      const action = (form.getAttribute('action') || '').trim();
      if (/^https?:\/\//.test(action)) return { url: action };
      return null;
    };

    const setSending = (sending) => {
      submit.disabled = sending;
      submitLabel.textContent = sending ? 'Küldés folyamatban…' : 'Ajánlatot kérek';
      form.setAttribute('aria-busy', String(sending));
    };

    const showFailure = (detail) => {
      status.className = 'form__status is-error';
      status.replaceChildren();
      const strong = document.createElement('strong');
      strong.textContent = 'Az ajánlatkérést nem sikerült elküldeni.';
      const p = document.createElement('span');
      p.textContent = `${detail} A beírt adataid megmaradtak, így újra megpróbálhatod, vagy keress minket közvetlenül a fenti elérhetőségeken.`;
      status.append(strong, p);
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.getAttribute('aria-busy') === 'true') return;

      Object.keys(rules).forEach((n) => touched.add(n));
      const errors = validateAll();
      renderSummary(errors);
      if (errors.length) {
        status.textContent = '';
        status.className = 'form__status';
        summary.focus();
        return;
      }

      const target = endpoint();
      if (!target) {
        showFailure('Az űrlap még nincs bekötve, ezért most nem tud üzenetet továbbítani.');
        return;
      }

      // Spamcsapda: valódi látogató nem tölti ki. Ilyenkor nem küldünk, és sikert sem jelzünk.
      if (form.elements._gotcha && form.elements._gotcha.value) {
        showFailure('Az üzenetet a rendszer automatikusnak ítélte.');
        return;
      }

      setSending(true);
      status.className = 'form__status is-sending';
      status.textContent = 'Küldés folyamatban…';

      let succeeded = false;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const data = new FormData(form);
        ['nev', 'telefon', 'email', 'telepules', 'uzenet', 'fogyasztas'].forEach((k) => {
          if (data.has(k)) data.set(k, String(data.get(k)).trim());
        });
        let request;
        if (target.emailjs) {
          // Az EmailJS-sablon változói: a mezők nevei + oldal (honnan jött) + reply_to
          const params = {};
          data.forEach((value, key) => {
            if (!key.startsWith('_')) params[key] = String(value);
          });
          params.oldal = location.href.split('#')[0];
          params.reply_to = params.email || '';
          request = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service_id: target.emailjs.service,
              template_id: target.emailjs.template,
              user_id: target.emailjs.key,
              template_params: params,
            }),
          };
        } else {
          request = { method: 'POST', body: data, headers: { Accept: 'application/json' } };
        }
        const response = await fetch(target.url, { ...request, signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        // Csak igazolt továbbítás után irányítunk a köszönőoldalra
        succeeded = true;
        status.textContent = 'Elküldve, átirányítás…';
        const service =
          form.querySelector('input[name="szolgaltatas"]:checked')?.value ||
          form.querySelector('input[type="hidden"][name="szolgaltatas"]')?.value ||
          '';
        const next = form.dataset.success || 'koszonjuk.html';
        // A köszönőoldal csak ezzel a jelzéssel számol konverziót (közvetlen megnyitásnál nem)
        try { sessionStorage.setItem(LEAD_KEY, '1'); } catch { /* privát mód: konverzió nélkül */ }
        location.assign(service ? `${next}?szolgaltatas=${encodeURIComponent(service)}` : next);
      } catch (err) {
        const timedOut = err && err.name === 'AbortError';
        showFailure(
          timedOut
            ? 'A szerver nem válaszolt időben.'
            : navigator.onLine === false
              ? 'Úgy tűnik, nincs internetkapcsolat.'
              : 'Hiba történt a továbbítás közben.',
        );
      } finally {
        clearTimeout(timer);
        if (!succeeded) setSending(false);
      }
    });
  }

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
