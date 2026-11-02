/* Dünya sahnesi (tip: "dunya"): kuşbakışı 2D RPG modu.
   - Canvas karo haritası, kamera, yürüyen oyuncu (klavye / dokunmatik / tıkla-yürü)
   - NPC'ler yollardan gelir, zaviye önünde bekler; konuşunca karakter sahnesi (diyalog) açılır
   - Çiftçilik: ek / hasat, üzüm toplama, ocakta yemek, ders; tabelada inşa; kapıda uyu (yıl biter)
   - Hava (kış, kuraklık, savaş), ara sahne (gaziler), yıl sonu hesabı (Ekonomi), bölge haritası (Bolge)
   İçerik: sahne.dunya (harita, nesneler), sahne.turlar, sahne.kurallar, sahne.yapilar, karakterSahneleri, olaylar */
(function () {
  const M = Motor;
  const KARO = 32; let GOR_W = 30, GOR_H = 17, ZOOM = 1; // görünür karo sayısı ve ölçek (boyutla() günceller)

  function turDurumuYeni() {
    return { olayKarti: false, konus: {}, bolge: {}, atamalar: {}, emekHarcanan: 0, olayBitti: false, figurGeldi: {}, haberGosterildi: false, bagToplandi: {} };
  }

  Sahneler.dunya = function (s, kok) {
    const d = M.durum;
    const K = s.kurallar, DU = s.dunya, turlar = s.turlar;
    if (Sahneler._dunyaDurdur) Sahneler._dunyaDurdur();

    /* ---------- Durum ---------- */
    if (!d.kaynaklar) d.kaynaklar = Object.assign({}, s.kaynaklar.baslangic);
    if (d.turIndex === undefined) d.turIndex = 0;
    if (!d.turDurum) d.turDurum = turDurumuYeni();
    const TD = d.turDurum;
    ['figurGeldi', 'bagToplandi', 'atamalar', 'konus', 'bolge'].forEach(k => { if (!TD[k]) TD[k] = {}; });
    if (!d.yerlesim) d.yerlesim = {};
    if (!d.tarlalar) d.tarlalar = [];
    if (!d.gunluk) d.gunluk = [];
    if (!d.hedefler) d.hedefler = {};
    if (!d.defter) d.defter = { kartlar: [], isaretler: {} };
    if (!d.turDurum.tanik) d.turDurum.tanik = {};
    if (!d.dunya) d.dunya = { oyuncu: { x: DU.oyuncuBaslangic[0] * KARO + 16, y: DU.oyuncuBaslangic[1] * KARO + 24, yon: 0 }, parseller: {} };
    M.icerik.kaynakAdlari = s.kaynaklar.adlar;
    Durum.kaydet(d);
    if (d.turIndex >= turlar.length) { M.sonraki(); return; }
    const tur = turlar[d.turIndex];
    const Z = tur.zorluk || {};
    const A = s.kaynaklar.ikonlar;
    const gAd = (k) => M.icerik.gostergeAdlari[k] || k;

    /* ---------- Harita ---------- */
    const satirlar = DU.harita;
    const HY = satirlar.length, HX = satirlar[0].length;
    const kar = (x, y) => (x < 0 || y < 0 || x >= HX || y >= HY) ? 'T' : satirlar[y][x];
    const tipAd = (ch) => DU.lejant[ch] || 'ot';
    const haneYerleri = [];
    for (let y = 0; y < HY; y++) for (let x = 0; x < HX; x++) if (kar(x, y) === 'H') haneYerleri.push({ x, y });
    const haneSayisi = () => Math.min(d.kaynaklar.haneler, haneYerleri.length);
    const haneVar = (x, y) => { const i = haneYerleri.findIndex(p => p.x === x && p.y === y); return i >= 0 && i < haneSayisi(); };
    const arsaAt = (x, y) => DU.arsalar.find(a => a.x === x && a.y === y);
    const yapiAt = (x, y) => { // yerleştirilmiş 2x2 yapı
      for (const [id, p] of Object.entries(d.yerlesim)) if (x >= p.x && x <= p.x + 1 && y >= p.y && y <= p.y + 1) return { id, p };
      for (const sy of (DU.sabitYapilar || [])) if (x >= sy.x && x <= sy.x + 1 && y >= sy.y && y <= sy.y + 1) return { id: sy.tip, p: sy, sabit: true };
      return null;
    };
    const parselAnahtar = (x, y) => x + ',' + y;
    const parselMi = (x, y) => kar(x, y) === 'F' || d.tarlalar.some(p => p.x === x && p.y === y);
    const parsel = (x, y) => { const k = parselAnahtar(x, y); if (!d.dunya.parseller[k]) d.dunya.parseller[k] = { durum: 'bos', kalan: 0 }; return d.dunya.parseller[k]; };
    const parselSayisi = () => { let n = 0; for (let y = 0; y < HY; y++) for (let x = 0; x < HX; x++) if (kar(x, y) === 'F') n++; return n + d.tarlalar.length; };

    const KATI = new Set(['T', 't', '^', 'r', '~', 'W', 'R', 'D', 'P', 'C', 'G', 'O', 'K', 'A']);
    const kati = (x, y) => {
      const ch = kar(x, y);
      if (ch === 'H') return haneVar(x, y);
      if (yapiAt(x, y)) return true;
      return KATI.has(ch);
    };
    const yurunur = (x, y) => x >= 0 && y >= 0 && x < HX && y < HY && !kati(x, y);

    /* BFS yol bulma (karo) */
    const yolBul = (bx, by, hx, hy) => {
      if (!yurunur(hx, hy)) return null;
      const anahtar = (x, y) => x + ',' + y;
      const onceki = {}; onceki[anahtar(bx, by)] = null;
      const kuyruk = [[bx, by]];
      while (kuyruk.length) {
        const [x, y] = kuyruk.shift();
        if (x === hx && y === hy) {
          const yol = []; let k = anahtar(x, y);
          while (k) { const [px, py] = k.split(',').map(Number); yol.push({ x: px, y: py }); k = onceki[k]; }
          return yol.reverse().slice(1);
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, nk = anahtar(nx, ny);
          if (nk in onceki || !yurunur(nx, ny)) continue;
          onceki[nk] = anahtar(x, y); kuyruk.push([nx, ny]);
        }
      }
      return null;
    };
    const enYakinYurunur = (tx, ty, bx, by) => {
      const adaylar = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => [tx + dx, ty + dy]).filter(([x, y]) => yurunur(x, y));
      adaylar.sort((a, b) => (Math.abs(a[0] - bx) + Math.abs(a[1] - by)) - (Math.abs(b[0] - bx) + Math.abs(b[1] - by)));
      return adaylar[0] || null;
    };

    /* ---------- Yardımcılar (ekonomi) ---------- */
    const toplamEmek = () => K.temelEmek + Math.min(d.kaynaklar.haneler, K.enCokHaneEmek);
    const kullanilanEmek = () => Object.values(TD.atamalar).reduce((a, b) => a + b, 0) + TD.emekHarcanan;
    const kalanEmek = () => toplamEmek() - kullanilanEmek();
    const isEnCok = (isId) => { const is = K.isler[isId]; if (is.enCokTarlaSayisiKadar) return parselSayisi(); if (is.yapiGerekli && !d.yapilar.includes(is.yapiGerekli)) return 0; return is.enCok || 0; };
    const odenebilir = (maliyet) => Object.entries(maliyet || {}).every(([k, v]) => (d.kaynaklar[k] || 0) >= v);
    const gunlukYaz = (satir) => {
      let g = d.gunluk.find(x => x.turId === tur.id);
      if (!g) { g = { turId: tur.id, yil: tur.yil, baslik: tur.baslik, satirlar: [] }; d.gunluk.push(g); }
      g.satirlar.push(satir); Durum.kaydet(d);
    };
    const karStil = (ad) => ((M.icerik.karakterler || {})[ad] || {}).stil || { giysi: '#777', sapka: 'kulah' };

    /* ---------- DOM: canvas + HUD ---------- */
    const canvas = M.el('canvas', { class: 'dunya-canvas', width: GOR_W * KARO, height: GOR_H * KARO, tabindex: '0' });
    document.body.classList.add('dunya-modu');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const hudSol = M.el('div', { class: 'hud hud-sol' });
    const hudSag = M.el('div', { class: 'hud hud-sag' });
    const istem = M.el('div', { class: 'hud hud-istem gizli' });
    const bildirimKutusu = M.el('div', { class: 'bildirimler' });
    const dpad = M.el('div', { class: 'dpad' },
      M.el('button', { class: 'dpad-b yukari', 'data-yon': 'yukari' }, '▲'), M.el('button', { class: 'dpad-b sol', 'data-yon': 'sol' }, '◀'),
      M.el('button', { class: 'dpad-b sag', 'data-yon': 'sag' }, '▶'), M.el('button', { class: 'dpad-b asagi', 'data-yon': 'asagi' }, '▼'));
    const eylemButonu = M.el('button', { class: 'eylem-butonu' }, 'E');
    const hudAraclar = M.el('div', { class: 'hud hud-araclar' },
      M.el('button', { class: 'hud-buton', title: 'Yıl bilgisi', onclick: () => yilBilgisi() }, 'ℹ️'),
      M.el('button', { class: 'hud-buton', title: 'Nasıl oynanır', onclick: () => yardim() }, '❓'),
      M.el('button', { class: 'hud-buton', title: 'Tam ekran', onclick: () => tamEkran() }, '⛶'),
      M.el('button', { class: 'hud-buton defter', title: 'Görüş defteri', onclick: () => defterAc() }, '📖 Defter'));
    const sarici = M.el('div', { class: 'dunya-sarici' }, canvas, hudSol, hudSag, hudAraclar, istem, bildirimKutusu, dpad, eylemButonu);
    /* Görünür alanı pencereye göre ayarla (tam ekran dahil) */
    const boyutla = () => {
      const ust = document.getElementById('ust-panel');
      const w = Math.max(320, Math.min(1920, sarici.clientWidth || window.innerWidth));
      const h = Math.max(240, window.innerHeight - (ust ? ust.offsetHeight : 0));
      canvas.width = w; canvas.height = h;
      canvas.style.height = h + 'px';
      ctx.imageSmoothingEnabled = false;
      // Harita pencereden küçükse büyüt (piksel görünümünü koruyarak)
      ZOOM = Math.max(1, Math.min(w / (HX * KARO), h / (HY * KARO)));
      ZOOM = Math.round(ZOOM * 4) / 4;
      GOR_W = Math.ceil(w / ZOOM / KARO) + 1; GOR_H = Math.ceil(h / ZOOM / KARO) + 1;
    };
    const tamEkran = () => {
      const el = document.documentElement;
      if (!document.fullscreenElement) { (el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).catch(() => bildir('Tarayıcı tam ekrana izin vermedi; F11 deneyin.')); }
      else document.exitFullscreen();
    };
    window.addEventListener('resize', boyutla); document.addEventListener('fullscreenchange', boyutla);
    const altPanel = M.el('div', { class: 'dunya-panel' });

    const bildir = (metin, sinif, sure) => {
      if ([...bildirimKutusu.children].some(c => c.textContent === metin)) return; // aynı mesajı yığma
      const b = M.el('div', { class: 'bildirim ' + (sinif || '') }, metin);
      bildirimKutusu.append(b);
      setTimeout(() => b.classList.add('kayboluyor'), (sure || 4500) - 600);
      setTimeout(() => b.remove(), sure || 4500);
    };

    const hudCiz = () => {
      hudSol.innerHTML = '';
      ['erzak', 'gumus', 'haneler'].forEach(k => hudSol.append(M.el('span', { class: 'hud-cip', title: s.kaynaklar.aciklamalar[k] }, A[k] + ' ' + d.kaynaklar[k])));
      hudSol.append(M.el('span', { class: 'hud-cip emek' + (kalanEmek() > 0 ? ' var' : ' bitti'), title: 'Enerji (emek): her iş 1 harcar. Bitince uyu.' }, '💪 ' + kalanEmek() + '/' + toplamEmek()));
      hudSag.innerHTML = '';
      hudSag.append(M.el('div', { class: 'hud-yil' }, (tur.hava ? tur.hava.ikon + ' ' : '') + tur.yil + ' · ' + tur.baslik + ' · ' + (d.turIndex + 1) + '/' + turlar.length));
      if (tur.hedef) hudSag.append(M.el('div', { class: 'hud-hedef' }, '🎯 ' + tur.hedef.metin));
      const tanikToplam = (tur.tanikler || []).length, tanikAlinan = (tur.tanikler || []).filter(t => TD.tanik[t.id]).length;
      if (tanikToplam) hudSag.append(M.el('div', { class: 'hud-isler' }, '🗣️ Tanıklar: ' + tanikAlinan + '/' + tanikToplam + ' · 📖 Defter: ' + d.defter.kartlar.length + ' kart'));
      hudAraclar.querySelector('.defter').textContent = '📖 Defter (' + d.defter.kartlar.length + ')';
      const isler = [];
      if (tur.olayKarti && !TD.olayKarti) isler.push('📜 ' + tur.olayKarti.baslik + (tur.olayKarti.gelen ? ' (gelenlerle konuş)' : ''));
      (tur.gorevler || []).forEach(g => {
        if (g.tip === 'konus' && !TD.konus[g.sahne]) isler.push('💬 ' + g.etiket);
        if (g.tip === 'bolge' && !TD.bolge[g.id]) isler.push('🗺️ ' + g.baslik + ' (kapıdaki haritada)');
      });
      if (isler.length) hudSag.append(M.el('div', { class: 'hud-isler' }, isler.map(x => M.el('div', null, x))));
      else hudSag.append(M.el('div', { class: 'hud-isler tamam' }, '✅ Görevler tamam. Kapıda uyuyup yılı bitirebilirsin.'));
    };

    const altPanelCiz = () => {
      altPanel.innerHTML = '';
      altPanel.append(M.el('div', { class: 'dunya-panel-ic' },
        M.el('div', null,
          M.el('h3', null, '🎮 Nasıl oynanır'),
          M.el('ul', { class: 'ipucu-listesi' }, DU.ipuclari.map(x => M.el('li', null, x))),
          M.el('p', { class: 'ipucu' }, DU.aciklama)),
        M.el('div', null,
          M.el('h3', null, '📯 Bu yıl'),
          tur.haber ? M.el('div', { class: 'haber-kutusu' }, M.el('b', null, tur.haber.kim + ': '), tur.haber.metin) : null,
          Z.ad ? M.el('div', { class: 'sabit-uyari' }, (Z.ikon || '⚠️') + ' ' + Z.ad + ': ' + Z.aciklama) : null,
          tur.sabitOlay ? M.el('p', null, '📌 Yıl sonunda sabit olay: ' + s.olaylar[tur.sabitOlay].baslik) : null,
          M.el('div', { class: 'buton-satiri', style: 'justify-content:flex-start' },
            M.el('button', { class: 'ikincil', onclick: () => bolgeAc() }, '🗺️ Bölge haritası'),
            M.el('button', { class: 'ikincil', onclick: () => gunlukAc() }, '📜 Günlük'),
            M.el('button', { onclick: () => uyu() }, '😴 Uyu ve yılı bitir')))));
    };

    const yilBilgisi = () => {
      const govde = M.el('div', null,
        M.el('div', { html: M.metin(tur.giris) }),
        tur.haber ? M.el('div', { class: 'haber-kutusu' }, M.el('b', null, '📯 ' + tur.haber.kim + ': '), tur.haber.metin) : null,
        tur.hedef ? M.el('div', { class: 'hedef-kutusu' }, M.el('b', null, '🎯 Hedef: '), tur.hedef.metin) : null,
        Z.ad ? M.el('div', { class: 'sabit-uyari' }, (Z.ikon || '⚠️') + ' ' + Z.ad + ': ' + Z.aciklama) : null,
        tur.sabitOlay ? M.el('p', null, '📌 Yıl sonunda sabit olay: ' + s.olaylar[tur.sabitOlay].baslik) : null,
        ilerleme.cloneNode(true));
      M.modal('Tur ' + (d.turIndex + 1) + '/' + turlar.length + ' · ' + tur.yil + ' · ' + tur.baslik, govde.innerHTML);
    };
    const yardim = () => M.modal('🎮 Nasıl oynanır', '<ul class="ipucu-listesi">' + DU.ipuclari.map(x => '<li>' + x + '</li>').join('') + '</ul><p>' + DU.aciklama + '</p><p>⛶ düğmesi ya da F11 ile tam ekran.</p>');

    /* ---------- Varlıklar ---------- */
    const O = d.dunya.oyuncu; // { x, y, yon } piksel; ayak merkezi
    let hareket = { yukari: false, asagi: false, sol: false, sag: false };
    let yuruyusKare = 0, yuruyusSayac = 0, zaman = 0, kilitli = false;
    let oyuncuYolu = null, varisEylemi = null;
    const npcler = []; const koyunlar = []; const yolcular = []; let kesit = null;

    const girisNoktasi = (ad) => { const g = DU.girisler[ad] || DU.girisler.yol; return { x: g[0], y: g[1] }; };
    const durakVer = (baslangic) => {
      const D = DU.duraklar;
      if (baslangic === 'zaviye') return { x: D[2][0], y: D[2][1] };
      const g = girisNoktasi(baslangic);
      const zx = DU.girisler.zaviye[0];
      return g.x < zx ? { x: D[0][0], y: D[0][1] } : { x: D[1][0], y: D[1][1] };
    };
    const figurTanimlari = () => {
      const liste = [];
      if (tur.olayKarti && tur.olayKarti.gelen && !TD.olayKarti) liste.push(Object.assign({ id: 'olay_' + tur.olayKarti.id, tetik: 'olay', etiket: tur.olayKarti.baslik }, tur.olayKarti.gelen));
      (tur.gorevler || []).filter(g => g.tip === 'konus' && g.gelen && !TD.konus[g.sahne]).forEach(g => liste.push(Object.assign({ id: 'konus_' + g.sahne, tetik: 'konus', gorev: g, etiket: g.etiket }, g.gelen)));
      return liste;
    };
    const npcOlustur = () => {
      figurTanimlari().forEach(f => {
        if (npcler.some(n => n.id === f.id)) return;
        const durak = durakVer(f.baslangic);
        const bas = f.baslangic === 'zaviye' ? durak : girisNoktasi(f.baslangic);
        const geldi = !!TD.figurGeldi[f.id] || f.baslangic === 'zaviye';
        const n = { id: f.id, ad: f.ad || f.etiket, stil: karStil(f.ad), tetik: f.tetik, gorev: f.gorev, etiket: f.etiket, baslangic: f.baslangic,
          x: (geldi ? durak.x : bas.x) * KARO + 16, y: (geldi ? durak.y : bas.y) * KARO + 24, yon: 0, kare: 0, sayac: 0,
          durum: geldi ? 'bekliyor' : 'geliyor', yol: geldi ? [] : (yolBul(bas.x, bas.y, durak.x, durak.y) || []), hiz: f.ad && karStil(f.ad).at ? 110 : 70 };
        if (!geldi && !n.yol.length) { n.durum = 'bekliyor'; n.x = durak.x * KARO + 16; n.y = durak.y * KARO + 24; }
        npcler.push(n);
      });
    };
    const npcGonder = (n, hedefAd) => {
      let hedef;
      if (hedefAd === 'hane') { const h = haneYerleri[Math.max(0, haneSayisi() - 1)]; hedef = enYakinYurunur(h.x, h.y, Math.floor(n.x / KARO), Math.floor(n.y / KARO)); hedef = hedef ? { x: hedef[0], y: hedef[1] } : girisNoktasi('yol'); }
      else hedef = girisNoktasi(hedefAd);
      n.durum = 'gidiyor';
      n.yol = yolBul(Math.floor(n.x / KARO), Math.floor(n.y / KARO), hedef.x, hedef.y) || [];
      if (!n.yol.length) n.sil = true;
    };
    const koyunOlustur = () => {
      const ka = DU.koyunlar; if (!ka) return;
      for (let i = 0; i < ka.sayi; i++) koyunlar.push({ x: (ka.alan[0] + 1 + i) * KARO + 16, y: (ka.alan[1] + 1) * KARO + 16, hx: null, hy: null, sayac: Math.random() * 2, kare: 0 });
    };
    const yolcuOlustur = () => {
      const ayar = tur.yolcular || {};
      const sayi = ayar.sayi || (1 + Math.floor(d.gostergeler.guven / 30));
      const stiller = ayar.ikonlar ? ayar.ikonlar.map(i => i === '🏇' ? { giysi: '#6b2f2f', sapkaRenk: '#3b3b3b', at: true } : { giysi: '#8a7a5a', sapka: 'kulah', sapkaRenk: '#d9c7a8' })
        : [{ giysi: '#8a7a5a', sapka: 'kulah', sapkaRenk: '#d9c7a8' }, { giysi: '#4e5d8a', sapka: 'ortu', sapkaRenk: '#f0e6d2' }, { giysi: '#2f6b6b', sapka: 'borkCap', sapkaRenk: '#8a4b1f' }];
      const yolSatiri = DU.girisler.yol[1];
      for (let i = 0; i < sayi; i++) {
        const yon = i % 2 ? 1 : -1;
        yolcular.push({ stil: stiller[i % stiller.length], x: Math.random() * HX * KARO, y: yolSatiri * KARO + 24, vx: yon * (40 + Math.random() * 30) * (ayar.hiz || 1), kare: 0, sayac: 0 });
      }
    };
    const tanikOlustur = () => {
      (tur.tanikler || []).forEach(t => {
        if (TD.tanik[t.id] || npcler.some(n => n.id === 'tanik_' + t.id)) return;
        npcler.push({ id: 'tanik_' + t.id, ad: t.ad, stil: t.stil || karStil(t.ad), tetik: 'tanik', tanik: t, etiket: 'Tanık: ' + t.ad,
          x: t.konum[0] * KARO + 16, y: t.konum[1] * KARO + 24, yon: 0, kare: 0, sayac: 0, durum: 'bekliyor', yol: [], hiz: 60, sabit: true });
      });
    };
    npcOlustur(); tanikOlustur(); koyunOlustur(); yolcuOlustur();

    /* ---------- Etkileşim hedefi ---------- */
    const oyuncuKaro = () => ({ x: Math.floor(O.x / KARO), y: Math.floor(O.y / KARO) });
    const YON = [[0, 1], [0, -1], [-1, 0], [1, 0]];
    const etkilesimAdaylari = () => {
      const p = oyuncuKaro();
      const [dx, dy] = YON[O.yon];
      const sira = [[p.x + dx, p.y + dy], [p.x, p.y], ...YON.map(([a, b]) => [p.x + a, p.y + b])];
      for (const [x, y] of sira) {
        const e = karoEtkilesimi(x, y);
        if (e) return e;
      }
      // NPC yakınlık
      for (const n of npcler) if (n.durum === 'bekliyor' && Math.hypot(n.x - O.x, n.y - O.y) < 48) return { tip: 'npc', npc: n, etiket: (n.tetik === 'tanik' ? 'Dinle: ' : 'Konuş: ') + n.ad };
      return null;
    };
    const karoEtkilesimi = (x, y) => {
      const ch = kar(x, y);
      const n = npcler.find(n => n.durum === 'bekliyor' && Math.floor(n.x / KARO) === x && Math.floor(n.y / KARO) === y);
      if (n) return { tip: 'npc', npc: n, etiket: (n.tetik === 'tanik' ? 'Dinle: ' : 'Konuş: ') + n.ad };
      if (parselMi(x, y)) {
        const pr = parsel(x, y);
        if (pr.durum === 'bos') return { tip: 'ek', x, y, etiket: 'Ek (1 💪)' };
        if (pr.durum === 'ekili') return { tip: 'bekle', x, y, etiket: 'Büyüyor… ' + Math.ceil(pr.kalan) + ' sn' };
        return { tip: 'hasat', x, y, etiket: 'Hasat et' };
      }
      if (ch === 'G') return { tip: 'bag', x, y, etiket: TD.bagToplandi[parselAnahtar(x, y)] ? 'Bu asma bu yıl toplandı' : 'Üzüm topla (1 💪)' };
      if (ch === 'O') return { tip: 'ocak', x, y, etiket: 'Yemek pişir (1 💪, 1 🌾)' };
      if (ch === 'K') return { tip: 'kuyu', x, y, etiket: 'Kuyu' };
      if (ch === 'D') return { tip: 'kapi', x, y, etiket: 'Zaviye kapısı' };
      if (ch === 'C') return { tip: 'kilise', x, y, etiket: 'Kozluca kilisesi' };
      if (ch === 'H' && haneVar(x, y)) return { tip: 'hane', x, y, etiket: 'Türkmen hanesi' };
      const ya = yapiAt(x, y);
      if (ya) return { tip: 'yapi', yapi: ya, etiket: ya.sabit ? 'Kozluca evi' : (s.yapilar[ya.id] || {}).ad };
      if (ch === 'A') { const a = arsaAt(x, y); return { tip: 'arsa', arsa: a, x, y, etiket: 'İnşa et: ' + a.etiket }; }
      if ((ch === '.' || ch === ',') && !kati(x, y) && YON.some(([a, b]) => parselMi(x + a, y + b)) && parselSayisi() < K.enCokTarla) return { tip: 'tarlaAc', x, y, etiket: 'Tarla aç (1 💪)' };
      return null;
    };

    const emekHarca = (isId) => {
      if (kalanEmek() <= 0) { bildir('💪 Enerjin bitti. Kapıda uyuyup yılı bitir.', 'kotu'); return false; }
      if (isId && TD.atamalar[isId] >= isEnCok(isId)) { bildir('Bu iş için bu yıl daha fazla emek verilemez (' + isEnCok(isId) + ').', 'kotu'); return false; }
      if (isId) TD.atamalar[isId] = (TD.atamalar[isId] || 0) + 1; else TD.emekHarcanan += 1;
      return true;
    };

    const etkilesim = async (e) => {
      if (!e || kilitli) return;
      const k = parselAnahtar(e.x, e.y);
      switch (e.tip) {
        case 'npc':
          if (e.npc.tetik === 'olay') olayKartiniAc(e.npc); else if (e.npc.tetik === 'tanik') tanikDinle(e.npc); else konusmayiAc(e.npc);
          break;
        case 'ek': {
          if (!emekHarca('tarla')) return;
          const pr = parsel(e.x, e.y); pr.durum = 'ekili'; pr.kalan = DU.bitkiSuresi || 12;
          bildir('🌱 Ekildi. Büyümesini bekle.'); break;
        }
        case 'hasat': {
          const pr = parsel(e.x, e.y);
          let m = (K.isler.tarla.uretim.erzak || 3) + (d.bayraklar.alet ? 1 : 0);
          if (Z.tarlaCarpan) m = Math.floor(m * Z.tarlaCarpan);
          pr.durum = 'bos';
          M.kaynakUygula({ erzak: m });
          bildir('🌾 Hasat: +' + m + ' erzak' + (Z.tarlaCarpan ? ' (kuraklık)' : ''), 'iyi');
          gunlukYaz('Hasat: +' + m + ' erzak'); break;
        }
        case 'bekle': bildir('🌱 Büyüyor… ' + Math.ceil(parsel(e.x, e.y).kalan) + ' saniye'); break;
        case 'tarlaAc':
          if (!emekHarca(null)) return;
          d.tarlalar.push({ x: e.x, y: e.y }); gunlukYaz('Yeni tarla açıldı.'); bildir('🌾 Tarla açıldı'); break;
        case 'bag': {
          if (TD.bagToplandi[k]) { bildir('Bu asma bu yıl toplandı.'); return; }
          if (!emekHarca('bag')) return;
          let m = K.isler.bag.uretim.gumus || 1; if (Z.bagCarpan) m = Math.floor(m * Z.bagCarpan);
          TD.bagToplandi[k] = tur.id;
          M.kaynakUygula({ gumus: m });
          bildir('🍇 Üzüm toplandı: +' + m + ' gümüş' + (Z.bagCarpan ? ' (pazar kapalı)' : ''), 'iyi');
          gunlukYaz('Bağ: +' + m + ' gümüş'); break;
        }
        case 'ocak': {
          if (d.kaynaklar.erzak < 1) { bildir('🌾 Erzak yok; önce hasat et.', 'kotu'); return; }
          if (!emekHarca('sofra')) return;
          M.kaynakUygula({ erzak: -1 }); M.etkiUygula(K.isler.sofra.etki, { tur: 'is', baslik: tur.yil, secim: 'sofra' });
          bildir('🍲 Yolcular doydu: Güven +' + K.isler.sofra.etki.guven, 'iyi'); gunlukYaz('Misafir sofrası kuruldu.'); break;
        }
        case 'kuyu': bildir('💧 Kuyu suyu soğuk ve temiz.'); break;
        case 'kilise': M.modal('Kozluca', '<p>Rum köyü Kozluca (kurgusal). Çiftçi Yorgi ve komşuları burada yaşar. Uç bölgesinde Türkmen ve Rum köyleri yan yanaydı.</p>'); break;
        case 'hane': M.modal('Türkmen hanesi', '<p>Zaviyenin çevresine yerleşen aileler. Her hane emek verir; iki hane yılda 1 erzak tüketir.</p>'); break;
        case 'yapi': {
          if (e.yapi.sabit) { bildir('Kozluca evi.'); return; }
          const y = s.yapilar[e.yapi.id];
          if (e.yapi.id === 'dersodasi') {
            if (TD.atamalar.dersodasi >= 1) { bildir('Bu yıl ders verildi.'); return; }
            if (!emekHarca('dersodasi')) return;
            M.etkiUygula(K.isler.dersodasi.etki, { tur: 'is', baslik: tur.yil, secim: 'ders' });
            bildir('📖 Ders verildi: İlim +' + K.isler.dersodasi.etki.ilim, 'iyi'); gunlukYaz('Ders odasında ders verildi.'); return;
          }
          M.modal(y.ikon + ' ' + y.ad, M.metin(y.aciklama) + M.metin(y.mantik)); break;
        }
        case 'arsa': insaMenusu(e.arsa); break;
        case 'kapi': kapiMenusu(); break;
      }
      Durum.kaydet(d); hudCiz();
    };

    /* ---------- Tanıklık kartları ---------- */
    const tezAd = (id) => (s.tezler.find(t => t.id === id) || {}).tarihci || id;
    const tanikDinle = async (npc) => {
      const t = npc.tanik; const k = t.kart;
      if (t.gerek) {
        const eksik = Object.entries(t.gerek).find(([kk, v]) => (d.kaynaklar[kk] || 0) < v);
        if (eksik) { M.modal(t.ad, '<p>' + t.gerekMetni + '</p><p>Ambarda yeterli erzak yok.</p>'); return; }
        if (kalanEmek() <= 0) { M.modal(t.ad, '<p>' + t.gerekMetni + '</p><p>Enerjin bitti; önce uyu.</p>'); return; }
        const ok = await M.modal(t.ad, '<p>' + t.gerekMetni + '</p>', [{ metin: 'Sofra kur ve dinle', deger: true }, { metin: 'Vazgeç', deger: false }]);
        if (!ok) return;
        M.kaynakUygula(Object.fromEntries(Object.entries(t.gerek).map(([kk, v]) => [kk, -v]))); TD.emekHarcanan += 1;
      }
      kilitli = true;
      const kunye = '<div class="kunye">' + k.kim + ' · ' + k.nerede + ' · ' + k.zaman + ' · ' + (k.tur === 'belge' ? '📜 belge' : '🗣️ sözlü anlatım') + '</div>';
      await M.modal('🗣️ ' + k.baslik, '<div class="tanik-kart">' + kunye + '<p class="tanik-soz">“' + k.metin + '”</p></div><p class="ipucu">💡 Anlatanın çıkarı olabilir mi? Deftere ekleyip görüşünü işaretle.</p>', [{ metin: '📖 Deftere ekle', deger: true }]);
      d.defter.kartlar.push(Object.assign({ id: t.id, turId: tur.id }, k));
      TD.tanik[t.id] = true; npc.sil = true;
      M.etkiUygula({ ilim: 1 }, { tur: 'tanik', baslik: tur.yil, secim: k.baslik });
      gunlukYaz('Tanıklık alındı: ' + k.baslik);
      Durum.kaydet(d); kilitli = false; hudCiz();
      bildir('📖 Deftere eklendi: ' + k.baslik + ' (İlim +1)', 'iyi');
      if (d.defter.kartlar.length === 1) setTimeout(() => defterAc(), 400);
    };

    const defterAc = () => {
      const kaplama = document.getElementById('modal-kaplama');
      const modal = document.getElementById('modal'); modal.classList.add('genis');
      document.getElementById('modal-baslik').textContent = '📖 Görüş Defteri';
      const govde = document.getElementById('modal-govde'); govde.innerHTML = '';
      const kartlar = d.defter.kartlar;
      if (!kartlar.length) govde.append(M.el('p', null, 'Henüz tanıklık yok. Haritadaki "?" işaretli kişileri dinle.'));
      // Tez özeti
      const ozet = M.el('div', { class: 'defter-tezler' });
      const ozetCiz = () => {
        ozet.innerHTML = '';
        s.tezler.forEach(t => {
          const n = kartlar.filter(k => (d.defter.isaretler[k.id] || {}).tez === t.id).length;
          ozet.append(M.el('div', { class: 'tez-satir' }, M.el('b', null, t.tarihci + ': '), M.el('span', { class: 'tez-kisa' }, t.kisa),
            M.el('div', { class: 'cubuk' }, M.el('div', { style: 'width:' + Math.min(100, n * 20) + '%; background:' + t.renk })), M.el('span', { class: 'tez-sayi' }, n + ' kart')));
        });
      };
      ozetCiz();
      govde.append(M.el('p', { class: 'ipucu' }, 'Her tanıklık için hangi tarihçinin görüşünü desteklediğini ve ne kadar güvenilir olduğunu işaretle. Çelişen tanıklıklar olabilir; bu normaldir.'), ozet);
      kartlar.slice().reverse().forEach(k => {
        const isr = d.defter.isaretler[k.id] = d.defter.isaretler[k.id] || {};
        const gb = M.el('div', { class: 'geri-bildirim ' + (isr.tez ? '' : 'gizli') });
        const gbYaz = () => { if (!isr.tez) return; gb.classList.remove('gizli'); gb.innerHTML = (k.tezler.includes(isr.tez) ? '✅ ' : '🤔 ') + M.metin(k.aciklama) + (isr.tez && !k.tezler.includes(isr.tez) ? '<p>Bu kartı ' + tezAd(isr.tez) + ' tezine bağladın; kartı yeniden oku, başka bir görüşe daha yakın olabilir. Yine de gerekçen varsa kalabilir.</p>' : ''); };
        gbYaz();
        const tezSec = M.el('select', { onchange: e => { isr.tez = e.target.value; Durum.kaydet(d); gbYaz(); ozetCiz(); } },
          M.el('option', { value: '' }, 'Hangi görüşü destekler?'), s.tezler.map(t => M.el('option', { value: t.id, selected: isr.tez === t.id ? 'selected' : null }, t.tarihci + ': ' + t.kisa)));
        const guvSec = M.el('select', { onchange: e => { isr.guven = e.target.value; Durum.kaydet(d); } },
          M.el('option', { value: '' }, 'Güvenilirlik?'), s.guvenilirlik.map(g => M.el('option', { value: g.id, selected: isr.guven === g.id ? 'selected' : null, title: g.aciklama }, g.ad + ' · ' + g.aciklama)));
        govde.append(M.el('div', { class: 'tanik-kart' },
          M.el('div', { class: 'kunye' }, k.kim + ' · ' + k.nerede + ' · ' + k.zaman + ' · ' + (k.tur === 'belge' ? '📜 belge' : '🗣️ sözlü')),
          M.el('b', null, k.baslik), M.el('p', { class: 'tanik-soz' }, '“' + k.metin + '”'),
          M.el('p', { class: 'ipucu' }, '🎭 Çıkar: ' + k.cikar),
          M.el('div', { class: 'defter-secimler' }, tezSec, guvSec), gb));
      });
      const b = document.getElementById('modal-butonlar'); b.innerHTML = '';
      b.append(M.el('button', { onclick: () => { kaplama.classList.add('gizli'); modal.classList.remove('genis'); hudCiz(); } }, 'Kapat'));
      kaplama.classList.remove('gizli');
    };

    /* ---------- Vakfiye yazıcı ---------- */
    const vakfiyeYaz = () => new Promise(resolve => {
      const VM = s.vakfiyeMaddeleri; if (!VM || d.vakfiye) { resolve(); return; }
      kilitli = true;
      const kaplama = document.getElementById('modal-kaplama');
      const modal = document.getElementById('modal'); modal.classList.add('genis');
      document.getElementById('modal-baslik').textContent = '📜 Vakfiyeyi yazdır';
      const govde = document.getElementById('modal-govde'); govde.innerHTML = '';
      const secimler = {};
      const onizleme = M.el('div', { class: 'belge vakfiye' });
      const onizlemeCiz = () => {
        const maddeler = VM.map(m => { const sec = m.secenekler.find(x => x.id === secimler[m.id]); return sec ? sec.madde : '…'; });
        onizleme.innerHTML = '<h3>Akçaköy Zaviyesi Vakfiyesi</h3><div class="kunye">Hicri 701 · Kadı huzurunda</div><p>Yahya oğlu Şeyh Yahya, Akçaköy\'deki bağını, dere üzerindeki değirmenin yarım hissesini ve zaviye avlusunu Allah rızası için vakfetti.</p>' + maddeler.map(m => '<p>' + m + '</p>').join('') + '<p>Bu şartları değiştiren, satan ya da bozan kimse Allah\'ın ve insanların huzurunda sorumludur.</p>';
      };
      onizlemeCiz();
      govde.append(M.el('p', null, 'Şeyh şartları sana bıraktı. Her madde için bir seçenek işaretle; belge sağda oluşacak. Bu vakfiye oyunun sonundaki kaynak görevinde karşına çıkacak.'));
      const form = M.el('div', { class: 'vakfiye-form' });
      VM.forEach(m => {
        const grup = M.el('div', { class: 'soru' }, M.el('h3', null, m.baslik), M.el('div', { class: 'secenekler' },
          m.secenekler.map(sec => M.el('button', { class: 'secenek', onclick: (e) => { secimler[m.id] = sec.id; grup.querySelectorAll('.secenek').forEach(x => x.classList.remove('secildi')); e.currentTarget.classList.add('secildi'); onizlemeCiz(); muhur.disabled = Object.keys(secimler).length < VM.length; } }, sec.metin))));
        form.append(grup);
      });
      govde.append(M.el('div', { class: 'vakfiye-duzen' }, form, onizleme));
      const b = document.getElementById('modal-butonlar'); b.innerHTML = '';
      const muhur = M.el('button', { disabled: 'disabled', onclick: () => {
        const etki = {}; const maddeler = [];
        VM.forEach(m => { const sec = m.secenekler.find(x => x.id === secimler[m.id]); maddeler.push(sec.madde); Object.entries(sec.etki || {}).forEach(([k, v]) => etki[k] = (etki[k] || 0) + v); });
        d.vakfiye = { secimler: Object.assign({}, secimler), maddeler, metin: onizleme.innerText };
        M.etkiUygula(etki, { tur: 'vakfiye', baslik: 'Vakfiye', secim: 'şartlar' });
        gunlukYaz('Vakfiye kadı huzurunda yazıldı: ' + maddeler.length + ' madde.');
        Durum.kaydet(d); kaplama.classList.add('gizli'); modal.classList.remove('genis'); kilitli = false; hudCiz(); resolve();
        M.modal('Vakfiye mühürlendi', '<p>Belge kadı sicilinde. Yıllar sonra biri "bu zaviye nasıl kuruldu" diye sorarsa önce bu belgeye bakacak.</p><p>' + M.etkiRozetleri(etki).map(e => e.outerHTML).join(' ') + '</p>');
      } }, '🔏 Mühürle');
      b.append(muhur);
      kaplama.classList.remove('gizli');
    });

    /* ---------- Savaş yorumu: neden sıralama + tahmin ---------- */
    const yorumEkrani = (olay) => new Promise(resolve => {
      const Y = olay.yorum; if (!Y) { resolve(); return; }
      const kaplama = document.getElementById('modal-kaplama');
      const modal = document.getElementById('modal'); modal.classList.add('genis');
      document.getElementById('modal-baslik').textContent = '🧭 ' + Y.baslik;
      const govde = document.getElementById('modal-govde'); govde.innerHTML = '';
      const toplanan = new Set(d.defter.kartlar.map(k => k.neden).filter(Boolean));
      const sira = [];
      govde.append(M.el('div', { html: M.metin(Y.giris) }));
      const liste = M.el('div', { class: 'secenekler' });
      const siraKutu = M.el('div', { class: 'neden-sira' });
      const siraCiz = () => { siraKutu.innerHTML = ''; sira.forEach((id, i) => { const n = s.nedenler.find(x => x.id === id); siraKutu.append(M.el('span', { class: 'etiket' }, (i + 1) + '. ' + n.ikon + ' ' + n.ad)); }); if (!sira.length) siraKutu.append(M.el('span', { class: 'ipucu' }, 'Sırayla üç etken seç.')); };
      s.nedenler.forEach(n => {
        const var_ = toplanan.has(n.id);
        liste.append(M.el('button', { class: 'secenek', onclick: (e) => { if (sira.includes(n.id) || sira.length >= 3) return; sira.push(n.id); e.currentTarget.classList.add('secildi'); siraCiz(); bitir.disabled = sira.length < 3 || !gerekce.value.trim(); } },
          n.ikon + ' ' + n.ad, M.el('span', { class: 'alt-metin' }, var_ ? '📖 Defterinde bu etkene dair tanıklık var.' : 'Bu etkene dair tanıklık toplamadın; yine de seçebilirsin.')));
      });
      siraCiz();
      const gerekce = M.el('textarea', { placeholder: 'Gerekçeni yaz...', oninput: () => { bitir.disabled = sira.length < 3 || !gerekce.value.trim(); } });
      govde.append(liste, siraKutu, M.el('h3', null, Y.gerekceSoru), gerekce);
      const b = document.getElementById('modal-butonlar'); b.innerHTML = '';
      const bitir = M.el('button', { disabled: 'disabled', onclick: async () => {
        d.cevaplar['neden_sira_' + olay.id] = sira.map(id => s.nedenler.find(x => x.id === id).ad).join(' > ');
        d.cevaplar['neden_gerekce_' + olay.id] = gerekce.value;
        Durum.kaydet(d); kaplama.classList.add('gizli'); modal.classList.remove('genis');
        // Tahmin
        if (Y.tahmin) {
          const sec = await new Promise(r2 => {
            document.getElementById('modal-baslik').textContent = '🔮 Tahmin et';
            govde.innerHTML = M.metin(Y.tahmin.soru);
            const l = M.el('div', { class: 'secenekler' });
            Y.tahmin.secenekler.forEach(sc => l.append(M.el('button', { class: 'secenek', onclick: () => { kaplama.classList.add('gizli'); r2(sc); } }, sc.metin)));
            govde.append(l); b.innerHTML = ''; kaplama.classList.remove('gizli');
          });
          d.cevaplar['tahmin_' + olay.id] = sec.metin; Durum.kaydet(d);
          await M.modal(sec.dogru ? '✅ Tarihte böyle oldu' : '📖 Tarihte olan', M.metin(sec.aciklama) + (sec.dogru ? '' : '<p><b>Tarihte:</b> ' + Y.tahmin.secenekler.find(x => x.dogru).metin + '.</p>'));
        }
        resolve();
      } }, 'Sıralamayı kaydet');
      b.append(bitir);
      kaplama.classList.remove('gizli');
    });

    /* ---------- İnşa ---------- */
    const insaMenusu = async (arsa) => {
      const secim = await new Promise(resolve => {
        const kaplama = document.getElementById('modal-kaplama');
        document.getElementById('modal-baslik').textContent = '🏗️ İnşa: ' + arsa.etiket;
        const govde = document.getElementById('modal-govde');
        govde.innerHTML = '<p>Bu arsaya hangi yapı kurulsun? Komşular: ' + (arsa.komsular.length ? arsa.komsular.join(', ') : 'yok') + '.</p>';
        const liste = M.el('div', { class: 'secenekler' });
        Object.entries(s.yapilar).forEach(([id, y]) => {
          if (d.yapilar.includes(id)) return;
          const onKosul = y.gerekliYapi && !d.yapilar.includes(y.gerekliYapi) ? 'Önce ' + s.yapilar[y.gerekliYapi].ad : null;
          const yerKosul = y.gerekliKomsu && !arsa.komsular.includes(y.gerekliKomsu) ? y.gerekliKomsu + ' kenarı gerekir' : null;
          const para = odenebilir(y.maliyet) ? null : 'Yetersiz kaynak';
          const engel = onKosul || yerKosul || para;
          const maliyet = Object.entries(y.maliyet || {}).map(([k, v]) => v + ' ' + A[k]).join(' + ');
          const bonus = y.komsuBonus && arsa.komsular.includes(y.komsuBonus.tip) ? ' ⭐ ' + y.komsuBonus.metin : '';
          liste.append(M.el('button', { class: 'secenek', disabled: engel ? 'disabled' : null, onclick: () => { kaplama.classList.add('gizli'); resolve(id); } },
            y.ikon + ' ' + y.ad + ' · ' + maliyet, M.el('span', { class: 'alt-metin' }, (engel ? '🔒 ' + engel + '. ' : '') + y.aciklama + bonus)));
        });
        govde.append(liste);
        const b = document.getElementById('modal-butonlar'); b.innerHTML = '';
        b.append(M.el('button', { class: 'ikincil', onclick: () => { kaplama.classList.add('gizli'); resolve(null); } }, 'Vazgeç'));
        kaplama.classList.remove('gizli');
      });
      if (!secim) return;
      const y = s.yapilar[secim];
      Object.entries(y.maliyet || {}).forEach(([k, v]) => d.kaynaklar[k] -= v);
      d.yapilar.push(secim); d.yerlesim[secim] = { x: arsa.x, y: arsa.y, arsa: arsa.id };
      let bonusMetin = '';
      if (y.komsuBonus && arsa.komsular.includes(y.komsuBonus.tip)) {
        d.bayraklar['bonus_' + secim] = true;
        if (y.komsuBonus.etki) M.etkiUygula(y.komsuBonus.etki, { tur: 'yapi', baslik: y.ad, secim: 'konum bonusu' });
        bonusMetin = '<p><b>Konum:</b> ' + y.komsuBonus.metin + '</p>';
      }
      gunlukYaz(y.ad + ' kuruldu.'); Durum.kaydet(d); hudCiz();
      bildir(y.ikon + ' ' + y.ad + ' kuruldu', 'iyi');
      await M.modal(y.ad + ' kuruldu', M.metin(y.mantik) + bonusMetin);
    };

    /* ---------- Kapı menüsü, bölge, günlük ---------- */
    const kapiMenusu = async () => {
      const sec = await M.modal('🏠 Zaviye', '<p>Ne yapmak istiyorsun?</p>', [
        { metin: '😴 Uyu ve yılı bitir', deger: 'uyu' }, { metin: '🗺️ Bölge haritası', deger: 'bolge' }, { metin: '📜 Günlük', deger: 'gunluk' }, { metin: 'Vazgeç', deger: null }]);
      if (sec === 'uyu') uyu(); else if (sec === 'bolge') bolgeAc(); else if (sec === 'gunluk') gunlukAc();
    };
    const bekleyenBolge = () => (tur.gorevler || []).filter(g => g.tip === 'bolge' && !TD.bolge[g.id]);
    const bolgeAc = async () => {
      const kaplama = document.getElementById('modal-kaplama');
      const modal = document.getElementById('modal'); modal.classList.add('genis');
      document.getElementById('modal-baslik').textContent = '🗺️ ' + s.bolge.baslik;
      const govde = document.getElementById('modal-govde'); govde.innerHTML = '';
      const bekleyen = bekleyenBolge();
      if (bekleyen.length) govde.append(M.el('p', { class: 'hedef-kutusu' }, '❗ ' + bekleyen[0].baslik + ': ' + bekleyen[0].soru));
      govde.append(Bolge.ciz(s, d, d.turIndex, bekleyen, async (gorev, yer, sec) => {
        M.kararKaydet(gorev.id, Object.assign({ yer: yer.id }, sec), gorev.baslik);
        d.kararlar[gorev.id].yer = yer.id; TD.bolge[gorev.id] = true;
        gunlukYaz(gorev.baslik + ': ' + sec.metin); Durum.kaydet(d);
        kaplama.classList.add('gizli'); modal.classList.remove('genis');
        await M.mantikModali(sec); hudCiz();
      }));
      const b = document.getElementById('modal-butonlar'); b.innerHTML = '';
      b.append(M.el('button', { onclick: () => { kaplama.classList.add('gizli'); modal.classList.remove('genis'); } }, 'Kapat'));
      kaplama.classList.remove('gizli');
    };
    const gunlukAc = () => {
      const g = d.gunluk.map(x => '<p><b>' + x.yil + ' · ' + x.baslik + '</b></p><ul>' + x.satirlar.map(y => '<li>' + y + '</li>').join('') + '</ul>').join('') || '<p>Henüz bir şey yazılmadı.</p>';
      M.modal('📜 Vakıf günlüğü', g);
    };

    /* ---------- Alt sahne (diyalog / olay) ---------- */
    const altSahneAc = (cizici, sahneVerisi, onBitti) => {
      kilitli = true; hareket = { yukari: false, asagi: false, sol: false, sag: false };
      const kaplama = M.el('div', { class: 'alt-sahne' + (sahneVerisi.arka === 'gece' ? ' gece' : '') });
      const ic = M.el('div', { class: 'alt-sahne-ic' }); kaplama.append(ic);
      document.body.append(kaplama); document.body.classList.add('alt-sahne-acik');
      cizici.call(Sahneler, sahneVerisi, ic, () => { kaplama.remove(); document.body.classList.remove('alt-sahne-acik'); kilitli = false; onBitti(); });
    };
    const konusmayiAc = (npc) => {
      const gorev = npc.gorev; const sahne = s.karakterSahneleri[gorev.sahne];
      altSahneAc(Sahneler.karakter, sahne, () => {
        const soru = sahne.adimlar.find(a => a.soru);
        if (soru && d.kararlar[soru.soru.id]) gunlukYaz(sahne.baslik + ': ' + d.kararlar[soru.soru.id].etiket);
        TD.konus[gorev.sahne] = true; Durum.kaydet(d);
        npcGonder(npc, npc.baslangic); hudCiz();
        if (gorev.sahne === 'sahne_vakfiye') setTimeout(() => vakfiyeYaz(), 300);
      });
    };
    const olayKartiniAc = async (npc) => {
      const ok = tur.olayKarti;
      if (!ok) { TD.olayKarti = true; return; }
      kilitli = true;
      if (ok.bilgi || !ok.secenekler) {
        await M.modal('📜 ' + ok.baslik, M.metin(ok.metin) + (ok.kavram ? '<div class="kavram"><b>' + ok.kavram.ad + ':</b> ' + ok.kavram.aciklama + '</div>' : ''));
        TD.olayKarti = true; Durum.kaydet(d); kilitli = false; hudCiz(); return;
      }
      const secim = await new Promise(resolve => {
        const kaplama = document.getElementById('modal-kaplama');
        document.getElementById('modal-baslik').textContent = '📜 ' + ok.baslik;
        const govde = document.getElementById('modal-govde');
        govde.innerHTML = M.metin(ok.metin) + (ok.kavram ? '<div class="kavram"><b>' + ok.kavram.ad + ':</b> ' + ok.kavram.aciklama + '</div>' : '');
        const sec = M.el('div', { class: 'secenekler' });
        ok.secenekler.forEach(sc => sec.append(M.el('button', { class: 'secenek', onclick: () => { kaplama.classList.add('gizli'); resolve(sc); } }, sc.metin, sc.aciklama ? M.el('span', { class: 'alt-metin' }, sc.aciklama) : null)));
        govde.append(sec); document.getElementById('modal-butonlar').innerHTML = ''; kaplama.classList.remove('gizli');
      });
      M.kararKaydet(ok.id, secim, ok.baslik);
      gunlukYaz(ok.baslik + ': ' + secim.metin);
      TD.olayKarti = true; Durum.kaydet(d);
      if (npc) npcGonder(npc, secim.kaynak && secim.kaynak.haneler > 0 ? 'hane' : npc.baslangic);
      await M.mantikModali(secim);
      kilitli = false; hudCiz();
    };

    /* ---------- Yıl sonu ---------- */
    const uyu = async () => {
      if (kilitli) return;
      const eksik = [];
      if (!TD.olayKarti) eksik.push(tur.olayKarti && tur.olayKarti.gelen ? 'Gelenlerle konuş: ' + tur.olayKarti.baslik : 'Olay kartı');
      (tur.gorevler || []).forEach(g => { if (g.tip === 'konus' && !TD.konus[g.sahne]) eksik.push('Konuş: ' + g.etiket); if (g.tip === 'bolge' && !TD.bolge[g.id]) eksik.push('Bölge haritasında: ' + g.baslik); });
      if (eksik.length) { M.modal('Uyumadan önce', '<ul>' + eksik.map(e => '<li>' + e + '</li>').join('') + '</ul>'); return; }
      const olgun = Object.values(d.dunya.parseller).filter(p => p.durum === 'olgun').length;
      const uyari = [];
      if (kalanEmek() > 0) uyari.push(kalanEmek() + ' emek boşta');
      if (olgun) uyari.push(olgun + ' parsel hasat edilmedi');
      const dinlenmeyen = (tur.tanikler || []).filter(t => !TD.tanik[t.id]).length;
      if (dinlenmeyen) uyari.push(dinlenmeyen + ' tanık dinlenmedi (bu yıl gidecekler)');
      const isaretsiz = d.defter.kartlar.filter(k => !(d.defter.isaretler[k.id] || {}).tez).length;
      if (isaretsiz) uyari.push(isaretsiz + ' kart defterde işaretlenmedi');
      if (uyari.length) { const ok = await M.modal('Uyumadan önce', '<p>' + uyari.join(', ') + '. Yine de yılı bitirmek istiyor musun?</p>', [{ metin: 'Önce halledeyim', deger: false }, { metin: 'Yine de uyu', deger: true }]); if (!ok) return; }
      kilitli = true;
      const sonuc = Ekonomi.yilSonu(s, d, tur, TD);
      hudCiz();
      await M.modal('Yıl sonu: ' + tur.yil + ' · ' + tur.baslik, sonuc.html);
      const sonrakiTur = () => {
        d.turIndex += 1; d.turDurum = turDurumuYeni();
        Object.values(d.dunya.parseller).forEach(p => { p.durum = 'bos'; p.kalan = 0; });
        Durum.kaydet(d); M.render();
      };
      if (tur.sabitOlay && !TD.olayBitti) {
        kesitBaslat(tur.sabitOlay, () => altSahneAc(Sahneler.olay, s.olaylar[tur.sabitOlay], async () => { TD.olayBitti = true; Durum.kaydet(d); await yorumEkrani(s.olaylar[tur.sabitOlay]); sonrakiTur(); }));
      } else sonrakiTur();
    };

    /* Ara sahne: ekran kararır, gaziler yoldan geçer, başlık yazılır */
    const kesitBaslat = (olayId, sonra) => {
      const o = s.olaylar[olayId];
      const yolSatiri = DU.girisler.yol[1];
      kesit = { sure: 5, gecen: 0, baslik: o.yil + ' · ' + o.baslik, sonra,
        atlilar: olayId === 'koyunhisar' ? Array.from({ length: 6 }, (_, i) => ({ x: HX * KARO + i * 90, y: yolSatiri * KARO + 24 - (i % 2) * 6, vx: -170 - (i % 3) * 20 })) : [] };
    };

    /* ---------- Girdi ---------- */
    const tusYon = { ArrowUp: 'yukari', ArrowDown: 'asagi', ArrowLeft: 'sol', ArrowRight: 'sag', w: 'yukari', s: 'asagi', a: 'sol', d: 'sag', W: 'yukari', S: 'asagi', A: 'sol', D: 'sag' };
    const modalAcik = () => !document.getElementById('modal-kaplama').classList.contains('gizli');
    const tusBas = (e) => {
      if (modalAcik() || document.querySelector('.alt-sahne')) return;
      if (tusYon[e.key]) { hareket[tusYon[e.key]] = true; oyuncuYolu = null; e.preventDefault(); }
      if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); etkilesim(etkilesimAdaylari()); }
    };
    const tusBirak = (e) => { if (tusYon[e.key]) hareket[tusYon[e.key]] = false; };
    window.addEventListener('keydown', tusBas); window.addEventListener('keyup', tusBirak);
    dpad.querySelectorAll('.dpad-b').forEach(b => {
      const yon = b.dataset.yon;
      const bas = (e) => { e.preventDefault(); hareket[yon] = true; oyuncuYolu = null; };
      const birak = (e) => { e.preventDefault(); hareket[yon] = false; };
      b.addEventListener('pointerdown', bas); b.addEventListener('pointerup', birak); b.addEventListener('pointerleave', birak); b.addEventListener('pointercancel', birak);
    });
    eylemButonu.addEventListener('click', () => etkilesim(etkilesimAdaylari()));
    canvas.addEventListener('click', (e) => {
      if (kilitli || modalAcik()) return;
      const r = canvas.getBoundingClientRect();
      const sx = (e.clientX - r.left) * (canvas.width / r.width) / ZOOM, sy = (e.clientY - r.top) * (canvas.height / r.height) / ZOOM;
      const tx = Math.floor((sx + kamera.x) / KARO), ty = Math.floor((sy + kamera.y) / KARO);
      const p = oyuncuKaro();
      const hedefEtk = karoEtkilesimi(tx, ty);
      const yakin = Math.abs(tx - p.x) + Math.abs(ty - p.y) <= 1;
      if (hedefEtk && yakin) { if (tx !== p.x || ty !== p.y) O.yon = ty > p.y ? 0 : ty < p.y ? 1 : tx < p.x ? 2 : 3; etkilesim(hedefEtk); return; }
      let hedef = yurunur(tx, ty) ? [tx, ty] : enYakinYurunur(tx, ty, p.x, p.y);
      if (!hedef) return;
      oyuncuYolu = yolBul(p.x, p.y, hedef[0], hedef[1]);
      varisEylemi = hedefEtk ? { tx, ty } : null;
      canvas.focus();
    });

    /* ---------- Güncelleme ---------- */
    const kamera = { x: 0, y: 0 };
    const kati_px = (px, py) => kati(Math.floor(px / KARO), Math.floor(py / KARO));
    const carpisma = (nx, ny) => kati_px(nx - 9, ny - 4) || kati_px(nx + 9, ny - 4) || kati_px(nx - 9, ny + 6) || kati_px(nx + 9, ny + 6);
    const oyuncuGuncelle = (dt) => {
      if (kilitli) return;
      let dx = 0, dy = 0;
      if (oyuncuYolu && oyuncuYolu.length) {
        const h = oyuncuYolu[0]; const hx = h.x * KARO + 16, hy = h.y * KARO + 24;
        const ddx = hx - O.x, ddy = hy - O.y;
        if (Math.hypot(ddx, ddy) < 3) { O.x = hx; O.y = hy; oyuncuYolu.shift(); if (!oyuncuYolu.length && varisEylemi) { const v = varisEylemi; varisEylemi = null; const p = oyuncuKaro(); O.yon = v.ty > p.y ? 0 : v.ty < p.y ? 1 : v.tx < p.x ? 2 : 3; etkilesim(karoEtkilesimi(v.tx, v.ty)); } return; }
        const l = Math.hypot(ddx, ddy); dx = ddx / l; dy = ddy / l;
      } else {
        if (hareket.sol) dx -= 1; if (hareket.sag) dx += 1; if (hareket.yukari) dy -= 1; if (hareket.asagi) dy += 1;
        if (dx && dy) { dx *= 0.707; dy *= 0.707; }
      }
      if (!dx && !dy) { yuruyusSayac = 0; yuruyusKare = 0; return; }
      if (Math.abs(dx) > Math.abs(dy)) O.yon = dx < 0 ? 2 : 3; else O.yon = dy < 0 ? 1 : 0;
      const hiz = 120 * dt;
      const nx = O.x + dx * hiz, ny = O.y + dy * hiz;
      if (!carpisma(nx, O.y)) O.x = nx; else oyuncuYolu = null;
      if (!carpisma(O.x, ny)) O.y = ny; else oyuncuYolu = null;
      O.x = Math.max(16, Math.min(HX * KARO - 16, O.x)); O.y = Math.max(20, Math.min(HY * KARO - 8, O.y));
      yuruyusSayac += dt; if (yuruyusSayac > 0.15) { yuruyusSayac = 0; yuruyusKare = 1 - yuruyusKare; }
    };
    const yoldaYuru = (n, dt) => {
      if (!n.yol.length) return true;
      const h = n.yol[0]; const hx = h.x * KARO + 16, hy = h.y * KARO + 24;
      const ddx = hx - n.x, ddy = hy - n.y, l = Math.hypot(ddx, ddy);
      if (l < 2) { n.x = hx; n.y = hy; n.yol.shift(); return !n.yol.length; }
      const adim = Math.min(l, n.hiz * dt);
      n.x += ddx / l * adim; n.y += ddy / l * adim;
      n.yon = Math.abs(ddx) > Math.abs(ddy) ? (ddx < 0 ? 2 : 3) : (ddy < 0 ? 1 : 0);
      n.sayac += dt; if (n.sayac > 0.2) { n.sayac = 0; n.kare = 1 - n.kare; }
      return false;
    };
    const npcGuncelle = (dt) => {
      for (const n of npcler) {
        if (n.durum === 'geliyor') { if (yoldaYuru(n, dt)) { n.durum = 'bekliyor'; n.yon = 0; TD.figurGeldi[n.id] = true; Durum.kaydet(d); hudCiz(); bildir('❗ ' + n.ad + ' zaviye önünde bekliyor.'); } }
        else if (n.durum === 'gidiyor') { if (yoldaYuru(n, dt)) n.sil = true; }
        else { n.sayac += dt; }
      }
      for (let i = npcler.length - 1; i >= 0; i--) if (npcler[i].sil) npcler.splice(i, 1);
    };
    const koyunGuncelle = (dt) => {
      const ka = DU.koyunlar; if (!ka) return;
      for (const k of koyunlar) {
        k.sayac -= dt;
        if (k.hx === null && k.sayac <= 0) { k.hx = (ka.alan[0] + Math.random() * (ka.alan[2] - ka.alan[0])) * KARO + 16; k.hy = (ka.alan[1] + Math.random() * (ka.alan[3] - ka.alan[1])) * KARO + 16; }
        if (k.hx !== null) {
          const ddx = k.hx - k.x, ddy = k.hy - k.y, l = Math.hypot(ddx, ddy);
          if (l < 2) { k.hx = null; k.sayac = 1 + Math.random() * 3; k.kare = 0; }
          else { k.x += ddx / l * 20 * dt; k.y += ddy / l * 20 * dt; k.kare = Math.floor(zaman * 4) % 2; }
        }
      }
    };
    const yolcuGuncelle = (dt) => {
      for (const y of yolcular) {
        y.x += y.vx * dt;
        if (y.x < -40) y.x = HX * KARO + 40; if (y.x > HX * KARO + 40) y.x = -40;
        y.sayac += dt; if (y.sayac > 0.2) { y.sayac = 0; y.kare = 1 - y.kare; }
      }
    };
    const parselGuncelle = (dt) => {
      let degisti = false;
      Object.values(d.dunya.parseller).forEach(p => { if (p.durum === 'ekili') { p.kalan -= dt; if (p.kalan <= 0) { p.durum = 'olgun'; p.kalan = 0; degisti = true; } } });
      if (degisti) { bildir('🌾 Ürün olgunlaştı, hasat edebilirsin.', 'iyi'); Durum.kaydet(d); }
    };

    /* ---------- Çizim ---------- */
    const otAdi = () => tur.hava && tur.hava.sinif === 'kis' ? 'otKis' : tur.hava && tur.hava.sinif === 'kurak' ? 'otKurak' : 'ot';
    const karoCiz = (ad, arg, sx, sy) => ctx.drawImage(Piksel.karo(ad, arg), 0, 0, 16, 16, sx, sy, KARO, KARO);
    const yazi = (metin, x, y, boyut) => { ctx.font = 'bold ' + (boyut || 12) + 'px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText(metin, x, y); ctx.fillStyle = '#fff'; ctx.fillText(metin, x, y); };
    const karakterSprite = (ad, stil, yon, kare, x, y) => { const img = Piksel.karakter(ad, stil, yon, kare); ctx.drawImage(img, 0, 0, 16, 20, Math.round(x - 16), Math.round(y - 36), 32, 40); };

    const ciz = () => {
      // Kamera (ölçekli görünür alan)
      const vw = canvas.width / ZOOM, vh = canvas.height / ZOOM;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1b2538'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(ZOOM, 0, 0, ZOOM, Math.max(0, (canvas.width - HX * KARO * ZOOM) / 2), Math.max(0, (canvas.height - HY * KARO * ZOOM) / 2));
      ctx.imageSmoothingEnabled = false;
      kamera.x = Math.max(0, Math.min(HX * KARO - vw, O.x - vw / 2));
      kamera.y = Math.max(0, Math.min(HY * KARO - vh, O.y - vh / 2));
      const kx = Math.round(kamera.x), ky = Math.round(kamera.y);
      const x0 = Math.floor(kx / KARO), y0 = Math.floor(ky / KARO);
      const suKare = Math.floor(zaman * 2) % 2;
      const ot = otAdi();
      // Zemin
      for (let y = y0; y <= y0 + GOR_H && y < HY; y++) for (let x = x0; x <= x0 + GOR_W && x < HX; x++) {
        const ch = kar(x, y), sx = x * KARO - kx, sy = y * KARO - ky;
        const ya = yapiAt(x, y);
        let ad = tipAd(ch), arg;
        if (ad === 'ot' || ad === 'ot2') { ad = ot; arg = ch === ',' ? 1 : 0; if (ot !== 'ot') arg = undefined; }
        if (ch === 'H') { if (haneVar(x, y)) ad = 'cadir'; else { ad = ot; arg = 0; } }
        if (ch === 'A' && ya) ad = ot;
        if (ch === 'A' && !ya) ad = 'tabela';
        if (ch === '~') arg = suKare;
        if (ch === 'F' || (ad === ot && d.tarlalar.some(p => p.x === x && p.y === y))) { const pr = parsel(x, y); ad = pr.durum === 'bos' ? 'tarlaBos' : pr.durum === 'ekili' ? 'tarlaEkili' : 'tarlaOlgun'; }
        if (ch === 'G' && TD.bagToplandi[parselAnahtar(x, y)]) ad = 'bagBos';
        if (ch === 'C') ad = 'kilise';
        if (ya) { ad = ya.sabit ? ot : 'avlu'; arg = 0; }
        if (ad === 'agac' || ad === 'cam' || ad === 'kaya' || ad === 'tabela' || ad === 'cadir') { karoCiz(ot, 0, sx, sy); }
        karoCiz(ad, arg, sx, sy);
        if ((ad === 'agac' || ad === 'cam') && ot === 'otKis') { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(sx + 6, sy + 4, 20, 8); }
      }
      // Yapılar (2x2)
      const yapiListesi = [...Object.entries(d.yerlesim).map(([id, p]) => ({ id, p })), ...(DU.sabitYapilar || []).map(sy => ({ id: sy.tip, p: sy }))];
      yapiListesi.forEach(({ id, p }) => ctx.drawImage(Piksel.yapi(id), 0, 0, 32, 32, p.x * KARO - kx, p.y * KARO - ky, KARO * 2, KARO * 2));
      // Etiketler
      (DU.etiketler || []).forEach(e => yazi(e.metin, e.x * KARO - kx + 16, e.y * KARO - ky + 22, 12));
      // Varlıklar (y'ye göre sırala)
      const varliklar = [];
      varliklar.push({ y: O.y, ciz: () => karakterSprite('oyuncu', karStil(M.icerik.karakter.ad), O.yon, yuruyusKare, O.x - kx, O.y - ky) });
      npcler.forEach(n => varliklar.push({ y: n.y, ciz: () => {
        karakterSprite('npc_' + n.ad, n.stil, n.yon, n.durum === 'bekliyor' ? 0 : n.kare, n.x - kx, n.y - ky);
        if (n.durum === 'bekliyor') { const by = n.y - ky - 44 + Math.sin(zaman * 4) * 3; const tanik = n.tetik === 'tanik'; ctx.fillStyle = tanik ? '#2f5f9e' : '#fff'; ctx.beginPath(); ctx.arc(n.x - kx, by, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = tanik ? '#fff' : '#c62828'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(tanik ? '?' : '!', n.x - kx, by + 5); }
        yazi(n.ad, n.x - kx, n.y - ky + 14, 10);
      } }));
      koyunlar.forEach(k => varliklar.push({ y: k.y, ciz: () => ctx.drawImage(Piksel.koyun(k.kare), 0, 0, 16, 16, k.x - kx - 16, k.y - ky - 24, 32, 32) }));
      yolcular.forEach(y => varliklar.push({ y: y.y, ciz: () => karakterSprite('yolcu' + (y.stil.at ? 'A' : 'B') + y.stil.giysi, y.stil, y.vx < 0 ? 2 : 3, y.kare, y.x - kx, y.y - ky) }));
      if (kesit) kesit.atlilar.forEach((a, i) => varliklar.push({ y: a.y, ciz: () => karakterSprite('gazi', { giysi: '#6b2f2f', sapkaRenk: '#3b3b3b', at: true }, 2, Math.floor(zaman * 8 + i) % 2, a.x - kx, a.y - ky) }));
      varliklar.sort((a, b) => a.y - b.y).forEach(v => v.ciz());
      // Hava
      if (tur.hava) {
        if (tur.hava.sinif === 'kis') { ctx.fillStyle = 'rgba(200,220,255,0.12)'; ctx.fillRect(0, 0, vw, vh); ctx.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { const px = (i * 97 + zaman * 20 * (1 + i % 3)) % vw, py = (i * 53 + zaman * 40 * (1 + i % 2)) % vh; ctx.fillRect(px, py, 3, 3); } }
        else if (tur.hava.sinif === 'kurak') { ctx.fillStyle = 'rgba(230,170,60,0.14)'; ctx.fillRect(0, 0, vw, vh); }
        else if (tur.hava.sinif === 'savas') { ctx.fillStyle = 'rgba(120,40,20,0.12)'; ctx.fillRect(0, 0, vw, vh); }
      }
      // Etkileşim istemi
      const e = kilitli ? null : etkilesimAdaylari();
      if (e) { istem.textContent = 'E · ' + e.etiket; istem.classList.remove('gizli'); } else istem.classList.add('gizli');
      // Ara sahne
      if (kesit) {
        ctx.fillStyle = 'rgba(10,8,20,' + Math.min(0.55, kesit.gecen * 0.4) + ')'; ctx.fillRect(0, 0, vw, vh);
        yazi(kesit.baslik, vw / 2, vh / 2 - 10, 28);
        yazi('Sabit olay · değiştirilemez', vw / 2, vh / 2 + 20, 14);
      }
    };

    /* ---------- Döngü ---------- */
    let son = performance.now(), calisiyor = true;
    const dongu = (t) => {
      if (!calisiyor) return;
      const dt = Math.min(0.05, (t - son) / 1000); son = t; zaman += dt;
      if (kesit) { kesit.gecen += dt; kesit.atlilar.forEach(a => a.x += a.vx * dt); if (kesit.gecen >= kesit.sure) { const k = kesit; kesit = null; k.sonra(); } }
      else { oyuncuGuncelle(dt); npcGuncelle(dt); if (!kilitli) parselGuncelle(dt); }
      koyunGuncelle(dt); yolcuGuncelle(dt);
      ciz();
      requestAnimationFrame(dongu);
    };
    Sahneler._dunyaDurdur = () => { calisiyor = false; window.removeEventListener('keydown', tusBas); window.removeEventListener('keyup', tusBirak); window.removeEventListener('resize', boyutla); document.removeEventListener('fullscreenchange', boyutla); document.body.classList.remove('dunya-modu'); Durum.kaydet(d); };

    /* ---------- Yerleşim ---------- */
    const ilerleme = M.el('div', { class: 'tur-ilerleme' },
      turlar.map((t, i) => M.el('div', { class: 'tur-nokta' + (i < d.turIndex ? ' gecti' : i === d.turIndex ? ' aktif' : ''), title: t.baslik + (t.zorluk ? ' · ' + t.zorluk.ad : '') },
        M.el('span', { class: 'tur-yil' }, t.yil), t.hava ? M.el('span', null, ' ' + t.hava.ikon) : null, t.sabitOlay ? M.el('span', { class: 'tur-sabit' }, '📌') : null,
        d.hedefler[t.id] ? M.el('span', { class: 'tur-hedef' }, d.hedefler[t.id].basarildi ? ' 🎯' : ' ✗') : null)));
    kok.append(sarici);
    boyutla(); hudCiz();
    // Kaynak paneli güncellemesi (Motor.kaynakUygula çağırır)
    Sahneler.kaynakPaneliGuncelle = hudCiz;
    requestAnimationFrame(dongu);
    setTimeout(() => canvas.focus(), 100);

    if (!TD.haberGosterildi) {
      TD.haberGosterildi = true; Durum.kaydet(d);
      if (tur.haber) setTimeout(() => bildir('📯 ' + tur.haber.kim + ': ' + tur.haber.metin, 'haber', 9000), 400);
      if (tur.hedef) setTimeout(() => bildir('🎯 Hedef: ' + tur.hedef.metin, 'hedef', 9000), 900);
    }
    if (!TD.olayKarti && tur.olayKarti && !tur.olayKarti.gelen) setTimeout(() => olayKartiniAc(null), 400);

    // Test/erişim için
    Sahneler._dunya = { etkilesim, etkilesimAdaylari, karoEtkilesimi, npcler, oyuncu: O, uyu, isinla: (x, y) => { O.x = x * KARO + 16; O.y = y * KARO + 24; }, yolBul, kalanEmek, bolgeAc, defterAc, tanikDinle, vakfiyeYaz };
  };
})();
