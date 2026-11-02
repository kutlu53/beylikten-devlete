/* Tur sahnesi: sıra tabanlı yıl döngüsü.
   - Yerleşke haritası: yapı yerleştirme (sürükle-bırak / seç-tıkla), tarla açma, emek dağıtımı
   - Haritada yürüyen figürler: olay kartları ve karakter sahneleri figüre tıklanarak başlar
   - Hava/zorluk katmanı: sert kış, kuraklık, savaş yılı, abluka (sabit takvim)
   - Tur hedefleri, gösterge eşikleri, yapı zinciri, zaviyenin görsel büyümesi
   - Bölge haritası: şematik SVG, denetim renkleri, kervan animasyonu, kuşatma çadırları
   Kurallar ve parametreler içerik JSON'undan (kurallar, yapilar, harita, bolge, turlar) okunur. */
(function () {
  const M = Motor;

  function turDurumuYeni() {
    return { olayKarti: false, konus: {}, bolge: {}, atamalar: {}, emekHarcanan: 0, olayBitti: false, figurGeldi: {}, haberGosterildi: false };
  }

  /* ---------- Küçük statik harita (özet ekranı için) ---------- */
  Sahneler.miniHarita = function (s, parca) {
    const H = s.harita;
    const kutu = M.el('div', { class: 'harita mini', style: 'grid-template-columns: repeat(' + H.genislik + ', 1fr); aspect-ratio: ' + H.genislik + ' / ' + H.yukseklik });
    const hucre = {};
    (H.karolar || []).forEach(k => hucre[k.x + ',' + k.y] = Object.assign({}, k));
    (H.hanelerKonumu || []).slice(0, Math.min(parca.haneler, (H.hanelerKonumu || []).length)).forEach(p => hucre[p.x + ',' + p.y] = { tip: 'hane', ikon: '⛺' });
    (parca.tarlalar || []).forEach(p => hucre[p.x + ',' + p.y] = { tip: 'tarla', ikon: '🌾' });
    Object.entries(parca.yerlesim || {}).forEach(([id, p]) => { const y = s.yapilar[id]; hucre[p.x + ',' + p.y] = { tip: 'yapi', ikon: y ? y.ikon : '🏚️' }; });
    const n = (parca.yapilar || []).filter(y => y !== 'zaviye').length;
    for (let y = 0; y < H.yukseklik; y++) for (let x = 0; x < H.genislik; x++) {
      const k = hucre[x + ',' + y] || { tip: (x + y) % 2 ? 'ot' : 'ot2', ikon: '' };
      const sinif = ['karo', k.tip];
      if (k.tip === 'zaviye') sinif.push('buyuk' + Math.min(3, Math.floor(n / 2)));
      kutu.append(M.el('div', { class: sinif.join(' ') }, k.ikon ? M.el('span', { class: 'karo-ikon' }, k.ikon) : null));
    }
    return kutu;
  };

  Sahneler.tur = function (s, kok) {
    const d = M.durum;
    const K = s.kurallar;
    const turlar = s.turlar;

    /* ---------- Durum hazırlığı ---------- */
    if (!d.kaynaklar) d.kaynaklar = Object.assign({}, s.kaynaklar.baslangic);
    if (d.turIndex === undefined) d.turIndex = 0;
    if (!d.turDurum) d.turDurum = turDurumuYeni();
    if (!d.turDurum.figurGeldi) d.turDurum.figurGeldi = {};
    if (!d.yerlesim) d.yerlesim = {};
    if (!d.tarlalar) d.tarlalar = [];
    if (!d.gunluk) d.gunluk = [];
    if (!d.hedefler) d.hedefler = {};
    M.icerik.kaynakAdlari = s.kaynaklar.adlar;
    Durum.kaydet(d);

    if (d.turIndex >= turlar.length) { M.sonraki(); return; }
    const tur = turlar[d.turIndex];
    const TD = d.turDurum;
    const Z = tur.zorluk || {};

    let seciliArac = null; // { tip: 'yapi'|'tarla', id }
    let aktifSekme = d.bayraklar.aktifSekme || 'yerleske';

    /* ---------- Yardımcılar ---------- */
    const tarlaSayisi = () => 1 + d.tarlalar.length;
    const toplamEmek = () => K.temelEmek + Math.min(d.kaynaklar.haneler, K.enCokHaneEmek);
    const kullanilanEmek = () => Object.values(TD.atamalar).reduce((a, b) => a + b, 0) + TD.emekHarcanan;
    const kalanEmek = () => toplamEmek() - kullanilanEmek();
    const isEnCok = (isId) => {
      const is = K.isler[isId];
      if (is.enCokTarlaSayisiKadar) return tarlaSayisi();
      if (is.yapiGerekli && !d.yapilar.includes(is.yapiGerekli)) return 0;
      return is.enCok || 0;
    };
    const odenebilir = (maliyet) => Object.entries(maliyet || {}).every(([k, v]) => (d.kaynaklar[k] || 0) >= v);
    const gunlukYaz = (satir) => {
      let g = d.gunluk.find(x => x.turId === tur.id);
      if (!g) { g = { turId: tur.id, yil: tur.yil, baslik: tur.baslik, satirlar: [] }; d.gunluk.push(g); }
      g.satirlar.push(satir);
      Durum.kaydet(d);
    };
    const A = s.kaynaklar.ikonlar;
    const gAd = (k) => M.icerik.gostergeAdlari[k] || k;

    // Harita hücre tablosu
    const H = s.harita;
    const tabanKaro = {};
    (H.karolar || []).forEach(k => { tabanKaro[k.x + ',' + k.y] = k; });
    const konumKaro = {};
    (H.karolar || []).forEach(k => { if (k.konum) konumKaro[k.konum] = k; });
    const zaviyeKaro = konumKaro.zaviye || { x: Math.floor(H.genislik / 2), y: H.yolSatiri };
    const karoTipi = (x, y) => (tabanKaro[x + ',' + y] || {}).tip || 'ot';
    const haneKonumlari = () => (H.hanelerKonumu || []).slice(0, Math.min(d.kaynaklar.haneler, (H.hanelerKonumu || []).length));
    const dolu = (x, y) => {
      if (tabanKaro[x + ',' + y] && tabanKaro[x + ',' + y].tip !== 'ot') return true;
      if (Object.values(d.yerlesim).some(p => p.x === x && p.y === y)) return true;
      if (d.tarlalar.some(p => p.x === x && p.y === y)) return true;
      if (haneKonumlari().some(p => p.x === x && p.y === y)) return true;
      return false;
    };
    const komsular = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < H.genislik && b < H.yukseklik);
    const sekizKomsu = (x, y) => { const r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) r.push([x + dx, y + dy]); return r.filter(([a, b]) => a >= 0 && b >= 0 && a < H.genislik && b < H.yukseklik); };
    const komsuTipiVar = (x, y, tip) => komsular(x, y).some(([a, b]) => karoTipi(a, b) === tip || (tip === 'tarla' && d.tarlalar.some(p => p.x === a && p.y === b)));
    const yerlestirilebilir = (x, y) => {
      if (!seciliArac) return false;
      if (dolu(x, y) || karoTipi(x, y) !== 'ot') return false;
      if (seciliArac.tip === 'yapi') {
        const y_ = s.yapilar[seciliArac.id];
        if (y_.gerekliKomsu && !komsuTipiVar(x, y, y_.gerekliKomsu)) return false;
      }
      return true;
    };
    const yapiSayisi = () => d.yapilar.filter(y => y !== 'zaviye').length;

    /* ---------- Kaynak paneli ---------- */
    const kaynakPaneli = M.el('div', { class: 'kaynak-paneli' });
    const kaynakPaneliCiz = () => {
      kaynakPaneli.innerHTML = '';
      const Ak = s.kaynaklar;
      ['erzak', 'gumus', 'haneler'].forEach(k => {
        kaynakPaneli.append(M.el('div', { class: 'kaynak', title: Ak.aciklamalar[k] },
          M.el('span', { class: 'kaynak-ikon' }, Ak.ikonlar[k]),
          M.el('span', { class: 'kaynak-deger' }, String(d.kaynaklar[k])),
          M.el('span', { class: 'kaynak-ad' }, Ak.adlar[k])));
      });
      kaynakPaneli.append(M.el('div', { class: 'kaynak emek' + (kalanEmek() > 0 ? ' var' : ''), title: Ak.aciklamalar.emek },
        M.el('span', { class: 'kaynak-ikon' }, Ak.ikonlar.emek),
        M.el('span', { class: 'kaynak-deger' }, kalanEmek() + '/' + toplamEmek()),
        M.el('span', { class: 'kaynak-ad' }, Ak.adlar.emek)));
    };
    Sahneler.kaynakPaneliGuncelle = kaynakPaneliCiz;

    /* ---------- Bildirim (harita üstü kısa mesaj) ---------- */
    const bildirimKutusu = M.el('div', { class: 'bildirimler' });
    const bildir = (metin, sinif, sure) => {
      const b = M.el('div', { class: 'bildirim ' + (sinif || '') }, metin);
      bildirimKutusu.append(b);
      setTimeout(() => b.classList.add('kayboluyor'), (sure || 5000) - 600);
      setTimeout(() => b.remove(), sure || 5000);
    };

    /* ---------- Yerleşke haritası ---------- */
    const haritaKutusu = M.el('div', { class: 'harita buyuk', style: 'grid-template-columns: repeat(' + H.genislik + ', 1fr); aspect-ratio: ' + H.genislik + ' / ' + H.yukseklik });
    const figurKatmani = M.el('div', { class: 'figur-katmani' });
    const havaKatmani = M.el('div', { class: 'hava-katmani' });
    const haritaSarici = M.el('div', { class: 'harita-sarici' }, haritaKutusu, havaKatmani, figurKatmani, bildirimKutusu);

    const bekleyenKonus = () => (tur.gorevler || []).filter(g => g.tip === 'konus' && !TD.konus[g.sahne]);

    const haritaCiz = () => {
      haritaKutusu.innerHTML = '';
      const hucre = {};
      Object.entries(tabanKaro).forEach(([k, v]) => hucre[k] = Object.assign({}, v));
      haneKonumlari().forEach((p, i) => { hucre[p.x + ',' + p.y] = { tip: 'hane', ikon: '⛺', etiket: i === 0 ? 'Hane' : '' }; });
      d.tarlalar.forEach(p => { hucre[p.x + ',' + p.y] = { tip: 'tarla', ikon: '🌾', is: 'tarla' }; });
      Object.entries(d.yerlesim).forEach(([id, p]) => { const y = s.yapilar[id]; hucre[p.x + ',' + p.y] = { tip: 'yapi', ikon: y.ikon, etiket: y.ad.split(' ')[0], is: K.isler[id] ? id : null }; });

      // Zaviyenin büyümesi: yapı sayısına göre avlu ve sur
      const buyukluk = Math.min(3, Math.floor(yapiSayisi() / 2)); // 0..3
      const avluHucreleri = new Set(buyukluk >= 1 ? sekizKomsu(zaviyeKaro.x, zaviyeKaro.y).map(([a, b]) => a + ',' + b) : []);

      for (let y = 0; y < H.yukseklik; y++) {
        for (let x = 0; x < H.genislik; x++) {
          const k = hucre[x + ',' + y] || { tip: (x + y) % 2 ? 'ot' : 'ot2', ikon: '' };
          const sinif = ['karo', k.tip];
          if (k.tip === 'zaviye') sinif.push('buyuk' + buyukluk);
          if (avluHucreleri.has(x + ',' + y) && (k.tip === 'ot' || k.tip === 'ot2' || k.tip === 'yol' || k.tip === 'yapi')) sinif.push('avlu' + (buyukluk >= 3 ? ' sur' : ''));
          if (seciliArac && yerlestirilebilir(x, y)) sinif.push('hedef');
          const karo = M.el('div', { class: sinif.join(' '), title: k.etiket || '', 'data-x': x, 'data-y': y });
          if (k.ikon) karo.append(M.el('span', { class: 'karo-ikon' }, k.ikon));
          if (k.etiket) karo.append(M.el('span', { class: 'karo-etiket' }, k.etiket));

          // Figürü olmayan konuşma görevleri için yedek rozet
          const kg = k.konum ? bekleyenKonus().find(g => g.konum === k.konum && !g.gelen) : null;
          if (kg) { karo.classList.add('gorev'); karo.append(M.el('span', { class: 'rozet-unlem', title: kg.etiket }, '!')); }

          if (k.is && K.isler[k.is]) {
            const n = TD.atamalar[k.is] || 0;
            if (n > 0) karo.append(M.el('span', { class: 'rozet-emek' }, '💪' + n));
            karo.classList.add('is');
          }

          karo.addEventListener('click', () => karoTiklandi(x, y, k, kg));
          karo.addEventListener('dragover', e => { if (yerlestirilebilir(x, y)) { e.preventDefault(); karo.classList.add('ustunde'); } });
          karo.addEventListener('dragleave', () => karo.classList.remove('ustunde'));
          karo.addEventListener('drop', e => { e.preventDefault(); karo.classList.remove('ustunde'); if (yerlestirilebilir(x, y)) yerlestir(x, y); });
          haritaKutusu.append(karo);
        }
      }
      havaCiz();
      yolculariCiz();
      figurleriCiz();
    };

    /* Hava / atmosfer katmanı */
    const havaCiz = () => {
      havaKatmani.innerHTML = '';
      havaKatmani.className = 'hava-katmani' + (tur.hava ? ' ' + tur.hava.sinif : '');
      if (tur.hava) {
        havaKatmani.append(M.el('div', { class: 'hava-rozet' }, tur.hava.ikon + ' ' + tur.hava.ad + (Z.aciklama ? ' · ' + Z.aciklama : '')));
        if (tur.hava.sinif === 'kis') for (let i = 0; i < 18; i++) havaKatmani.append(M.el('span', { class: 'kar', style: 'left:' + (Math.random() * 100) + '%; animation-duration:' + (6 + Math.random() * 6) + 's; animation-delay:-' + (Math.random() * 8) + 's' }, '❄'));
      } else if (Z.ad) {
        havaKatmani.append(M.el('div', { class: 'hava-rozet' }, (Z.ikon || '⚠️') + ' ' + Z.ad + ' · ' + Z.aciklama));
      }
    };

    /* Yoldan geçen yolcular (Güven'e göre sayı; tur isterse gaziler) */
    const yolculariCiz = () => {
      figurKatmani.querySelectorAll('.yolcu').forEach(e => e.remove());
      const ayar = tur.yolcular || {};
      const sayi = ayar.sayi || (1 + Math.floor(d.gostergeler.guven / 30));
      const ikonlar = ayar.ikonlar || ['🚶', '🐎', '🐪', '🧕', '🧑‍🌾'];
      const hiz = ayar.hiz || 1;
      for (let i = 0; i < sayi; i++) {
        const sure = (14 + Math.random() * 10) / hiz;
        figurKatmani.append(M.el('div', { class: 'yolcu' + (i % 2 && !ayar.yon ? ' ters' : ''), style: 'top:' + ((H.yolSatiri + 0.15) / H.yukseklik * 100) + '%; animation-duration:' + sure + 's; animation-delay:-' + (Math.random() * sure) + 's' }, ikonlar[i % ikonlar.length]));
      }
    };

    /* ---------- Yürüyen figürler (olay kartı / karakter sahnesi tetikleyicileri) ---------- */
    const figurTanimlari = () => {
      const liste = [];
      if (tur.olayKarti && tur.olayKarti.gelen && !TD.olayKarti) liste.push(Object.assign({ id: 'olay_' + tur.olayKarti.id, tetik: 'olay', etiket: tur.olayKarti.baslik }, tur.olayKarti.gelen));
      (tur.gorevler || []).filter(g => g.tip === 'konus' && g.gelen && !TD.konus[g.sahne]).forEach(g => liste.push(Object.assign({ id: 'konus_' + g.sahne, tetik: 'konus', gorev: g, etiket: g.etiket }, g.gelen)));
      return liste;
    };
    const konumNoktasi = (konum) => {
      const k = konumKaro[konum];
      if (k) return { x: k.x, y: k.y };
      return { x: H.genislik - 1, y: H.yolSatiri };
    };
    const figurYuzde = (p) => 'left:' + ((p.x + 0.5) / H.genislik * 100) + '%; top:' + ((p.y + 0.5) / H.yukseklik * 100) + '%';
    const durakVer = (baslangic) => {
      const duraklar = H.figurDuraklari || [{ x: zaviyeKaro.x - 1, y: zaviyeKaro.y }, { x: zaviyeKaro.x + 1, y: zaviyeKaro.y }, { x: zaviyeKaro.x, y: zaviyeKaro.y - 1 }];
      if (baslangic === 'zaviye') return duraklar[2] || duraklar[0];
      const bas = konumNoktasi(baslangic);
      return bas.x < zaviyeKaro.x ? duraklar[0] : duraklar[1];
    };
    const figurAnimasyonlari = {};
    const figurleriCiz = () => {
      figurKatmani.querySelectorAll('.figur').forEach(e => e.remove());
      figurTanimlari().forEach(f => {
        const durak = durakVer(f.baslangic);
        const bas = f.baslangic === 'zaviye' ? durak : konumNoktasi(f.baslangic);
        const geldi = !!TD.figurGeldi[f.id];
        const el = M.el('div', { class: 'figur' + (geldi ? ' bekliyor' : ' geliyor'), style: figurYuzde(geldi ? durak : bas), title: f.etiket, 'data-figur': f.id },
          M.el('span', { class: 'figur-ikon' }, f.ikon),
          M.el('span', { class: 'rozet-unlem' }, '!'),
          M.el('span', { class: 'figur-ad' }, f.ad || f.etiket));
        el.addEventListener('click', () => {
          if (!TD.figurGeldi[f.id]) return;
          if (f.tetik === 'olay') olayKartiniAc();
          else konusmayiAc(f.gorev);
        });
        figurKatmani.append(el);
        if (!geldi) {
          requestAnimationFrame(() => requestAnimationFrame(() => { el.style.cssText = figurYuzde(durak); }));
          clearTimeout(figurAnimasyonlari[f.id]);
          figurAnimasyonlari[f.id] = setTimeout(() => { TD.figurGeldi[f.id] = true; Durum.kaydet(d); el.classList.remove('geliyor'); el.classList.add('bekliyor'); panelCiz(); }, 2600);
        }
      });
    };
    /* Figür işi bitince geldiği yere döner (ya da yerleşir), sonra silinir */
    const figurGonder = (id, hedefKonum, sonra) => {
      const el = figurKatmani.querySelector('.figur[data-figur="' + id + '"]');
      if (!el || hedefKonum === 'zaviye') { sonra(); return; }
      el.classList.remove('bekliyor'); el.classList.add('gidiyor');
      const hedef = hedefKonum === 'hane' ? (haneKonumlari().slice(-1)[0] || konumNoktasi('yol')) : konumNoktasi(hedefKonum);
      el.style.cssText = figurYuzde(hedef);
      setTimeout(sonra, 2000);
    };

    const karoTiklandi = async (x, y, k, konusGorevi) => {
      if (seciliArac) { if (yerlestirilebilir(x, y)) yerlestir(x, y); else M.modal('Buraya kurulamaz', '<p>' + (seciliArac.tip === 'yapi' && s.yapilar[seciliArac.id].gerekliKomsu ? 'Bu yapı ' + s.yapilar[seciliArac.id].gerekliKomsu + ' kenarına kurulmalı.' : 'Boş bir yeşil alan seç.') + '</p>'); return; }
      if (konusGorevi) { konusmayiAc(konusGorevi); return; }
      if (k.is && K.isler[k.is]) { emekEkle(k.is, 1); return; }
      if (k.konum && s.harita.konumlar[k.konum]) {
        const bekleyen = figurTanimlari().find(f => f.baslangic === k.konum && !TD.figurGeldi[f.id]);
        M.modal(s.harita.konumlar[k.konum].ad, '<p>' + (bekleyen ? 'Buradan biri yola çıktı; zaviyeye varınca ona tıkla.' : 'Bu yıl burada konuşulacak kimse yok.') + '</p>');
      }
    };

    /* ---------- Yapı yerleştirme ---------- */
    const yerlestir = async (x, y) => {
      const arac = seciliArac; seciliArac = null;
      if (arac.tip === 'tarla') {
        TD.emekHarcanan += 1;
        d.tarlalar.push({ x, y });
        gunlukYaz('Yeni tarla açıldı.');
        bildir('🌾 Tarla açıldı (1 emek)');
        Durum.kaydet(d); hepsiniCiz();
        return;
      }
      const yapi = s.yapilar[arac.id];
      Object.entries(yapi.maliyet || {}).forEach(([k, v]) => d.kaynaklar[k] -= v);
      d.yapilar.push(arac.id);
      d.yerlesim[arac.id] = { x, y };
      let bonusMetin = '';
      if (yapi.komsuBonus && komsuTipiVar(x, y, yapi.komsuBonus.tip)) {
        d.bayraklar['bonus_' + arac.id] = true;
        if (yapi.komsuBonus.etki) M.etkiUygula(yapi.komsuBonus.etki, { tur: 'yapi', baslik: yapi.ad, secim: 'konum bonusu' });
        bonusMetin = '<p><b>Konum:</b> ' + yapi.komsuBonus.metin + '</p>';
      } else if (yapi.komsuBonus) {
        bonusMetin = '<p class="ipucu">İpucu: ' + yapi.komsuBonus.metin.split(':')[0] + ' olsaydı ek kazanç olurdu.</p>';
      }
      gunlukYaz(yapi.ad + ' kuruldu.');
      Durum.kaydet(d);
      hepsiniCiz();
      bildir(yapi.ikon + ' ' + yapi.ad + ' kuruldu', 'iyi');
      await M.modal(yapi.ad + ' kuruldu', M.metin(yapi.mantik) + bonusMetin);
    };

    const paletKutusu = M.el('div', { class: 'palet' });
    const paletCiz = () => {
      paletKutusu.innerHTML = '';
      paletKutusu.append(M.el('div', { class: 'palet-baslik' }, '🏗️ İnşa', seciliArac ? M.el('button', { class: 'ikincil kucuk', onclick: () => { seciliArac = null; hepsiniCiz(); } }, 'Vazgeç') : null));
      Object.entries(s.yapilar).forEach(([id, y]) => {
        if (d.yapilar.includes(id)) return;
        const onKosul = y.gerekliYapi && !d.yapilar.includes(y.gerekliYapi) ? s.yapilar[y.gerekliYapi].ad : null;
        const uygun = odenebilir(y.maliyet) && !onKosul;
        const maliyet = Object.entries(y.maliyet || {}).map(([k, v]) => v + ' ' + s.kaynaklar.ikonlar[k]).join(' + ');
        const el = M.el('div', { class: 'palet-oge' + (uygun ? '' : ' pasif') + (seciliArac && seciliArac.id === id ? ' secili' : ''), draggable: uygun ? 'true' : null, title: y.aciklama + (onKosul ? ' Önce ' + onKosul + ' gerekir.' : '') },
          M.el('span', { class: 'palet-ikon' }, y.ikon),
          M.el('span', { class: 'palet-ad' }, y.ad),
          M.el('span', { class: 'palet-maliyet' }, onKosul ? '🔒 ' + onKosul : maliyet));
        el.addEventListener('click', () => {
          if (!uygun) { M.modal(y.ad, '<p>' + (onKosul ? 'Önce <b>' + onKosul + '</b> kurulmalı.' : y.ad + ' için ' + maliyet + ' gerekir.') + '</p><p>' + y.aciklama + '</p>'); return; }
          seciliArac = (seciliArac && seciliArac.id === id) ? null : { tip: 'yapi', id }; hepsiniCiz();
        });
        el.addEventListener('dragstart', e => { seciliArac = { tip: 'yapi', id }; e.dataTransfer.setData('text/plain', id); haritaCiz(); });
        el.addEventListener('dragend', () => { if (seciliArac && seciliArac.tip === 'yapi' && !d.yerlesim[id]) { seciliArac = null; hepsiniCiz(); } });
        paletKutusu.append(el);
      });
      const tarlaUygun = kalanEmek() >= 1 && d.tarlalar.length < K.enCokTarla - 1;
      const t = M.el('div', { class: 'palet-oge' + (tarlaUygun ? '' : ' pasif') + (seciliArac && seciliArac.tip === 'tarla' ? ' secili' : ''), draggable: tarlaUygun ? 'true' : null, title: 'Boş alana yeni tarla aç. 1 emek harcar; tarla sayısı kadar emek tarlada çalışabilir.' },
        M.el('span', { class: 'palet-ikon' }, '🌾'), M.el('span', { class: 'palet-ad' }, 'Tarla aç'), M.el('span', { class: 'palet-maliyet' }, '1 💪'));
      t.addEventListener('click', () => { if (!tarlaUygun) { M.modal('Tarla açılamıyor', '<p>Tarla açmak 1 emek ister; en çok ' + K.enCokTarla + ' tarla olabilir.</p>'); return; } seciliArac = (seciliArac && seciliArac.tip === 'tarla') ? null : { tip: 'tarla' }; hepsiniCiz(); });
      t.addEventListener('dragstart', e => { seciliArac = { tip: 'tarla' }; e.dataTransfer.setData('text/plain', 'tarla'); haritaCiz(); });
      t.addEventListener('dragend', () => { if (seciliArac && seciliArac.tip === 'tarla') { seciliArac = null; hepsiniCiz(); } });
      paletKutusu.append(t);
      if (seciliArac) paletKutusu.append(M.el('div', { class: 'ipucu' }, 'Haritada yanıp sönen bir alana tıkla.'));
    };

    /* ---------- Emek ---------- */
    const emekEkle = (isId, delta) => {
      const simdi = TD.atamalar[isId] || 0;
      const yeni = simdi + delta;
      if (yeni < 0) return;
      if (yeni > isEnCok(isId)) { M.modal(K.isler[isId].ad, '<p>Bu işe en çok ' + isEnCok(isId) + ' emek verilebilir. ' + K.isler[isId].aciklama + '.</p>'); return; }
      if (delta > 0 && kalanEmek() <= 0) { M.modal('Emek kalmadı', '<p>Bu yılın tüm emeği dağıtıldı. Başka bir işten azaltabilirsin.</p>'); return; }
      TD.atamalar[isId] = yeni;
      Durum.kaydet(d);
      hepsiniCiz();
    };

    /* ---------- Bölge haritası (SVG) ---------- */
    const B = s.bolge;
    const bolgeKutusu = M.el('div', { class: 'bolge-sarici' });
    const bekleyenBolge = () => (tur.gorevler || []).filter(g => g.tip === 'bolge' && !TD.bolge[g.id]);
    const turSira = (id) => turlar.findIndex(t => t.id === id);
    const yerKontrol = (yer) => {
      // Değişim, belirtilen tur bittikten sonra görünür (fetih turun sonundaki sabit olaydır)
      if (yer.kontrolDegisimi && turSira(yer.kontrolDegisimi.tur) < d.turIndex) return yer.kontrolDegisimi.kontrol;
      return yer.kontrol;
    };
    const kusatmada = (yer) => yer.kusatma && turSira(yer.kusatma.baslangicTur) <= d.turIndex && turSira(yer.kusatma.bitisTur) >= d.turIndex;

    const bolgeCiz = () => {
      bolgeKutusu.innerHTML = '';
      const NS = 'http://www.w3.org/2000/svg';
      const mk = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); if (text !== undefined) e.textContent = text; return e; };
      const svg = mk('svg', { viewBox: '0 0 ' + B.genislik + ' ' + B.yukseklik, class: 'bolge-svg' });
      const yerler = {}; B.yerler.forEach(y => yerler[y.id] = y);

      svg.append(mk('rect', { x: 0, y: 0, width: B.genislik, height: B.yukseklik, fill: '#e9e2cc' }));
      svg.append(mk('path', { d: 'M0,0 L' + B.genislik + ',0 L' + B.genislik + ',18 Q' + (B.genislik * 0.6) + ',60 ' + (B.genislik * 0.35) + ',20 Q120,0 0,30 Z', fill: '#bcd4e6' }));
      svg.append(mk('text', { x: 20, y: 22, class: 'bolge-deniz' }, 'Marmara Denizi (şematik)'));
      B.yollar.forEach(([a, b]) => { const P = yerler[a], Q = yerler[b]; svg.append(mk('line', { x1: P.x, y1: P.y, x2: Q.x, y2: Q.y, class: 'bolge-yol' })); });

      // Öğrencinin ağı: kervan yolu (hareketli kervan), kardeş zaviye
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
        const gorev = bekleyenBolge().find(gv => gv.secenekler.some(sc => sc.yer === y.id));
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
        g.addEventListener('click', () => yerTiklandi(y, gorev));
        svg.append(g);
      });
      bolgeKutusu.append(svg);
      const lej = M.el('div', { class: 'bolge-lejant' });
      Object.entries(B.lejant).forEach(([k, v]) => lej.append(M.el('span', null, M.el('i', { style: 'background:' + B.renkler[k] }), v)));
      lej.append(M.el('span', null, '⚔️ savaş / abluka'), M.el('span', null, M.el('i', { style: 'background:#c62828;height:3px' }), 'kervan yolun'));
      bolgeKutusu.append(lej, M.el('div', { class: 'harita-aciklama' }, (B.turSiniri[tur.id] ? 'Yıl: ' + B.turSiniri[tur.id] + '. ' : '') + B.aciklama));
    };

    const yerTiklandi = async (yer, gorev) => {
      if (gorev) {
        const sec = gorev.secenekler.find(sc => sc.yer === yer.id);
        const ok = await M.modal(gorev.baslik + ': ' + sec.metin, M.metin(sec.aciklama) + '<p>Bu seçimi onaylıyor musun?</p>', [{ metin: 'Onayla', deger: true }, { metin: 'Vazgeç', deger: false }]);
        if (!ok) return;
        M.kararKaydet(gorev.id, Object.assign({ yer: yer.id }, sec), gorev.baslik);
        d.kararlar[gorev.id].yer = yer.id;
        TD.bolge[gorev.id] = true;
        gunlukYaz(gorev.baslik + ': ' + sec.metin);
        Durum.kaydet(d);
        await M.mantikModali(sec);
        hepsiniCiz();
        return;
      }
      M.modal(yer.ad, '<p>' + (B.lejant[yerKontrol(yer)] || '') + (yer.not ? '. ' + yer.not : '') + (kusatmada(yer) ? '. ' + yer.kusatma.metin : '') + '</p>');
    };

    /* ---------- Alt sahne (karakter / olay) ---------- */
    const altSahneAc = (cizici, sahneVerisi, onBitti) => {
      const kaplama = M.el('div', { class: 'alt-sahne' + (sahneVerisi.arka === 'gece' ? ' gece' : '') });
      const ic = M.el('div', { class: 'alt-sahne-ic' });
      kaplama.append(ic);
      document.body.append(kaplama);
      document.body.classList.add('alt-sahne-acik');
      cizici.call(Sahneler, sahneVerisi, ic, () => {
        kaplama.remove();
        document.body.classList.remove('alt-sahne-acik');
        onBitti();
      });
      window.scrollTo(0, 0);
    };

    const konusmayiAc = (gorev) => {
      const sahne = s.karakterSahneleri[gorev.sahne];
      altSahneAc(Sahneler.karakter, sahne, () => {
        const soru = sahne.adimlar.find(a => a.soru);
        if (soru && d.kararlar[soru.soru.id]) gunlukYaz(sahne.baslik + ': ' + d.kararlar[soru.soru.id].etiket);
        const bitir = () => { TD.konus[gorev.sahne] = true; Durum.kaydet(d); hepsiniCiz(); };
        if (gorev.gelen) figurGonder('konus_' + gorev.sahne, gorev.gelen.baslangic, bitir); else bitir();
      });
    };

    /* ---------- Olay kartı ---------- */
    const olayKartiniAc = async () => {
      const ok = tur.olayKarti;
      if (!ok) { TD.olayKarti = true; return; }
      if (ok.bilgi || !ok.secenekler) {
        await M.modal('📜 ' + ok.baslik, M.metin(ok.metin) + (ok.kavram ? '<div class="kavram"><b>' + ok.kavram.ad + ':</b> ' + ok.kavram.aciklama + '</div>' : ''));
        TD.olayKarti = true; Durum.kaydet(d); hepsiniCiz();
        return;
      }
      const secim = await new Promise(resolve => {
        const kaplama = document.getElementById('modal-kaplama');
        document.getElementById('modal-baslik').textContent = '📜 ' + ok.baslik;
        const govde = document.getElementById('modal-govde');
        govde.innerHTML = M.metin(ok.metin) + (ok.kavram ? '<div class="kavram"><b>' + ok.kavram.ad + ':</b> ' + ok.kavram.aciklama + '</div>' : '');
        const sec = M.el('div', { class: 'secenekler' });
        ok.secenekler.forEach(sc => sec.append(M.el('button', { class: 'secenek', onclick: () => { kaplama.classList.add('gizli'); resolve(sc); } }, sc.metin, sc.aciklama ? M.el('span', { class: 'alt-metin' }, sc.aciklama) : null)));
        govde.append(sec);
        document.getElementById('modal-butonlar').innerHTML = '';
        kaplama.classList.remove('gizli');
      });
      M.kararKaydet(ok.id, secim, ok.baslik);
      gunlukYaz(ok.baslik + ': ' + secim.metin);
      const bitir = () => { TD.olayKarti = true; Durum.kaydet(d); hepsiniCiz(); };
      // Yerleşen aileler çadırlara yürür; geri çevrilenler geldikleri yola döner
      if (ok.gelen) figurGonder('olay_' + ok.id, secim.kaynak && secim.kaynak.haneler > 0 ? 'hane' : ok.gelen.baslangic, bitir); else bitir();
      await M.mantikModali(secim);
      hepsiniCiz();
    };

    /* ---------- Sağ panel: yılın işleri ---------- */
    const panel = M.el('div', { class: 'kart yil-paneli' });
    const panelCiz = () => {
      panel.innerHTML = '';
      panel.append(M.el('h3', null, '📋 Bu yılın işleri'));
      if (tur.hedef) panel.append(M.el('div', { class: 'hedef-kutusu' }, M.el('b', null, '🎯 Hedef: '), tur.hedef.metin));
      if (tur.haber) panel.append(M.el('div', { class: 'haber-kutusu' }, M.el('b', null, '📯 ' + tur.haber.kim + ': '), tur.haber.metin));
      const liste = M.el('ul', { class: 'is-listesi' });

      const olayFigurBekliyor = tur.olayKarti && tur.olayKarti.gelen && !TD.olayKarti;
      liste.append(M.el('li', { class: TD.olayKarti ? 'tamam' : 'zorunlu' },
        M.el('span', { class: 'onay' }, TD.olayKarti ? '✅' : '❗'),
        M.el('span', null, 'Olay: ' + (tur.olayKarti ? tur.olayKarti.baslik : '-') + (olayFigurBekliyor ? (TD.figurGeldi['olay_' + tur.olayKarti.id] ? ' (haritada bekliyor, tıkla)' : ' (yolda)') : '')),
        olayFigurBekliyor ? null : M.el('button', { class: 'ikincil kucuk', onclick: olayKartiniAc }, TD.olayKarti ? 'Tekrar oku' : 'Aç')));

      const emekLi = M.el('li', { class: kalanEmek() === 0 ? 'tamam' : '' },
        M.el('span', { class: 'onay' }, kalanEmek() === 0 ? '✅' : '⬜'),
        M.el('span', null, 'Emeği dağıt (' + kalanEmek() + ' boşta)'));
      const emekTablo = M.el('div', { class: 'emek-tablo' });
      Object.entries(K.isler).forEach(([id, is]) => {
        const enCok = isEnCok(id);
        if (enCok === 0 && is.yapiGerekli) return;
        const n = TD.atamalar[id] || 0;
        let uyari = '';
        if (id === 'tarla' && Z.tarlaCarpan) uyari = ' ⚠️ bu yıl ×' + Z.tarlaCarpan;
        if (id === 'bag' && Z.bagCarpan) uyari = ' ⚠️ bu yıl ×' + Z.bagCarpan;
        emekTablo.append(M.el('div', { class: 'emek-satir', title: is.aciklama },
          M.el('span', { class: 'emek-ad' }, is.ikon + ' ' + is.ad),
          M.el('span', { class: 'emek-aciklama' }, is.aciklama + uyari),
          M.el('span', { class: 'emek-kontrol' },
            M.el('button', { class: 'kucuk ikincil', onclick: () => emekEkle(id, -1), disabled: n === 0 ? 'disabled' : null }, '−'),
            M.el('b', null, n + '/' + enCok),
            M.el('button', { class: 'kucuk', onclick: () => emekEkle(id, 1), disabled: (n >= enCok || kalanEmek() <= 0) ? 'disabled' : null }, '+'))));
      });
      if (TD.emekHarcanan) emekTablo.append(M.el('div', { class: 'ipucu' }, 'Tarla açmaya harcanan: ' + TD.emekHarcanan));
      emekLi.append(emekTablo);
      liste.append(emekLi);

      (tur.gorevler || []).filter(g => g.tip === 'konus').forEach(g => {
        const tamam = !!TD.konus[g.sahne];
        const geldi = TD.figurGeldi['konus_' + g.sahne];
        liste.append(M.el('li', { class: tamam ? 'tamam' : 'zorunlu' },
          M.el('span', { class: 'onay' }, tamam ? '✅' : '❗'),
          M.el('span', null, 'Konuş: ' + g.etiket + (tamam ? '' : g.gelen ? (geldi ? ' (haritada bekliyor, tıkla)' : ' (yolda)') : ' (' + (s.harita.konumlar[g.konum] || {}).ad + ')')),
          tamam || (g.gelen && !geldi) ? null : M.el('button', { class: 'kucuk', onclick: () => { aktifSekme = 'yerleske'; d.bayraklar.aktifSekme = aktifSekme; hepsiniCiz(); konusmayiAc(g); } }, 'Git')));
      });

      (tur.gorevler || []).filter(g => g.tip === 'bolge').forEach(g => {
        const tamam = !!TD.bolge[g.id];
        liste.append(M.el('li', { class: tamam ? 'tamam' : 'zorunlu' },
          M.el('span', { class: 'onay' }, tamam ? '✅' : '❗'),
          M.el('span', null, 'Bölge: ' + g.baslik + (tamam ? ' · ' + d.kararlar[g.id].etiket : '')),
          tamam ? null : M.el('button', { class: 'kucuk', onclick: () => { aktifSekme = 'bolge'; d.bayraklar.aktifSekme = aktifSekme; hepsiniCiz(); M.modal(g.baslik, M.metin(g.soru) + '<p>Bölge haritasında yanıp sönen yerlerden birine tıkla.</p>'); } }, 'Haritaya git')));
      });

      if (tur.sabitOlay) liste.append(M.el('li', { class: 'sabit' }, M.el('span', { class: 'onay' }, '📌'), M.el('span', null, 'Yıl sonunda sabit olay: ' + s.olaylar[tur.sabitOlay].baslik)));

      panel.append(liste);
      if (tur.ipucu) panel.append(M.el('p', { class: 'ipucu' }, '💡 ' + tur.ipucu));
      panel.append(M.el('div', { class: 'buton-satiri' }, M.el('button', { class: 'buyuk', onclick: yiliBitir }, '⏭️ Yılı bitir')));
    };

    /* ---------- Hedef denetimi ---------- */
    const hedefSagla = (k, yilSonucu) => {
      if (!k) return true;
      if (k.hepsi) return k.hepsi.every(x => hedefSagla(x, yilSonucu));
      if (k.herhangi) return k.herhangi.some(x => hedefSagla(x, yilSonucu));
      if (k.yil) return !!yilSonucu[k.yil];
      return M.kosulSagla(k);
    };

    /* ---------- Yıl sonu ---------- */
    const yiliBitir = async () => {
      const eksik = [];
      if (!TD.olayKarti) eksik.push(tur.olayKarti && tur.olayKarti.gelen ? 'Haritada gelenlere tıkla: ' + tur.olayKarti.baslik : 'Olay kartını aç');
      (tur.gorevler || []).forEach(g => {
        if (g.tip === 'konus' && !TD.konus[g.sahne]) eksik.push('Konuş: ' + g.etiket);
        if (g.tip === 'bolge' && !TD.bolge[g.id]) eksik.push('Bölge: ' + g.baslik);
      });
      if (eksik.length) { M.modal('Yıl bitmeden', '<ul>' + eksik.map(e => '<li>' + e + '</li>').join('') + '</ul>'); return; }
      if (kalanEmek() > 0) {
        const ok = await M.modal('Boşta emek var', '<p>' + kalanEmek() + ' emek dağıtılmadı; boşa gidecek. Yine de yılı bitirmek istiyor musun?</p>', [{ metin: 'Önce dağıtayım', deger: false }, { metin: 'Yine de bitir', deger: true }]);
        if (!ok) return;
      }

      const satirlar = [];
      const delta = { erzak: 0, gumus: 0 };
      const etki = {};
      const yilSonucu = { erzakYetti: true };
      const etkiEkle = (e, kat) => { Object.entries(e || {}).forEach(([k, v]) => etki[k] = (etki[k] || 0) + v * (kat || 1)); };
      if (Z.ad) satirlar.push((Z.ikon || '⚠️') + ' ' + Z.ad + ': ' + Z.aciklama);

      Object.entries(TD.atamalar).forEach(([id, n]) => {
        if (!n) return;
        const is = K.isler[id];
        const parcalar = [];
        Object.entries(is.uretim || {}).forEach(([k, v]) => {
          let m = v * n;
          if (k === 'erzak' && id === 'tarla' && d.bayraklar.alet) m += n;
          if (id === 'tarla' && Z.tarlaCarpan) m = Math.floor(m * Z.tarlaCarpan);
          if (id === 'bag' && Z.bagCarpan) m = Math.floor(m * Z.bagCarpan);
          delta[k] += m; parcalar.push('+' + m + ' ' + A[k]);
        });
        Object.entries(is.tuketim || {}).forEach(([k, v]) => { delta[k] -= v * n; parcalar.push('-' + (v * n) + ' ' + A[k]); });
        if (is.etki) { etkiEkle(is.etki, n); parcalar.push(Object.entries(is.etki).map(([k, v]) => gAd(k) + ' +' + v * n).join(', ')); }
        satirlar.push(is.ikon + ' ' + is.ad + ' (' + n + ' emek): ' + parcalar.join(', ') + (id === 'tarla' && d.bayraklar.alet ? ' (alet bonusu)' : ''));
      });
      d.yapilar.forEach(id => {
        const y = s.yapilar[id]; if (!y || !y.yillik) return;
        const parcalar = [];
        Object.entries(y.yillik.uretim || {}).forEach(([k, v]) => { delta[k] += v; parcalar.push('+' + v + ' ' + A[k]); });
        Object.entries(y.yillik.tuketim || {}).forEach(([k, v]) => { delta[k] -= v; parcalar.push('-' + v + ' ' + A[k]); });
        if (y.yillik.etki) { etkiEkle(y.yillik.etki); parcalar.push(Object.entries(y.yillik.etki).map(([k, v]) => gAd(k) + ' +' + v).join(', ')); }
        if (parcalar.length) satirlar.push(y.ikon + ' ' + y.ad + ': ' + parcalar.join(', '));
        if (d.bayraklar['bonus_' + id] && y.komsuBonus && y.komsuBonus.yillik) { Object.entries(y.komsuBonus.yillik).forEach(([k, v]) => { delta[k] += v; }); satirlar.push(y.ikon + ' ' + y.komsuBonus.metin); }
      });
      Object.values(d.yillikEkler || {}).forEach(ek => { Object.entries(ek.kaynak || {}).forEach(([k, v]) => { delta[k] += v; }); satirlar.push('🐪 ' + ek.metin + ': ' + Object.entries(ek.kaynak).map(([k, v]) => '+' + v + ' ' + A[k]).join(', ')); });
      const carpan = Z.tuketimCarpan || 1;
      const haneTuketim = Math.ceil(d.kaynaklar.haneler / (K.haneTuketimBolen || 2)) * carpan;
      delta.erzak -= haneTuketim; satirlar.push('🏘️ Haneler (' + d.kaynaklar.haneler + '): -' + haneTuketim + ' ' + A.erzak + (carpan > 1 ? ' (×' + carpan + ')' : ''));
      const misafir = Math.floor(d.gostergeler.guven / (K.misafirBolen || 50)) * carpan;
      if (misafir > 0) { delta.erzak -= misafir; satirlar.push('🚶 Yolcular ve misafirler: -' + misafir + ' ' + A.erzak + ' (Güven arttıkça gelen de artar)'); }
      Object.entries(Z.ekTuketim || {}).forEach(([k, v]) => { delta[k] -= v; satirlar.push((Z.ikon || '⚠️') + ' ' + Z.ad + ': -' + v + ' ' + A[k]); });
      if (K.yillikAsinma) { etkiEkle(K.yillikAsinma); satirlar.push('⏳ Yıllar geçiyor: ' + Object.entries(K.yillikAsinma).map(([k, v]) => gAd(k) + ' ' + v).join(', ') + ' (sofra, aşevi ve iyi komşuluk bunu dengeler)'); }

      let erzak = d.kaynaklar.erzak + delta.erzak;
      let gumus = d.kaynaklar.gumus + delta.gumus;
      if (erzak < 0) { satirlar.push('⚠️ Erzak yetmedi: sofra boş kaldı. Güven -5, Refah -5'); etkiEkle({ guven: -5, refah: -5 }); erzak = 0; yilSonucu.erzakYetti = false; }
      const kapasite = d.yapilar.includes('ambar') ? K.ambarKapasitesiAmbarla : K.ambarKapasitesi;
      if (erzak > kapasite) { satirlar.push('🐀 Ambar sınırı ' + kapasite + ': ' + (erzak - kapasite) + ' erzak çürüdü' + (d.yapilar.includes('ambar') ? '' : ' (ambar kurarsan sınır 24 olur)')); erzak = kapasite; }
      if (gumus < 0) gumus = 0;
      let refah;
      if (erzak >= 8 && gumus >= 4) { refah = 3; satirlar.push('📈 Ambar ve kese dolu: Refah +3'); }
      else if (erzak <= 2) { refah = -4; satirlar.push('📉 Ambar boşa yakın: Refah -4'); }
      else { refah = 1; satirlar.push('➡️ Geçim idare ediyor: Refah +1'); }
      etkiEkle({ refah });

      d.kaynaklar.erzak = erzak; d.kaynaklar.gumus = gumus;
      M.etkiUygula(etki, { tur: 'yil', baslik: tur.yil + ' yıl sonu', secim: 'üretim ve tüketim' });

      (K.esikler || []).forEach(e => {
        if (d.gostergeler[e.gosterge] < e.altinda) {
          M.kaynakUygula(e.kaynak);
          satirlar.push('🔻 ' + e.metin + ': ' + Object.entries(e.kaynak).map(([k, v]) => v + ' ' + A[k]).join(', '));
        }
      });

      if (tur.hedef) {
        const basarildi = hedefSagla(tur.hedef.kosul, yilSonucu);
        d.hedefler[tur.id] = { metin: tur.hedef.metin, basarildi };
        satirlar.push((basarildi ? '🎯 Hedef başarıldı: ' : '🎯 Hedef tutmadı: ') + tur.hedef.metin);
      }
      satirlar.forEach(x => gunlukYaz(x));
      Durum.kaydet(d);
      kaynakPaneliCiz();
      await M.modal('Yıl sonu: ' + tur.yil + ' · ' + tur.baslik,
        '<ul class="yil-sonu">' + satirlar.map(x => '<li' + (x.startsWith('🎯') ? ' class="hedef-satir ' + (x.includes('başarıldı') ? 'iyi' : 'kotu') + '"' : '') + '>' + x + '</li>').join('') + '</ul>' +
        '<p><b>Ambar:</b> ' + d.kaynaklar.erzak + ' ' + A.erzak + ' · <b>Kese:</b> ' + d.kaynaklar.gumus + ' ' + A.gumus + ' · <b>Hane:</b> ' + d.kaynaklar.haneler + '</p>');

      const sonrakiTur = () => {
        d.turIndex += 1;
        d.turDurum = turDurumuYeni();
        Durum.kaydet(d);
        M.render();
      };
      if (tur.sabitOlay && !TD.olayBitti) {
        altSahneAc(Sahneler.olay, s.olaylar[tur.sabitOlay], () => { TD.olayBitti = true; Durum.kaydet(d); sonrakiTur(); });
      } else sonrakiTur();
    };

    /* ---------- Sekmeler ve yerleşim ---------- */
    const sekmeler = M.el('div', { class: 'sekmeler' });
    const haritaAlani = M.el('div');
    const sekmeCiz = () => {
      sekmeler.innerHTML = '';
      [['yerleske', '🏠 Yerleşke'], ['bolge', '🗺️ Bölge' + (bekleyenBolge().length ? ' ❗' : '')]].forEach(([id, ad]) => {
        sekmeler.append(M.el('button', { class: 'sekme' + (aktifSekme === id ? ' aktif' : ''), onclick: () => { aktifSekme = id; d.bayraklar.aktifSekme = id; Durum.kaydet(d); hepsiniCiz(); } }, ad));
      });
      haritaAlani.innerHTML = '';
      if (aktifSekme === 'yerleske') haritaAlani.append(haritaSarici, M.el('div', { class: 'harita-aciklama' }, H.aciklama), paletKutusu);
      else haritaAlani.append(bolgeKutusu);
    };

    const hepsiniCiz = () => { kaynakPaneliCiz(); haritaCiz(); paletCiz(); bolgeCiz(); panelCiz(); sekmeCiz(); };

    const ilerleme = M.el('div', { class: 'tur-ilerleme' },
      turlar.map((t, i) => M.el('div', { class: 'tur-nokta' + (i < d.turIndex ? ' gecti' : i === d.turIndex ? ' aktif' : ''), title: t.baslik + (t.zorluk ? ' · ' + t.zorluk.ad : '') },
        M.el('span', { class: 'tur-yil' }, t.yil), t.hava ? M.el('span', null, ' ' + t.hava.ikon) : null, t.sabitOlay ? M.el('span', { class: 'tur-sabit' }, '📌') : null,
        d.hedefler[t.id] ? M.el('span', { class: 'tur-hedef' }, d.hedefler[t.id].basarildi ? ' 🎯' : ' ✗') : null)));

    kok.append(
      M.el('div', { class: 'kart vurgulu tur-baslik' },
        M.el('div', { class: 'tur-ust' },
          M.el('div', null, M.el('span', { class: 'etiket' }, 'Tur ' + (d.turIndex + 1) + '/' + turlar.length), M.el('h2', null, tur.yil + ' · ' + tur.baslik)),
          kaynakPaneli),
        M.el('div', { html: M.metin(tur.giris) }),
        ilerleme),
      M.el('div', { class: 'yerleske-duzen' },
        M.el('div', { class: 'kart harita-karti' }, sekmeler, haritaAlani),
        panel)
    );
    hepsiniCiz();

    if (!TD.haberGosterildi) {
      TD.haberGosterildi = true; Durum.kaydet(d);
      if (tur.haber) setTimeout(() => bildir('📯 ' + tur.haber.kim + ': ' + tur.haber.metin, 'haber', 9000), 400);
      if (tur.hedef) setTimeout(() => bildir('🎯 Hedef: ' + tur.hedef.metin, 'hedef', 9000), 900);
    }
    if (!TD.olayKarti && tur.olayKarti && !tur.olayKarti.gelen) setTimeout(olayKartiniAc, 300);
  };
})();
