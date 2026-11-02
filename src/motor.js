/* Motor: içerik yükleme, sahne yönetimi, göstergeler, yardımcılar.
   Bölüm içeriği content/bolumN.json içindedir; motor içeriğe bağımlı metin taşımaz. */
/* Node.append(null) metin olarak "null" ekler; koşullu çocuklar (x ? el : null) için boşları ele. */
(function () {
  const orig = Element.prototype.append;
  Element.prototype.append = function (...n) { return orig.apply(this, n.filter(x => x !== null && x !== undefined && x !== false)); };
})();

const Motor = {
  icerik: null,
  durum: null,
  kok: null,

  GOSTERGE_SIRASI: ['refah', 'ilim', 'guven', 'adalet'],

  /* ---------- İçerik ---------- */
  async icerikYukle(yol, yedekAnahtar) {
    try {
      const r = await fetch(yol);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (window[yedekAnahtar]) return window[yedekAnahtar];
      throw new Error('İçerik yüklenemedi: ' + yol);
    }
  },

  /* ---------- Yardımcılar ---------- */
  el(tag, ozellikler, ...cocuklar) {
    const e = document.createElement(tag);
    if (ozellikler) {
      for (const [k, v] of Object.entries(ozellikler)) {
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else if (v !== null && v !== undefined) e.setAttribute(k, v);
      }
    }
    for (const c of cocuklar.flat()) {
      if (c === null || c === undefined || c === false) continue;
      e.append(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  },

  /* Basit metin biçimi: **kalın**, satır sonu -> paragraf. HTML kaçırılır. */
  metin(m) {
    if (!m) return '';
    const kacis = String(m)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return kacis
      .split(/\n\s*\n/)
      .map(p => '<p>' + p.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') + '</p>')
      .join('');
  },

  kavramKutusu(kavram) {
    if (!kavram) return null;
    return this.el('div', { class: 'kavram' },
      this.el('b', null, kavram.ad + ': '), kavram.aciklama);
  },

  modal(baslik, govdeHtml, butonlar) {
    return new Promise(resolve => {
      const kaplama = document.getElementById('modal-kaplama');
      document.getElementById('modal-baslik').textContent = baslik;
      document.getElementById('modal-govde').innerHTML = govdeHtml;
      const kutu = document.getElementById('modal-butonlar');
      kutu.innerHTML = '';
      (butonlar || [{ metin: 'Devam', deger: true }]).forEach((b, i) => {
        const btn = this.el('button', { class: i === 0 ? '' : 'ikincil', onclick: () => {
          kaplama.classList.add('gizli');
          resolve(b.deger);
        } }, b.metin);
        kutu.append(btn);
      });
      kaplama.classList.remove('gizli');
      kutu.querySelector('button').focus();
    });
  },

  /* ---------- Göstergeler ---------- */
  seviyeAdi(deger) {
    const e = this.icerik.seviyeler || { dusuk: 'Zayıf', orta: 'Orta', yuksek: 'Güçlü' };
    if (deger < 35) return e.dusuk;
    if (deger < 65) return e.orta;
    return e.yuksek;
  },

  gostergeleriCiz(degisenler) {
    const kutu = document.getElementById('gostergeler');
    kutu.innerHTML = '';
    const adlar = this.icerik.gostergeAdlari || {};
    for (const k of this.GOSTERGE_SIRASI) {
      const d = this.durum.gostergeler[k] ?? 0;
      const g = this.el('div', { class: 'gosterge' + (degisenler && degisenler.includes(k) ? ' degisti' : ''), title: (this.icerik.gostergeAciklamalari || {})[k] || '' },
        this.el('div', { class: 'gosterge-ad' },
          this.el('span', null, adlar[k] || k),
          this.el('span', { class: 'seviye' }, this.seviyeAdi(d))),
        this.el('div', { class: 'cubuk ' + k }, this.el('div', { style: 'width:' + d + '%' })));
      kutu.append(g);
    }
  },

  /* Etki nesnesi: { refah: +10, ilim: -5 ... } */
  etkiUygula(etki, kaynak) {
    if (!etki) return [];
    const degisen = [];
    for (const [k, v] of Object.entries(etki)) {
      if (!(k in this.durum.gostergeler)) continue;
      const eski = this.durum.gostergeler[k];
      this.durum.gostergeler[k] = Math.max(0, Math.min(100, eski + v));
      if (v !== 0) degisen.push(k);
    }
    if (kaynak) this.durum.gecmis.push(Object.assign({ etki }, kaynak));
    this.gostergeleriCiz(degisen);
    Durum.kaydet(this.durum);
    return degisen;
  },

  /* Kaynak nesnesi: { erzak: +3, gumus: -2, haneler: +1 } — yalnızca tur sahnesinde anlamlı */
  kaynakUygula(kaynak) {
    if (!kaynak || !this.durum.kaynaklar) return;
    for (const [k, v] of Object.entries(kaynak)) {
      if (!(k in this.durum.kaynaklar)) continue;
      this.durum.kaynaklar[k] = Math.max(0, this.durum.kaynaklar[k] + v);
    }
    Durum.kaydet(this.durum);
    if (typeof Sahneler !== 'undefined' && Sahneler.kaynakPaneliGuncelle) Sahneler.kaynakPaneliGuncelle();
  },

  kaynakRozetleri(kaynak) {
    const parcalar = [];
    const adlar = this.icerik.kaynakAdlari || { erzak: 'Erzak', gumus: 'Gümüş', haneler: 'Hane' };
    for (const [k, v] of Object.entries(kaynak || {})) {
      if (v === 0) continue;
      parcalar.push(this.el('span', { class: 'etki-rozet ' + (v > 0 ? 'arti' : 'eksi') },
        (adlar[k] || k) + ' ' + (v > 0 ? '+' : '') + v));
    }
    return parcalar;
  },

  etkiRozetleri(etki) {
    const adlar = this.icerik.gostergeAdlari || {};
    const parcalar = [];
    for (const [k, v] of Object.entries(etki || {})) {
      if (v === 0) continue;
      parcalar.push(this.el('span', { class: 'etki-rozet ' + (v > 0 ? 'arti' : 'eksi') },
        (adlar[k] || k) + ' ' + (v > 0 ? '▲' : '▼')));
    }
    return parcalar;
  },

  /* ---------- Koşullar ----------
     { "karar": "k2", "secim": "a" }
     { "bayrak": "hazirlik", "deger": "yarali" }
     { "gosterge": "guven", "enAz": 60 } / { "gosterge": "refah", "enCok": 30 }
     { "yapi": "imaret" }
     { "hepsi": [..] } / { "herhangi": [..] } / { "degil": {..} } */
  kosulSagla(k) {
    if (!k) return true;
    const d = this.durum;
    if (k.hepsi) return k.hepsi.every(x => this.kosulSagla(x));
    if (k.herhangi) return k.herhangi.some(x => this.kosulSagla(x));
    if (k.degil) return !this.kosulSagla(k.degil);
    if (k.karar) return !!d.kararlar[k.karar] && (k.secim === undefined || d.kararlar[k.karar].secimId === k.secim);
    if (k.kaynak) { const v = (d.kaynaklar || {})[k.kaynak] ?? 0; if (k.enAz !== undefined && v < k.enAz) return false; if (k.enCok !== undefined && v > k.enCok) return false; return true; }
    if (k.yapiSayisi !== undefined) return d.yapilar.filter(y => y !== 'zaviye').length >= k.yapiSayisi;
    if (k.tanik !== undefined) return ((d.defter || {}).kartlar || []).length >= k.tanik;
    if (k.neden !== undefined) return ((d.defter || {}).kartlar || []).filter(x => x.neden).length >= k.neden;
    if (k.bayrak) return d.bayraklar[k.bayrak] === k.deger;
    if (k.yapi) return d.yapilar.includes(k.yapi);
    if (k.gosterge) {
      const v = d.gostergeler[k.gosterge] ?? 0;
      if (k.enAz !== undefined && v < k.enAz) return false;
      if (k.enCok !== undefined && v > k.enCok) return false;
      return true;
    }
    return true;
  },

  kararKaydet(kararId, secenek, baslik) {
    this.durum.kararlar[kararId] = { secimId: secenek.id, etiket: secenek.metin, etki: secenek.etki || {}, baslik };
    if (secenek.yapi && !this.durum.yapilar.includes(secenek.yapi)) this.durum.yapilar.push(secenek.yapi);
    if (secenek.bayrak) Object.assign(this.durum.bayraklar, secenek.bayrak);
    if (secenek.kaynak) this.kaynakUygula(secenek.kaynak);
    if (secenek.yillik) { this.durum.yillikEkler = this.durum.yillikEkler || {}; this.durum.yillikEkler[kararId] = { kaynak: secenek.yillik, metin: secenek.metin }; }
    this.etkiUygula(secenek.etki, { tur: 'karar', kararId, baslik, secim: secenek.metin });
    Durum.kaydet(this.durum);
  },

  mantikModali(secenek) {
    const rozetler = [...this.etkiRozetleri(secenek.etki), ...this.kaynakRozetleri(secenek.kaynak)];
    return this.modal('Dönemin mantığı', this.metin(secenek.mantik) + '<p>' + rozetler.map(e => e.outerHTML).join(' ') + '</p>');
  },

  /* ---------- Sahne yönetimi ---------- */
  baslat(icerik, durum) {
    this.icerik = icerik;
    this.durum = durum;
    this.kok = document.getElementById('sahne');
    document.getElementById('ust-bolum').textContent = 'Bölüm ' + icerik.bolum + ': ' + icerik.baslik;
    this.sahneyeGit(durum.sahneIndex);
  },

  sahneyeGit(i) {
    const sahneler = this.icerik.sahneler;
    if (i < 0) i = 0;
    if (i >= sahneler.length) i = sahneler.length - 1;
    this.durum.sahneIndex = i;
    Durum.kaydet(this.durum);
    this.render();
  },

  sonraki() { this.sahneyeGit(this.durum.sahneIndex + 1); },

  render() {
    const sahne = this.icerik.sahneler[this.durum.sahneIndex];
    document.getElementById('ust-panel').classList.remove('gizli');
    document.getElementById('ust-sahne').textContent = '· ' + (sahne.baslik || sahne.tip);
    this.gostergeleriCiz();
    this.kok.innerHTML = '';
    window.scrollTo(0, 0);
    const cizici = Sahneler[sahne.tip];
    if (!cizici) {
      this.kok.append(this.el('div', { class: 'kart' }, 'Bilinmeyen sahne tipi: ' + sahne.tip));
      return;
    }
    cizici.call(Sahneler, sahne, this.kok);
  },

  /* Her sahnenin altındaki "Devam" düğmesi */
  devamButonu(metin, kosulFn) {
    const b = this.el('button', { onclick: () => {
      if (kosulFn && !kosulFn()) return;
      this.sonraki();
    } }, metin || 'Devam ▶');
    return this.el('div', { class: 'buton-satiri' }, b);
  }
};
