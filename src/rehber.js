/* Rehber (öğretici): ekranın bir parçasını ışıkla vurgulayıp yanına konuşma balonu koyan adımlı tur.
   Üç tur var: harita (ilk girişte), mini (ilk mini oyunda), savas (ilk savaş animasyonunda).
   Her tur bir kez gösterilir; görüldüğü Motor.durum.bayraklar['rehber_<ad>'] ile kaydedilir (Yeni oyun sıfırlar).
   ❓ yardım penceresindeki "Rehberi baştan göster" bayrakları siler ve harita turunu yeniden başlatır.
   Adım: { hedef: () => Element | Element[] | null, baslik, metin, goster?: () => ({ kaynak, hedef }) }
   hedef tanımlı ama bulunamazsa adım atlanır; hedef yoksa balon ortada çıkar. goster: sürükle-bırak gösterimi (el + kart hayaleti).
   Tur açıkken body'de 'rehber-acik' sınıfı olur; savaş animasyonu bu sırada bekler. */
const Rehber = (() => {
  const M = Motor;
  let aktif = null;
  const azHareket = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ilk = (secici) => document.querySelector(secici);
  const son = (secici) => { const l = document.querySelectorAll(secici); return l.length ? l[l.length - 1] : null; };
  const metinliDugme = (kap, yazi) => [...document.querySelectorAll(kap + ' button')].find(b => b.textContent.includes(yazi)) || null;

  /* ---------- Turlar ---------- */
  const turlar = {
    harita: () => {
      const ic = M.icerik || {}; const n = (ic.olaylar || []).length;
      return [
        { baslik: '🧭 Hoş geldin!', metin: 'Bu oyunda **' + (ic.donem || '') + '** arasındaki **' + n + ' olayı** sırayla oynayacaksın. Tarih değişmez; sen olayların nedenlerini araştırır, kaynakları karşılaştırır ve yorumlarsın.\n\nKısa bir tur yapalım. İstediğin an **Atla** diyebilirsin.' },
        { hedef: () => ilk('.olay-pin.aktif') || ilk('.olay-pin.secili'), baslik: 'Olay işaretleri', metin: 'Haritadaki her işaret bir olay. Olaylar sırayla açılır: 🔒 kilitli olanlar, önceki olayı bitirince açılır. Tamamladığın olaylar ✓ olur ve Osmanlı toprakları haritada büyür.' },
        { hedef: () => ilk('.zaman-cubugu'), baslik: 'Zaman çubuğu', metin: 'Olaylar burada yıl sırasıyla dizilir. Bir noktaya tıklayarak da olay seçebilirsin.' },
        { hedef: () => ilk('.harita-lejant'), baslik: 'Lejant', metin: 'Haritadaki renklerin anlamı burada. Komşu devletler ve beylikler sıradaki olayın yılına göre değişir; nehir, dağ ve komşu katmanlarını açıp kapatabilirsin. Kapalıysa başlığına tıklayıp aç.' },
        { hedef: () => ilk('.olay-paneli'), baslik: 'Olay paneli', metin: 'Seçtiğin olayın özeti, kazanım kodu ve görevin burada. Önce oku, sonra oyna.' },
        { hedef: () => ilk('.olay-paneli button.buyuk'), baslik: 'Oyna', metin: 'Hazır olduğunda **▶ Oyna** düğmesine bas. Her mini oyun birkaç adımdır; sonunda **Tarihte Ne Oldu** kartı açılır.' },
        { hedef: () => metinliDugme('.harita-araclar', 'Ürünlerim'), baslik: 'Ürünlerim', metin: 'Her mini oyun bir ürün üretir: tarih şeridi notu, kaynak analizi, tez savunması... Hepsi burada birikir. Kopyalayıp ya da yazdırıp öğretmenine teslim edersin.' },
        { hedef: () => metinliDugme('.harita-araclar', '❓'), baslik: 'Yardım', metin: 'Bu rehberi yeniden görmek istersen **❓** düğmesine bas. İyi yolculuklar!' }
      ];
    },
    mini: () => [
      { hedef: () => ilk('.mini-adimlar'), baslik: '🧭 Adımlar', metin: 'Mini oyun birkaç adımdan oluşur; bulunduğun adım koyu renkli. Geçtiğin bir adıma tıklayarak geri dönebilirsin, yaptıkların silinmez.' },
      { goster: () => ({ kaynak: ilk('.mini-govde .tepsi .surukle-kart') || ilk('.mini-govde .surukle-kart'), hedef: ilk('.mini-govde .surukle-hedef') }), baslik: 'Sürükle-bırak', metin: 'Kartı tutup uygun yere **sürükle**. İstersen önce karta, sonra hedefe **tıkla**; aynı işi görür. Dokunmatik ekranda da çalışır.' },
      { hedef: () => ilk('.mini-govde .geri-al'), baslik: 'Geri al', metin: 'Yanlış bir hamle mi yaptın? **↶ Geri al** son hamleni geri alır.' },
      { hedef: () => son('.mini-govde .buton-satiri'), baslik: 'İlerle', metin: 'Adımı bitirince buradan ilerlersin; eksik bir şey varsa oyun sana söyler. Sonraki adımlarda burada **◀ Geri** düğmesi de çıkar.' },
      { hedef: () => ilk('.mini-cikis'), baslik: 'Haritaya dön', metin: 'Ara vermek istersen buradan haritaya dönebilirsin. Yarım kalan mini oyun kaydedilmez; olayı sonra yeniden oynarsın.' }
    ],
    savas: () => [
      { hedef: () => [ilk('.savas-ilerleme'), ilk('.savas-kontrol')].filter(Boolean), baslik: '🧭 Savaşı izle', metin: 'Savaşın sonucu sabit ama hızını sen belirlersin. **⏸ Durdur** ile metni rahatça oku, **⏪ Önceki / Sonraki ⏩** ile aşamalar arasında gez, **⏮ Baştan** ile yeniden izle.\n\nKlavyede boşluk ve ← → tuşları da çalışır.' }
    ]
  };

  /* ---------- Motor ---------- */
  function kapat() {
    if (!aktif) return;
    aktif.temizle(); aktif.kok.remove(); document.body.classList.remove('rehber-acik');
    window.removeEventListener('resize', aktif.yerlestir); document.removeEventListener('keydown', aktif.tus, true);
    aktif = null;
  }

  function baslat(adimlar) {
    kapat();
    if (!adimlar || !adimlar.length) return;
    const kok = M.el('div', { class: 'rehber' });
    const isik = M.el('div', { class: 'rehber-isik' });
    const balon = M.el('div', { class: 'rehber-balon', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rehber-baslik' });
    kok.append(isik, balon);
    document.body.append(kok); document.body.classList.add('rehber-acik');
    let i = -1, hedefler = [], gosterim = null;

    const gosterimDurdur = () => { if (gosterim) { gosterim.dur = true; gosterim.zamanlar.forEach(clearTimeout); gosterim.el.remove(); gosterim.hayalet.remove(); gosterim = null; } };
    /* Sürükle-bırak gösterimi: el ve kartın küçük kopyası kaynaktan hedefe gider, döngüyle tekrarlar. */
    const gosterimBaslat = (kaynak, hedef) => {
      const el = M.el('div', { class: 'rehber-el', 'aria-hidden': 'true' }, '👆');
      const hayalet = kaynak.cloneNode(true); hayalet.classList.remove('surukle', 'secili', 'tasiniyor'); hayalet.classList.add('rehber-hayalet'); hayalet.setAttribute('aria-hidden', 'true');
      kok.append(hayalet, el);
      const g = { el, hayalet, zamanlar: [], dur: false }; gosterim = g;
      const sonra = (ms, f) => g.zamanlar.push(setTimeout(() => { if (!g.dur) f(); }, ms));
      const koy = (x, y) => [el, hayalet].forEach(e => { e.style.left = x + 'px'; e.style.top = y + 'px'; });
      const tur = () => {
        g.zamanlar = [];
        const a = kaynak.getBoundingClientRect(), b = hedef.getBoundingClientRect();
        const ax = a.left + a.width / 2, ay = a.top + Math.min(a.height / 2, 50), bx = b.left + b.width / 2, by = b.top + Math.min(b.height / 2, 60);
        [el, hayalet].forEach(e => { e.style.transition = 'none'; e.style.opacity = '0'; }); koy(ax, ay); void el.offsetWidth;
        sonra(60, () => { el.style.transition = 'opacity 0.3s'; el.style.opacity = '1'; });
        sonra(600, () => { hayalet.style.transition = 'opacity 0.2s'; hayalet.style.opacity = '0.9'; });
        sonra(850, () => { const t = azHareket() ? 'none' : 'left 1.3s ease-in-out, top 1.3s ease-in-out, opacity 0.3s'; el.style.transition = t; hayalet.style.transition = t; koy(bx, by); });
        sonra(2500, () => { [el, hayalet].forEach(e => { e.style.transition = 'opacity 0.4s'; e.style.opacity = '0'; }); });
        sonra(3100, tur);
      };
      tur();
    };

    const yerlestir = () => {
      const vw = window.innerWidth, vh = window.innerHeight, pay = 8;
      let R = null;
      if (hedefler.length) {
        const rs = hedefler.map(e => e.getBoundingClientRect());
        R = { l: Math.max(4, Math.min(...rs.map(r => r.left)) - pay), t: Math.max(4, Math.min(...rs.map(r => r.top)) - pay), r: Math.min(vw - 4, Math.max(...rs.map(r => r.right)) + pay), b: Math.min(vh - 4, Math.max(...rs.map(r => r.bottom)) + pay) };
      }
      if (R) Object.assign(isik.style, { left: R.l + 'px', top: R.t + 'px', width: (R.r - R.l) + 'px', height: (R.b - R.t) + 'px' });
      else Object.assign(isik.style, { left: vw / 2 + 'px', top: vh / 2 + 'px', width: '0px', height: '0px' });
      isik.classList.toggle('bos', !R);
      const W = Math.min(400, vw - 24); balon.style.width = W + 'px'; const H = balon.offsetHeight, ara = 14;
      const yatay = (cx) => Math.max(12, Math.min(vw - W - 12, cx - W / 2)), dikey = (cy) => Math.max(12, Math.min(vh - H - 12, cy - H / 2));
      let x, y;
      if (!R) { x = (vw - W) / 2; y = Math.max(12, (vh - H) / 2); }
      else if (R.b + ara + H <= vh - pay) { y = R.b + ara; x = yatay((R.l + R.r) / 2); }
      else if (R.t - ara - H >= pay) { y = R.t - ara - H; x = yatay((R.l + R.r) / 2); }
      else if (R.r + ara + W <= vw - pay) { x = R.r + ara; y = dikey((R.t + R.b) / 2); }
      else if (R.l - ara - W >= pay) { x = R.l - ara - W; y = dikey((R.t + R.b) / 2); }
      else { x = (vw - W) / 2; y = Math.max(12, vh - H - 12); }
      balon.style.left = x + 'px'; balon.style.top = y + 'px';
    };

    // Hedefi çözer; tanımlı ama bulunamayan (ya da görünmeyen) hedefli adım atlanır.
    const coz = (a) => {
      if (a.goster) { const g = a.goster(); return g && g.kaynak && g.hedef ? { hedefler: [g.kaynak, g.hedef], gosterim: g } : null; }
      if (!a.hedef) return { hedefler: [] };
      const h = [].concat(a.hedef() || []).filter(e => e && e.getClientRects().length);
      return h.length ? { hedefler: h } : null;
    };
    // Tur açıkken ekran değişmez (katman tıklamaları tutar); görünür adımlar baştan bir kez süzülür, numaralar ardışık kalır.
    adimlar = adimlar.filter(a => coz(a));
    if (!adimlar.length) { kok.remove(); document.body.classList.remove('rehber-acik'); return; }
    const git = (yon) => {
      const j = i + yon;
      if (j < 0) return;
      if (j >= adimlar.length) { kapat(); return; }
      const c = coz(adimlar[j]); if (!c) { kapat(); return; }
      gosterimDurdur(); i = j; hedefler = c.hedefler;
      const ilkHedef = hedefler[0]; if (ilkHedef) { const r = ilkHedef.getBoundingClientRect(); if (r.top < 0 || r.bottom > window.innerHeight) ilkHedef.scrollIntoView({ block: 'center' }); }
      const sonAdim = i === adimlar.length - 1, onceVar = i > 0;
      const ileri = M.el('button', { onclick: () => git(1) }, sonAdim ? 'Anladım ✓' : 'İleri ▶');
      balon.innerHTML = '';
      balon.append(
        M.el('div', { class: 'rehber-ust' }, M.el('span', null, 'Rehber'), M.el('span', null, (i + 1) + '/' + adimlar.length)),
        M.el('h3', { id: 'rehber-baslik' }, adimlar[i].baslik),
        M.el('div', { html: M.metin(adimlar[i].metin) }),
        M.el('div', { class: 'buton-satiri' },
          sonAdim ? null : M.el('button', { class: 'ikincil kucuk atla', onclick: kapat }, 'Atla'),
          onceVar ? M.el('button', { class: 'ikincil', onclick: () => git(-1) }, '◀') : null,
          ileri));
      yerlestir(); ileri.focus();
      if (c.gosterim) gosterimBaslat(c.gosterim.kaynak, c.gosterim.hedef);
    };
    const tus = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); kapat(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); git(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); git(-1); }
    };
    aktif = { kok, yerlestir, tus, temizle: gosterimDurdur };
    window.addEventListener('resize', yerlestir); document.addEventListener('keydown', tus, true);
    git(1);
  }

  /* Turu bir kez gösterir (başka bir tur açıksa ya da durum yoksa bekler, işaretlemez). */
  function goster(ad, gecikme) {
    setTimeout(() => {
      const d = M.durum; if (!d || aktif || !turlar[ad]) return;
      d.bayraklar = d.bayraklar || {}; const k = 'rehber_' + ad;
      if (d.bayraklar[k]) return;
      d.bayraklar[k] = true; Durum.kaydet(d);
      baslat(turlar[ad]());
    }, gecikme === undefined ? 350 : gecikme);
  }
  /* Tüm turları yeniden gösterilecek hâle getirir ve harita turunu başlatır. */
  function yenidenBaslat() {
    const d = M.durum; if (d && d.bayraklar) Object.keys(d.bayraklar).filter(k => k.startsWith('rehber_')).forEach(k => delete d.bayraklar[k]);
    if (d) Durum.kaydet(d);
    goster('harita', 0);
  }

  return { goster, yenidenBaslat, baslat, kapat, acik: () => !!aktif };
})();
