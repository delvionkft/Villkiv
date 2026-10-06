(() => {
  'use strict';

  const root = document.documentElement;
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
    const radio = form.querySelector(`input[name="szolgaltatas"][value="${value}"]`);
    if (!radio) return null;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    return radio;
  };

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-service]');
    if (!link || !contact) return;
    const radio = selectService(link.dataset.service);
    if (!radio) return;
    e.preventDefault();
    contact.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    radio.focus({ preventScroll: true });
    if (location.hash !== '#kapcsolat') history.pushState(null, '', '#kapcsolat');
  });

  const preset = new URLSearchParams(location.search).get('szolgaltatas');
  if (preset) selectService(preset);

  /* ---------------------------------------------------------------------
     Űrlap: ellenőrzés és beküldés
     --------------------------------------------------------------------- */
  if (form) {
    const done = document.getElementById('urlap-kesz');
    const summary = document.getElementById('urlap-hibak');
    const status = form.querySelector('.form__status');
    const submit = form.querySelector('.form__submit');
    const submitLabel = form.querySelector('.form__submit-label');
    const serviceSet = document.getElementById('szolgaltatas-mezo');
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
      uzenet: (v) => (v.length <= MESSAGE_MAX ? '' : `Az üzenet legfeljebb ${MESSAGE_MAX} karakter lehet.`),
    };

    const LABELS = {
      szolgaltatas: 'Szolgáltatás',
      nev: 'Név',
      telefon: 'Telefonszám',
      email: 'E-mail-cím',
      telepules: 'Ingatlan települése',
      uzenet: 'Rövid üzenet',
    };

    const touched = new Set();

    const showError = (name, message) => {
      const errorEl = document.getElementById(`${name}-hiba`);
      if (errorEl) errorEl.textContent = message;
      if (name === 'szolgaltatas') {
        serviceSet.classList.toggle('is-invalid', Boolean(message));
        form.querySelectorAll('input[name="szolgaltatas"]').forEach((r) => {
          if (message) r.setAttribute('aria-invalid', 'true');
          else r.removeAttribute('aria-invalid');
        });
      } else {
        const input = form.elements[name];
        if (message) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      }
    };

    const validateField = (name) => {
      const input = form.elements[name];
      const value = name === 'szolgaltatas' ? '' : input.value;
      const message = rules[name](value);
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
          a.href = name === 'szolgaltatas' ? '#szolgaltatas-mezo' : `#${name}`;
          a.textContent = `${LABELS[name]}: ${message}`;
          a.addEventListener('click', (e) => {
            e.preventDefault();
            const target =
              name === 'szolgaltatas'
                ? form.querySelector('input[name="szolgaltatas"]')
                : form.elements[name];
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
      const name = e.target.name;
      if (!rules[name] || name === 'szolgaltatas') return;
      if (e.target.value !== '' || touched.has(name)) {
        touched.add(name);
        validateField(name);
      }
    });
    form.addEventListener('input', (e) => {
      const name = e.target.name;
      if (name === 'uzenet') updateCount();
      if (touched.has(name)) validateField(name);
      if (!summary.hidden) renderSummary(validateAllSilently());
    });
    form.addEventListener('change', (e) => {
      if (e.target.name === 'szolgaltatas') {
        validateField('szolgaltatas');
        if (!summary.hidden) renderSummary(validateAllSilently());
      }
    });

    // A hibalistát frissíti, de a mezők hibajelzését csak a már érintett mezőknél mutatja
    function validateAllSilently() {
      return Object.keys(rules)
        .map((name) => {
          const value = name === 'szolgaltatas' ? '' : form.elements[name].value;
          return { name, message: rules[name](value) };
        })
        .filter((r) => r.message);
    }

    const counter = form.querySelector('[data-count-for="uzenet"]');
    function updateCount() {
      if (counter) counter.textContent = `${form.elements.uzenet.value.length} / ${MESSAGE_MAX}`;
    }
    updateCount();

    const endpoint = () => {
      const action = (form.getAttribute('action') || '').trim();
      return /^(https?:\/\/|\/)/.test(action) ? action : '';
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

      const url = endpoint();
      if (!url) {
        showFailure('Az űrlap még nincs bekötve, ezért most nem tud üzenetet továbbítani.');
        return;
      }

      // A _gotcha spamcsapda mezőt a szerveroldal értékeli ki (pl. Formspree).

      setSending(true);
      status.className = 'form__status is-sending';
      status.textContent = 'Küldés folyamatban…';

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const data = new FormData(form);
        ['nev', 'telefon', 'email', 'telepules', 'uzenet'].forEach((k) => data.set(k, String(data.get(k) || '').trim()));
        const response = await fetch(url, {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        // Csak igazolt továbbítás után jelzünk sikert
        form.hidden = true;
        status.textContent = '';
        done.hidden = false;
        done.focus();
        done.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
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
        setSending(false);
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
    items.forEach((el) => {
      // Ami már látszik betöltéskor, azt nem rejtjük el
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-visible');
      else io.observe(el);
    });
    root.classList.add('reveal-ready');
  }

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
