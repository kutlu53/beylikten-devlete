/* Piksel sanat üreticisi: tüm karo ve karakter çizimleri kodla üretilir (telifsiz, dosya gerektirmez).
   Her sprite 16x16 piksel çizilir ve KARO (32px) boyutuna ölçeklenir. */
const Piksel = (() => {
  const B = 16;              // taban piksel
  const KARO = 32;           // ekran karosu
  const onbellek = {};

  function tuval(w, h) {
    const c = document.createElement('canvas');
    c.width = w || B; c.height = h || B;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return [c, g];
  }
  // Basit sözde rastgele (deterministik desen için)
  function rnd(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  const px = (g, x, y, renk, w = 1, h = 1) => { g.fillStyle = renk; g.fillRect(x, y, w, h); };

  /* ---------- Karolar ---------- */
  const karoCizici = {
    ot(g, varyant) {
      px(g, 0, 0, varyant ? '#7fb356' : '#86b95c', B, B);
      const r = rnd(varyant ? 7 : 3);
      for (let i = 0; i < 10; i++) px(g, Math.floor(r() * B), Math.floor(r() * B), '#6da04a');
      for (let i = 0; i < 4; i++) px(g, Math.floor(r() * B), Math.floor(r() * B), '#9bcc6d');
    },
    otKis(g) { px(g, 0, 0, '#e8eef2', B, B); const r = rnd(11); for (let i = 0; i < 8; i++) px(g, Math.floor(r() * B), Math.floor(r() * B), '#d2dbe3'); for (let i = 0; i < 3; i++) px(g, Math.floor(r() * B), Math.floor(r() * B), '#9bb0a0'); },
    otKurak(g) { px(g, 0, 0, '#b9b25e', B, B); const r = rnd(5); for (let i = 0; i < 10; i++) px(g, Math.floor(r() * B), Math.floor(r() * B), '#a39c4c'); for (let i = 0; i < 3; i++) px(g, Math.floor(r() * B), Math.floor(r() * B), '#cfc87a'); },
    toprak(g) { px(g, 0, 0, '#c9a36a', B, B); const r = rnd(9); for (let i = 0; i < 12; i++) px(g, Math.floor(r() * B), Math.floor(r() * B), '#b8915a'); for (let i = 0; i < 4; i++) px(g, Math.floor(r() * B), Math.floor(r() * B), '#d9b77c'); },
    yol(g) { px(g, 0, 0, '#d2b887', B, B); const r = rnd(13); for (let i = 0; i < 14; i++) px(g, Math.floor(r() * B), Math.floor(r() * B), '#c2a675'); for (let i = 0; i < 3; i++) px(g, Math.floor(r() * B), Math.floor(r() * B), '#8e7a55', 2, 1); },
    avlu(g) { px(g, 0, 0, '#cdbb95', B, B); for (let y = 0; y < B; y += 4) for (let x = 0; x < B; x += 4) { px(g, x + ((y / 4) % 2) * 2, y, '#bda985', 3, 3); } },
    su(g, kare) { px(g, 0, 0, '#5b9bd5', B, B); const r = rnd(17 + kare); for (let i = 0; i < 6; i++) px(g, Math.floor(r() * 13), Math.floor(r() * B), '#8ec1ea', 3, 1); for (let i = 0; i < 3; i++) px(g, Math.floor(r() * 13), Math.floor(r() * B), '#4a86bf', 3, 1); },
    kopru(g) { px(g, 0, 0, '#5b9bd5', B, B); for (let y = 0; y < B; y += 1) px(g, 0, y, y % 4 === 3 ? '#6b4a2b' : '#9c6b3c', B, 1); px(g, 0, 0, '#5a3a1e', B, 1); px(g, 0, 15, '#5a3a1e', B, 1); },
    agac(g, varyant) {
      karoCizici.ot(g, varyant);
      px(g, 7, 10, '#6b4a2b', 2, 6);
      const yesil = varyant ? '#2f7a3a' : '#3b8f45', koyu = varyant ? '#246030' : '#2e7336';
      px(g, 3, 4, yesil, 10, 7); px(g, 5, 2, yesil, 6, 3); px(g, 2, 6, koyu, 2, 4); px(g, 12, 6, koyu, 2, 4); px(g, 4, 10, koyu, 8, 1);
      px(g, 6, 3, '#5fb36b', 3, 2);
    },
    cam(g) { karoCizici.ot(g, 1); px(g, 7, 12, '#5a3a1e', 2, 4); px(g, 2, 9, '#1f6b3a', 12, 3); px(g, 4, 6, '#277a44', 8, 3); px(g, 6, 3, '#2f8a4e', 4, 3); px(g, 7, 1, '#2f8a4e', 2, 2); },
    kaya(g) { karoCizici.ot(g, 0); px(g, 3, 7, '#8d8d86', 10, 7); px(g, 5, 4, '#a4a49c', 6, 4); px(g, 4, 11, '#6f6f69', 8, 2); px(g, 6, 5, '#c2c2b9', 3, 2); },
    tepe(g) { px(g, 0, 0, '#a89b6f', B, B); px(g, 0, 10, '#8f8460', B, 6); px(g, 2, 2, '#b5a87b', 12, 6); px(g, 5, 0, '#c4b88c', 6, 3); },
    duvar(g) { px(g, 0, 0, '#c9bfa6', B, B); for (let y = 0; y < B; y += 4) { for (let x = 0; x < B; x += 8) { const ox = (y / 4) % 2 ? 4 : 0; px(g, (x + ox) % B, y, '#b8ad92', 7, 3); } px(g, 0, y + 3, '#9c927a', B, 1); } },
    cati(g, renk) { px(g, 0, 0, renk || '#a4493a', B, B); for (let y = 0; y < B; y += 4) { px(g, 0, y, '#7e3328', B, 1); for (let x = (y / 4) % 2 ? 4 : 0; x < B; x += 8) px(g, x, y + 1, '#c45e4b', 3, 2); } },
    catiKoyu(g) { karoCizici.cati(g, '#7f5a3a'); },
    kapi(g) { karoCizici.duvar(g); px(g, 4, 3, '#4e3418', 8, 13); px(g, 5, 4, '#6b4a2b', 6, 11); px(g, 9, 9, '#e0c25a', 1, 1); px(g, 4, 2, '#8b6b3d', 8, 1); },
    pencere(g) { karoCizici.duvar(g); px(g, 5, 4, '#4e3418', 6, 7); px(g, 6, 5, '#9fd3f0', 4, 5); px(g, 8, 5, '#4e3418', 1, 5); },
    tarlaBos(g) { px(g, 0, 0, '#8a6238', B, B); for (let y = 1; y < B; y += 4) px(g, 0, y, '#6f4c2a', B, 2); },
    tarlaEkili(g) { karoCizici.tarlaBos(g); for (let x = 2; x < B; x += 5) for (let y = 2; y < B; y += 4) px(g, x, y, '#7fc25a', 2, 2); },
    tarlaOlgun(g) { karoCizici.tarlaBos(g); for (let x = 1; x < B; x += 5) { px(g, x + 1, 2, '#6aa84f', 1, 13); px(g, x, 1, '#e8c547', 3, 5); px(g, x + 1, 0, '#f2d86b', 1, 2); } },
    bag(g) { karoCizici.toprak(g); px(g, 7, 2, '#6b4a2b', 2, 13); px(g, 2, 4, '#5a9a3a', 12, 2); px(g, 2, 9, '#5a9a3a', 12, 2); px(g, 3, 6, '#6f3fa0', 2, 2); px(g, 10, 6, '#6f3fa0', 2, 2); px(g, 5, 11, '#6f3fa0', 2, 2); px(g, 11, 11, '#6f3fa0', 2, 2); px(g, 1, 3, '#78b847', 3, 2); px(g, 12, 8, '#78b847', 3, 2); },
    bagBos(g) { karoCizici.toprak(g); px(g, 7, 2, '#6b4a2b', 2, 13); px(g, 2, 4, '#5a9a3a', 12, 2); px(g, 2, 9, '#5a9a3a', 12, 2); px(g, 1, 3, '#78b847', 3, 2); px(g, 12, 8, '#78b847', 3, 2); },
    cadir(g) { karoCizici.ot(g, 0); px(g, 2, 12, '#5b4a3a', 12, 2); px(g, 3, 6, '#d9c7a8', 10, 7); px(g, 5, 3, '#e6d8bf', 6, 4); px(g, 7, 1, '#e6d8bf', 2, 3); px(g, 7, 9, '#4e3418', 2, 4); px(g, 2, 8, '#b59f7e', 2, 5); px(g, 12, 8, '#b59f7e', 2, 5); },
    kilise(g) { px(g, 0, 0, '#c9bfa6', B, B); px(g, 0, 0, '#86b95c', B, 4); px(g, 2, 6, '#d6cdb6', 12, 10); px(g, 2, 4, '#8a5a3a', 12, 3); px(g, 6, 0, '#d6cdb6', 4, 6); px(g, 7, 1, '#4e3418', 2, 1); px(g, 7, 0, '#4e3418', 2, 3); px(g, 6, 1, '#4e3418', 4, 1); px(g, 7, 11, '#4e3418', 2, 5); },
    tabela(g) { karoCizici.ot(g, 1); px(g, 7, 8, '#6b4a2b', 2, 7); px(g, 2, 3, '#9c6b3c', 12, 6); px(g, 3, 4, '#d6b36a', 10, 4); px(g, 4, 5, '#5a3a1e', 2, 2); px(g, 7, 5, '#5a3a1e', 2, 2); px(g, 10, 5, '#5a3a1e', 2, 2); },
    ocak(g) { karoCizici.avlu(g); px(g, 2, 9, '#6f6f69', 12, 5); px(g, 3, 7, '#8d8d86', 10, 3); px(g, 4, 3, '#3b3b3b', 8, 5); px(g, 5, 2, '#5a5a5a', 6, 2); px(g, 6, 5, '#f2a53a', 4, 3); px(g, 7, 4, '#ffd36b', 2, 2); },
    yatak(g) { karoCizici.avlu(g); px(g, 2, 2, '#6b4a2b', 12, 12); px(g, 3, 3, '#e6e0d0', 10, 10); px(g, 3, 3, '#7a3e9d', 10, 3); px(g, 4, 7, '#c98a4b', 8, 5); },
    masa(g) { karoCizici.avlu(g); px(g, 2, 4, '#8b6b3d', 12, 7); px(g, 3, 11, '#5a3a1e', 2, 3); px(g, 11, 11, '#5a3a1e', 2, 3); px(g, 4, 5, '#e9dcb5', 8, 5); px(g, 5, 6, '#a4493a', 2, 1); px(g, 8, 7, '#2f5f9e', 3, 1); },
    kuyu(g) { karoCizici.avlu(g); px(g, 3, 8, '#8d8d86', 10, 6); px(g, 4, 6, '#6f6f69', 8, 3); px(g, 3, 2, '#6b4a2b', 1, 7); px(g, 12, 2, '#6b4a2b', 1, 7); px(g, 2, 1, '#a4493a', 12, 2); px(g, 6, 9, '#3b5f8a', 4, 3); },
    mezar(g) { karoCizici.ot(g, 0); px(g, 5, 6, '#9c927a', 6, 9); px(g, 6, 4, '#b8ad92', 4, 3); px(g, 7, 3, '#b8ad92', 2, 1); },
    bos(g) { px(g, 0, 0, '#000', B, B); }
  };

  /* Yapı sprite'ı (2x2 karo = 32x32 taban piksel) */
  function yapiCiz(ad) {
    const [c, g] = tuval(B * 2, B * 2);
    const stil = {
      imaret: { duvar: '#d9c7a8', cati: '#a4493a', motif: (g) => { px(g, 13, 20, '#3b3b3b', 6, 5); px(g, 14, 18, '#f2a53a', 4, 2); } },
      ambar: { duvar: '#9c6b3c', cati: '#6b4a2b', motif: (g) => { px(g, 12, 18, '#5a3a1e', 8, 10); px(g, 13, 19, '#e8c547', 6, 8); } },
      dersodasi: { duvar: '#d9c7a8', cati: '#2f5f9e', motif: (g) => { px(g, 12, 20, '#fff', 8, 6); px(g, 15, 20, '#2f5f9e', 2, 6); } },
      degirmen: { duvar: '#c9bfa6', cati: '#7f5a3a', motif: (g) => { px(g, 11, 14, '#6b4a2b', 10, 2); px(g, 15, 10, '#6b4a2b', 2, 10); px(g, 12, 11, '#6b4a2b', 8, 8); px(g, 14, 13, '#c9bfa6', 4, 4); } },
      mescit: { duvar: '#e6e0d0', cati: '#3a7d44', motif: (g) => { px(g, 2, 2, '#e6e0d0', 3, 14); px(g, 1, 0, '#3a7d44', 5, 3); px(g, 13, 22, '#4e3418', 6, 8); } },
      zaviye: { duvar: '#d9c7a8', cati: '#a4493a', motif: () => {} }
    }[ad] || { duvar: '#d9c7a8', cati: '#7f5a3a', motif: () => {} };
    px(g, 2, 14, stil.duvar, 28, 18);
    for (let y = 14; y < 32; y += 4) px(g, 2, y + 3, '#b8ad92', 28, 1);
    px(g, 0, 4, stil.cati, 32, 11);
    for (let y = 4; y < 15; y += 3) px(g, 0, y, '#00000033', 32, 1);
    px(g, 4, 0, stil.cati, 24, 5);
    px(g, 13, 24, '#4e3418', 6, 8); // kapı
    stil.motif(g);
    return c;
  }

  /* Karakter sprite'ı: 16x20 piksel; yon: 0 aşağı, 1 yukarı, 2 sol, 3 sağ; kare: 0/1 yürüme */
  function karakterCiz(stil, yon, kare) {
    const [c, g] = tuval(B, 20);
    const S = Object.assign({ ten: '#e8b98a', sac: '#3b2416', giysi: '#8a4b1f', sapka: null, sapkaRenk: '#f0e6d2', sakal: null, at: false }, stil);
    if (S.at) {
      // Atlı: at gövdesi + binici
      px(g, 1, 10, '#6b4a2b', 14, 6); px(g, 2, 16, '#4e3418', 2, 4); px(g, 11, 16, '#4e3418', 2, 4 - kare); px(g, 12, 7, '#6b4a2b', 4, 5); px(g, 14, 6, '#4e3418', 2, 2); px(g, 0, 11, '#3b2416', 2, 3);
      px(g, 5, 2, S.ten, 4, 3); px(g, 5, 0, S.sapkaRenk, 4, 2); px(g, 4, 5, S.giysi, 6, 6); px(g, 3, 6, S.giysi, 1, 3); px(g, 10, 6, S.giysi, 1, 3);
      return c;
    }
    const bacak = kare ? 1 : 0;
    // gölge
    px(g, 4, 18, '#00000033', 8, 2);
    // bacaklar
    px(g, 5, 14 + bacak, '#4e3418', 2, 4 - bacak); px(g, 9, 14 + (1 - bacak), '#4e3418', 2, 3 + bacak);
    // gövde / cübbe
    px(g, 4, 8, S.giysi, 8, 7); px(g, 3, 9, S.giysi, 1, 4); px(g, 12, 9, S.giysi, 1, 4);
    px(g, 7, 9, '#00000022', 1, 6);
    // kollar
    if (yon === 2) px(g, 3, 9, S.ten, 1, 1); else if (yon === 3) px(g, 12, 9, S.ten, 1, 1); else { px(g, 3, 12, S.ten, 1, 1); px(g, 12, 12, S.ten, 1, 1); }
    // baş
    px(g, 5, 2, S.ten, 6, 6);
    if (yon === 1) { px(g, 5, 2, S.sac, 6, 6); }
    else {
      px(g, 5, 2, S.sac, 6, 2);
      if (yon === 0) { px(g, 6, 5, '#222', 1, 1); px(g, 9, 5, '#222', 1, 1); }
      else if (yon === 2) { px(g, 6, 5, '#222', 1, 1); px(g, 5, 2, S.sac, 2, 5); }
      else { px(g, 9, 5, '#222', 1, 1); px(g, 9, 2, S.sac, 2, 5); }
      if (S.sakal && yon !== 1) px(g, 6, 7, S.sakal, 4, 2);
    }
    // sarık / başlık / örtü
    if (S.sapka === 'sarik') { px(g, 4, 1, S.sapkaRenk, 8, 3); px(g, 5, 0, S.sapkaRenk, 6, 1); }
    else if (S.sapka === 'kulah') { px(g, 5, 0, S.sapkaRenk, 6, 3); px(g, 6, -1, S.sapkaRenk, 4, 1); }
    else if (S.sapka === 'ortu') { px(g, 4, 1, S.sapkaRenk, 8, 3); px(g, 4, 4, S.sapkaRenk, 1, 6); px(g, 11, 4, S.sapkaRenk, 1, 6); }
    else if (S.sapka === 'borkCap') { px(g, 5, 0, S.sapkaRenk, 6, 3); }
    return c;
  }

  function koyunCiz(kare) {
    const [c, g] = tuval(B, B);
    px(g, 3, 5, '#f2efe6', 10, 7); px(g, 2, 6, '#f2efe6', 12, 5); px(g, 11, 4, '#e6e0d0', 4, 4); px(g, 12, 5, '#222', 1, 1);
    px(g, 4, 12, '#3b3b3b', 2, 3 - kare); px(g, 10, 12, '#3b3b3b', 2, 2 + kare); px(g, 7, 12, '#3b3b3b', 2, 3);
    return c;
  }

  /* ---------- Önbellekli erişim ---------- */
  function karo(ad, arg) {
    const anahtar = ad + ':' + (arg ?? '');
    if (onbellek[anahtar]) return onbellek[anahtar];
    const [c, g] = tuval();
    (karoCizici[ad] || karoCizici.bos)(g, arg);
    onbellek[anahtar] = c;
    return c;
  }
  function yapi(ad) { const k = 'yapi:' + ad; if (!onbellek[k]) onbellek[k] = yapiCiz(ad); return onbellek[k]; }
  function karakter(stilAd, stil, yon, kare) { const k = 'kr:' + stilAd + ':' + yon + ':' + kare; if (!onbellek[k]) onbellek[k] = karakterCiz(stil, yon, kare); return onbellek[k]; }
  function koyun(kare) { const k = 'koyun:' + kare; if (!onbellek[k]) onbellek[k] = koyunCiz(kare); return onbellek[k]; }

  return { B, KARO, karo, yapi, karakter, koyun };
})();
