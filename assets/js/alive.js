// Alive: gives illustrations the same "living" feel as the hero garden — idle sway, hand-drawn line boil, lean toward the pointer, springy wobble on tap.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  function filters() {
    if (document.getElementById('alive-boil-0')) return;
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.setAttribute('aria-hidden', 'true');
    s.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    s.innerHTML = [0, 1, 2].map(i => `<filter id="alive-boil-${i}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="${i * 7 + 3}"/><feDisplacementMap in="SourceGraphic" scale="3.2" xChannelSelector="R" yChannelSelector="G"/></filter>`).join('');
    document.body.appendChild(s);
  }
  class Alive {
    constructor(root, o) {
      this.root = root || document; this.on = true; this.boil = true; this.set(o || {});
      this.items = new Map(); this.mx = null; this.my = null; this.fi = 0; this.lastBoil = 0;
      this.reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      filters();
      this.io = window.IntersectionObserver ? new IntersectionObserver(es => es.forEach(e => { const it = this.items.get(e.target); if (it) it.vis = e.isIntersecting; }), { rootMargin: '80px' }) : null;
      this.onMove = e => { if (e.pointerType === 'mouse') { this.mx = e.clientX; this.my = e.clientY; } };
      this.onOut = e => { if (!e.relatedTarget) this.mx = null; };
      this.onDown = e => {
        for (const [el, it] of this.items) if (el.contains(e.target)) { it.v += (Math.random() < 0.5 ? -1 : 1) * 9 * it.amt; it.sv -= 0.06; }
        if (e.pointerType !== 'mouse') { this.mx = e.clientX; this.my = e.clientY; clearTimeout(this.tt); this.tt = setTimeout(() => { this.mx = null; }, 900); }
      };
      window.addEventListener('pointermove', this.onMove, { passive: true });
      document.addEventListener('pointerout', this.onOut);
      window.addEventListener('pointerdown', this.onDown, { passive: true });
      this.scan(); this.si = setInterval(() => this.scan(), 1000);
      const loop = () => { this.raf = requestAnimationFrame(loop); this.frame(); };
      loop();
    }
    set(o) { if (o.on != null) this.on = o.on; if (o.boil != null) this.boil = o.boil; this.dirty = true; }
    scan() {
      this.root.querySelectorAll('[data-alive]').forEach((el, i) => {
        if (this.items.has(el)) return;
        el.style.transformOrigin = '50% 100%'; el.style.willChange = 'transform';
        this.items.set(el, { amt: parseFloat(el.dataset.alive) || 1, ph: (this.items.size * 2.399) % 6.28, a: 0, v: 0, s: 1, sv: 0, lift: 0, vis: true });
        this.io && this.io.observe(el);
      });
      for (const el of this.items.keys()) if (!el.isConnected) { this.io && this.io.unobserve(el); this.items.delete(el); }
    }
    frame() {
      const now = performance.now(), t = now / 1000;
      if (this.reduced || !this.on) {
        if (this.dirty) { for (const el of this.items.keys()) { el.style.transform = ''; el.style.filter = ''; } this.dirty = false; }
        return;
      }
      this.dirty = true;
      const boilStep = this.boil && now - this.lastBoil > 130;
      if (boilStep) { this.lastBoil = now; this.fi = (this.fi + 1) % 3; }
      for (const [el, it] of this.items) {
        if (!it.vis) continue;
        const r = el.getBoundingClientRect(), A = it.amt;
        let lean = 0, lift = 0;
        if (this.mx != null) {
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = this.mx - cx, dy = this.my - cy, d = Math.hypot(dx, dy), reach = Math.max(280, Math.max(r.width, r.height) * 0.85);
          if (d < reach && d > 1) { const w = 1 - d / reach, s = w * w * (3 - 2 * w); lean = dx / d * s * 5 * A; lift = s * 6 * Math.min(1, A); }
        }
        const idle = (Math.sin(t * 0.9 + it.ph) * 0.9 + Math.sin(t * 0.37 + it.ph * 2) * 0.5) * A;
        it.v += ((idle + lean) - it.a) * 0.045; it.v *= 0.86; it.a += it.v;
        it.sv += (1 - it.s) * 0.12; it.sv *= 0.8; it.s += it.sv;
        it.lift += (lift - it.lift) * 0.08;
        const br = 1 + Math.sin(t * 1.3 + it.ph) * 0.006 * A;
        el.style.transform = `translateY(${(-it.lift).toFixed(2)}px) rotate(${it.a.toFixed(3)}deg) scale(${(it.s * br).toFixed(4)}, ${(it.s * (2 - br) + (1 - it.s) * 0.4).toFixed(4)})`;
        if (boilStep) el.style.filter = `url(#alive-boil-${(this.fi + Math.round(it.ph)) % 3})`;
        else if (!this.boil && el.style.filter) el.style.filter = '';
      }
    }
    destroy() {
      cancelAnimationFrame(this.raf); clearInterval(this.si); clearTimeout(this.tt); this.io && this.io.disconnect();
      window.removeEventListener('pointermove', this.onMove); document.removeEventListener('pointerout', this.onOut); window.removeEventListener('pointerdown', this.onDown);
      for (const el of this.items.keys()) { el.style.transform = ''; el.style.filter = ''; }
    }
  }
  window.Alive = { mount: (root, o) => new Alive(root, o) };
})();
