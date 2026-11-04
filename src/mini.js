/* Mini oyunlar. Her biri (olay, icerik, onBitti) alır; tam ekran kaplama içinde adım adım ilerler;
   bitince onBitti(sonuc) ile ürünleri döndürür.
   Tipler: tez (sürükle-bırak kanıt tahtası), savas (birlik yerleştirme, animasyonlu sabit savaş, neden sıralama, farkı bul),
           abluka (ikmal yollarını kesme bulmacası), esle (kavram eşleştirme), iskan (yerleştirme), dedektif (ipucu sıralama), okuma.
   Ortak kontroller: "✕ Haritaya dön" (üst çubuk), "◀ Geri" (önceki adım; geçilen adım çiplerine tıklamak da geri götürür),
           "↶ Geri al" (sürükle-bırak adımlarında son hamle). Geri dönülen adımda önceki seçimler ve yazılar korunur. */
const MiniOyunlar = (() => {
  const M = Motor;

  /* ---------- Sürükle-bırak (işaretçi tabanlı; tıkla-seç/tıkla-bırak yedeği) ---------- */
  const Surukle = {
    secili: null,
    kart(el, hedefSecici, onBirak) {
      el.classList.add('surukle');
      let bas = null, tasiyor = false, klon = null;
      el.addEventListener('pointerdown', e => {
        if (e.button !== 0) return; bas = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', e => {
        if (!bas) return;
        if (!tasiyor && Math.hypot(e.clientX - bas.x, e.clientY - bas.y) > 6) {
          tasiyor = true; klon = el.cloneNode(true); klon.classList.add('surukle-klon'); document.body.append(klon); el.classList.add('tasiniyor');
        }
        if (tasiyor) { klon.style.left = e.clientX + 'px'; klon.style.top = e.clientY + 'px'; document.querySelectorAll(hedefSecici).forEach(h => h.classList.toggle('ustunde', h === Surukle.hedefBul(e, hedefSecici))); }
      });
      const bitir = e => {
        if (!bas) return;
        if (tasiyor) {
          const h = Surukle.hedefBul(e, hedefSecici);
          klon.remove(); klon = null; el.classList.remove('tasiniyor'); document.querySelectorAll(hedefSecici).forEach(x => x.classList.remove('ustunde'));
          if (h) onBirak(h);
        } else { // tıkla-seç
          // Başka bir kart seçiliyken onun hedefi içindeki bir karta tıklandıysa seçim değişmez; tıklama hedefe ulaşır ve seçili kart oraya bırakılır.
          if (Surukle.secili && Surukle.secili !== el && Surukle.seciliHedef && el.closest(Surukle.seciliHedef)) { /* hedefin click dinleyicisi bırakır */ }
          else if (Surukle.secili === el) { el.classList.remove('secili'); Surukle.secili = null; }
          else { document.querySelectorAll('.surukle.secili').forEach(x => x.classList.remove('secili')); el.classList.add('secili'); Surukle.secili = el; Surukle.secilenBirak = onBirak; Surukle.seciliHedef = hedefSecici; }
        }
        bas = null; tasiyor = false;
      };
      el.addEventListener('pointerup', bitir); el.addEventListener('pointercancel', bitir);
    },
    hedef(el) {
      el.classList.add('surukle-hedef');
      el.addEventListener('click', () => { if (Surukle.secili && Surukle.secilenBirak) { const f = Surukle.secilenBirak; Surukle.secili.classList.remove('secili'); Surukle.secili = null; f(el); } });
    },
    hedefBul(e, secici) {
      const liste = document.elementsFromPoint(e.clientX, e.clientY);
      return liste.find(x => x.matches && x.matches(secici)) || liste.map(x => x.closest && x.closest(secici)).find(Boolean) || null;
    }
  };

  /* ---------- Ortak ---------- */
  /* Kaplama. Her adım fonksiyonu K.adim(no, kendisi) ile başlar; böylece "◀ Geri" ve adım çipleri o adımı yeniden çizebilir.
     Adım değişince ya da kaplama kapanınca K.temizlik ile kaydedilen işler (animasyon, klavye dinleyicisi) durdurulur.
     K.ileri(metin, onclick, kosul): alt düğme satırı; ilk adımdan sonra solda "◀ Geri" de içerir. */
  function kaplamaAc(olay, adimlar) {
    const kap = M.el('div', { class: 'mini-oyun' });
    const adimKutu = M.el('div', { class: 'mini-adimlar' });
    const govde = M.el('div', { class: 'mini-govde' });
    let aktif = 0, temizlikler = []; const ziyaret = [];
    const temizle = () => { temizlikler.forEach(f => { try { f(); } catch (e) { /* yoksay */ } }); temizlikler = []; };
    const adimCiz = () => {
      adimKutu.innerHTML = '';
      adimlar.forEach((a, i) => {
        const sinif = 'mini-adim' + (i === aktif ? ' aktif' : i < aktif ? ' gecti' : ''); const yazi = (i + 1) + '. ' + a;
        adimKutu.append(i < aktif && ziyaret[i] ? M.el('button', { class: sinif, title: 'Bu adıma geri dön', onclick: () => ziyaret[i]() }, yazi) : M.el('span', { class: sinif }, yazi));
      });
    };
    const K = {
      govde,
      adim(i, yenidenCiz) { temizle(); aktif = i; if (yenidenCiz) ziyaret[i] = yenidenCiz; adimCiz(); govde.innerHTML = ''; govde.scrollTop = 0; Surukle.secili = null; },
      temizlik(f) { temizlikler.push(f); },
      ileri(metin, onclick, kosul) {
        const geri = aktif > 0 ? ziyaret[aktif - 1] : null;
        return M.el('div', { class: 'buton-satiri' },
          geri ? M.el('button', { class: 'ikincil geri-dugme', title: 'Önceki adıma dön (yaptıkların korunur)', onclick: () => geri() }, '◀ Geri') : null,
          M.el('button', { class: 'buyuk', onclick: () => { const e = kosul ? kosul() : null; if (e) { M.modal('Eksik', '<p>' + e + '</p>'); return; } onclick(); } }, metin));
      },
      kapat() { temizle(); kap.remove(); document.body.classList.remove('mini-acik'); }
    };
    const cik = async () => {
      const ok = await M.modal('Haritaya dön', '<p>Bu mini oyunda yaptıkların kaydedilmez. Olayı istediğin zaman yeniden oynayabilirsin.</p><p>Haritaya dönülsün mü?</p>', [{ metin: 'Oyuna devam et', deger: false }, { metin: '✕ Haritaya dön', deger: true }]);
      if (ok) K.kapat();
    };
    kap.append(M.el('div', { class: 'mini-ust' },
      M.el('div', { class: 'mini-baslik' }, M.el('span', { class: 'etiket' }, olay.yil), M.el('b', null, ' ' + olay.ad)),
      adimKutu,
      M.el('button', { class: 'kucuk ikincil mini-cikis', title: 'Mini oyundan çık, haritaya dön', onclick: cik }, '✕ Haritaya dön')), govde);
    document.body.append(kap); document.body.classList.add('mini-acik');
    adimCiz();
    Rehber.goster('mini'); // ilk mini oyunda bir kez; ilk adım çizildikten sonra açılır
    return K;
  }

  /* Durum nesnesini kimliğini koruyarak geri yükler (adım fonksiyonları const nesne ve dizileri paylaşır). */
  const icineKoy = (hedef, kaynak) => { if (Array.isArray(hedef)) hedef.splice(0, hedef.length, ...kaynak); else { Object.keys(hedef).forEach(k => delete hedef[k]); Object.assign(hedef, kaynak); } };
  /* Son hamleyi geri al: her hamleden önce kaydet() çağrılır; düğme son kaydı geri yükleyip ciz() çağırır. */
  function geriAlma(nesneler, ciz) {
    const yigin = [];
    const buton = M.el('button', { class: 'kucuk ikincil geri-al', title: 'Son hamleyi geri al' }, '↶ Geri al');
    const guncelle = () => { buton.disabled = !yigin.length; };
    buton.addEventListener('click', () => { if (!yigin.length) return; JSON.parse(yigin.pop()).forEach((s, i) => icineKoy(nesneler[i], s)); guncelle(); ciz(); });
    guncelle();
    return { kaydet() { yigin.push(JSON.stringify(nesneler)); if (yigin.length > 50) yigin.shift(); guncelle(); }, buton };
  }

  /* Çoktan seçmeli soru; onceki verilirse (seçeneğin metni) o seçenek işaretli ve geri bildirimi açık gelir. */
  const soruKutusu = (q, cevapla, onceki) => {
    const gb = M.el('div', { class: 'geri-bildirim gizli' });
    const sec = M.el('div', { class: 'secenekler' });
    const goster = (btn, s) => { sec.querySelectorAll('.secenek').forEach(x => x.classList.remove('secildi')); btn.classList.add('secildi'); gb.innerHTML = M.metin(s.geriBildirim); gb.classList.remove('gizli'); };
    q.secenekler.forEach((s, i) => { const b = M.el('button', { class: 'secenek', onclick: (e) => { goster(e.currentTarget, s); cevapla(i, s); } }, s.metin); sec.append(b); if (onceki && s.metin === onceki) goster(b, s); });
    return M.el('div', { class: 'soru' }, M.el('h3', null, q.metin), sec, gb);
  };
  /* Yazı alanı: önceki değeri geri yükler, her değişiklikte degisince(metin) çağırır. */
  const yaziAlani = (yerTutucu, deger, degisince) => { const t = M.el('textarea', { placeholder: yerTutucu }); t.value = deger || ''; t.addEventListener('input', () => degisince(t.value)); return t; };
  const baslikKarti = (baslik, metin, ekstra) => M.el('div', { class: 'kart vurgulu' }, M.el('h2', null, baslik), M.el('div', { html: M.metin(metin) }), ekstra || null);
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (t, at, tx) => { const e = document.createElementNS(NS, t); Object.entries(at || {}).forEach(([k, v]) => { if (v !== null && v !== undefined) e.setAttribute(k, v); }); if (tx !== undefined) e.textContent = tx; return e; };
  const bildirim = (govde, metin, sinif) => { const b = M.el('div', { class: 'mini-bildirim ' + (sinif || '') }, metin); govde.prepend(b); setTimeout(() => b.remove(), 4500); };

  /* Son adım: kaynak sorusu (varsa) + tarih şeridi notu */
  function sonAdim(K, olay, sonuc, adimNo, ekSoru) {
    K.adim(adimNo, () => sonAdim(K, olay, sonuc, adimNo, ekSoru));
    let cevap = !ekSoru || !!sonuc.kaynakCevabi;
    const ta = yaziAlani('Bir-iki cümle...', sonuc.seritNotu, v => sonuc.seritNotu = v);
    K.govde.append(
      ekSoru ? M.el('div', { class: 'kart' }, soruKutusu(ekSoru, (i, s) => { cevap = true; sonuc.kaynakCevabi = s.metin; }, sonuc.kaynakCevabi)) : null,
      M.el('div', { class: 'kart' }, M.el('h3', null, '✍️ ' + (olay.seritNotu || 'Bu olayı tarih şeridine bir cümleyle not et.')), M.el('p', { class: 'ipucu' }, 'Bu not açıklamalı tarih şeridinin parçası olacak.'), ta),
      K.ileri('Bitir ✓', () => { K.kapat(); K.onBitti(sonuc); }, () => !cevap ? 'Önce soruyu cevapla.' : !(sonuc.seritNotu || '').trim() ? 'Tarih şeridine bir cümle yaz.' : null));
  }

  /* Kartları kutulara eşleştirme adımı (esle ve taht ortak). V: { giris, hedefler: [{ id, ad, ikon }], kartlar: [{ ad, hedef, aciklama }] }.
     yerlesen (kart sırası → kutu id) ve eslestirme (kart adı → ürün satırı) adım dışında tutulur; geri dönünce korunur. */
  function kutuAdimi(K, baslik, V, yerlesen, eslestirme, ileriMetin, ileriFn) {
    const tepsi = M.el('div', { class: 'tepsi yatay' }); const kutular = M.el('div', { class: 'esle-kutular' }); const gb = M.el('div', { class: 'geri-bildirim gizli' });
    const hedefAd = (id) => V.hedefler.find(h => h.id === id).ad;
    const G = geriAlma([yerlesen, eslestirme], () => { gb.classList.add('gizli'); ciz(); });
    const ciz = () => {
      tepsi.innerHTML = ''; kutular.innerHTML = '';
      V.kartlar.forEach((k, idx) => { if (yerlesen[idx]) return; const el = M.el('div', { class: 'neden-kart surukle-kart' }, k.ad); Surukle.kart(el, '.esle-kutu', (h) => birak(idx, h.dataset.id)); tepsi.append(el); });
      if (!tepsi.children.length) tepsi.append(M.el('span', { class: 'ipucu' }, 'Tüm kartlar yerleşti.'));
      V.hedefler.forEach(h => { const kutu = M.el('div', { class: 'esle-kutu', 'data-id': h.id }, M.el('h4', null, h.ikon + ' ' + h.ad)); Surukle.hedef(kutu); V.kartlar.forEach((k, idx) => { if (yerlesen[idx] === h.id) kutu.append(M.el('div', { class: 'tahta-kart ' + (k.hedef === h.id ? 'guvenilir' : 'supheli') }, k.ad, M.el('div', { class: 'kunye' }, k.aciklama), M.el('button', { class: 'kucuk ikincil', title: 'Kartı geri al', onclick: () => { G.kaydet(); delete yerlesen[idx]; delete eslestirme[k.ad]; ciz(); } }, '↩'))); }); kutular.append(kutu); });
    };
    const birak = (idx, hedefId) => { const k = V.kartlar[idx]; if (yerlesen[idx] !== hedefId) G.kaydet(); yerlesen[idx] = hedefId; gb.innerHTML = (k.hedef === hedefId ? '✅ ' : '🤔 Bu kart daha çok "' + hedefAd(k.hedef) + '" kutusuna ait. ') + k.aciklama; gb.classList.remove('gizli'); eslestirme[k.ad] = hedefAd(hedefId) + (k.hedef === hedefId ? ' ✓' : ' (beklenen: ' + hedefAd(k.hedef) + ')'); ciz(); };
    ciz();
    K.govde.append(baslikKarti(baslik, V.giris), M.el('div', { class: 'kart' }, M.el('div', { class: 'arac-satiri' }, M.el('h3', null, '🃏 Kartlar'), G.buton), tepsi, gb), kutular,
      K.ileri(ileriMetin, ileriFn, () => Object.keys(yerlesen).length < V.kartlar.length ? 'Tüm kartları bir kutuya yerleştir.' : null));
  }

  /* ---------- OKUMA (yedek) ---------- */
  function okuma(olay, icerik, onBitti) {
    const K = kaplamaAc(olay, ['Oku', 'Kaynak sorusu ve not']); K.onBitti = onBitti; const sonuc = {};
    const adim1 = () => {
      K.adim(0, adim1);
      K.govde.append(baslikKarti(olay.ad, olay.ozet, (olay.kavramlar || []).map(k => M.kavramKutusu(k))), K.ileri('Devam ▶', () => sonAdim(K, olay, sonuc, 1, olay.kaynakSorusu)));
    };
    adim1();
  }

  /* ---------- TEZ: sürükle-bırak kanıt tahtası + mühür + tez savunma ---------- */
  function tez(olay, icerik, onBitti) {
    const K = kaplamaAc(olay, ['Kanıt tahtası', 'Mühürle', 'Tezini savun']); K.onBitti = onBitti;
    const tezler = icerik.tezler, guven = icerik.guvenilirlik, kartlar = olay.tanikler;
    const isaretler = {}; const sonuc = { kartlar: {} };
    const savunma = { tez: null, destek: [], zayif: null, cevaplar: {} };
    const tezAd = (id) => (tezler.find(t => t.id === id) || {}).tarihci || '-';
    const kartEl = (k, kucuk) => M.el('div', { class: 'tanik-kart surukle-kart' + (kucuk ? ' kucuk' : ''), 'data-id': k.id },
      M.el('div', { class: 'kart-bas' }, M.el('span', { class: 'kart-avatar' }, k.avatar), M.el('b', null, k.ad), M.el('span', { class: 'etiket kurgu' }, k.tur === 'belge' ? 'belge' : 'sözlü')),
      M.el('div', { class: 'kunye' }, k.kim + ' · ' + k.nerede + ' · ' + k.zaman),
      M.el('p', { class: 'tanik-soz' }, '“' + k.metin + '”'),
      M.el('p', { class: 'ipucu' }, '🎭 Çıkar: ' + k.cikar));

    const tahtaCiz = () => {
      K.adim(0, tahtaCiz);
      const tepsi = M.el('div', { class: 'tepsi' });
      const tahta = M.el('div', { class: 'kanit-tahtasi' });
      const sayac = M.el('span', { class: 'ipucu' });
      const yerlesenler = () => kartlar.filter(k => isaretler[k.id] && isaretler[k.id].tez).length;
      const yenidenCiz = () => {
        tepsi.innerHTML = ''; tahta.innerHTML = '';
        kartlar.filter(k => !(isaretler[k.id] || {}).tez).forEach(k => { const el = kartEl(k); Surukle.kart(el, '.tahta-sutun', (h) => birak(k, h.dataset.tez)); tepsi.append(el); });
        if (!tepsi.children.length) tepsi.append(M.el('p', { class: 'ipucu' }, 'Tüm tanıklıklar tahtada. Kartları sütunlar arasında taşıyabilirsin.'));
        tezler.forEach(t => {
          const sutun = M.el('div', { class: 'tahta-sutun', 'data-tez': t.id, style: 'border-top: 6px solid ' + t.renk }, M.el('h4', null, t.tarihci), M.el('p', { class: 'ipucu' }, t.kisa));
          Surukle.hedef(sutun);
          kartlar.filter(k => (isaretler[k.id] || {}).tez === t.id).forEach(k => {
            const el = M.el('div', { class: 'tahta-kart surukle-kart' }, M.el('b', null, k.avatar + ' ' + k.ad), M.el('p', null, k.metin.slice(0, 80) + (k.metin.length > 80 ? '…' : '')),
              M.el('div', { class: 'geri-bildirim' + (isaretler[k.id].gb ? '' : ' gizli'), html: isaretler[k.id].gb || '' }));
            Surukle.kart(el, '.tahta-sutun', (h) => birak(k, h.dataset.tez));
            sutun.append(el);
          });
          tahta.append(sutun);
        });
        sayac.textContent = yerlesenler() + '/' + kartlar.length + ' tanıklık yerleşti';
      };
      const G = geriAlma([isaretler], yenidenCiz);
      const birak = (k, tezId) => {
        if ((isaretler[k.id] || {}).tez !== tezId) G.kaydet();
        isaretler[k.id] = isaretler[k.id] || {};
        isaretler[k.id].tez = tezId;
        const uyuyor = k.tezler.includes(tezId);
        isaretler[k.id].gb = (uyuyor ? '✅ ' : '🤔 ') + k.aciklama + (uyuyor ? '' : ' Bu kartı ' + tezAd(tezId) + ' sütununa koydun; gerekçen varsa kalabilir, istersen taşı.');
        yenidenCiz();
      };
      yenidenCiz();
      K.govde.append(baslikKarti('Kanıt tahtası', 'Tanıklık kartlarını, desteklediğini düşündüğün tarihçinin sütununa **sürükle** (ya da karta tıkla, sonra sütuna tıkla). Her kart bırakıldığında kısa bir tarihçi yorumu belirir. Kartları sonradan taşıyabilirsin; bir hamleyi **↶ Geri al** ile geri alabilirsin.', M.el('div', { class: 'arac-satiri' }, sayac, G.buton)),
        M.el('div', { class: 'tahta-duzen' }, M.el('div', { class: 'kart tepsi-karti' }, M.el('h3', null, '🗣️ Tanıklar'), tepsi), tahta),
        K.ileri('Mühürlemeye geç ▶', muhurCiz, () => yerlesenler() < kartlar.length ? 'Önce tüm kartları tahtaya yerleştir.' : null));
    };

    const muhurCiz = () => {
      K.adim(1, muhurCiz);
      const liste = M.el('div', { class: 'kanit-tahtasi' });
      const ciz = () => {
        liste.innerHTML = '';
        tezler.forEach(t => {
          const sutun = M.el('div', { class: 'tahta-sutun', style: 'border-top: 6px solid ' + t.renk }, M.el('h4', null, t.tarihci));
          kartlar.filter(k => isaretler[k.id].tez === t.id).forEach(k => {
            const muhurler = M.el('div', { class: 'muhurler' }, guven.map(g => M.el('button', { class: 'muhur ' + g.id + (isaretler[k.id].guven === g.id ? ' basili' : ''), title: g.aciklama, onclick: () => { isaretler[k.id].guven = g.id; ciz(); } }, g.ad)));
            sutun.append(M.el('div', { class: 'tahta-kart ' + (isaretler[k.id].guven || '') }, M.el('b', null, k.avatar + ' ' + k.ad), M.el('p', null, k.metin.slice(0, 90) + '…'), M.el('p', { class: 'ipucu' }, '🎭 ' + k.cikar), muhurler));
          });
          liste.append(sutun);
        });
      };
      ciz();
      K.govde.append(baslikKarti('Mühürle', 'Her kartın altındaki mühürlerden birini bas: **Güvenilir** (olaya yakın, çıkarı az), **Şüpheli** (çıkar, abartı, sonradan aktarım), **Çelişkili** (başka bir kartla çelişiyor). Menkıbeler ve çıkarı olan tanıklar için dikkatli ol.'), liste,
        K.ileri('Tezini savun ▶', savunCiz, () => kartlar.some(k => !isaretler[k.id].guven) ? 'Her karta bir mühür bas.' : null));
    };

    const savunCiz = () => {
      K.adim(2, savunCiz);
      const s = savunma;
      const gorusler = M.el('div', { class: 'gorus-kartlari' });
      const gorusCiz = () => { gorusler.innerHTML = ''; icerik.gorusKartlari.forEach(g => { const t = tezler.find(x => x.id === g.id); const n = kartlar.filter(k => isaretler[k.id].tez === g.id).length; gorusler.append(M.el('button', { class: 'gorus-karti secilebilir' + (s.tez === g.id ? ' secildi' : ''), style: 'border-color:' + (s.tez === g.id ? t.renk : ''), onclick: () => { s.tez = g.id; gorusCiz(); } }, M.el('h4', null, g.tarihci), M.el('div', { class: 'alt' }, g.donem), M.el('p', null, g.ozet), M.el('span', { class: 'etiket' }, '📖 tahtada ' + n + ' kart'))); }); };
      gorusCiz();
      const kartListesi = M.el('div');
      kartlar.forEach(k => {
        const c = M.el('input', { type: 'checkbox', onchange: e => { s.destek = s.destek.filter(x => x !== k.id); if (e.target.checked) s.destek.push(k.id); } }); c.checked = s.destek.includes(k.id);
        const r = M.el('input', { type: 'radio', name: 'zayif', onchange: () => s.zayif = k.id }); r.checked = s.zayif === k.id;
        kartListesi.append(M.el('div', { class: 'tanik-kart kucuk ' + (isaretler[k.id].guven || '') }, M.el('div', { class: 'kunye' }, k.avatar + ' ' + k.ad + ' · sütun: ' + tezAd(isaretler[k.id].tez) + ' · mühür: ' + ((guven.find(g => g.id === isaretler[k.id].guven) || {}).ad || '')), M.el('p', { class: 'tanik-soz' }, '“' + k.metin + '”'), M.el('div', { class: 'defter-secimler' }, M.el('label', null, c, ' Destekliyor'), M.el('label', null, r, ' Zayıflatıyor'))));
      });
      const sorular = olay.tezSorulari.map(q => M.el('div', { class: 'soru' }, M.el('h3', null, q.metin), yaziAlani(null, s.cevaplar[q.id], v => s.cevaplar[q.id] = v)));
      K.govde.append(baslikKarti('Tezini savun', 'Bir görüş seç, onu destekleyen en az iki kart ve zayıflatan bir kart işaretle, gerekçeni yaz.'),
        M.el('div', { class: 'kart' }, M.el('h3', null, '1. Görüş'), gorusler), M.el('div', { class: 'kart' }, M.el('h3', null, '2. Kanıtlar'), kartListesi), M.el('div', { class: 'kart' }, M.el('h3', null, '3. Gerekçe'), sorular),
        K.ileri('Bitir ✓', () => {
          kartlar.forEach(k => sonuc.kartlar[k.ad] = tezAd(isaretler[k.id].tez) + ' / ' + ((guven.find(g => g.id === isaretler[k.id].guven) || {}).ad || '-'));
          sonuc.tez = tezAd(s.tez); sonuc.destek = s.destek.map(id => kartlar.find(k => k.id === id).ad); sonuc.zayif = s.zayif ? kartlar.find(k => k.id === s.zayif).ad : '-';
          sonuc.tezGerekce = s.cevaplar.tez_gerekce; sonuc.tezZayif = s.cevaplar.tez_zayif; sonuc.tezCurutme = s.cevaplar.tez_curutme;
          K.kapat(); onBitti(sonuc);
        }, () => !s.tez ? 'Bir görüş seç.' : s.destek.length < 2 ? 'En az iki destekleyen kart işaretle.' : !s.zayif ? 'Zayıflatan bir kart işaretle.' : olay.tezSorulari.some(q => !(s.cevaplar[q.id] || '').trim()) ? 'Üç gerekçe sorusunu da cevapla.' : null));
    };
    tahtaCiz();
  }

  /* ---------- SAVAŞ ---------- */
  function savasHaritasi(olay) {
    const svg = mk('svg', { viewBox: '0 0 600 260', class: 'savas-haritasi' });
    const kiyi = olay.id === 'koyunhisar';
    svg.append(mk('rect', { x: 0, y: 0, width: 600, height: 260, fill: kiyi ? '#7fb0d6' : '#cfdc9e' }));
    svg.append(mk('path', { d: kiyi ? 'M0,120 C100,80 200,140 300,110 C400,80 500,130 600,100 L600,260 L0,260 Z' : 'M0,0 L600,0 L600,260 L0,260 Z', fill: '#dcd2b4' }));
    if (!kiyi) { svg.append(mk('path', { d: 'M0,40 C150,20 300,60 600,30', class: 'tepe-cizgi' }), mk('path', { d: 'M0,60 C150,45 300,80 600,55', class: 'tepe-cizgi' })); }
    [[60, 240, kiyi ? '← İstanbul / İzmit' : '← Düşman tarafı'], [540, 240, kiyi ? 'İznik →' : 'Osmanlı tarafı →']].forEach(([x, y, t]) => svg.append(mk('text', { x, y, 'text-anchor': 'middle', class: 'yer-etiket' }, t)));
    return svg;
  }
  function savas(olay, icerik, onBitti) {
    const K = kaplamaAc(olay, ['Düzen kur', 'Savaş (sabit)', 'Nedenleri sırala', 'Farkı bul', 'Tahmin ve not']); K.onBitti = onBitti;
    const nedenler = olay.nedenler || icerik.nedenler; const sonuc = {}; const yerlesen = {};
    const sira = [null, null, null]; const fark = { sec: [null, null], cevaplar: {} }; let izlendi = false;
    const birlikler = [{ id: 'gozcu', ad: 'Gözcü', ikon: '👁️' }, { id: 'atli', ad: 'Atlı birlik', ikon: '🏇' }, { id: 'elci', ad: 'Elçi', ikon: '🤝' }];
    const adim1 = () => {
      K.adim(0, adim1);
      const svg = savasHaritasi(olay);
      const bilgi = M.el('div', { class: 'kart' });
      const tepsi = M.el('div', { class: 'tepsi yatay' });
      const sarici = M.el('div', { class: 'savas-sarici' }, svg);
      const hepsiniCiz = () => { bolgeCiz(); tepsiCiz(); bilgiCiz(); };
      const G = geriAlma([yerlesen], hepsiniCiz);
      const bolgeCiz = () => {
        svg.querySelectorAll('.bolge').forEach(x => x.remove()); sarici.querySelectorAll('.bolge-hedef').forEach(x => x.remove());
        olay.hazirliklar.forEach(h => {
          const g = mk('g', { class: 'bolge' + (yerlesen[h.id] ? ' dolu' : '') });
          g.append(mk('circle', { cx: h.x, cy: h.y, r: 22, class: 'bolge-daire' }), mk('text', { x: h.x, y: h.y + 7, 'text-anchor': 'middle', style: 'font-size:20px' }, yerlesen[h.id] ? birlikler.find(b => b.id === yerlesen[h.id]).ikon : h.ikon), mk('text', { x: h.x, y: h.y + 40, 'text-anchor': 'middle', class: 'yer-etiket' }, h.bolge));
          svg.append(g);
          // HTML hedef (sürükleme için) haritanın üstüne konumlanır
          const hed = M.el('div', { class: 'bolge-hedef' + (yerlesen[h.id] ? ' dolu' : ''), style: 'left:' + (h.x / 600 * 100) + '%; top:' + (h.y / 260 * 100) + '%', 'data-id': h.id, title: h.ad + ': ' + h.metin });
          if (yerlesen[h.id]) hed.append(M.el('button', { class: 'kaldir', title: 'Birliği geri çek', onclick: (e) => { e.stopPropagation(); G.kaydet(); delete yerlesen[h.id]; hepsiniCiz(); } }, '✕'));
          Surukle.hedef(hed); sarici.append(hed);
        });
      };
      const tepsiCiz = () => {
        tepsi.innerHTML = '';
        birlikler.filter(b => !Object.values(yerlesen).includes(b.id)).forEach(b => { const el = M.el('div', { class: 'birlik surukle-kart' }, M.el('span', { class: 'birlik-ikon' }, b.ikon), b.ad); Surukle.kart(el, '.bolge-hedef', (h) => birak(b, h.dataset.id)); tepsi.append(el); });
        if (!tepsi.children.length) tepsi.append(M.el('span', { class: 'ipucu' }, 'Tüm birlikler yerleşti. Bir birliği geri çekmek için bölgedeki ✕ düğmesine bas.'));
      };
      const bilgiCiz = () => {
        bilgi.innerHTML = ''; bilgi.append(M.el('h3', null, '🃏 Toplanan bilgi'));
        const ids = Object.keys(yerlesen);
        if (!ids.length) bilgi.append(M.el('p', { class: 'ipucu' }, 'Henüz yok. Birlikleri bölgelere yerleştir.'));
        ids.forEach(id => {
          const b = birlikler.find(x => x.id === yerlesen[id]); const h = olay.hazirliklar.find(x => x.id === id); const n = nedenler.find(x => x.id === h.neden);
          bilgi.append(M.el('div', { class: 'tanik-kart kucuk' }, M.el('b', null, b.ikon + ' ' + b.ad + ' → ' + h.bolge), M.el('p', null, h.sonuc), M.el('span', { class: 'etiket' }, '🃏 Neden kartı: ' + n.ikon + ' ' + n.ad)));
        });
      };
      const birak = (b, bolgeId) => {
        if (yerlesen[bolgeId]) { bildirim(K.govde, 'Bu bölgede zaten bir birlik var.'); return; }
        G.kaydet(); yerlesen[bolgeId] = b.id; hepsiniCiz();
      };
      hepsiniCiz();
      K.govde.append(baslikKarti('Düzen kur', olay.gorev + '\n\n' + (olay.duzenGiris || 'Üç birliğini haritadaki bölgelere sürükle; her bölge sana savaşın bir nedenine dair bilgi verir.')),
        M.el('div', { class: 'kart' }, M.el('div', { class: 'arac-satiri' }, M.el('h3', null, '⚔️ Birlikler'), G.buton), tepsi, sarici), bilgi,
        K.ileri('Savaşa git ▶', () => { sonuc.hazirliklar = Object.keys(yerlesen).map(id => olay.hazirliklar.find(h => h.id === id).ad); adim2(); }, () => Object.keys(yerlesen).length < 3 ? 'Üç birliği de yerleştir.' : null));
    };
    /* Sabit savaş: zaman (g, saniye) elle de ilerletilebilir; durdur/devam, önceki/sonraki aşama, baştan izle.
       Kısayollar: boşluk = durdur/devam, ← → = aşamalar. Adımdan çıkınca animasyon ve klavye dinleyicisi temizlenir. */
    const adim2 = () => {
      K.adim(1, adim2);
      const svg = savasHaritasi(olay); const kaybeden = (olay.savasAnimasyon || {}).kazanan === 'dusman';
      const metin = M.el('div', { class: 'savas-metin', 'aria-live': 'polite' });
      const B = mk('g'), O = mk('g'); svg.append(B, O);
      const bCiz = (x, y, op) => { B.innerHTML = ''; B.append(mk('circle', { cx: x, cy: y, r: 16, fill: '#7b8fd0', stroke: '#2b2118', 'stroke-width': 2, opacity: op }), mk('text', { x, y: y + 5, 'text-anchor': 'middle', class: 'pin-no' }, 'D'), mk('text', { x, y: y + 34, 'text-anchor': 'middle', class: 'yer-etiket' }, olay.id === 'koyunhisar' ? 'Bizans kuvveti' : olay.id === 'ankara' ? 'Timur ordusu' : 'Düşman ittifakı')); };
      const oCiz = (x, y, op) => { O.innerHTML = ''; O.append(mk('circle', { cx: x, cy: y, r: 16, fill: '#c98a4b', stroke: '#2b2118', 'stroke-width': 2, opacity: op }), mk('text', { x, y: y + 5, 'text-anchor': 'middle', class: 'pin-no' }, 'O'), mk('text', { x, y: y + 34, 'text-anchor': 'middle', class: 'yer-etiket' }, 'Osmanlı')); };
      const efekt = mk('g'); svg.append(efekt);
      const adimlar = olay.savasAdimlari, n = adimlar.length, sure = 5, toplam = n * sure;
      let g = 0, oynuyor = true, onceki = null, kareNo = null, sonMetin = '';
      const asama = () => Math.min(n - 1, Math.floor(g / sure));
      const dolgu = M.el('div', { class: 'savas-ilerleme-dolgu' });
      const cubuk = M.el('div', { class: 'savas-ilerleme' }, dolgu, adimlar.slice(1).map((x, i) => M.el('span', { class: 'savas-ilerleme-tik', style: 'left:' + ((i + 1) / n * 100) + '%' })));
      const oynatDurdur = () => { if (g >= toplam) { g = 0; oynuyor = true; } else oynuyor = !oynuyor; ciz(); };
      const atla = (yon) => { g = Math.max(0, Math.min(toplam, (asama() + yon) * sure)); ciz(); };
      const bastan = M.el('button', { class: 'kucuk ikincil', title: 'Savaşı baştan izle', onclick: () => { g = 0; oynuyor = true; ciz(); } }, '⏮ Baştan');
      const oncekiB = M.el('button', { class: 'kucuk ikincil', title: 'Önceki aşama (←)', onclick: () => atla(-1) }, '⏪ Önceki');
      const oynat = M.el('button', { class: 'kucuk', title: 'Durdur / devam et (boşluk)', onclick: oynatDurdur });
      const sonrakiB = M.el('button', { class: 'kucuk ikincil', title: 'Sonraki aşama (→)', onclick: () => atla(1) }, 'Sonraki ⏩');
      const ciz = () => {
        const p = g / toplam, i = asama(), bitti = g >= toplam;
        if (bitti) izlendi = true;
        const durumYazi = bitti ? 'Savaş bitti. Sonuç sabit; şimdi nedenlerini sen yorumlayacaksın.' : !oynuyor ? '⏸ Durduruldu. Devam etmek için ▶ düğmesine ya da boşluk tuşuna bas.' : '';
        const yeniMetin = '<p><b>' + (i + 1) + '/' + n + '</b> ' + adimlar[i] + '</p>' + (durumYazi ? '<p class="ipucu">' + durumYazi + '</p>' : '');
        if (yeniMetin !== sonMetin) { metin.innerHTML = yeniMetin; sonMetin = yeniMetin; }
        const oynatYazi = oynuyor ? '⏸ Durdur' : bitti ? '🔁 Tekrar izle' : '▶ Devam et';
        if (oynat.textContent !== oynatYazi) oynat.textContent = oynatYazi;
        oncekiB.disabled = g < sure; sonrakiB.disabled = bitti;
        dolgu.style.width = (p * 100) + '%';
        efekt.innerHTML = '';
        const faz = p * n; // 0..n
        let bx = 80 + Math.min(1, faz) * 180, by = 160, ox = 480 - Math.min(1, faz) * 150, oy = 175, bop = 1, oop = 1;
        if (faz > 1 && faz < 2.2) { const s = Math.sin(g * 20) * 4; bx += s; ox -= s; efekt.append(mk('text', { x: 300, y: 150, 'text-anchor': 'middle', style: 'font-size:34px' }, '⚔️')); }
        if (faz >= 2.2) { const r = Math.min(1, (faz - 2.2) / 1.2); if (kaybeden) { ox += r * 200; oop = 1 - r * 0.6; } else { bx -= r * 220; bop = 1 - r * 0.6; } }
        if (faz >= 3) { for (let k = 0; k < 4; k++) efekt.append(mk('text', { x: (kaybeden ? 120 : 380) + k * 45, y: 230, style: 'font-size:18px' }, kaybeden ? '🏰' : '⛺')); }
        bCiz(bx, by, bop); oCiz(ox, oy, oop);
      };
      const modalAcik = () => !document.getElementById('modal-kaplama').classList.contains('gizli') || document.body.classList.contains('rehber-acik');
      const kare = (t) => { // bir pencere (çıkış onayı, uyarı, rehber) açıkken savaş bekler
        if (oynuyor && !modalAcik()) { if (onceki !== null) g = Math.min(toplam, g + Math.min(0.1, (t - onceki) / 1000)); if (g >= toplam) oynuyor = false; ciz(); }
        onceki = t; kareNo = requestAnimationFrame(kare);
      };
      const tus = (e) => {
        if (modalAcik()) return;
        const t = e.target; if (t.closest && t.closest('input, textarea, select')) return;
        if (e.key === ' ' || e.code === 'Space') { if (t.closest && t.closest('button')) return; e.preventDefault(); oynatDurdur(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); if (g < toplam) atla(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); if (g >= sure) atla(-1); }
      };
      document.addEventListener('keydown', tus);
      K.temizlik(() => { cancelAnimationFrame(kareNo); document.removeEventListener('keydown', tus); });
      K.govde.append(M.el('div', { class: 'sabit-uyari' }, '📌 Sabit olay: savaşın sonucunu değiştiremezsin. İzle; istediğin yerde durdurup okuyabilirsin.'),
        M.el('div', { class: 'kart' }, svg, cubuk,
          M.el('div', { class: 'savas-kontrol' }, bastan, oncekiB, oynat, sonrakiB, M.el('span', { class: 'ipucu' }, 'Kısayol: boşluk durdurur, ← → aşamalar arasında gezer.')),
          metin),
        K.ileri('Nedenleri sırala ▶', adim3, () => izlendi ? null : 'Önce savaşı sonuna kadar izle. Acele etmek istersen "Sonraki ⏩" ile aşamaları tek tek geçebilirsin.'));
      ciz(); kareNo = requestAnimationFrame(kare);
      Rehber.goster('savas', 150); // ilk savaşta kontrolleri tanıtır; rehber açıkken savaş bekler
    };
    const adim3 = () => {
      K.adim(2, adim3);
      const toplanan = new Set(Object.keys(yerlesen).map(id => olay.hazirliklar.find(h => h.id === id).neden));
      const tepsi = M.el('div', { class: 'tepsi yatay' }); const slotlar = M.el('div', { class: 'sira-slotlari' });
      const G = geriAlma([sira], () => ciz());
      const ciz = () => {
        tepsi.innerHTML = ''; slotlar.innerHTML = '';
        nedenler.filter(n => !sira.includes(n.id)).forEach(n => { const el = M.el('div', { class: 'neden-kart surukle-kart' + (toplanan.has(n.id) ? ' toplanan' : '') }, M.el('span', { class: 'birlik-ikon' }, n.ikon), M.el('span', null, n.ad), toplanan.has(n.id) ? M.el('span', { class: 'etiket' }, '🃏 bilgi topladın') : null); Surukle.kart(el, '.sira-slot', (h) => { G.kaydet(); sira[+h.dataset.i] = n.id; ciz(); }); tepsi.append(el); });
        sira.forEach((id, i) => { const slot = M.el('div', { class: 'sira-slot' + (id ? ' dolu' : ''), 'data-i': i }, M.el('b', null, (i + 1) + '.'), id ? M.el('span', null, nedenler.find(n => n.id === id).ikon + ' ' + nedenler.find(n => n.id === id).ad) : M.el('span', { class: 'ipucu' }, 'buraya sürükle'), id ? M.el('button', { class: 'kucuk ikincil', onclick: () => { G.kaydet(); sira[i] = null; ciz(); } }, '✕') : null); Surukle.hedef(slot); slotlar.append(slot); });
      };
      ciz();
      const ta = yaziAlani('Gerekçeni yaz...', sonuc.nedenGerekce, v => sonuc.nedenGerekce = v);
      K.govde.append(baslikKarti(olay.yorum.giris.split('.')[0] + '.', olay.yorum.giris, null),
        M.el('div', { class: 'kart' }, M.el('div', { class: 'arac-satiri' }, M.el('h3', null, 'Neden kartları'), G.buton), tepsi, M.el('h3', null, 'Önem sırası'), slotlar, M.el('h3', null, olay.yorum.gerekceSoru), ta),
        K.ileri('Farkı bul ▶', () => { sonuc.nedenSira = sira.map(id => nedenler.find(x => x.id === id).ad).join(' > '); adim4(); }, () => sira.some(x => !x) ? 'Üç sırayı da doldur.' : !(sonuc.nedenGerekce || '').trim() ? 'Gerekçeni yaz.' : null));
    };
    const adim4 = () => {
      K.adim(3, adim4);
      const F = olay.farklar; const sec = fark.sec; const cevaplar = fark.cevaplar; const gb = M.el('div', { class: 'geri-bildirim gizli' });
      const kontrol = () => { if (sec[0] === null || sec[1] === null) return; const dogru = sec[0] === F.dogru[0] && sec[1] === F.dogru[1]; gb.innerHTML = (dogru ? '✅ Tam bu ikisi. ' : '🤔 Bu iki cümle de farklı bakışlar taşıyor; en keskin çelişki: "' + F.kaynak1[F.dogru[0]] + '" ile "' + F.kaynak2[F.dogru[1]] + '". ') + M.metin(F.aciklama); gb.classList.remove('gizli'); sonuc.kaynakKarsilastirma = { 'Seçtiğin çift': F.kaynak1[sec[0]] + ' | ' + F.kaynak2[sec[1]] }; };
      const sutun = (i, k) => M.el('div', { class: 'belge' }, M.el('span', { class: 'etiket dogrulama' }, k.etiket), M.el('h3', null, k.ad), M.el('div', { class: 'kunye' }, k.zaman + ' · ' + k.tur),
        M.el('div', { class: 'cumleler' }, (i === 0 ? F.kaynak1 : F.kaynak2).map((c, j) => M.el('button', { class: 'cumle' + (sec[i] === j ? ' secildi' : ''), onclick: (e) => { e.currentTarget.parentElement.querySelectorAll('.cumle').forEach(x => x.classList.remove('secildi')); e.currentTarget.classList.add('secildi'); sec[i] = j; kontrol(); } }, c))));
      K.govde.append(baslikKarti('Farkı bul', F.giris), M.el('div', { class: 'belgeler' }, sutun(0, olay.kaynaklar[0]), sutun(1, olay.kaynaklar[1])), gb,
        M.el('div', { class: 'kart' }, (olay.kaynakSorulari || []).map(q => soruKutusu(q, (i, s) => cevaplar[q.metin] = s.metin, cevaplar[q.metin]))),
        K.ileri('Tahmin ve nota geç ▶', () => { Object.assign(sonuc.kaynakKarsilastirma, cevaplar); adim5(); }, () => (sec[0] === null || sec[1] === null) ? 'Her kaynaktan bir cümle seç.' : (olay.kaynakSorulari || []).some(q => !cevaplar[q.metin]) ? 'Soruyu cevapla.' : null));
      kontrol();
    };
    const adim5 = () => {
      K.adim(4, adim5);
      const gb = M.el('div', { class: 'geri-bildirim gizli' }); const sec = M.el('div', { class: 'secenekler' });
      const goster = (btn, s) => { sec.querySelectorAll('.secenek').forEach(x => x.classList.remove('secildi')); btn.classList.add('secildi'); sonuc.tahmin = s.metin; gb.innerHTML = (s.dogru ? '✅ Tarihte böyle oldu. ' : '📖 Tarihte olan: ' + olay.tahmin.secenekler.find(x => x.dogru).metin + '. ') + M.metin(s.aciklama); gb.classList.remove('gizli'); };
      olay.tahmin.secenekler.forEach(s => { const b = M.el('button', { class: 'secenek', onclick: (e) => goster(e.currentTarget, s) }, s.metin); sec.append(b); if (sonuc.tahmin === s.metin) goster(b, s); });
      const ta = yaziAlani('Bir-iki cümle...', sonuc.seritNotu, v => sonuc.seritNotu = v);
      K.govde.append(M.el('div', { class: 'kart' }, M.el('h3', null, '🔮 ' + olay.tahmin.soru), sec, gb), M.el('div', { class: 'kart' }, M.el('h3', null, '✍️ ' + olay.seritNotu), ta),
        K.ileri('Bitir ✓', () => { K.kapat(); onBitti(sonuc); }, () => !sonuc.tahmin ? 'Bir tahmin seç.' : !(sonuc.seritNotu || '').trim() ? 'Tarih şeridine bir cümle yaz.' : null));
    };
    adim1();
  }

  /* ---------- ABLUKA: ikmal yollarını kes ---------- */
  function abluka(olay, icerik, onBitti) {
    const K = kaplamaAc(olay, ['Ablukayı kur', 'Sonuç', 'Kaynak sorusu ve not']); K.onBitti = onBitti;
    const A = olay.abluka; const sonuc = {}; const yerlesen = {};
    const adim1 = () => {
      K.adim(0, adim1);
      const svg = mk('svg', { viewBox: '0 0 600 300', class: 'savas-haritasi' });
      const sarici = M.el('div', { class: 'savas-sarici' }, svg);
      const cx = 300, cy = 150; const uclar = A.yollar.map((y, i) => { const a = -Math.PI / 2 + i * (2 * Math.PI / A.yollar.length); return { x: cx + Math.cos(a) * 125, y: cy + Math.sin(a) * 105, ad: y, i }; });
      const G = geriAlma([yerlesen], () => { ciz(); tepsiCiz(); });
      const ciz = () => {
        svg.innerHTML = ''; sarici.querySelectorAll('.bolge-hedef').forEach(x => x.remove());
        svg.append(mk('rect', { x: 0, y: 0, width: 600, height: 300, fill: '#dcd2b4' }));
        uclar.forEach(u => { svg.append(mk('line', { x1: cx, y1: cy, x2: u.x, y2: u.y, class: 'ikmal-yolu' + (yerlesen[u.i] ? ' kesik' : '') }), mk('text', { x: u.x, y: u.y + (u.y > cy ? 34 : -26), 'text-anchor': 'middle', class: 'yer-etiket' }, u.ad)); if (u.i === 0) svg.append(mk('circle', { cx: u.x, cy: u.y - 2, r: 30, fill: '#7fb0d6', opacity: 0.5 })); });
        svg.append(mk('circle', { cx, cy, r: 34, fill: '#c9bfa6', stroke: '#3b2416', 'stroke-width': 3 }), mk('text', { x: cx, y: cy + 8, 'text-anchor': 'middle', style: 'font-size:26px' }, '🏰'), mk('text', { x: cx, y: cy + 54, 'text-anchor': 'middle', class: 'yer-etiket' }, A.sehir));
        uclar.forEach(u => { if (yerlesen[u.i]) svg.append(mk('text', { x: u.x, y: u.y + 8, 'text-anchor': 'middle', style: 'font-size:24px' }, '⛺')); const h = M.el('div', { class: 'bolge-hedef' + (yerlesen[u.i] ? ' dolu' : ''), style: 'left:' + (u.x / 6) + '%; top:' + (u.y / 3) + '%', 'data-i': u.i, title: u.ad }); Surukle.hedef(h); if (yerlesen[u.i]) h.append(M.el('button', { class: 'kaldir', title: 'Karargâhı kaldır', onclick: (e) => { e.stopPropagation(); G.kaydet(); delete yerlesen[u.i]; ciz(); tepsiCiz(); } }, '✕')); sarici.append(h); });
      };
      const tepsi = M.el('div', { class: 'tepsi yatay' });
      const tepsiCiz = () => { tepsi.innerHTML = ''; for (let k = Object.keys(yerlesen).length; k < A.karargah; k++) { const el = M.el('div', { class: 'birlik surukle-kart' }, M.el('span', { class: 'birlik-ikon' }, '⛺'), 'Karargâh'); Surukle.kart(el, '.bolge-hedef', (h) => { const i = +h.dataset.i; if (yerlesen[i]) return; G.kaydet(); yerlesen[i] = true; ciz(); tepsiCiz(); }); tepsi.append(el); } if (!tepsi.children.length) tepsi.append(M.el('span', { class: 'ipucu' }, 'Karargâhlar yerleşti. Kaldırmak için karargâhın ✕ düğmesine bas.')); };
      ciz(); tepsiCiz();
      K.govde.append(baslikKarti(A.sehir + ' ablukası', A.giris, M.el('p', { class: 'ipucu' }, '💡 ' + A.ipucu)), M.el('div', { class: 'kart' }, M.el('div', { class: 'arac-satiri' }, M.el('h3', null, '⛺ Karargâhlar'), G.buton), tepsi, sarici),
        K.ileri('Ablukayı başlat ▶', adim2, () => Object.keys(yerlesen).length < A.karargah ? 'Dört karargâhı da yerleştir.' : null));
    };
    const adim2 = () => {
      K.adim(1, adim2);
      const acik = A.yollar.map((y, i) => i).filter(i => !yerlesen[i]);
      const denizAcik = acik.includes(0);
      sonuc.abluka = 'Açık bırakılan yol: ' + acik.map(i => A.yollar[i]).join(', ');
      K.govde.append(baslikKarti('Abluka sonucu', (denizAcik
        ? '**' + A.yollar[0] + '** açık kaldı: şehir su yoluyla beslenmeye devam etti; abluka yıllarca sürdü. Tarihte de ' + A.sehir + ' uzun bir ablukadan sonra, dışarıdan yardım kesilince teslim oldu.'
        : 'Açık kalan yol: **' + A.yollar[acik[0]] + '**. Kara yolundan sızan az bir ikmal şehri uzun süre ayakta tutamadı; dışarıdan ordu gelmeyince ' + A.sehir + ' teslim oldu (' + olay.yil + ').') + '\n\n' + A.aciklama),
        K.ileri('Kaynak sorusuna geç ▶', () => sonAdim(K, olay, sonuc, 2, olay.kaynakSorusu)));
    };
    adim1();
  }

  /* ---------- EŞLE: kavram kartlarını kutulara sürükle ---------- */
  function esle(olay, icerik, onBitti) {
    const E = olay.esle;
    const K = kaplamaAc(olay, ['Eşleştir', 'Bağ kur', E.oyku ? 'Dijital öykü ve not' : 'Not']); K.onBitti = onBitti;
    const sonuc = { eslestirme: {} }; const yerlesen = {}; const oyku = { sahsiyet: '', metin: '' };
    const adim1 = () => { K.adim(0, adim1); kutuAdimi(K, olay.ad, E, yerlesen, sonuc.eslestirme, 'Bağ kur ▶', adim2); };
    const adim2 = () => {
      K.adim(1, adim2); let cevap = !!sonuc.kaynakCevabi;
      K.govde.append(baslikKarti('Bağ kur', olay.ozet, (olay.kavramlar || []).map(k => M.kavramKutusu(k))), M.el('div', { class: 'kart' }, soruKutusu(E.bag, (i, s) => { cevap = true; sonuc.kaynakCevabi = s.metin; }, sonuc.kaynakCevabi)),
        K.ileri('Devam ▶', adim3, () => cevap ? null : 'Önce bir seçenek işaretle.'));
    };
    const adim3 = () => {
      if (!E.oyku) { sonAdim(K, olay, sonuc, 2, null); return; }
      K.adim(2, adim3);
      const sec = M.el('select', null, M.el('option', { value: '' }, 'Şahsiyet seç'), (olay.sahsiyetler || []).map(s => M.el('option', { value: s.ad }, s.ad)));
      const notu = M.el('p', { class: 'ipucu' });
      const notGoster = () => { const s = (olay.sahsiyetler || []).find(x => x.ad === sec.value); notu.textContent = s ? s.not : ''; };
      sec.value = oyku.sahsiyet; notGoster();
      sec.addEventListener('change', () => { oyku.sahsiyet = sec.value; notGoster(); });
      const ta = yaziAlani('Üç cümle...', oyku.metin, v => oyku.metin = v); const ta2 = yaziAlani('Bir-iki cümle...', sonuc.seritNotu, v => sonuc.seritNotu = v);
      K.govde.append(M.el('div', { class: 'kart' }, M.el('h3', null, '🎬 ' + E.oyku), sec, notu, ta), M.el('div', { class: 'kart' }, M.el('h3', null, '✍️ ' + olay.seritNotu), ta2),
        K.ileri('Bitir ✓', () => { sonuc.dijitalOyku = oyku.sahsiyet + ': ' + oyku.metin; K.kapat(); onBitti(sonuc); }, () => !oyku.sahsiyet ? 'Bir şahsiyet seç.' : !oyku.metin.trim() ? 'Öykü taslağını yaz.' : !(sonuc.seritNotu || '').trim() ? 'Tarih şeridine bir cümle yaz.' : null));
    };
    adim1();
  }

  /* ---------- İSKÂN: aileleri ve zaviyeleri köylere yerleştir ---------- */
  function iskan(olay, icerik, onBitti) {
    const I = olay.iskan; const K = kaplamaAc(olay, ['Yerleştir', 'Değerlendir', 'Not']); K.onBitti = onBitti;
    const sonuc = {}; const yerlesen = {}; // parcaId -> yerId
    const adim1 = () => {
      K.adim(0, adim1);
      const svg = mk('svg', { viewBox: '0 0 600 260', class: 'savas-haritasi' }); const sarici = M.el('div', { class: 'savas-sarici' }, svg);
      const G = geriAlma([yerlesen], () => { ciz(); tepsiCiz(); });
      const ciz = () => {
        svg.innerHTML = ''; sarici.querySelectorAll('.bolge-hedef').forEach(x => x.remove());
        svg.append(mk('rect', { x: 0, y: 0, width: 600, height: 260, fill: '#7fb0d6' }), mk('path', { d: 'M0,120 C80,60 160,40 260,30 C380,20 500,40 600,60 L600,260 L0,260 Z', fill: '#dcd2b4' }), mk('path', { d: 'M0,200 C100,170 200,230 300,205 C400,185 500,230 600,210 L600,260 L0,260 Z', fill: '#7fb0d6' }), mk('text', { x: 60, y: 60, class: 'deniz-etiket' }, 'Saros'), mk('text', { x: 480, y: 245, class: 'deniz-etiket' }, 'Marmara'));
        I.yerler.forEach(y => { const sakin = Object.entries(yerlesen).filter(([p, yid]) => yid === y.id).map(([p]) => I.parcalar.find(x => x.id === p)); svg.append(mk('circle', { cx: y.x, cy: y.y, r: 20, fill: y.tip === 'yerli' ? '#d6cdb6' : '#e9dcb5', stroke: y.tip === 'yerli' ? '#7b8fd0' : '#8c7651', 'stroke-width': 3, 'stroke-dasharray': y.tip === 'bos' ? '5 3' : null }), mk('text', { x: y.x, y: y.y + 7, 'text-anchor': 'middle', style: 'font-size:18px' }, y.tip === 'yerli' ? '⛪' : '🏚️'), mk('text', { x: y.x, y: y.y + 38, 'text-anchor': 'middle', class: 'yer-etiket' }, y.ad)); sakin.forEach((p, i) => svg.append(mk('text', { x: y.x - 20 + i * 22, y: y.y - 24, 'text-anchor': 'middle', style: 'font-size:18px' }, p.ikon))); const h = M.el('div', { class: 'bolge-hedef', style: 'left:' + (y.x / 6) + '%; top:' + (y.y / 2.6) + '%', 'data-id': y.id, title: y.ad }); Surukle.hedef(h); sarici.append(h); });
      };
      const tepsi = M.el('div', { class: 'tepsi yatay' });
      const tepsiCiz = () => { tepsi.innerHTML = ''; I.parcalar.filter(p => !yerlesen[p.id]).forEach(p => { const el = M.el('div', { class: 'birlik surukle-kart' }, M.el('span', { class: 'birlik-ikon' }, p.ikon), p.ad); Surukle.kart(el, '.bolge-hedef', (h) => { const yid = h.dataset.id; if (Object.values(yerlesen).filter(x => x === yid).length >= 2) { bildirim(K.govde, 'Bu köye en çok iki grup yerleşebilir.'); return; } G.kaydet(); yerlesen[p.id] = yid; ciz(); tepsiCiz(); }); tepsi.append(el); }); if (!tepsi.children.length) tepsi.append(M.el('span', { class: 'ipucu' }, 'Herkes yerleşti. Fikrini değiştirirsen ↶ Geri al ile son yerleştirmeyi geri alabilirsin.')); };
      ciz(); tepsiCiz();
      K.govde.append(baslikKarti('İskân ve istimalet', I.giris, M.el('p', { class: 'ipucu' }, I.kurallar)), M.el('div', { class: 'kart' }, M.el('div', { class: 'arac-satiri' }, M.el('h3', null, '⛺ Gelenler'), G.buton), tepsi, sarici),
        K.ileri('Değerlendir ▶', adim2, () => Object.keys(yerlesen).length < I.parcalar.length ? 'Tüm grupları yerleştir.' : null));
    };
    const adim2 = () => {
      K.adim(1, adim2); let cevap = !!sonuc.kaynakCevabi;
      const satirlar = I.yerler.map(y => { const sakin = Object.entries(yerlesen).filter(([p, yid]) => yid === y.id).map(([p]) => I.parcalar.find(x => x.id === p)); if (!sakin.length) return M.el('li', null, M.el('b', null, y.ad + ': '), y.tip === 'bos' ? 'Boş kaldı; iskân olmadı.' : 'Yerli halk kendi hâlinde; bağ kurulmadı.'); return M.el('li', null, M.el('b', null, y.ad + ': '), sakin.map(p => I.degerlendirme[y.tip + '_' + p.tip]).join(' ')); });
      sonuc.iskan = satirlar.map(li => li.textContent).join(' | ');
      K.govde.append(baslikKarti('Yerleşimin sonucu', ''), M.el('div', { class: 'kart' }, M.el('ul', null, satirlar)), M.el('div', { class: 'kart' }, (olay.kavramlar || []).map(k => M.kavramKutusu(k)), soruKutusu(I.soru, (i, s) => { cevap = true; sonuc.kaynakCevabi = s.metin; }, sonuc.kaynakCevabi)),
        K.ileri('Nota geç ▶', () => sonAdim(K, olay, sonuc, 2, null), () => cevap ? null : 'Soruyu cevapla.'));
    };
    adim1();
  }

  /* ---------- DEDEKTİF: ipuçlarını güvenilirliğe göre sırala, tarihi tahmin et ---------- */
  function dedektif(olay, icerik, onBitti) {
    const D = olay.dedektif; const K = kaplamaAc(olay, ['İpuçlarını sırala', 'Tarihi tahmin et', 'Soru ve not']); K.onBitti = onBitti;
    const sonuc = {}; const sira = D.ipuclari.map(() => null); let tahminDeger = null;
    const adim1 = () => {
      K.adim(0, adim1);
      const tepsi = M.el('div', { class: 'tepsi' }); const slotlar = M.el('div', { class: 'sira-slotlari dikey' });
      const G = geriAlma([sira], () => ciz());
      const ciz = () => { tepsi.innerHTML = ''; slotlar.innerHTML = ''; D.ipuclari.filter(ip => !sira.includes(ip.id)).forEach(ip => { const el = M.el('div', { class: 'tanik-kart kucuk surukle-kart' }, M.el('p', { class: 'tanik-soz' }, ip.metin)); Surukle.kart(el, '.sira-slot', (h) => { G.kaydet(); sira[+h.dataset.i] = ip.id; ciz(); }); tepsi.append(el); }); sira.forEach((id, i) => { const ip = D.ipuclari.find(x => x.id === id); const slot = M.el('div', { class: 'sira-slot' + (id ? ' dolu' : ''), 'data-i': i }, M.el('b', null, (i + 1) + '. ' + (i === 0 ? 'En güvenilir' : i === sira.length - 1 ? 'En az güvenilir' : '')), ip ? M.el('span', null, ip.metin.slice(0, 70) + '…') : M.el('span', { class: 'ipucu' }, 'buraya sürükle'), id ? M.el('button', { class: 'kucuk ikincil', onclick: () => { G.kaydet(); sira[i] = null; ciz(); } }, '✕') : null); Surukle.hedef(slot); slotlar.append(slot); }); };
      ciz();
      K.govde.append(baslikKarti('Tarih dedektifi', D.giris), M.el('div', { class: 'kart' }, M.el('div', { class: 'arac-satiri' }, M.el('h3', null, '🔎 İpuçları'), G.buton), tepsi, M.el('h3', null, 'Güvenilirlik sırası'), slotlar),
        K.ileri('Tarihi tahmin et ▶', () => { sonuc.ipucuSirasi = sira.map(id => D.ipuclari.find(x => x.id === id).metin.split(':')[0]).join(' > '); sonuc.ipucuDegerlendirme = sira[sira.length - 1] === 'menkibe' ? 'Menkıbeyi en sona koydun: doğru içgüdü.' : 'Menkıbe en az güvenilir ipucu olmalıydı.'; adim2(); }, () => sira.some(x => !x) ? 'Tüm ipuçlarını sırala.' : null));
    };
    const adim2 = () => {
      K.adim(1, adim2);
      const [a, b] = D.aralik; const deger = M.el('input', { type: 'range', min: a, max: b, value: tahminDeger !== null ? tahminDeger : Math.round((a + b) / 2), class: 'tarih-kaydirici' }); const etiket = M.el('b', { style: 'font-size:1.4rem' }, deger.value); deger.addEventListener('input', () => etiket.textContent = deger.value);
      const gb = M.el('div', { class: 'geri-bildirim gizli' });
      const kontrol = () => { const v = +deger.value; tahminDeger = v; const icinde = v >= D.kabul[0] && v <= D.kabul[1]; gb.innerHTML = (icinde ? '✅ Tarihçilerin önerdiği aralıktasın (' + D.kabul.join('-') + '). ' : '📖 Tarihçiler ' + D.kabul.join('-') + ' aralığını önerir. ') + M.metin(D.aciklama); gb.classList.remove('gizli'); sonuc.tahmin = v + (icinde ? ' (aralıkta)' : ' (aralık dışı)'); };
      K.govde.append(baslikKarti('Tahminin', sonuc.ipucuDegerlendirme + ' Şimdi fetih yılını tahmin et.'), M.el('div', { class: 'kart' }, M.el('div', { class: 'kaydirici-satir' }, M.el('span', null, String(a)), deger, M.el('span', null, String(b))), M.el('p', { style: 'text-align:center' }, 'Tahmin: ', etiket), M.el('button', { onclick: kontrol }, 'Kontrol et'), gb),
        K.ileri('Soruya geç ▶', () => sonAdim(K, olay, sonuc, 2, D.soru), () => sonuc.tahmin ? null : 'Önce tahminini kontrol et.'));
      if (sonuc.tahmin) kontrol();
    };
    adim1();
  }

  /* ---------- TAHT: taht mücadelesini yıl yıl haritada izle (Fetret) ---------- */
  /* Her yıl (faz) için öğrenci bölgelere şehzade rozeti sürükler, Kontrol et'e basar; yanlışsa tarihteki durum nazikçe gösterilir.
     Sonraki yıl, bir önceki yılın tarihteki durumuyla başlar; öğrenci yalnızca değişeni işaretler. Ardından ayakta tutanlar (kutuAdimi) ve kaynak/not. */
  function taht(olay, icerik, onBitti) {
    const T = olay.taht; const K = kaplamaAc(olay, ['Taht mücadelesi', 'Ayakta tutanlar', 'Kaynak sorusu ve not']); K.onBitti = onBitti;
    const sonuc = { tahtFazlari: {}, ayaktaTutanlar: {} }; const kurumYerlesen = {};
    const sehzade = (id) => T.sehzadeler.find(s => s.id === id);
    let faz = 0, odakla = false; const atamalar = T.fazlar.map(() => ({})); const kontrol = T.fazlar.map(() => false);
    const yeniden = () => { odakla = true; adim1(); }; // kontrol ya da yıl değişimi: yıl kartına kaydırarak yeniden çiz
    const adim1 = () => {
      K.adim(0, adim1);
      const F = T.fazlar[faz], atama = atamalar[faz], bitti = kontrol[faz], son = faz === T.fazlar.length - 1;
      const gorunen = bitti ? F.dogru : atama;
      const svg = mk('svg', { viewBox: '0 0 600 320', class: 'savas-haritasi taht-haritasi' }); const sarici = M.el('div', { class: 'savas-sarici taht-sarici' }, svg);
      const G = geriAlma([atama], () => ciz());
      const ciz = () => {
        svg.innerHTML = ''; sarici.querySelectorAll('.taht-bolge').forEach(x => x.remove());
        svg.append(mk('rect', { x: 0, y: 0, width: 600, height: 320, fill: '#7fb0d6' }));
        (T.karalar || []).forEach(d => svg.append(mk('path', { d, fill: '#dcd2b4', stroke: '#9c8c66', 'stroke-width': 2 })));
        (T.beylikler || []).forEach(b => svg.append(mk('path', { d: b.d, fill: '#c4baa2', 'fill-opacity': 0.8, stroke: '#8c7651', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }), mk('text', { x: b.x, y: b.y, 'text-anchor': 'middle', class: 'taht-beylik' }, b.ad)));
        T.bolgeler.forEach(b => { const s = sehzade(gorunen[b.id]); svg.append(mk('path', { d: b.d, fill: s ? s.renk : '#efe4cc', 'fill-opacity': s ? 0.5 : 0.9, stroke: s ? s.renk : '#8c7651', 'stroke-width': 2.5 })); });
        (T.denizler || []).forEach(e => svg.append(mk('text', { x: e.x, y: e.y, 'text-anchor': 'middle', class: 'deniz-etiket' }, e.ad)));
        (T.yerler || []).forEach(y => svg.append(mk('circle', { cx: y.x, cy: y.y, r: 3.5, fill: '#3b2416' }), mk('text', { x: y.x + 6, y: y.y - 5, class: 'yer-etiket' }, y.ad)));
        T.bolgeler.forEach(b => {
          const s = sehzade(gorunen[b.id]); const ogrenci = atama[b.id];
          const isaret = bitti ? (ogrenci === F.dogru[b.id] ? M.el('span', { class: 'taht-isaret dogru' }, '✓') : M.el('span', { class: 'taht-isaret' }, '🤔 sen: ' + ((sehzade(ogrenci) || {}).kisa || '-'))) : null;
          const h = M.el('div', { class: 'taht-bolge' + (s ? ' dolu' : '') + (bitti ? ' kilitli' : ''), style: 'left:' + (b.x / 6) + '%; top:' + (b.y / 3.2) + '%', 'data-id': b.id, title: b.ad },
            M.el('b', null, b.ad), s ? M.el('span', { class: 'taht-rozet', style: 'background:' + s.renk }, s.kisa) : M.el('span', { class: 'ipucu' }, 'buraya sürükle'), isaret);
          if (!bitti) Surukle.hedef(h);
          sarici.append(h);
        });
      };
      const palet = M.el('div', { class: 'tepsi yatay taht-palet' });
      T.sehzadeler.forEach(s => {
        const el = M.el('div', { class: 'birlik taht-sehzade' + (bitti ? ' pasif' : ' surukle-kart'), title: s.not }, M.el('span', { class: 'taht-rozet', style: 'background:' + s.renk }, s.kisa), s.ad);
        if (!bitti) Surukle.kart(el, '.taht-bolge', (h) => { const id = h.dataset.id; if (atama[id] === s.id) return; G.kaydet(); atama[id] = s.id; ciz(); });
        palet.append(el);
      });
      const kontrolEt = () => {
        if (T.bolgeler.some(b => !atama[b.id])) { M.modal('Eksik', '<p>Her bölgeye bir şehzade yerleştir.</p>'); return; }
        kontrol[faz] = true;
        // anahtar sıra numarasıyla başlar: "1403" gibi sayısal anahtarlar nesnede öne geçer, yıllar karışırdı
        sonuc.tahtFazlari[(faz + 1) + '. ' + F.yil] = T.bolgeler.map(b => b.ad + ': ' + sehzade(atama[b.id]).ad + (atama[b.id] === F.dogru[b.id] ? ' ✓' : ' (tarihte: ' + sehzade(F.dogru[b.id]).ad + ')')).join(' · ');
        if (!son) atamalar[faz + 1] = Object.assign({}, F.dogru); // sonraki yıl, bu yılın tarihteki durumundan başlar
        yeniden();
      };
      const fazSeridi = M.el('div', { class: 'taht-fazlar' }, T.fazlar.map((f, i) => {
        const ulasilir = i === 0 || kontrol[i - 1]; const sinif = 'taht-faz' + (i === faz ? ' aktif' : kontrol[i] ? ' gecti' : '');
        return ulasilir && i !== faz ? M.el('button', { class: sinif, onclick: () => { faz = i; yeniden(); } }, f.yil) : M.el('span', { class: sinif }, f.yil);
      }));
      const yanlisVar = bitti && T.bolgeler.some(b => atama[b.id] !== F.dogru[b.id]);
      const gb = bitti ? M.el('div', { class: 'geri-bildirim', html: (yanlisVar ? '<p>🤔 Haritada artık tarihteki durum görünüyor; senin işaretlerin bölgelerin altında.</p>' : '<p>✅ Hepsi tarihteki durumla aynı.</p>') + M.metin(F.aciklama) }) : null;
      const dugme = bitti ? (son ? M.el('span', { class: 'ipucu' }, 'Tüm yılların haritası tamam. Aşağıdan devam et.') : M.el('button', { onclick: () => { faz++; yeniden(); } }, 'Sonraki yıl ▶'))
        : M.el('button', { onclick: kontrolEt }, 'Kontrol et ✓');
      ciz();
      // Sıra: olay metni → (kontrolden sonra) geri bildirim → araç satırı (Geri al + Kontrol/Sonraki) → rozetler → harita
      const yilKarti = M.el('div', { class: 'kart' }, fazSeridi,
        M.el('h3', null, '📅 ' + F.yil + ' · ' + F.baslik), M.el('div', { html: M.metin(F.metin) }),
        faz > 0 && !bitti ? M.el('p', { class: 'ipucu' }, 'Harita bir önceki yılın tarihteki durumuyla başlıyor. Bu yıl ne değişti? Değişen bölgeye doğru şehzadeyi sürükle.') : null,
        gb,
        M.el('div', { class: 'arac-satiri' }, M.el('h3', null, bitti ? '🗺️ Tarihteki durum' : '👑 Şehzadeyi bölgeye sürükle'), M.el('div', { class: 'arac-dugmeler' }, bitti ? null : G.buton, dugme)),
        bitti ? null : palet, sarici);
      K.govde.append(baslikKarti('Taht mücadelesi', T.giris),
        M.el('details', { class: 'kart taht-sehzadeler', open: faz === 0 && !bitti ? 'open' : null }, M.el('summary', null, M.el('b', null, '👑 Şehzadeleri tanı')), T.sehzadeler.map(s => M.el('p', null, M.el('span', { class: 'taht-rozet', style: 'background:' + s.renk }, s.kisa), ' ', M.el('b', null, s.ad + ': '), s.not))),
        yilKarti,
        K.ileri('Ayakta tutanlar ▶', adim2, () => kontrol.every(Boolean) ? null : 'Önce ' + T.fazlar.length + ' yılın haritasını tamamla (her yıl için Kontrol et).'));
      if (odakla) { odakla = false; yilKarti.scrollIntoView({ block: 'start' }); }
    };
    const adim2 = () => { K.adim(1, adim2); kutuAdimi(K, 'Devleti ne ayakta tuttu?', T.kurumlar, kurumYerlesen, sonuc.ayaktaTutanlar, 'Kaynak sorusuna geç ▶', () => sonAdim(K, olay, sonuc, 2, olay.kaynakSorusu)); };
    adim1();
  }

  return { okuma, tez, savas, abluka, esle, iskan, dedektif, taht };
})();
