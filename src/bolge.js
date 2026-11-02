/* Bölge haritası (şematik SVG): denetim renkleri sabit tarihe göre, kervan animasyonu, kuşatma çadırları,
   bölge görevlerinde aday yerler. tur.js ve dunya.js tarafından ortak kullanılır. */
const Bolge = {
  /* s: tur/dunya sahnesi (s.bolge, s.turlar), d: durum, turIndex, bekleyen: bölge görevleri, onSecim(gorev, yer, secenek) */
  ciz(s, d, turIndex, bekleyen, onSecim) {
    const M = Motor;
    const B = s.bolge, turlar = s.turlar;
    const turSira = (id) => turlar.findIndex(t => t.id === id);
    const yerKontrol = (yer) => (yer.kontrolDegisimi && turSira(yer.kontrolDegisimi.tur) < turIndex) ? yer.kontrolDegisimi.kontrol : yer.kontrol;
    const kusatmada = (yer) => yer.kusatma && turSira(yer.kusatma.baslangicTur) <= turIndex && turSira(yer.kusatma.bitisTur) >= turIndex;
    const tur = turlar[Math.min(turIndex, turlar.length - 1)];

    const kutu = M.el('div', { class: 'bolge-sarici' });
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); if (text !== undefined) e.textContent = text; return e; };
    const svg = mk('svg', { viewBox: '0 0 ' + B.genislik + ' ' + B.yukseklik, class: 'bolge-svg' });
    const yerler = {}; B.yerler.forEach(y => yerler[y.id] = y);

    svg.append(mk('rect', { x: 0, y: 0, width: B.genislik, height: B.yukseklik, fill: '#e9e2cc' }));
    svg.append(mk('path', { d: 'M0,0 L' + B.genislik + ',0 L' + B.genislik + ',18 Q' + (B.genislik * 0.6) + ',60 ' + (B.genislik * 0.35) + ',20 Q120,0 0,30 Z', fill: '#bcd4e6' }));
    svg.append(mk('text', { x: 20, y: 22, class: 'bolge-deniz' }, 'Marmara Denizi (şematik)'));
    B.yollar.forEach(([a, b]) => { const P = yerler[a], Q = yerler[b]; svg.append(mk('line', { x1: P.x, y1: P.y, x2: Q.x, y2: Q.y, class: 'bolge-yol' })); });

    const akc = yerler.akcakoy;
    const kervan = d.kararlar.kervan;
    if (kervan && yerler[kervan.yer]) {
      const hedef = yerler[kervan.yer];
      svg.append(mk('line', { x1: akc.x, y1: akc.y, x2: hedef.x, y2: hedef.y, class: 'bolge-kervan' }));
      for (let i = 0; i < 2; i++) {
        const t = mk('text', { class: 'bolge-ikon', 'text-anchor': 'middle', dy: 5 }, '🐪');
        t.append(mk('animateMotion', { dur: '7s', repeatCount: 'indefinite', begin: (i * 3.5) + 's', path: i ? 'M' + hedef.x + ',' + hedef.y + ' L' + akc.x + ',' + akc.y : 'M' + akc.x + ',' + akc.y + ' L' + hedef.x + ',' + hedef.y }));
        svg.append(t);
      }
    }
    const kardes = d.kararlar.kardes;

    B.yerler.forEach(y => {
      const g = mk('g', { class: 'bolge-yer ' + y.tip, 'data-id': y.id });
      const kontrol = yerKontrol(y);
      const r = y.tip === 'sehir' ? 14 : y.tip === 'koy' ? 8 : y.tip === 'vakif' ? 12 : 10;
      const gorev = (bekleyen || []).find(gv => gv.secenekler.some(sc => sc.yer === y.id));
      if (gorev) g.classList.add('aday');
      if (kusatmada(y)) [[-26, 14], [-20, -22], [24, 20]].forEach(([dx, dy]) => g.append(mk('text', { x: y.x + dx, y: y.y + dy, class: 'bolge-ikon kucuk', 'text-anchor': 'middle' }, '⛺')));
      if (y.tip === 'savas') g.append(mk('text', { x: y.x, y: y.y + 6, class: 'bolge-ikon', 'text-anchor': 'middle' }, '⚔️'));
      else g.append(mk('circle', { cx: y.x, cy: y.y, r, fill: B.renkler[kontrol], stroke: '#3b2416', 'stroke-width': y.tip === 'vakif' ? 3 : 1.5 }));
      if (y.tip === 'vakif') g.append(mk('text', { x: y.x, y: y.y + 5, class: 'bolge-ikon', 'text-anchor': 'middle' }, '🏠'));
      if (y.tip === 'kale') g.append(mk('text', { x: y.x, y: y.y + 4, class: 'bolge-ikon kucuk', 'text-anchor': 'middle' }, '🏰'));
      if (kusatmada(y)) g.append(mk('text', { x: y.x + 16, y: y.y - 10, class: 'bolge-ikon' }, '⚔️'));
      if (kardes && kardes.yer === y.id) g.append(mk('text', { x: y.x - 24, y: y.y - 8, class: 'bolge-ikon' }, '🏠'));
      g.append(mk('text', { x: y.x, y: y.y + r + 14, class: 'bolge-etiket', 'text-anchor': 'middle' }, y.ad));
      g.append(mk('title', {}, y.ad + ' · ' + (B.lejant[kontrol] || kontrol) + (y.not ? ' · ' + y.not : '') + (kusatmada(y) ? ' · ' + y.kusatma.metin : '')));
      g.addEventListener('click', async () => {
        if (gorev) {
          const sec = gorev.secenekler.find(sc => sc.yer === y.id);
          const ok = await M.modal(gorev.baslik + ': ' + sec.metin, M.metin(sec.aciklama) + '<p>Bu seçimi onaylıyor musun?</p>', [{ metin: 'Onayla', deger: true }, { metin: 'Vazgeç', deger: false }]);
          if (ok) onSecim(gorev, y, sec);
          return;
        }
        M.modal(y.ad, '<p>' + (B.lejant[kontrol] || '') + (y.not ? '. ' + y.not : '') + (kusatmada(y) ? '. ' + y.kusatma.metin : '') + '</p>');
      });
      svg.append(g);
    });
    kutu.append(svg);
    const lej = M.el('div', { class: 'bolge-lejant' });
    Object.entries(B.lejant).forEach(([k, v]) => lej.append(M.el('span', null, M.el('i', { style: 'background:' + B.renkler[k] }), v)));
    lej.append(M.el('span', null, '⚔️ savaş / abluka'), M.el('span', null, M.el('i', { style: 'background:#c62828;height:3px' }), 'kervan yolun'));
    kutu.append(lej, M.el('div', { class: 'harita-aciklama' }, (B.turSiniri[tur.id] ? 'Yıl: ' + B.turSiniri[tur.id] + '. ' : '') + B.aciklama));
    return kutu;
  }
};
