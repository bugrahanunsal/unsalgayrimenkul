/* Charts for an admin panel (Lumen: Money → Expenses, Overview → Analytics; also used as is by other sites' admins).
   Plain HTML and SVG, no library. Colours come from CSS variables (--lc-series, --lc-strong, --lc-pick, --lc-context,
   --lc-grid, --lc-axis), set by each admin's stylesheet — one series = one colour (checked for colour-blind safety and
   ≥3:1 contrast on white), the bar you pick = the accent, the earlier period = grey. Thin marks, hairline grid, values at
   the bar ends, a tooltip on hover AND keyboard focus, and a table twin for every chart. Texts in English or Turkish
   (LpCharts.setLang('tr')). Every label and value reaches the page through textContent (they come from a database or
   from Google). No inline scripts, no eval (CSP-safe). */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const TEXT = {
    en: { table: 'Show as a table', cur: 'This period', prev: 'Previous period', chart: 'Chart', keys: '. Use the left and right arrow keys to read each day.' },
    tr: { table: 'Tablo olarak göster', cur: 'Bu dönem', prev: 'Önceki dönem', chart: 'Grafik', keys: '. Her günü okumak için sağ ve sol ok tuşlarını kullanın.' }
  };
  const LOC = { lang: 'en', locale: 'en-CA', currency: 'CAD' };
  const t = (k) => (TEXT[LOC.lang] || TEXT.en)[k];

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }
  function svg(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(k => e.setAttribute(k, String(attrs[k])));
    return e;
  }
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  /** axis ticks: 1234 → "1.2K" ("1,2 B" in Turkish); money adds the currency sign */
  function compact(v, money) {
    const n = num(v);
    try {
      return new Intl.NumberFormat(LOC.locale, Object.assign({ notation: 'compact', maximumFractionDigits: 1 },
        money ? { style: 'currency', currency: LOC.currency, minimumFractionDigits: 0 } : {})).format(n);
    } catch (_) {
      return (money ? '$' : '') + (Math.abs(n) >= 1000 ? Math.round(n / 100) / 10 + 'K' : String(Math.round(n * 10) / 10));
    }
  }

  /** clean axis: max → [0, step, 2·step, …] covering max (steps of 1, 2, 2.5 or 5 × 10ⁿ) */
  function ticks(max, count) {
    const m = Math.max(num(max), 0);
    if (m <= 0) return [0, 1];
    const raw = m / (count || 4), mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => s >= raw) || 10 * mag;
    const out = [];
    for (let v = 0; v < m + step * 0.999; v += step) out.push(Math.round(v * 1e6) / 1e6);
    if (out.length < 2) out.push(step);
    return out;
  }

  // ------------------------------------------------------------------ tooltip (one per chart)
  function tooltip(host) {
    const tip = el('div', 'lc-tip');
    tip.setAttribute('role', 'status');
    tip.hidden = true;
    host.appendChild(tip);
    return {
      show(x, y, title, rows) {
        tip.textContent = '';
        tip.appendChild(el('div', 'lc-tip-t', title));
        (rows || []).forEach(r => {
          const row = el('div', 'lc-tip-row');
          if (r.key) row.appendChild(el('span', 'lc-key lc-key-' + r.key));
          row.appendChild(el('b', '', r.value));
          if (r.label) row.appendChild(el('span', 'lc-tip-l', r.label));
          tip.appendChild(row);
        });
        tip.hidden = false;
        const hw = host.clientWidth, tw = tip.offsetWidth;
        const left = Math.min(Math.max(x, tw / 2 + 4), Math.max(hw - tw / 2 - 4, tw / 2 + 4));
        tip.style.left = left + 'px';
        tip.style.top = Math.max(y, tip.offsetHeight + 12) + 'px';
      },
      hide() { tip.hidden = true; }
    };
  }

  // ------------------------------------------------------------------ table twin
  /** <details> "Show as a table": headers ['Category', 'Amount'], rows [['Paint', '$12.00'], …] */
  function table(headers, rows, summary) {
    const d = el('details', 'lc-table');
    d.appendChild(el('summary', '', summary || t('table')));
    const wrap = el('div', 'table-container');
    const tb0 = el('table', 'table');
    const thead = el('thead'), tr = el('tr');
    headers.forEach((x, i) => { const th = el('th', i ? 'lc-num' : '', x); th.scope = 'col'; tr.appendChild(th); });
    thead.appendChild(tr); tb0.appendChild(thead);
    const tb = el('tbody');
    rows.forEach(r => { const row = el('tr'); r.forEach((x, i) => row.appendChild(el('td', i ? 'lc-num' : '', x))); tb.appendChild(row); });
    tb0.appendChild(tb); wrap.appendChild(tb0); d.appendChild(wrap);
    return d;
  }

  // ------------------------------------------------------------------ horizontal bars (ranked categories)
  /**
   * rows: [{key, label, sub, value, text, share}] (text = the value as shown; share = "42%")
   * opts: {onSelect(row|null), selected: key, label: 'Spent by category'}
   * Bars grow from one baseline, 8 px thick, rounded at the value end. Selectable rows are buttons (aria-pressed).
   */
  function bars(host, rows, opts) {
    const o = opts || {};
    host.textContent = '';
    const list = el('ol', 'lc-bars');
    if (o.label) list.setAttribute('aria-label', o.label);
    const max = Math.max(...rows.map(r => num(r.value)), 0);
    rows.forEach((r) => {
      const li = el('li');
      const pick = typeof o.onSelect === 'function' && r.key !== undefined && r.key !== null;
      const row = el(pick ? 'button' : 'div', 'lc-row');
      if (pick) {
        row.type = 'button';
        const on = o.selected === r.key;
        row.setAttribute('aria-pressed', on ? 'true' : 'false');
        row.addEventListener('click', () => o.onSelect(on ? null : r));
      }
      const lab = el('span', 'lc-label', r.label);
      if (r.sub) lab.appendChild(el('small', '', r.sub));
      const val = el('span', 'lc-val', r.text !== undefined ? r.text : String(r.value));
      if (r.share) val.appendChild(el('small', '', r.share));
      const bar = el('span', 'lc-bar');
      const fill = el('span', 'lc-fill');
      fill.style.width = (max > 0 ? Math.max(0, num(r.value)) / max * 100 : 0).toFixed(2) + '%';
      bar.appendChild(fill);
      row.append(lab, val, bar);
      li.appendChild(row);
      list.appendChild(li);
    });
    host.appendChild(list);
    return list;
  }

  // ------------------------------------------------------------------ vertical columns (months, weeks, age bands)
  /**
   * rows: [{label, short, value, text}] in order. opts: {money, height, label, valueLabel}
   * The tallest column carries its value on the cap; every column shows label + value in a tooltip on hover and focus.
   */
  function columns(host, rows, opts) {
    const o = opts || {};
    host.textContent = '';
    const H = o.height || 180;
    const wrap = el('div', 'lc-cols');
    wrap.style.setProperty('--h', H + 'px');
    const tk = ticks(Math.max(...rows.map(r => num(r.value)), 0), 4);
    const top = tk[tk.length - 1] || 1;
    const yaxis = el('div', 'lc-yaxis');
    yaxis.setAttribute('aria-hidden', 'true');
    const plot = el('div', 'lc-plot');
    tk.forEach(v => {
      const y = el('span', '', compact(v, o.money)); y.style.bottom = (v / top * 100) + '%'; yaxis.appendChild(y);
      if (v > 0) { const g = el('span', 'lc-grid'); g.style.bottom = (v / top * 100) + '%'; plot.appendChild(g); }
    });
    const set = el('div', 'lc-colset');
    if (o.label) { set.setAttribute('role', 'list'); set.setAttribute('aria-label', o.label); }
    const tip = tooltip(wrap);
    const maxV = Math.max(...rows.map(r => num(r.value)));
    let capDone = false;
    rows.forEach((r) => {
      const c = el('div', 'lc-col');
      c.tabIndex = 0;
      c.setAttribute('role', 'listitem');
      c.setAttribute('aria-label', r.label + ': ' + (r.text !== undefined ? r.text : r.value));
      const bar = el('span');
      bar.style.height = (Math.max(0, num(r.value)) / top * 100).toFixed(2) + '%';
      if (!(num(r.value) > 0)) bar.hidden = true;                     // nothing: no mark (the tooltip still says 0)
      c.appendChild(bar);
      if (!capDone && maxV > 0 && num(r.value) === maxV) {               // one direct label: the highest column
        capDone = true;
        const cap = el('em', 'lc-cap', r.text !== undefined ? r.text : String(r.value));
        cap.style.bottom = 'calc(' + (num(r.value) / top * 100).toFixed(2) + '% + 4px)';
        c.appendChild(cap);
      }
      const show = () => {
        const pr = plot.getBoundingClientRect(), cr = c.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
        const y = pr.bottom - wr.top - (Math.max(0, num(r.value)) / top) * pr.height;
        tip.show(cr.left - wr.left + cr.width / 2, y, r.label, [{ value: r.text !== undefined ? r.text : String(r.value), label: o.valueLabel || '' }]);
      };
      c.addEventListener('pointerenter', show);
      c.addEventListener('focus', show);
      c.addEventListener('pointerleave', () => tip.hide());
      c.addEventListener('blur', () => tip.hide());
      set.appendChild(c);
    });
    plot.appendChild(set);
    const xl = el('div', 'lc-xlabels');
    xl.setAttribute('aria-hidden', 'true');
    const every = rows.length > 16 ? Math.ceil(rows.length / 8) : rows.length > 8 && host.clientWidth < 520 ? 2 : 1;
    rows.forEach((r, i) => xl.appendChild(el('span', '', i % every === 0 ? (r.short || r.label) : '')));
    wrap.append(yaxis, plot, el('span'), xl);
    host.appendChild(wrap);
    return wrap;
  }

  // ------------------------------------------------------------------ line over time (+ the earlier period in grey)
  /**
   * points: [{label, short, v, p, plabel}] (v = this period, p = the earlier period's value at the same position, optional)
   * opts: {height, format(v), seriesLabel, prevLabel, label, money}
   * A 2 px line with a 10 % wash under it; a crosshair snaps to the nearest point on hover, and ← → move it from the keyboard.
   */
  function line(host, points, opts) {
    const o = opts || {};
    const fmt = typeof o.format === 'function' ? o.format : (v) => String(v);
    host.textContent = '';
    const box = el('div', 'lc-line');
    host.appendChild(box);
    const hasPrev = points.some(p => p.p !== undefined && p.p !== null);
    if (hasPrev) {
      const lg = el('div', 'lc-legend');
      [['cur', o.seriesLabel || t('cur')], ['prev', o.prevLabel || t('prev')]].forEach(([k, txt]) => {
        const it = el('span', 'lc-legend-i'); it.append(el('span', 'lc-key lc-key-' + k), el('span', '', txt)); lg.appendChild(it);
      });
      box.appendChild(lg);
    }
    const stage = el('div', 'lc-stage');
    stage.tabIndex = 0;
    stage.setAttribute('role', 'img');
    stage.setAttribute('aria-label', (o.label || t('chart')) + t('keys'));
    box.appendChild(stage);
    const tip = tooltip(stage);
    let at = -1, geo = null;

    function draw() {
      const W = Math.max(stage.clientWidth || 300, 240), H = o.height || 220, padL = 40, padR = 12, padT = 12, padB = 26;
      const vals = points.map(p => num(p.v)).concat(hasPrev ? points.map(p => num(p.p)) : []);
      const tk = ticks(Math.max(...vals, 0), 4), top = tk[tk.length - 1] || 1;
      const n = points.length, iw = W - padL - padR, ih = H - padT - padB;
      const x = (i) => padL + (n <= 1 ? iw / 2 : i * iw / (n - 1));
      const y = (v) => padT + ih - (num(v) / top) * ih;
      const s = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', focusable: 'false' });
      tk.forEach(v => {
        s.appendChild(svg('line', { x1: padL, x2: W - padR, y1: y(v), y2: y(v), class: v === 0 ? 'lc-gl0' : 'lc-gl', 'shape-rendering': 'crispEdges' }));
        const tx = svg('text', { x: padL - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'lc-tick' }); tx.textContent = compact(v, o.money); s.appendChild(tx);
      });
      const want = W < 480 ? 4 : 6, step = Math.max(1, Math.ceil(n / want));
      points.forEach((p, i) => {
        if (i % step !== 0 && i !== n - 1) return;
        if (i !== n - 1 && n - 1 - i < step * 0.6) return;                 // keep the last label clear of its neighbour
        const tx = svg('text', { x: x(i), y: H - 8, 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle', class: 'lc-tick' });
        tx.textContent = p.short || p.label; s.appendChild(tx);
      });
      const path = (key) => points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[key]).toFixed(1)).join(' ');
      if (hasPrev) s.appendChild(svg('path', { d: path('p'), class: 'lc-prev' }));
      if (n > 1) s.appendChild(svg('path', { d: path('v') + ' L' + x(n - 1).toFixed(1) + ' ' + y(0) + ' L' + x(0).toFixed(1) + ' ' + y(0) + ' Z', class: 'lc-area' }));
      s.appendChild(svg('path', { d: path('v'), class: 'lc-cur' }));
      if (n === 1) s.appendChild(svg('circle', { cx: x(0), cy: y(points[0].v), r: 4, class: 'lc-dot' }));
      const cross = svg('line', { x1: 0, x2: 0, y1: padT, y2: padT + ih, class: 'lc-cross', visibility: 'hidden' });
      const dot = svg('circle', { cx: 0, cy: 0, r: 4, class: 'lc-dot', visibility: 'hidden' });
      s.append(cross, dot);
      stage.querySelectorAll('svg').forEach(e => e.remove());
      stage.insertBefore(s, stage.firstChild);
      geo = { x, y, n, cross, dot, iw, padL };
      if (at >= 0) mark(at);
    }
    function mark(i) {
      if (!geo || !points.length) return;
      at = Math.max(0, Math.min(points.length - 1, i));
      const p = points[at], cx = geo.x(at);
      geo.cross.setAttribute('x1', cx); geo.cross.setAttribute('x2', cx); geo.cross.setAttribute('visibility', 'visible');
      geo.dot.setAttribute('cx', cx); geo.dot.setAttribute('cy', geo.y(p.v)); geo.dot.setAttribute('visibility', 'visible');
      const rows = [{ key: 'cur', value: fmt(num(p.v)), label: o.seriesLabel || '' }];
      if (hasPrev && p.p !== undefined && p.p !== null) rows.push({ key: 'prev', value: fmt(num(p.p)), label: (o.prevLabel || t('prev')) + (p.plabel ? ' (' + p.plabel + ')' : '') });
      tip.show(cx, geo.y(Math.max(num(p.v), hasPrev ? num(p.p) : 0)), p.label, rows);
    }
    function unmark() {
      at = -1;
      if (geo) { geo.cross.setAttribute('visibility', 'hidden'); geo.dot.setAttribute('visibility', 'hidden'); }
      tip.hide();
    }
    stage.addEventListener('pointermove', (e) => {
      if (!geo || !points.length) return;
      const r = stage.getBoundingClientRect();
      const rel = (e.clientX - r.left - geo.padL) / (geo.iw || 1);
      mark(Math.round(rel * (geo.n - 1)));
    });
    stage.addEventListener('pointerleave', unmark);
    stage.addEventListener('blur', unmark);
    stage.addEventListener('focus', () => mark(points.length - 1));
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); mark((at < 0 ? points.length - 1 : at) + (e.key === 'ArrowLeft' ? -1 : 1)); }
      else if (e.key === 'Home') { e.preventDefault(); mark(0); }
      else if (e.key === 'End') { e.preventDefault(); mark(points.length - 1); }
    });
    draw();
    if (typeof ResizeObserver === 'function') {
      let last = stage.clientWidth;
      new ResizeObserver(() => { if (Math.abs(stage.clientWidth - last) > 2) { last = stage.clientWidth; draw(); } }).observe(stage);
    }
    return box;
  }

  /** LpCharts.setLang('tr', {locale: 'tr-TR', currency: 'TRY'}) — texts and number formats */
  function setLang(lang, o) {
    LOC.lang = TEXT[lang] ? lang : 'en';
    LOC.locale = (o && o.locale) || (LOC.lang === 'tr' ? 'tr-TR' : 'en-CA');
    LOC.currency = (o && o.currency) || (LOC.lang === 'tr' ? 'TRY' : 'CAD');
  }

  window.LpCharts = { bars, columns, line, table, compact, ticks, setLang };
})();
