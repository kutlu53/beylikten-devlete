/* Harita kabuğu: tam ekran şematik harita, zaman çubuğu, sırayla açılan olay işaretleri, olay paneli,
   mini oyun başlatma, "Tarihte Ne Oldu" kartı, ürünler (öğrenme kanıtları) özeti. */
(function () {
  const M = Motor;
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => { if (v !== null && v !== undefined) e.setAttribute(k, v); }); if (text !== undefined) e.textContent = text; return e; };

  Sahneler.harita = function (icerik, kok) {
    const d = M.durum;
    if (!d.harita) d.harita = { acik: 0, tamam: {}, urunler: {}, secili: null };
    const HD = d.harita;
    const H = icerik.harita, olaylar = icerik.olaylar;
    const yillar = { bas: 1299, son: 1453 };
    document.body.classList.add('harita-modu');
    document.getElementById('ust-panel').classList.add('gizli');
    Durum.kaydet(d);

    const yer = (id) => H.yerler.find(y => y.id === id) || { x: 500, y: 300 };
    const durumu = (i) => HD.tamam[olaylar[i].id] ? 'tamam' : i === HD.acik ? 'aktif' : i < HD.acik ? 'tamam' : 'kilitli';
    let secili = HD.secili !== null && HD.secili !== undefined ? HD.secili : HD.acik;
    if (secili >= olaylar.length) secili = olaylar.length - 1;

    /* ---------- SVG harita ---------- */
    /* Katmanlar: deniz → kara → komşu alanları → Osmanlı toprakları → göller → dağlar → nehirler → etiketler → yerler → olay işaretleri.
       Komşu devlet ve beylikler (H.komsular) sıradaki olayın yılına göre gösterilir (Osmanlı toprakları da tamamlanan olaylara göre
       büyüdüğü için ikisi tutarlı kalır). Komşu alanları ve Osmanlı toprakları kara sınırıyla kırpılır, denize taşmaz. */
    const svg = mk('svg', { viewBox: '0 0 ' + H.genislik + ' ' + H.yukseklik, class: 'dunya-haritasi', preserveAspectRatio: 'xMidYMid slice' });
    const katman = HD.katmanlar = Object.assign({ nehir: true, dag: true, komsu: true }, HD.katmanlar || {});
    const komsuYili = () => HD.acik >= olaylar.length ? yillar.son : olaylar[HD.acik].yilSayi;
    const yilda = (k, yil) => (k.yillar || []).some(([a, b]) => a <= yil && yil <= b);
    const yuv = (p) => p.map(v => Math.round(v * 10) / 10).join(',');
    // Catmull-Rom eğrisi: nehirleri yumuşak çizer
    const egri = (n) => { let dd = 'M' + yuv(n[0]); for (let i = 0; i < n.length - 1; i++) { const p0 = n[i - 1] || n[i], p1 = n[i], p2 = n[i + 1], p3 = n[i + 2] || p2; dd += ' C' + yuv([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' + yuv([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + yuv(p2); } return dd; };
    // Dağ sırası: çizgi boyunca aralıklı "^" işaretleri
    const sirt = (n, ara = 13) => { let dd = '', kalan = ara / 2; for (let i = 0; i < n.length - 1; i++) { const [x1, y1] = n[i], [x2, y2] = n[i + 1]; const L = Math.hypot(x2 - x1, y2 - y1); let t = kalan; for (; t <= L; t += ara) { const x = x1 + (x2 - x1) * t / L, y = y1 + (y2 - y1) * t / L; dd += 'M' + yuv([x - 4, y + 2.5]) + ' L' + yuv([x, y - 3]) + ' L' + yuv([x + 4, y + 2.5]) + ' '; } kalan = t - L; } return dd; };
    const haritaCiz = (yeniAcilan) => {
      svg.innerHTML = '';
      const kirp = mk('clipPath', { id: 'kara-kirp' }); H.karalar.forEach(k => kirp.append(mk('path', { d: k.d })));
      svg.append(mk('defs', {}), mk('rect', { x: 0, y: 0, width: H.genislik, height: H.yukseklik, fill: H.deniz })); svg.querySelector('defs').append(kirp);
      // dalga deseni
      for (let i = 0; i < 14; i++) svg.append(mk('path', { d: 'M' + (i * 80 - 40) + ',' + (40 + (i % 3) * 170) + ' q20,-8 40,0 t40,0', class: 'dalga' }));
      const kara = mk('g', { class: 'karalar' });
      H.karalar.forEach(k => kara.append(mk('path', { d: k.d, fill: H.kara, stroke: '#9c8c66', 'stroke-width': k.ada ? 1.2 : 2, 'stroke-linejoin': 'round' })));
      svg.append(kara);
      const yil = komsuYili(); const komsular = katman.komsu ? (H.komsular || []).filter(k => yilda(k, yil)) : [];
      const kg = mk('g', { 'clip-path': 'url(#kara-kirp)' });
      komsular.forEach(k => { const e = mk('ellipse', { cx: k.x, cy: k.y, rx: k.rx, ry: k.ry, class: 'komsu-alan ' + k.tur }); e.append(mk('title', {}, k.ad + (k.not ? ' · ' + k.not : '') + ' (yaklaşık alan)')); kg.append(e); });
      svg.append(kg);
      // Osmanlı toprakları (açılmış olaylara göre)
      const tg = mk('g', { 'clip-path': 'url(#kara-kirp)' });
      H.topraklar.forEach(t => {
        const acilisIndex = olaylar.findIndex(o => o.id === t.acilis);
        if (acilisIndex < 0 || !(HD.tamam[t.acilis])) return;
        const p = mk('path', { d: t.d, fill: t.nufuz ? H.nufuz : H.osmanli, 'fill-opacity': t.nufuz ? 0.55 : 0.85, stroke: '#8a4b1f', 'stroke-width': 1.5, 'stroke-dasharray': t.nufuz ? '6 4' : null, class: 'toprak' + (yeniAcilan === t.acilis ? ' yeni' : '') });
        p.append(mk('title', {}, t.etiket || (t.nufuz ? 'Osmanlı nüfuz alanı' : 'Osmanlı toprağı')));
        tg.append(p);
      });
      svg.append(tg);
      (H.goller || []).forEach(g => { const p = mk('path', { d: g.d, fill: H.deniz, class: 'gol' }); p.append(mk('title', {}, g.ad)); svg.append(p); });
      if (katman.dag) (H.daglar || []).forEach(dg => { const p = mk('path', { d: sirt(dg.noktalar), class: 'dag' }); p.append(mk('title', {}, dg.ad)); svg.append(p); });
      if (katman.nehir) (H.nehirler || []).forEach(r => { const p = mk('path', { d: egri(r.noktalar), class: 'nehir' }); p.append(mk('title', {}, r.ad)); svg.append(p); });
      H.denizEtiketleri.forEach(e => svg.append(mk('text', { x: e.x, y: e.y, class: 'deniz-etiket', 'text-anchor': 'middle' }, e.metin)));
      if (katman.dag) (H.daglar || []).forEach(dg => dg.etiket && svg.append(mk('text', { x: dg.etiket[0], y: dg.etiket[1], class: 'dag-etiket', 'text-anchor': 'middle' }, dg.ad)));
      if (katman.nehir) (H.nehirler || []).forEach(r => r.etiket && svg.append(mk('text', { x: r.etiket[0], y: r.etiket[1], class: 'nehir-etiket', 'text-anchor': 'middle' }, r.ad)));
      komsular.forEach(k => k.etiket && svg.append(mk('text', { x: k.etiket[0], y: k.etiket[1], class: 'komsu-etiket ' + k.tur, 'text-anchor': 'middle' }, k.ad)));
      // Yerler
      H.yerler.forEach(y => {
        svg.append(mk('circle', { cx: y.x, cy: y.y, r: 3.5, fill: '#5a4a32' }));
        svg.append(mk('text', { x: y.x + 7, y: y.y + 14, class: 'yer-etiket' }, y.ad));
      });
      // Olay işaretleri
      olaylar.forEach((o, i) => {
        const p = yer(o.yer);
        const px = o.pin ? o.pin[0] : p.x, py = o.pin ? o.pin[1] - 4 : p.y - 4;
        const st = durumu(i);
        if (o.pin && (Math.abs(px - p.x) > 8 || Math.abs(py + 4 - p.y) > 8)) svg.append(mk('line', { x1: p.x, y1: p.y, x2: px, y2: py, class: 'pin-cizgi' }));
        const g = mk('g', { class: 'olay-pin ' + st + (i === secili ? ' secili' : ''), transform: 'translate(' + px + ',' + py + ')' });
        g.append(mk('path', { d: 'M0,0 C-12,-14 -12,-30 0,-30 C12,-30 12,-14 0,0 Z', class: 'pin-govde' }));
        g.append(mk('circle', { cx: 0, cy: -19, r: 9, class: 'pin-ic' }));
        g.append(mk('text', { x: 0, y: -15, 'text-anchor': 'middle', class: 'pin-no' }, st === 'tamam' ? '✓' : st === 'kilitli' ? '🔒' : String(i + 1)));
        g.append(mk('text', { x: 0, y: -38, 'text-anchor': 'middle', class: 'pin-yil' }, o.kisaYil || o.yil));
        g.append(mk('title', {}, o.ad + ' · ' + o.yil + (st === 'kilitli' ? ' · önce önceki olayı tamamla' : '')));
        g.addEventListener('click', () => { secili = i; HD.secili = i; Durum.kaydet(d); haritaCiz(); panelCiz(); zamanCiz(); });
        svg.append(g);
      });
    };

    /* ---------- Zaman çubuğu ---------- */
    const zaman = M.el('div', { class: 'zaman-cubugu' });
    const zamanCiz = () => {
      zaman.innerHTML = '';
      const cizgi = M.el('div', { class: 'zaman-cizgi' });
      zaman.append(cizgi);
      for (let y = 1300; y <= 1450; y += 50) zaman.append(M.el('span', { class: 'zaman-tik', style: 'left:' + ((y - yillar.bas) / (yillar.son - yillar.bas) * 100) + '%' }, String(y)));
      let oncekiX = -100; const enAzAralik = 2.6; // yüzde; üst üste binen işaretleri sağa kaydır
      olaylar.forEach((o, i) => {
        const st = durumu(i);
        let x = (o.yilSayi - yillar.bas) / (yillar.son - yillar.bas) * 100;
        if (x < oncekiX + enAzAralik) x = oncekiX + enAzAralik;
        if (x > 100) x = 100;
        oncekiX = x;
        const n = M.el('button', { class: 'zaman-nokta ' + st + (i === secili ? ' secili' : ''), style: 'left:' + x + '%', title: o.ad + ' · ' + o.yil, onclick: () => { secili = i; HD.secili = i; Durum.kaydet(d); haritaCiz(); panelCiz(); zamanCiz(); } }, st === 'tamam' ? '✓' : String(i + 1));
        zaman.append(n);
      });
    };

    /* ---------- Lejant ve katmanlar ---------- */
    const lejant = M.el('div', { class: 'harita-lejant' + (HD.lejantKapali === false ? '' : ' kapali') });
    const lejantCiz = () => {
      lejant.innerHTML = '';
      const kapali = lejant.classList.contains('kapali');
      const ornek = (sinif) => M.el('span', { class: 'lejant-ornek ' + sinif });
      const satir = (...cocuk) => M.el('div', { class: 'lejant-satir' }, ...cocuk);
      const secim = (anahtar, ...cocuk) => { const c = M.el('input', { type: 'checkbox', onchange: (e) => { katman[anahtar] = e.target.checked; Durum.kaydet(d); haritaCiz(); } }); c.checked = !!katman[anahtar]; return M.el('label', { class: 'lejant-satir' }, c, ...cocuk); };
      lejant.append(
        M.el('button', { class: 'lejant-baslik', 'aria-expanded': kapali ? 'false' : 'true', onclick: () => { lejant.classList.toggle('kapali'); HD.lejantKapali = lejant.classList.contains('kapali'); Durum.kaydet(d); lejantCiz(); } }, '🗺️ Lejant ' + (kapali ? '▸' : '▾')),
        M.el('div', { class: 'lejant-govde' },
          satir(ornek('osmanli'), 'Osmanlı toprağı'), satir(ornek('nufuz'), 'Osmanlı nüfuz alanı'),
          secim('komsu', M.el('span', null, 'Komşular (', M.el('b', null, String(komsuYili())), ' yılı)')),
          M.el('div', { class: 'lejant-alt' }, satir(ornek('devlet'), 'Devlet'), satir(ornek('beylik'), 'Anadolu beyliği'), satir(ornek('latin'), 'Venedik, Ceneviz, Latin')),
          secim('nehir', ornek('nehir'), 'Nehirler'), secim('dag', ornek('dag'), 'Dağlar'),
          M.el('button', { class: 'lejant-not', onclick: () => M.modal('🗺️ Harita hakkında', '<p>Harita şematiktir. Komşu devletler ve beylikler, sıradaki olayın yılına (' + komsuYili() + ') göre gösterilir; Osmanlı toprakları tamamladığın olaylara göre büyür.</p><p class="ipucu">Öğretmen doğrulamalı:</p><ul>' + (H.dogrulama || []).map(x => '<li>' + M.metin(x).replace(/^<p>|<\/p>$/g, '') + '</li>').join('') + '</ul>') }, 'ℹ️ Sınırlar ve yıllar yaklaşıktır')));
    };

    /* ---------- Olay paneli ---------- */
    const panel = M.el('aside', { class: 'olay-paneli' });
    const panelCiz = () => {
      const o = olaylar[secili]; const st = durumu(secili);
      panel.innerHTML = '';
      panel.append(
        M.el('div', { class: 'olay-ust' }, M.el('span', { class: 'etiket' }, 'Olay ' + (secili + 1) + '/' + olaylar.length), M.el('span', { class: 'etiket gercek' }, o.kazanim)),
        M.el('h2', null, o.yil + ' · ' + o.ad),
        M.el('div', { class: 'olay-ozet', html: M.metin(o.ozet) }),
        o.gorev ? M.el('div', { class: 'hedef-kutusu' }, M.el('b', null, '🎮 Görev: '), o.gorev) : null,
        M.el('p', { class: 'ipucu' }, 'Mini oyun: ' + ({ tez: 'Sürükle-bırak kanıt tahtası, mühürler ve tez savunma', savas: 'Birlik yerleştirme, sabit savaş animasyonu, neden sıralama, farkı bul', okuma: 'Oku, kaynak sorusunu cevapla, tarih şeridine not düş', abluka: 'İkmal yollarını kesme bulmacası', esle: 'Kavram kartlarını eşleştirme', iskan: 'Aileleri ve zaviyeleri yerleştirme', dedektif: 'İpuçlarını sırala, tarihi tahmin et', taht: 'Taht mücadelesini yıl yıl haritada izle, devleti ayakta tutanları ayır' })[o.miniOyun.tip] || o.miniOyun.tip),
        M.el('div', { class: 'buton-satiri', style: 'justify-content:flex-start' },
          st === 'kilitli' ? M.el('button', { disabled: 'disabled' }, '🔒 Önce ' + (HD.acik + 1) + '. olayı tamamla')
            : M.el('button', { class: 'buyuk', onclick: () => oyna(secili) }, st === 'tamam' ? '🔁 Tekrar oyna' : '▶ Oyna'),
          st === 'tamam' ? M.el('button', { class: 'ikincil', onclick: () => tarihteGoster(o) }, '📖 Tarihte ne oldu') : null)
      );
    };

    /* ---------- Mini oyun başlat ---------- */
    const oyna = (i) => {
      const o = olaylar[i];
      const oyun = MiniOyunlar[o.miniOyun.tip];
      if (!oyun) { M.modal('Hazır değil', '<p>Bu mini oyun henüz hazır değil.</p>'); return; }
      oyun(o, icerik, (sonuc) => {
        const ilkKez = !HD.tamam[o.id];
        HD.tamam[o.id] = true;
        HD.urunler[o.id] = Object.assign({ ad: o.ad, yil: o.yil, kazanim: o.kazanim }, sonuc);
        if (ilkKez && i === HD.acik) HD.acik = Math.min(olaylar.length, HD.acik + 1);
        Durum.kaydet(d);
        haritaCiz(o.id); panelCiz(); zamanCiz(); ustCiz(); lejantCiz();
        tarihteGoster(o, true);
      });
    };

    const tarihteGoster = (o, ileri) => {
      const sonrakiVar = HD.acik < olaylar.length;
      M.modal('📖 Tarihte ne oldu: ' + o.ad, '<ul>' + (o.tarihte || []).map(t => '<li>' + M.metin(t) + '</li>').join('') + '</ul>' +
        (o.dogrulama ? '<p class="ipucu">Öğretmen doğrulamalı: ' + o.dogrulama.join('; ') + '</p>' : ''),
        ileri && sonrakiVar ? [{ metin: 'Sonraki olaya geç ▶', deger: true }, { metin: 'Haritada kal', deger: false }] : [{ metin: 'Kapat', deger: false }]
      ).then(ok => { if (ok) { secili = HD.acik; HD.secili = secili; Durum.kaydet(d); haritaCiz(); panelCiz(); zamanCiz(); } });
    };

    /* ---------- Üst çubuk ---------- */
    const ust = M.el('div', { class: 'harita-ust' });
    const ustCiz = () => {
      ust.innerHTML = '';
      const tamamSayi = olaylar.filter(o => HD.tamam[o.id]).length;
      ust.append(
        M.el('div', { class: 'harita-baslik' }, M.el('b', null, icerik.unite + ' · ' + icerik.baslik), M.el('span', null, ' · ' + icerik.donem)),
        M.el('div', { class: 'harita-ilerleme' }, M.el('div', { class: 'cubuk' }, M.el('div', { style: 'width:' + (tamamSayi / olaylar.length * 100) + '%; background: var(--vurgu)' })), M.el('span', null, tamamSayi + '/' + olaylar.length + ' olay')),
        M.el('div', { class: 'harita-araclar' },
          M.el('button', { class: 'hud-buton', onclick: urunlerGoster, title: 'Ürünlerim (öğrenme kanıtları)' }, '📂 Ürünlerim'),
          M.el('button', { class: 'hud-buton', title: 'Nasıl oynanır, rehber', onclick: async () => {
            const ok = await M.modal('❓ Nasıl oynanır', '<ul class="ipucu-listesi"><li>Haritadaki işaretler olaylar; sırayla açılır.</li><li>İşarete tıkla, sağ panelde oku, <b>Oyna</b> ile mini oyuna gir.</li><li>Kartları <b>sürükle-bırak</b> ya da önce karta, sonra hedefe <b>tıkla</b>. Yanlış hamleyi <b>↶ Geri al</b> geri alır.</li><li>Mini oyunda <b>◀ Geri</b> önceki adıma döner; <b>✕ Haritaya dön</b> oyundan çıkar (yarım oyun kaydedilmez).</li><li>Savaşı <b>⏸ Durdur</b> ile durdurup aşama aşama izleyebilirsin (boşluk, ← →).</li><li>Her mini oyunun sonunda bir ürün oluşur: tarih şeridi notu, kaynak analizi, tez. <b>Ürünlerim</b>’de birikir.</li><li>Tarih değişmez; senin kararların yorumunu şekillendirir.</li></ul>', [{ metin: '🧭 Rehberi baştan göster', deger: true }, { metin: 'Kapat', deger: false }]);
            if (ok) Rehber.yenidenBaslat();
          } }, '❓'),
          M.el('button', { class: 'hud-buton', onclick: () => { const el = document.documentElement; if (!document.fullscreenElement) (el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).catch(() => {}); else document.exitFullscreen(); }, title: 'Tam ekran' }, '⛶'),
          M.el('button', { class: 'hud-buton', onclick: async () => { const ok = await M.modal('Baştan başla', '<p>Tüm ilerleme ve ürünler silinecek. Emin misin?</p>', [{ metin: 'Evet, sil', deger: true }, { metin: 'Vazgeç', deger: false }]); if (ok) { Durum.sil(); location.reload(); } }, title: 'Baştan başla' }, '🔄'))
      );
    };

    /* ---------- Ürünler ---------- */
    const urunlerGoster = () => {
      const u = HD.urunler;
      const parcalar = [];
      let duz = icerik.unite + ' · ' + icerik.baslik + ' · ' + new Date().toLocaleDateString('tr-TR') + '\n';
      olaylar.forEach(o => {
        const s = u[o.id]; if (!s) return;
        parcalar.push('<h3>' + o.yil + ' · ' + o.ad + ' <span class="etiket">' + o.kazanim + '</span></h3>');
        duz += '\n== ' + o.yil + ' · ' + o.ad + ' (' + o.kazanim + ') ==\n';
        Object.entries(s).forEach(([k, v]) => {
          if (['ad', 'yil', 'kazanim'].includes(k)) return;
          const deger = typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : JSON.stringify(v);
          const ad = ({ seritNotu: 'Tarih şeridi notu', kaynakCevabi: 'Kaynak sorusu', tez: 'Savunulan tez', nedenSira: 'Neden sıralaması', nedenGerekce: 'Gerekçe', tahmin: 'Tahmin', tezGerekce: 'Tez gerekçesi', tezZayif: 'Zayıf yön', tezCurutme: 'Çürütme', kaynakKarsilastirma: 'Kaynak karşılaştırma', hazirliklar: 'Hazırlıklar', kartlar: 'Kaynak analiz formu', destek: 'Destekleyen kartlar', zayif: 'Zayıflatan kart', abluka: 'Abluka kararı', iskan: 'İskân sonucu', eslestirme: 'Eşleştirme', dijitalOyku: 'Dijital öykü taslağı', ipucuSirasi: 'İpucu güvenilirlik sırası', ipucuDegerlendirme: 'Sıralama değerlendirmesi', tahtFazlari: 'Taht mücadelesi (yıl yıl harita)', ayaktaTutanlar: 'Devleti ayakta tutanlar / dağıtanlar' })[k] || k;
          parcalar.push('<p><b>' + ad + ':</b> ' + (typeof v === 'object' && !Array.isArray(v) ? '<pre class="urun-pre">' + Object.entries(v).map(([a, b]) => a + ': ' + b).join('\n') + '</pre>' : deger) + '</p>');
          duz += '- ' + ad + ': ' + (typeof v === 'object' && !Array.isArray(v) ? '\n' + Object.entries(v).map(([a, b]) => '    ' + a + ': ' + b).join('\n') : deger) + '\n';
        });
      });
      const kaplama = document.getElementById('modal-kaplama'); const modal = document.getElementById('modal'); modal.classList.add('genis');
      document.getElementById('modal-baslik').textContent = '📂 Ürünlerim (öğrenme kanıtları)';
      document.getElementById('modal-govde').innerHTML = parcalar.length ? parcalar.join('') : '<p>Henüz ürün yok. İlk olayı oyna.</p>';
      const b = document.getElementById('modal-butonlar'); b.innerHTML = '';
      b.append(M.el('button', { class: 'ikincil', onclick: async () => { try { await navigator.clipboard.writeText(duz); alert('Kopyalandı'); } catch (e) { prompt('Kopyala:', duz); } } }, '📋 Kopyala'),
        M.el('button', { class: 'ikincil', onclick: () => window.print() }, '🖨️ Yazdır'),
        M.el('button', { onclick: () => { kaplama.classList.add('gizli'); modal.classList.remove('genis'); } }, 'Kapat'));
      kaplama.classList.remove('gizli');
    };

    kok.innerHTML = '';
    kok.append(M.el('div', { class: 'harita-sahne' }, svg, ust, panel, lejant, zaman));
    haritaCiz(); panelCiz(); zamanCiz(); ustCiz(); lejantCiz();
    Rehber.goster('harita');
  };
})();
