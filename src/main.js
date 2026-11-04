/* Başlatıcı: ünite içeriğini yükler, giriş ekranını gösterir, harita kabuğunu başlatır. */
(async function () {
  const kok = document.getElementById('sahne');
  const M = Motor;
  let icerik;
  try {
    icerik = await M.icerikYukle('content/unite10-2.json', 'ICERIK_UNITE10_2');
  } catch (e) {
    kok.innerHTML = '<div class="kart"><h2>İçerik yüklenemedi</h2><p>' + e.message + '</p><p>content/unite10-2.json ve content/unite10-2.js dosyalarının yerinde olduğundan emin ol.</p></div>';
    return;
  }
  M.icerik = icerik;

  const kayit = Durum.yukle();
  const kayitVar = kayit && kayit.unite === icerik.unite && kayit.surum === 2;
  const g = icerik.giris || {};

  /* Giriş arka planı: ünite haritası; Osmanlı toprakları olay sırasıyla belirir (sol altta o olayın yılı ve adı),
     hepsi görününce bir süre bekleyip baştan başlar. Hareket azaltma tercihi açıksa topraklar baştan görünür, döngü çalışmaz.
     Görünüm, toprakların bulunduğu batı kısma kırpılır; geniş ekranda kart sağda durur, büyüme solda görünür. */
  let girisZamanlayici = null;
  const girisArka = () => {
    const H = icerik.harita; if (!H || !H.karalar) return null;
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (t, at) => { const e = document.createElementNS(NS, t); Object.entries(at || {}).forEach(([k, v]) => { if (v !== null && v !== undefined) e.setAttribute(k, v); }); return e; };
    const gorunum = H.girisGorunum || [0, 50, Math.min(880, H.genislik), Math.min(500, H.yukseklik)];
    const svg = mk('svg', { viewBox: gorunum.join(' '), preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true', focusable: 'false' });
    svg.append(mk('rect', { x: 0, y: 0, width: H.genislik, height: H.yukseklik, fill: H.deniz }));
    H.karalar.forEach(k => svg.append(mk('path', { d: k.d, fill: H.kara, stroke: '#9c8c66', 'stroke-width': k.ada ? 1.2 : 2, 'stroke-linejoin': 'round' })));
    const kirp = mk('clipPath', { id: 'giris-kirp' }); H.karalar.forEach(k => kirp.append(mk('path', { d: k.d }))); svg.append(mk('defs')); svg.querySelector('defs').append(kirp);
    const tg = mk('g', { 'clip-path': 'url(#giris-kirp)' }); svg.append(tg); // topraklar kara sınırıyla kırpılır
    const sira = icerik.olaylar.map(o => o.id);
    const topraklar = (H.topraklar || []).slice().sort((a, b) => sira.indexOf(a.acilis) - sira.indexOf(b.acilis)).map(t => {
      const p = mk('path', { d: t.d, fill: t.nufuz ? H.nufuz : H.osmanli, 'fill-opacity': t.nufuz ? 0.55 : 0.85, stroke: '#8a4b1f', 'stroke-width': 1.5, 'stroke-dasharray': t.nufuz ? '6 4' : null, class: 'giris-toprak' });
      tg.append(p); return { p, olay: icerik.olaylar.find(o => o.id === t.acilis) };
    });
    (H.goller || []).forEach(g => svg.append(mk('path', { d: g.d, fill: H.deniz, stroke: '#6a9cc4', 'stroke-width': 0.8 })));
    (H.yerler || []).forEach(y => svg.append(mk('circle', { cx: y.x, cy: y.y, r: 3, fill: '#5a4a32', opacity: 0.6 })));
    const yazi = M.el('div', { class: 'giris-yil gizli', 'aria-hidden': 'true' });
    const azHareket = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (azHareket) { topraklar.forEach(t => t.p.classList.add('gorunur')); yazi.textContent = 'Osmanlı toprakları · ' + icerik.donem; yazi.classList.remove('gizli'); }
    else if (topraklar.length) {
      const bekle = 4; let adim = 0;
      const tik = () => {
        if (adim < topraklar.length) { const t = topraklar[adim]; t.p.classList.add('gorunur'); if (t.olay) { yazi.textContent = t.olay.yil + ' · ' + t.olay.ad; yazi.classList.remove('gizli'); } }
        else if (adim === topraklar.length + bekle) { topraklar.forEach(t => t.p.classList.remove('gorunur')); yazi.classList.add('gizli'); }
        else if (adim > topraklar.length + bekle + 1) adim = -1;
        adim++;
      };
      tik(); girisZamanlayici = setInterval(tik, 1100);
    }
    return M.el('div', { class: 'giris-arka' }, svg, yazi);
  };
  /* Kartın içindeki küçük zaman şeridi: dönemin başı-sonu ve olay noktaları (süs; ekran okuyucudan gizli). */
  const girisSerit = () => {
    const [bas, son] = String(icerik.donem || '').split('-').map(Number);
    if (!bas || !son || son <= bas) return null;
    const s = M.el('div', { class: 'giris-serit', 'aria-hidden': 'true' }, M.el('div', { class: 'giris-serit-cizgi' }));
    icerik.olaylar.forEach(o => { if (typeof o.yilSayi !== 'number') return; const x = Math.max(0, Math.min(100, (o.yilSayi - bas) / (son - bas) * 100)); s.append(M.el('span', { class: 'giris-serit-nokta', title: o.yil + ' · ' + o.ad, style: 'left:' + x + '%' })); });
    s.append(M.el('span', { class: 'giris-serit-yil bas' }, String(bas)), M.el('span', { class: 'giris-serit-orta' }, icerik.olaylar.length + ' olay'), M.el('span', { class: 'giris-serit-yil son' }, String(son)));
    return s;
  };

  const basla = (durum) => {
    clearInterval(girisZamanlayici);
    M.durum = durum;
    Durum.kaydet(durum);
    kok.innerHTML = '';
    try { const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {}); } catch (e) { /* tam ekran desteklenmiyor */ }
    Sahneler.harita(icerik, kok);
  };
  const yeniDurum = () => ({ surum: 2, unite: icerik.unite, gostergeler: {}, kararlar: {}, yapilar: [], bayraklar: {}, cevaplar: {}, gecmis: [], harita: null, baslangic: new Date().toISOString() });

  kok.innerHTML = '';
  kok.append(
    M.el('div', { class: 'giris-sahne' },
      girisArka(),
      M.el('div', { class: 'giris' },
        M.el('div', { class: 'giris-desen' }),
        M.el('div', { class: 'giris-ic' },
          M.el('div', { class: 'etiket' }, g.ustYazi || '10. Sınıf Tarih'),
          M.el('h1', null, g.baslik || 'Beylikten Devlete'),
          M.el('h2', null, icerik.unite + ' · ' + icerik.baslik + ' (' + icerik.donem + ')'),
          girisSerit(),
          M.el('div', { class: 'alt', html: M.metin(g.aciklama) }),
          M.el('div', { class: 'buton-satiri' },
            kayitVar ? M.el('button', { class: 'buyuk', onclick: () => basla(kayit) }, '▶ Kaldığın yerden devam et') : null,
            M.el('button', { class: kayitVar ? 'ikincil' : 'buyuk', onclick: async () => {
              if (kayitVar) { const ok = await M.modal('Yeni oyun', '<p>Kayıtlı ilerleme silinecek. Devam edilsin mi?</p>', [{ metin: 'Evet', deger: true }, { metin: 'Vazgeç', deger: false }]); if (!ok) return; }
              Durum.sil(); basla(yeniDurum());
            } }, '✨ Yeni oyun')),
          g.altNot ? M.el('p', { class: 'ipucu', style: 'margin-top:1.6rem' }, g.altNot) : null),
        M.el('div', { class: 'giris-desen' })))
  );
})();
