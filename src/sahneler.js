/* Sahne çiziciler. Her fonksiyon (sahne, kok) alır; sahne tipi içerik JSON'undaki "tip" alanıdır.
   Yeni bir sahne tipi eklemek için buraya fonksiyon ekleyin. */
const Sahneler = {

  /* ---------- 1. Tarih şeridi açılışı ---------- */
  serit(s, kok) {
    const M = Motor;
    kok.append(
      M.el('div', { class: 'kart vurgulu' },
        M.el('h2', null, s.baslik),
        M.el('div', { html: M.metin(s.giris) }),
        (s.kavramlar || []).map(k => M.kavramKutusu(k))
      ),
      M.el('div', { class: 'kart' },
        M.el('h3', null, s.seritBaslik || 'Sabit olaylar'),
        M.el('div', { class: 'serit' },
          M.el('div', { class: 'serit-cizgi' }),
          M.el('div', { class: 'serit-noktalar' },
            s.olaylar.map(o => M.el('div', { class: 'serit-nokta' + (o.vurgu ? ' vurgu' : '') },
              M.el('div', { class: 'top' }),
              M.el('div', { class: 'yil' }, o.yil),
              M.el('div', { class: 'etiket-metin' }, o.etiket),
              o.not ? M.el('div', { class: 'not' }, o.not) : null))
          )
        ),
        s.uyari ? M.el('div', { class: 'sabit-uyari', html: M.metin(s.uyari) }) : null
      ),
      M.devamButonu(s.devam)
    );
  },

  /* ---------- 2. Yerleşke fazı ---------- */
  yerleske(s, kok) {
    const M = Motor;
    const h = s.harita;

    const haritaKutusu = M.el('div', { class: 'harita', style: 'grid-template-columns: repeat(' + h.genislik + ', 1fr); aspect-ratio: ' + h.genislik + ' / ' + h.yukseklik });
    const ciz = () => {
      haritaKutusu.innerHTML = '';
      const hucre = {};
      (h.karolar || []).forEach(k => { hucre[k.x + ',' + k.y] = k; });
      // Yapı yerleri: ya yapılmış (ikon) ya boş arsa
      for (const [ad, y] of Object.entries(h.yapiYerleri || {})) {
        if (M.durum.yapilar.includes(ad)) hucre[y.x + ',' + y.y] = { tip: 'yapi', ikon: y.ikon, etiket: y.etiket };
        else if (!hucre[y.x + ',' + y.y]) hucre[y.x + ',' + y.y] = { tip: 'bos-arsa', ikon: '', etiket: y.bosEtiket || '' };
      }
      (h.kosulluKarolar || []).forEach(k => { if (M.kosulSagla(k.kosul)) hucre[k.x + ',' + k.y] = Object.assign({ tip: 'yapi' }, k); });
      for (let y = 0; y < h.yukseklik; y++) {
        for (let x = 0; x < h.genislik; x++) {
          const k = hucre[x + ',' + y] || { tip: (x + y) % 2 ? 'ot' : 'ot2', ikon: '' };
          haritaKutusu.append(M.el('div', { class: 'karo ' + k.tip, title: k.etiket || '' },
            k.ikon ? M.el('span', null, k.ikon) : null,
            k.etiket ? M.el('span', { class: 'karo-etiket' }, k.etiket) : null));
        }
      }
    };
    ciz();

    const kararListesi = M.el('div', { class: 'karar-listesi' });
    const kararlar = s.kararlar || [];
    let acikIndex = kararlar.findIndex(k => !M.durum.kararlar[k.id]);
    if (acikIndex === -1) acikIndex = kararlar.length;

    const devam = M.devamButonu(s.devam, () => {
      const eksik = kararlar.filter(k => !M.durum.kararlar[k.id]);
      if (eksik.length) {
        M.modal('Kararlar tamamlanmadı', '<p>Devam etmeden önce yerleşke kararlarının hepsini ver.</p>');
        return false;
      }
      return true;
    });

    const kararlariCiz = () => {
      kararListesi.innerHTML = '';
      kararlar.forEach((k, i) => {
        if (i > acikIndex) return; // sırayla açılır
        const verilen = M.durum.kararlar[k.id];
        const kart = M.el('div', { class: 'kart karar' + (verilen ? ' tamam' : '') },
          M.el('h3', null, (i + 1) + '. ' + k.baslik),
          M.el('div', { html: M.metin(k.soru) }),
          M.kavramKutusu(k.kavram),
          M.el('div', { class: 'secenekler' },
            k.secenekler.map(sec => M.el('button', {
              class: 'secenek' + (verilen && verilen.secimId === sec.id ? ' secildi' : ''),
              disabled: verilen ? 'disabled' : null,
              onclick: async () => {
                M.kararKaydet(k.id, sec, k.baslik);
                ciz();
                await M.mantikModali(sec);
                acikIndex = i + 1;
                kararlariCiz();
              }
            }, sec.metin, sec.aciklama ? M.el('span', { class: 'alt-metin' }, sec.aciklama) : null))
          ),
          verilen ? M.el('div', { class: 'geri-bildirim', html: '<b>Kararın:</b> ' + verilen.etiket }) : null
        );
        kararListesi.append(kart);
      });
    };
    kararlariCiz();

    kok.append(
      M.el('div', { class: 'kart vurgulu' },
        M.el('h2', null, s.baslik),
        M.el('div', { html: M.metin(s.giris) })),
      M.el('div', { class: 'yerleske-duzen' },
        M.el('div', null,
          M.el('div', { class: 'kart' },
            M.el('h3', null, h.baslik || 'Yerleşke haritası'),
            haritaKutusu,
            M.el('div', { class: 'harita-aciklama', html: M.metin(h.aciklama) }))),
        kararListesi),
      devam
    );
  },

  /* ---------- 3. Karakter sahnesi (görsel roman) ---------- */
  karakter(s, kok, onBitti) {
    const M = Motor;
    const karakterler = Object.assign({}, M.icerik.karakterler || {}, s.karakterler || {});
    const adimlar = (s.adimlar || []).filter(a => M.kosulSagla(a.kosul));
    const ilerlemeAnahtar = 'adim_' + s.id;
    let i = M.durum.bayraklar[ilerlemeAnahtar] || 0;
    if (i >= adimlar.length) i = Math.max(0, adimlar.length - 1);

    const arka = M.el('div', { class: 'sahne-arka ' + (s.arka || '') });
    const avatarKutu = M.el('div', { class: 'avatar' });
    const kutu = M.el('div', { class: 'konusma-kutusu', style: 'flex:1' });
    arka.append(avatarKutu, kutu);

    const ilerlemeKaydet = () => { M.durum.bayraklar[ilerlemeAnahtar] = i; Durum.kaydet(M.durum); };

    const adimCiz = () => {
      const a = adimlar[i];
      kutu.innerHTML = '';
      avatarKutu.innerHTML = '';
      const konusanAd = a.konusan || (a.soru ? (M.icerik.karakter || {}).ad : null);
      const kk = konusanAd ? karakterler[konusanAd] : null;
      if (kk) {
        avatarKutu.append(M.el('div', null, kk.avatar || '🙂'),
          M.el('div', { class: 'ad' }, konusanAd, kk.kurgusal ? M.el('span', { class: 'etiket kurgu' }, 'kurgusal') : M.el('span', { class: 'etiket gercek' }, 'gerçek kişi')));
      } else {
        avatarKutu.append(M.el('div', null, '📜'), M.el('div', { class: 'ad' }, 'Anlatıcı'));
      }

      if (a.soru) {
        const soru = a.soru;
        const verilen = M.durum.kararlar[soru.id];
        kutu.append(M.el('div', { class: 'konusan' }, 'Karar: ' + (konusanAd || '')),
          M.el('div', { html: M.metin(soru.metin) }),
          M.kavramKutusu(soru.kavram));
        const secenekler = M.el('div', { class: 'secenekler' });
        soru.secenekler.forEach(sec => {
          secenekler.append(M.el('button', {
            class: 'secenek' + (verilen && verilen.secimId === sec.id ? ' secildi' : ''),
            disabled: verilen ? 'disabled' : null,
            onclick: async () => {
              M.kararKaydet(soru.id, sec, soru.baslik || s.baslik);
              kutu.innerHTML = '';
              kutu.append(M.el('div', { class: 'konusan' }, 'Sonuç'),
                M.el('div', { html: M.metin(sec.cevap) }));
              await M.mantikModali(sec);
              ileri();
            }
          }, sec.metin));
        });
        kutu.append(secenekler);
        if (verilen) kutu.append(M.el('div', { class: 'buton-satiri' }, M.el('button', { onclick: ileri }, 'Devam ▶')));
      } else {
        kutu.append(
          M.el('div', { class: 'konusan' }, konusanAd || ''),
          M.el('div', { class: konusanAd ? '' : 'anlatici', html: M.metin(a.metin) }),
          M.kavramKutusu(a.kavram),
          M.el('div', { class: 'buton-satiri' },
            i > 0 ? M.el('button', { class: 'ikincil', onclick: () => { i--; ilerlemeKaydet(); adimCiz(); } }, '◀ Geri') : null,
            M.el('button', { onclick: ileri }, i === adimlar.length - 1 ? (s.devam || 'Sahneyi bitir ▶') : 'Devam ▶'))
        );
      }
    };

    const ileri = () => {
      if (i < adimlar.length - 1) { i++; ilerlemeKaydet(); adimCiz(); }
      else if (onBitti) { onBitti(); }
      else { M.sonraki(); }
    };

    kok.append(
      M.el('div', { class: 'kart vurgulu' },
        M.el('h2', null, s.baslik),
        s.giris ? M.el('div', { html: M.metin(s.giris) }) : null),
      arka
    );
    adimCiz();
  },

  /* ---------- 4. Sabit olay ---------- */
  olay(s, kok, onBitti) {
    const M = Motor;
    const anahtar = 'olay_' + s.id;
    const uygulananlar = [];

    // Etkiler bir kez uygulanır (sayfa yenilense de tekrar etmez)
    if (!M.durum.bayraklar[anahtar]) {
      const liste = [];
      if (s.sabitEtki) { liste.push(s.sabitEtki); }
      (s.kosulluEtkiler || []).forEach(k => { if (M.kosulSagla(k.kosul)) liste.push(k); });
      M.durum.bayraklar[anahtar] = liste.map(k => ({ metin: k.metin, etki: k.etki, kaynak: k.kaynak }));
      liste.forEach(k => { M.etkiUygula(k.etki, { tur: 'olay', baslik: s.baslik, secim: k.metin }); if (k.kaynak) M.kaynakUygula(k.kaynak); });
      if (M.durum.gunluk) M.durum.gunluk.push({ id: s.id, yil: s.yil, baslik: s.baslik, sabit: true, satirlar: liste.map(k => k.metin) });
    }
    uygulananlar.push(...M.durum.bayraklar[anahtar]);

    const notId = s.seritNotu ? s.seritNotu.id : null;
    const notAlani = notId ? M.el('textarea', { placeholder: s.seritNotu.yerTutucu || '', oninput: e => {
      M.durum.cevaplar[notId] = e.target.value; Durum.kaydet(M.durum);
    } }) : null;
    if (notAlani && M.durum.cevaplar[notId]) notAlani.value = M.durum.cevaplar[notId];

    kok.append(
      M.el('div', { class: 'olay-baslik' },
        M.el('div', { class: 'etiket gercek' }, 'Sabit olay · değiştirilemez'),
        M.el('h2', null, s.yil + ' · ' + s.baslik),
        M.el('div', { html: M.metin(s.giris) })),
      M.el('div', { class: 'kart' },
        M.el('div', { html: M.metin(s.metin) }),
        (s.kavramlar || []).map(k => M.kavramKutusu(k))),
      M.el('div', { class: 'kart vurgulu' },
        M.el('h3', null, s.etkiBaslik || 'Olayın vakfa etkisi'),
        M.el('p', null, s.etkiGiris || ''),
        M.el('ul', { class: 'etki-listesi' },
          uygulananlar.map(u => M.el('li', null, u.metin + ' ', M.etkiRozetleri(u.etki), M.kaynakRozetleri(u.kaynak))))),
      s.seritNotu ? M.el('div', { class: 'kart' },
        M.el('h3', null, s.seritNotu.baslik || 'Tarih şeridi notu'),
        M.el('div', { html: M.metin(s.seritNotu.soru) }),
        s.seritNotu.ipucu ? M.el('p', { class: 'ipucu' }, s.seritNotu.ipucu) : null,
        notAlani) : null,
      M.el('div', { class: 'buton-satiri' }, M.el('button', { onclick: () => {
        if (notId && !(M.durum.cevaplar[notId] || '').trim()) {
          M.modal('Not boş', '<p>Tarih şeridine bir cümle not etmeden geçiyorsun. Bu not bölüm sonu ürününün parçası olacak. Önce bir cümle yazmanı öneririm.</p>');
          return;
        }
        if (onBitti) onBitti(); else M.sonraki();
      } }, s.devam || 'Devam ▶'))
    );
  },

  /* ---------- 5. Kaynak/kanıt görevi ---------- */
  kaynak(s, kok) {
    const M = Motor;
    const cevapla = (id, deger) => { M.durum.cevaplar[id] = deger; Durum.kaydet(M.durum); };

    const soruCiz = (q) => {
      const kutu = M.el('div', { class: 'soru' });
      kutu.append(M.el('h3', null, q.metin));
      if (q.aciklama) kutu.append(M.el('div', { html: M.metin(q.aciklama) }));
      if (q.tip === 'secmeli') {
        const gb = M.el('div', { class: 'geri-bildirim gizli' });
        const secKutu = M.el('div', { class: 'secenekler' });
        const mevcut = M.durum.cevaplar[q.id];
        q.secenekler.forEach((sec, idx) => {
          const b = M.el('button', { class: 'secenek' + (mevcut === idx ? ' secildi' : ''), onclick: () => {
            cevapla(q.id, idx);
            secKutu.querySelectorAll('.secenek').forEach(x => x.classList.remove('secildi'));
            b.classList.add('secildi');
            gb.innerHTML = M.metin(sec.geriBildirim);
            gb.classList.remove('gizli');
          } }, sec.metin);
          secKutu.append(b);
        });
        if (mevcut !== undefined && q.secenekler[mevcut]) { gb.innerHTML = M.metin(q.secenekler[mevcut].geriBildirim); gb.classList.remove('gizli'); }
        kutu.append(secKutu, gb);
      } else {
        const ta = M.el('textarea', { placeholder: q.yerTutucu || 'Cevabını buraya yaz...', oninput: e => cevapla(q.id, e.target.value) });
        if (M.durum.cevaplar[q.id]) ta.value = M.durum.cevaplar[q.id];
        if (q.ipucu) kutu.append(M.el('p', { class: 'ipucu' }, '💡 ' + q.ipucu));
        kutu.append(ta);
      }
      return kutu;
    };

    const parcalar = [
      M.el('div', { class: 'kart vurgulu' },
        M.el('h2', null, s.baslik),
        M.el('div', { html: M.metin(s.giris) }),
        (s.kavramlar || []).map(k => M.kavramKutusu(k)))
    ];

    // A. Belgeler
    if (s.belgeler) {
      parcalar.push(M.el('div', { class: 'belgeler' },
        s.belgeler.map(b => M.el('div', { class: 'belge ' + (b.tur || '') },
          M.el('span', { class: 'etiket kurgu' }, b.etiketMetni || 'kurgusal belge'),
          M.el('h3', null, b.baslik),
          M.el('div', { class: 'kunye' }, b.kunye),
          M.el('div', { html: M.metin(b.kaynak === 'ogrenciVakfiyesi' && M.durum.vakfiye ? ('Yahya oğlu Şeyh Yahya, Akçaköy\'deki bağını, dere üzerindeki değirmenin yarım hissesini ve zaviye avlusunu Allah rızası için vakfetti.\n\n' + M.durum.vakfiye.maddeler.join('\n\n') + '\n\nBu şartları değiştiren, satan ya da bozan kimse Allah\'ın ve insanların huzurunda sorumludur.') : b.metin) })))));
      parcalar.push(M.el('div', { class: 'kart' },
        M.el('h3', null, s.sorularBaslik || 'Belgeleri sorgula'),
        (s.sorular || []).map(soruCiz)));
    }

    // B. Görüş kartları
    if (s.gorusler) {
      const g = s.gorusler;
      const vurguSec = (kart) => {
        const sel = M.el('select', { onchange: e => {
          cevapla('vurgu_' + kart.id, e.target.value);
          gb.innerHTML = e.target.value === kart.vurguId ? M.metin(g.dogruMetni || 'Kartın vurgusuyla örtüşüyor.') : M.metin(g.tekrarMetni || 'Kartı bir kez daha oku: başka bir etken daha öne çıkıyor olabilir.');
          gb.classList.remove('gizli');
        } }, M.el('option', { value: '' }, g.secimYazisi || 'En çok hangi etkeni vurguluyor?'),
          g.vurgular.map(v => M.el('option', { value: v.id }, v.metin)));
        const gb = M.el('div', { class: 'geri-bildirim gizli' });
        const mevcut = M.durum.cevaplar['vurgu_' + kart.id];
        if (mevcut) { sel.value = mevcut; gb.innerHTML = mevcut === kart.vurguId ? M.metin(g.dogruMetni || '') : M.metin(g.tekrarMetni || ''); gb.classList.remove('gizli'); }
        return [sel, gb];
      };
      parcalar.push(M.el('div', { class: 'kart' },
        M.el('h2', null, g.baslik),
        M.el('div', { html: M.metin(g.giris) }),
        M.el('div', { class: 'gorus-kartlari' },
          g.kartlar.map(k => M.el('div', { class: 'gorus-karti' },
            M.el('span', { class: 'etiket dogrulama' }, 'özet · öğretmen doğrulamalı'),
            M.el('h4', null, k.tarihci),
            M.el('div', { class: 'alt' }, k.donem),
            M.el('div', { html: M.metin(k.ozet) }),
            vurguSec(k)))),
        (g.sorular || []).map(soruCiz)));
    }

    parcalar.push(M.devamButonu(s.devam, () => {
      const zorunlu = [...(s.sorular || []), ...((s.gorusler || {}).sorular || [])].filter(q => q.zorunlu);
      const eksik = zorunlu.filter(q => { const c = M.durum.cevaplar[q.id]; return c === undefined || c === '' || (typeof c === 'string' && !c.trim()); });
      if (eksik.length) {
        M.modal('Eksik cevap', '<p>Şu sorular henüz cevaplanmadı:</p><ul>' + eksik.map(q => '<li>' + q.metin + '</li>').join('') + '</ul>');
        return false;
      }
      return true;
    }));
    kok.append(...parcalar);
  },

  /* ---------- 5b. Tez savunma ---------- */
  tez(s, kok) {
    const M = Motor; const d = M.durum;
    const dunya = M.icerik.sahneler.find(sh => sh.tip === 'dunya' || sh.tip === 'tur') || {};
    const tezler = dunya.tezler || [];
    const kartlar = (d.defter || {}).kartlar || [];
    const isaretler = (d.defter || {}).isaretler || {};
    const cevap = (id, v) => { d.cevaplar[id] = v; Durum.kaydet(d); };
    const secili = () => d.cevaplar.tez_secim;
    const destek = () => d.cevaplar.tez_destek || [];
    const zayif = () => d.cevaplar.tez_zayif_kart || '';

    const tezKutu = M.el('div', { class: 'gorus-kartlari' });
    const kartKutu = M.el('div');
    const tezCiz = () => {
      tezKutu.innerHTML = '';
      tezler.forEach(t => {
        const n = kartlar.filter(k => (isaretler[k.id] || {}).tez === t.id).length;
        tezKutu.append(M.el('button', { class: 'gorus-karti secilebilir' + (secili() === t.id ? ' secildi' : ''), style: 'border-color:' + (secili() === t.id ? t.renk : ''), onclick: () => { cevap('tez_secim', t.id); tezCiz(); kartCiz(); } },
          M.el('h4', null, t.tarihci), M.el('p', null, t.kisa), M.el('span', { class: 'etiket' }, '📖 Defterde ' + n + ' kart')));
      });
    };
    const kartCiz = () => {
      kartKutu.innerHTML = '';
      if (!secili()) { kartKutu.append(M.el('p', { class: 'ipucu' }, 'Önce bir görüş seç.')); return; }
      if (!kartlar.length) { kartKutu.append(M.el('p', { class: 'sabit-uyari' }, 'Defterinde tanıklık yok. Yine de aşağıdaki soruları kendi bilgilerinle cevaplayabilirsin.')); return; }
      kartKutu.append(M.el('h3', null, 'Destekleyen kartlar (en az 2) ve zayıflatan bir kart'));
      kartlar.forEach(k => {
        const isr = isaretler[k.id] || {};
        const dCheck = M.el('input', { type: 'checkbox', checked: destek().includes(k.id) ? 'checked' : null, onchange: e => { const l = destek().filter(x => x !== k.id); if (e.target.checked) l.push(k.id); cevap('tez_destek', l); } });
        const zRadio = M.el('input', { type: 'radio', name: 'zayif', checked: zayif() === k.id ? 'checked' : null, onchange: () => cevap('tez_zayif_kart', k.id) });
        kartKutu.append(M.el('div', { class: 'tanik-kart kucuk' },
          M.el('div', { class: 'kunye' }, k.kim + ' · ' + k.zaman + (isr.tez ? ' · işaretin: ' + ((tezler.find(t => t.id === isr.tez) || {}).tarihci || isr.tez) : '') + (isr.guven ? ' · ' + isr.guven : '')),
          M.el('b', null, k.baslik), M.el('p', { class: 'tanik-soz' }, '“' + k.metin + '”'),
          M.el('div', { class: 'defter-secimler' }, M.el('label', null, dCheck, ' Destekliyor'), M.el('label', null, zRadio, ' Zayıflatıyor'))));
      });
    };
    tezCiz(); kartCiz();
    const sorular = (s.sorular || []).map(q => {
      const ta = M.el('textarea', { placeholder: 'Cevabını buraya yaz...', oninput: e => cevap(q.id, e.target.value) });
      if (d.cevaplar[q.id]) ta.value = d.cevaplar[q.id];
      return M.el('div', { class: 'soru' }, M.el('h3', null, q.metin), ta);
    });
    kok.append(
      M.el('div', { class: 'kart vurgulu' }, M.el('h2', null, s.baslik), M.el('div', { html: M.metin(s.giris) })),
      M.el('div', { class: 'kart' }, M.el('h3', null, '1. Hangi görüşü savunuyorsun?'), tezKutu),
      M.el('div', { class: 'kart' }, M.el('h3', null, '2. Kanıtlarını seç'), kartKutu),
      M.el('div', { class: 'kart' }, M.el('h3', null, '3. Gerekçelendir'), sorular),
      M.devamButonu(s.devam, () => {
        const eksik = [];
        if (!secili()) eksik.push('Bir görüş seç');
        if (kartlar.length >= 2 && destek().length < 2) eksik.push('En az iki destekleyen kart işaretle');
        (s.sorular || []).filter(q => q.zorunlu && !(d.cevaplar[q.id] || '').trim()).forEach(q => eksik.push(q.metin));
        if (eksik.length) { M.modal('Eksik', '<ul>' + eksik.map(e => '<li>' + e + '</li>').join('') + '</ul>'); return false; }
        return true;
      })
    );
  },

  /* ---------- 6. "Tarihte Ne Oldu" kartı ---------- */
  tarihte(s, kok) {
    const M = Motor;
    kok.append(
      M.el('div', { class: 'kart vurgulu' },
        M.el('h2', null, s.baslik),
        M.el('div', { html: M.metin(s.giris) })),
      M.el('div', { class: 'belgeler' },
        M.el('div', { class: 'kart kurgu' },
          M.el('h3', null, s.kurguBaslik || '🎭 Kurgu olan'),
          M.el('ul', null, s.kurgu.map(m => M.el('li', { html: M.metin(m) })))),
        M.el('div', { class: 'kart gercek' },
          M.el('h3', null, s.gercekBaslik || '📖 Tarihte olan'),
          M.el('ul', null, s.gercek.map(m => M.el('li', { html: M.metin(m) }))))),
      s.not ? M.el('div', { class: 'kart', html: M.metin(s.not) }) : null,
      M.devamButonu(s.devam)
    );
  },

  /* ---------- 7. Bölüm sonu özeti ---------- */
  ozet(s, kok) {
    const M = Motor;
    const d = M.durum;
    const adlar = M.icerik.gostergeAdlari || {};
    const satirlar = [];

    // Kararlar
    const kararSatirlari = Object.entries(d.kararlar).map(([id, k]) =>
      M.el('tr', null, M.el('td', null, k.baslik || id), M.el('td', null, k.etiket), M.el('td', null, M.etkiRozetleri(k.etki))));

    // Cevaplar: içerikteki soru metinlerini bul
    const soruHaritasi = {};
    M.icerik.sahneler.forEach(sh => {
      (sh.sorular || []).forEach(q => soruHaritasi[q.id] = q);
      ((sh.gorusler || {}).sorular || []).forEach(q => soruHaritasi[q.id] = q);
      ((sh.gorusler || {}).kartlar || []).forEach(k => soruHaritasi['vurgu_' + k.id] = { metin: k.tarihci + ' kartı: vurgulanan etken', vurgular: (sh.gorusler || {}).vurgular });
      if (sh.seritNotu) soruHaritasi[sh.seritNotu.id] = { metin: sh.seritNotu.baslik || 'Tarih şeridi notu' };
    });
    const cevapSatirlari = Object.entries(d.cevaplar).map(([id, c]) => {
      const q = soruHaritasi[id] || { metin: id };
      let metin = c;
      if (typeof c === 'number' && q.secenekler) metin = q.secenekler[c] ? q.secenekler[c].metin : c;
      if (q.vurgular) { const v = q.vurgular.find(x => x.id === c); metin = v ? v.metin : c; }
      return M.el('tr', null, M.el('td', null, q.metin), M.el('td', { class: 'ozet-cevap' }, String(metin)));
    });

    const duzYazi = () => {
      let t = 'BÜYÜYEN VAKIF · Bölüm ' + M.icerik.bolum + ': ' + M.icerik.baslik + '\n';
      t += 'Tarih: ' + new Date().toLocaleDateString('tr-TR') + '\n\nGÖSTERGELER\n';
      M.GOSTERGE_SIRASI.forEach(k => t += '- ' + (adlar[k] || k) + ': ' + M.seviyeAdi(d.gostergeler[k]) + ' (' + d.gostergeler[k] + ')\n');
      if (gunluk.length) { t += '\nVAKIF GÜNLÜĞÜ\n'; gunluk.forEach(g => { t += g.yil + ' · ' + g.baslik + '\n'; (g.satirlar || []).forEach(x => t += '   - ' + x + '\n'); if (g.sabit && notlar[g.id]) t += '   Not: ' + notlar[g.id] + '\n'; }); }
      if (defter.kartlar.length) { t += '\nGÖRÜŞ DEFTERİ\n'; defter.kartlar.forEach(k => { const i = defter.isaretler[k.id] || {}; t += '- ' + k.baslik + ' (' + k.kim + '): görüş=' + ((tezler.find(x => x.id === i.tez) || {}).tarihci || '-') + ', güvenilirlik=' + (i.guven || '-') + '\n'; }); t += 'Savunulan tez: ' + ((tezler.find(x => x.id === d.cevaplar.tez_secim) || {}).tarihci || '-') + '\n'; }
      if (d.vakfiye) { t += '\nVAKFİYE\n'; d.vakfiye.maddeler.forEach(m => t += '- ' + m + '\n'); }
      if (d.hedefler) { t += '\nTUR HEDEFLERİ\n'; Object.values(d.hedefler).forEach(h => t += (h.basarildi ? '[x] ' : '[ ] ') + h.metin + '\n'); }
      t += '\nKARARLAR\n';
      Object.values(d.kararlar).forEach(k => t += '- ' + (k.baslik || '') + ': ' + k.etiket + '\n');
      t += '\nCEVAPLAR\n';
      cevapSatirlari.forEach(tr => t += '- ' + tr.children[0].textContent + ': ' + tr.children[1].textContent + '\n');
      return t;
    };

    const gunluk = d.gunluk || [];
    const notlar = {};
    M.icerik.sahneler.forEach(sh => Object.values(sh.olaylar || {}).forEach(o => { if (o.seritNotu) notlar[o.id] = d.cevaplar[o.seritNotu.id]; }));
    const gunlukKarti = gunluk.length ? M.el('div', { class: 'kart' },
      M.el('h3', null, '📜 Vakıf günlüğü (açıklamalı tarih şeridi)'),
      M.el('div', { class: 'gunluk' },
        gunluk.map(g => M.el('div', { class: 'gunluk-satir' + (g.sabit ? ' sabit' : '') },
          M.el('div', { class: 'gunluk-yil' }, g.yil),
          M.el('div', null,
            M.el('b', null, g.baslik),
            M.el('ul', null, (g.satirlar || []).map(x => M.el('li', null, x))),
            g.sabit && notlar[g.id] ? M.el('div', { class: 'gunluk-not' }, '✍️ Notun: ' + notlar[g.id]) : null))))) : null;

    // 1299 / bölüm sonu karşılaştırması (tur sahnesi varsa)
    const turSahnesi = M.icerik.sahneler.find(sh => sh.tip === 'tur');
    const karsilastirma = (turSahnesi && Sahneler.miniHarita) ? M.el('div', { class: 'kart' },
      M.el('h3', null, '🏗️ Zaviye nasıl büyüdü?'),
      M.el('div', { class: 'karsilastirma' },
        M.el('div', null, M.el('h4', null, turSahnesi.turlar[0].yil + ': başlangıç'), Sahneler.miniHarita(turSahnesi, { yerlesim: {}, tarlalar: [], haneler: turSahnesi.kaynaklar.baslangic.haneler, yapilar: ['zaviye'] })),
        M.el('div', null, M.el('h4', null, turSahnesi.turlar[turSahnesi.turlar.length - 1].yil.split('-').pop() + ': bölüm sonu'), Sahneler.miniHarita(turSahnesi, { yerlesim: d.yerlesim || {}, tarlalar: d.tarlalar || [], haneler: (d.kaynaklar || {}).haneler || 0, yapilar: d.yapilar }))),
      d.hedefler && Object.keys(d.hedefler).length ? M.el('div', null,
        M.el('h4', { style: 'margin-top:1rem' }, '🎯 Tur hedefleri'),
        M.el('ul', null, Object.values(d.hedefler).map(h => M.el('li', null, (h.basarildi ? '✅ ' : '✗ ') + h.metin)))) : null) : null;

    const defter = d.defter || { kartlar: [], isaretler: {} };
    const tezler = (turSahnesi || {}).tezler || [];
    const defterKarti = defter.kartlar.length ? M.el('div', { class: 'kart' },
      M.el('h3', null, '📖 Görüş defteri (kaynak/kanıt analizi)'),
      M.el('p', null, 'Savunulan tez: ' + ((tezler.find(t => t.id === d.cevaplar.tez_secim) || {}).tarihci || 'seçilmedi')),
      M.el('table', { class: 'ozet-tablo' },
        M.el('thead', null, M.el('tr', null, M.el('th', null, 'Tanıklık'), M.el('th', null, 'Kaynak'), M.el('th', null, 'Görüş'), M.el('th', null, 'Güvenilirlik'), M.el('th', null, 'Tezde'))),
        M.el('tbody', null, defter.kartlar.map(k => { const i = defter.isaretler[k.id] || {}; return M.el('tr', null, M.el('td', null, k.baslik), M.el('td', null, k.kim + ' · ' + k.zaman), M.el('td', null, (tezler.find(t => t.id === i.tez) || {}).tarihci || '-'), M.el('td', null, i.guven || '-'), M.el('td', null, (d.cevaplar.tez_destek || []).includes(k.id) ? '✅ destek' : d.cevaplar.tez_zayif_kart === k.id ? '⚠️ zayıflatan' : '')); }))),
      d.vakfiye ? M.el('div', null, M.el('h4', null, '📜 Yazdırdığın vakfiye'), M.el('ul', null, d.vakfiye.maddeler.map(m => M.el('li', null, m)))) : null) : null;

    kok.append(
      M.el('div', { class: 'kart vurgulu' },
        M.el('h2', null, s.baslik),
        M.el('div', { html: M.metin(s.giris) })),
      defterKarti,
      karsilastirma,
      gunlukKarti,
      M.el('div', { class: 'kart' },
        M.el('h3', null, 'Vakfın durumu (bölüm sonu)'),
        d.kaynaklar ? M.el('p', null, 'Erzak: ' + d.kaynaklar.erzak + ' · Gümüş: ' + d.kaynaklar.gumus + ' · Hane: ' + d.kaynaklar.haneler + ' · Yapılar: ' + (d.yapilar.filter(y => y !== 'zaviye').join(', ') || 'yok') + ' · Tarla: ' + ((d.tarlalar || []).length + 1)) : null,
        M.el('table', { class: 'ozet-tablo dar' },
          M.el('tbody', null, M.GOSTERGE_SIRASI.map(k => M.el('tr', null,
            M.el('th', null, adlar[k] || k),
            M.el('td', null, M.el('div', { class: 'cubuk ' + k, style: 'max-width:300px' }, M.el('div', { style: 'width:' + d.gostergeler[k] + '%' })), ' ', M.seviyeAdi(d.gostergeler[k])))))),
        M.el('h3', null, 'Verilen kararlar'),
        M.el('table', { class: 'ozet-tablo' },
          M.el('thead', null, M.el('tr', null, M.el('th', null, 'Karar'), M.el('th', null, 'Seçim'), M.el('th', null, 'Etki'))),
          M.el('tbody', null, kararSatirlari)),
        M.el('h3', null, 'Kaynak görevi ve notlar'),
        M.el('table', { class: 'ozet-tablo' },
          M.el('thead', null, M.el('tr', null, M.el('th', null, 'Soru'), M.el('th', null, 'Cevap'))),
          M.el('tbody', null, cevapSatirlari))),
      s.ozDegerlendirme ? M.el('div', { class: 'kart' },
        M.el('h3', null, s.ozDegerlendirme.baslik || 'Öz değerlendirme'),
        s.ozDegerlendirme.sorular.map(q => {
          const ta = M.el('textarea', { oninput: e => { d.cevaplar[q.id] = e.target.value; Durum.kaydet(d); } });
          if (d.cevaplar[q.id]) ta.value = d.cevaplar[q.id];
          return M.el('div', { class: 'soru' }, M.el('p', null, q.metin), ta);
        })) : null,
      M.el('div', { class: 'buton-satiri' },
        M.el('button', { class: 'ikincil', onclick: async () => {
          const t = duzYazi();
          try { await navigator.clipboard.writeText(t); M.modal('Kopyalandı', '<p>Özet panoya kopyalandı. Öğretmenine yapıştırarak gönderebilirsin.</p>'); }
          catch (e) { M.modal('Özet metni', '<textarea style="min-height:300px">' + t.replace(/</g, '&lt;') + '</textarea>'); }
        } }, '📋 Özeti kopyala'),
        M.el('button', { class: 'ikincil', onclick: () => window.print() }, '🖨️ Yazdır / PDF'),
        M.el('button', { onclick: async () => {
          const ok = await M.modal('Baştan başla', '<p>Bu bölümdeki tüm kararlar ve cevaplar silinecek. Emin misin?</p>', [{ metin: 'Evet, sil', deger: true }, { metin: 'Vazgeç', deger: false }]);
          if (ok) { Durum.sil(); location.reload(); }
        } }, '🔄 Baştan başla'))
    );
  }
};
