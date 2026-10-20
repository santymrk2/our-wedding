// Santy & Caro — page logic: hero garden, living illustrations, countdown, RSVP, gifts, sticky RSVP button.
(function () {
  // ---------- config ----------
  // Where RSVP answers are POSTed as JSON (e.g. a Google Apps Script web app or Formspree URL).
  // Empty = answers stay in the browser only, as in the design.
  const RSVP_ENDPOINT = '';

  const HERO_TEXT = 'Santy & Caro';
  const MOBILE_BP = 720;
  const GARDEN = {
    colors: {
      text: '#2F5EA8', stem: '#2F5EA8', leaf: '#8FAE7E', vein: '#F2EFE3', wing: '#9DB8DE', spot: '#F4B9C0',
      roses: [['#F4B9C0', '#C95A6B'], ['#F2A07B', '#B9532F'], ['#9DB8DE', '#2F5EA8'], ['#F3D27A', '#B58A1E'], ['#F7D7C4', '#C9603F']]
    },
    density: 0.8, roseAmt: 0.45, roseSize: 0.75
  };

  const T0 = new Date('2027-02-08T17:00:00-03:00').getTime();
  const DAY0 = new Date('2027-02-08T00:00:00-03:00').getTime();
  const END = new Date('2027-02-09T02:00:00-03:00').getTime();
  const SCHED = [['17:00', 'la recepción'], ['17:30', 'la ceremonia'], ['19:00', 'el primer especial'], ['20:00', 'la cena'], ['21:00', 'el segundo especial']];

  const $ = id => document.getElementById(id);
  const isMobile = () => window.innerWidth < MOBILE_BP;

  // ---------- illustration placeholders ----------
  const PH_ICON = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
  document.querySelectorAll('.ilus').forEach(el => {
    if (el.querySelector('img')) return;
    el.classList.add('ilus--empty');
    const cap = document.createElement('span');
    cap.textContent = el.dataset.placeholder || '';
    el.innerHTML = PH_ICON;
    el.appendChild(cap);
  });

  // ---------- hero: Type Garden ----------
  // On narrow screens the names go on three lines: Santy / & / Caro.
  const heroText = () => (!isMobile() || !HERO_TEXT.includes(' & ')) ? HERO_TEXT : HERO_TEXT.replace(' & ', '\n&\n');
  const garden = window.TypeGarden.mount($('garden'), GARDEN);
  garden.play(heroText());
  $('replay').addEventListener('click', () => garden.play(heroText(), { delay: 200 }));
  // Re-write the names when crossing the breakpoint (e.g. rotating the phone).
  let wasMobile = isMobile(), rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (isMobile() !== wasMobile) { wasMobile = isMobile(); garden.play(heroText(), { delay: 200 }); } }, 250);
  });

  // ---------- living illustrations ----------
  window.Alive.mount(document, { on: true, boil: true });

  // ---------- countdown ----------
  // ?cd=antes|hoy|fiesta|despues previews each phase without waiting for the date.
  const preview = new URLSearchParams(location.search).get('cd');
  const nowFor = real => preview === 'hoy' ? DAY0 + 10.2 * 36e5 : preview === 'fiesta' ? T0 + 3.4 * 36e5 : preview === 'despues' ? END + 864e5 : preview === 'antes' ? T0 - 40 * 864e5 : real;
  function countdown() {
    const now = nowFor(Date.now()), diff = Math.max(0, T0 - now);
    let title = '', note = '', units;
    if (now < DAY0) units = [[Math.floor(diff / 864e5), 'días'], [Math.floor(diff / 36e5) % 24, 'horas'], [Math.floor(diff / 6e4) % 60, 'min']];
    else if (now < T0) { title = '¡Es hoy!'; note = 'Nos vemos a las 17 hs en El Dorado.'; units = [[Math.floor(diff / 36e5), 'horas'], [Math.floor(diff / 6e4) % 60, 'min']]; }
    else if (now < END) {
      const art = new Date(now - 3 * 36e5), hm = art.getUTCHours() * 60 + art.getUTCMinutes();
      let cur = SCHED[0];
      SCHED.forEach(x => { const [hh, mm] = x[0].split(':').map(Number); if (hm >= hh * 60 + mm || hm < 300) cur = x; });
      title = '¡Está pasando!'; note = 'Ahora: ' + cur[1] + ' (desde las ' + cur[0] + ').'; units = [];
    } else { title = 'Gracias por haber sido parte ✿'; note = 'Santy & Caro · 08.02.2027'; units = []; }
    $('cd-title').textContent = title; $('cd-title').hidden = !title;
    $('cd-note').textContent = note; $('cd-note').hidden = !note;
    $('cd-units').innerHTML = units.map(([v, l]) => `<div class="countdown__unit"><span class="countdown__v">${v}</span><span class="countdown__l">${l}</span></div>`).join('');
  }
  countdown();
  setInterval(countdown, 30000);

  // ---------- RSVP ----------
  const form = $('rsvp-form'), nameIn = $('rsvp-name'), submitBtn = $('rsvp-submit');
  let att = null, submitted = false;
  const canSubmit = () => nameIn.value.trim() && att;
  const sync = () => {
    document.querySelectorAll('.rsvp__opt').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.att === att)));
    $('rsvp-extra').hidden = att !== 'yes';
    submitBtn.disabled = !canSubmit();
    form.hidden = submitted; $('rsvp-done').hidden = !submitted;
    syncFab();
  };
  nameIn.addEventListener('input', sync);
  document.querySelectorAll('.rsvp__opt').forEach(b => b.addEventListener('click', () => { att = b.dataset.att; sync(); }));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!canSubmit()) return;
    const data = { name: nameIn.value.trim(), attending: att === 'yes', diet: att === 'yes' ? form.diet.value.trim() : '', song: att === 'yes' ? form.song.value.trim() : '', sentAt: new Date().toISOString() };
    $('rsvp-error').hidden = true;
    if (RSVP_ENDPOINT) {
      submitBtn.disabled = true;
      try {
        // text/plain keeps it a "simple" request, so endpoints like Apps Script accept it without CORS preflight.
        const r = await fetch(RSVP_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error(r.status);
      } catch (err) { $('rsvp-error').hidden = false; sync(); return; }
    }
    const yes = att === 'yes', first = data.name.split(' ')[0];
    $('rsvp-stamp').textContent = yes ? '¡sí!' : 'otra vez';
    $('rsvp-stamp').classList.toggle('rsvp__stamp--no', !yes);
    $('rsvp-done-title').textContent = yes ? `¡Qué alegría, ${first}!` : `Te vamos a extrañar, ${first}`;
    $('rsvp-done-text').textContent = yes ? 'Te esperamos el 8 de febrero en el Teatro El Dorado, desde las 17 hs.' : 'Gracias por avisarnos. Vamos a brindar por vos.';
    submitted = true; sync();
  });
  $('rsvp-reset').addEventListener('click', () => { submitted = false; sync(); });

  // ---------- gifts ----------
  $('bank-toggle').addEventListener('click', e => {
    const open = $('bank').hidden;
    $('bank').hidden = !open;
    e.currentTarget.setAttribute('aria-expanded', String(open));
    e.currentTarget.textContent = open ? 'Ocultar datos' : 'Ver datos bancarios';
  });

  // ---------- sticky RSVP button ----------
  // Shows after scrolling past most of the first screen; hides while the RSVP card is visible or once answered.
  function syncFab() {
    const r = $('confirmar').getBoundingClientRect();
    const inRsvp = r.top < window.innerHeight && r.bottom > 0;
    $('fab').hidden = submitted || inRsvp || window.scrollY <= window.innerHeight * 0.7;
  }
  window.addEventListener('scroll', syncFab, { passive: true });
  window.addEventListener('resize', syncFab);
  sync();
})();
