/* MANGATRENDINDO — aplikasi statis.
   Semua data manga dibaca dari data.json.
   Pengguna TIDAK perlu mengedit file ini untuk menambah judul/chapter. */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var searchInput = document.getElementById('search');
  var DATA = null;
  var genreAktif = 'Semua';

  var bookmarks = loadJSON('mt_bookmarks', []);
  var progress = loadJSON('mt_progress', {}); // { mangaId: { chapter: 3, tanggal: '...' } }

  function loadJSON(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || 'null');
      return v === null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* abaikan */ }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtTanggal(tgl) {
    try {
      return new Date(tgl.indexOf('T') !== -1 ? tgl : tgl + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return tgl; }
  }
  function waktuRelatif(tgl) {
    try {
      var punyaJam = tgl.indexOf('T') !== -1;
      var d = new Date(punyaJam ? tgl : tgl + 'T00:00:00');
      var skrg = new Date();
      if (d > skrg) return 'hari ini';
      if (punyaJam) {
        var jam = Math.floor((skrg - d) / 3600000);
        if (jam < 1) return 'baru saja';
        if (jam < 24 && d.toDateString() === skrg.toDateString()) return jam + ' jam lalu';
      }
      var awalHariIni = new Date(skrg.getFullYear(), skrg.getMonth(), skrg.getDate());
      var awalHariD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      var hari = Math.round((awalHariIni - awalHariD) / 86400000);
      if (hari <= 0) return 'hari ini';
      if (hari === 1) return 'kemarin';
      if (hari < 7) return hari + ' hari lalu';
      if (hari < 30) return Math.floor(hari / 7) + ' minggu lalu';
      if (hari < 365) return Math.floor(hari / 30) + ' bulan lalu';
      return Math.floor(hari / 365) + ' tahun lalu';
    } catch (e) { return tgl; }
  }
  function isHariIni(tgl) {
    try {
      var d = new Date(tgl.indexOf('T') !== -1 ? tgl : tgl + 'T00:00:00');
      return d.toDateString() === new Date().toDateString();
    } catch (e) { return false; }
  }
  /* Penghitung view per chapter (CounterAPI v2, gratis).
     Butuh workspace 'mangatrendindo' yang dibuat sekali di counterapi.dev.
     Angka mulai dari 0 dan bertambah setiap kali ada yang membuka chapter.
     Kalau layanannya tidak bisa dihubungi, angkanya disembunyikan saja. */
  var COUNTER_WS = 'mangatrendindo';
  var COUNTER_BASE = 'https://api.counterapi.dev/v2';
  /* Kolom komentar (Disqus, gratis). Shortname dari dashboard Disqus setelah
     mendaftarkan situs mangatrendindo.my.id (kategori Entertainment).
     Tiap halaman punya thread sendiri lewat page.identifier. */
  var DISQUS_SHORTNAME = 'mangatrendindo-my-id';
  var DISQUS_SITE = 'https://mangatrendindo.my.id';
  function komentarHtml() {
    return '<div class="komentar"><h2 class="section-title">Komentar</h2><div id="disqus_thread"></div></div>';
  }
  /* Situs ini single-page (pindah halaman tanpa reload), jadi setiap selesai
     render halaman yang punya kolom komentar, panggil ini dengan id halaman.
     Kalau script Disqus belum dimuat, muat dulu; kalau sudah, reset ke
     halaman baru (cara resmi Disqus untuk SPA). */
  function muatKomentar(pageId, pageTitle) {
    var pageUrl = DISQUS_SITE + '/' + location.hash;
    if (window.DISQUS) {
      window.DISQUS.reset({ reload: true, config: function () {
        this.page.identifier = pageId;
        this.page.url = pageUrl;
        this.page.title = pageTitle;
      }});
      return;
    }
    window.disqus_config = function () {
      this.page.identifier = pageId;
      this.page.url = pageUrl;
      this.page.title = pageTitle;
    };
    if (document.querySelector('script[data-disqus-embed]')) return;
    var s = document.createElement('script');
    s.setAttribute('data-disqus-embed', '1');
    s.src = 'https://' + DISQUS_SHORTNAME + '.disqus.com/embed.js';
    s.setAttribute('data-timestamp', String(+new Date()));
    (document.head || document.body).appendChild(s);
  }
  /* CounterAPI menghapus titik dari slug (mis. nama "blue-lock-370.1" jadi slug
     "blue-lock-3701"), jadi kunci counter juga harus tanpa titik. */
  function counterKey(mangaId, nomor) {
    return (mangaId + '-' + nomor).replace(/\./g, '');
  }
  function counterHit(mangaId, nomor) {
    try {
      var c = new AbortController();
      setTimeout(function () { c.abort(); }, 2500);
      fetch(COUNTER_BASE + '/' + COUNTER_WS + '/' + encodeURIComponent(counterKey(mangaId, nomor)) + '/up', { signal: c.signal, mode: 'cors' }).catch(function () {});
    } catch (e) {}
  }
  function counterGet(mangaId, nomor) {
    var c = new AbortController();
    var t = setTimeout(function () { c.abort(); }, 3000);
    return fetch(COUNTER_BASE + '/' + COUNTER_WS + '/' + encodeURIComponent(counterKey(mangaId, nomor)), { signal: c.signal, mode: 'cors' })
      .then(function (r) { clearTimeout(t); if (!r.ok) return null; return r.json(); })
      .then(function (j) { return (j && j.data && typeof j.data.up_count === 'number') ? j.data.up_count : null; })
      .catch(function () { clearTimeout(t); return null; });
  }
  function chapterTerbaru(m) {
    return m.chapters.slice().sort(function (a, b) { return b.nomor - a.nomor; })[0];
  }
  /* Judul halaman per rute, supaya Google Analytics mencatat judul manga/chapter,
     bukan cuma 'MANGATRENDINDO — Baca Manga' di semua halaman. */
  function judulHalaman() {
    var hash = location.hash || '#/';
    var parts = hash.replace(/^#\//, '').split('/');
    var dasar = 'MANGATRENDINDO — Baca Manga';
    if (parts[0] === 'daftar') return 'Daftar Manga | ' + dasar;
    if (parts[0] === 'koleksi') return 'Koleksiku | ' + dasar;
    if (parts[0] === 'manga' && parts[1] && DATA) {
      var m = cariManga(decodeURIComponent(parts[1]));
      if (m) return m.judul + ' | ' + dasar;
    }
    if (parts[0] === 'baca' && parts[1] && parts[2] && DATA) {
      var m2 = cariManga(decodeURIComponent(parts[1]));
      if (m2) return m2.judul + ' Chapter ' + parts[2] + ' | ' + dasar;
    }
    if (parts[0] === 'vip' && parts[1] && parts[2] && DATA) {
      var m3 = cariManga(decodeURIComponent(parts[1]));
      if (m3) return m3.judul + ' Chapter ' + parts[2] + ' (VIP) | ' + dasar;
    }
    return dasar;
  }
  function cariManga(id) {
    return DATA.manga.find(function (m) { return m.id === id; });
  }
  function isBookmark(id) { return bookmarks.indexOf(id) !== -1; }

  /* ---------- Kartu manga (grid ala Voratoon) ---------- */
  function kartuManga(m, badge) {
    var ch = chapterTerbaru(m);
    var badgeHtml = badge ? '<span class="badge ' + badge.cls + '">' + esc(badge.teks) + '</span> ' : '';
    return '<a class="manga-card" href="#/manga/' + esc(m.id) + '">' +
      '<img src="' + esc(m.cover) + '" alt="Cover ' + esc(m.judul) + '" loading="lazy">' +
      '<div class="manga-card-body">' +
        '<h3>' + esc(m.judul) + '</h3>' +
        '<div class="manga-meta">' + badgeHtml +
          '<span class="badge status">' + esc(m.status) + '</span>' +
          '<span class="rating">&#9733; ' + m.rating.toFixed(1) + '</span>' +
        '</div>' +
        '<div class="manga-meta" style="margin-top:6px">' +
          '<span>Chapter ' + (ch ? ch.nomor : '-') + '</span>' +
          '<span>&middot; ' + fmtTanggal(ch ? ch.tanggal : '') + '</span>' +
          '<span class="up-label">UP</span>' +
        '</div>' +
      '</div></a>';
  }

  /* ---------- Sidebar: Manga Populer + Genre ---------- */
  function renderSidebar() {
    var populer = DATA.manga.slice().sort(function (a, b) { return b.views - a.views; }).slice(0, 4);
    var popEl = document.getElementById('sidebar-popular');
    if (popEl) {
      popEl.innerHTML = populer.map(function (m, i) {
        var ch = chapterTerbaru(m);
        return '<a class="side-rank" href="#/manga/' + esc(m.id) + '">' +
          '<span class="rank">' + (i + 1) + '</span>' +
          '<img src="' + esc(m.cover) + '" alt="Cover ' + esc(m.judul) + '" loading="lazy">' +
          '<span><span class="side-title">' + esc(m.judul) + '</span><br>' +
          '<span class="side-ch">Chapter ' + (ch ? ch.nomor : '-') + '</span></span></a>';
      }).join('');
    }
    var genres = ['Semua'];
    DATA.manga.forEach(function (m) {
      m.genre.forEach(function (g) { if (genres.indexOf(g) === -1) genres.push(g); });
    });
    genres.sort();
    var genEl = document.getElementById('sidebar-genres');
    if (genEl) {
      genEl.innerHTML = genres.map(function (g) {
        return '<a class="chip" href="#/daftar" data-genre="' + esc(g) + '">' + esc(g) + '</a>';
      }).join('');
      genEl.querySelectorAll('[data-genre]').forEach(function (el) {
        el.addEventListener('click', function () {
          genreAktif = el.getAttribute('data-genre');
          if ((location.hash || '#/') === '#/daftar') renderDaftar();
        });
      });
    }
  }

  /* ---------- Halaman: Beranda ---------- */
  function renderBeranda() {
    var semuaChapter = [];
    DATA.manga.forEach(function (m, mi) {
      m.chapters.forEach(function (c, ci) {
        semuaChapter.push({ manga: m, chapter: c, mi: mi, ci: ci });
      });
    });
    semuaChapter.sort(function (a, b) {
      var d = b.chapter.tanggal.localeCompare(a.chapter.tanggal);
      if (d !== 0) return d;
      if (a.mi !== b.mi) return b.mi - a.mi;
      return a.ci - b.ci;
    });
    var grupUpdate = [];
    semuaChapter.forEach(function (u) {
      var g = null;
      for (var i = 0; i < grupUpdate.length; i++) {
        if (grupUpdate[i].manga.id === u.manga.id) { g = grupUpdate[i]; break; }
      }
      if (!g) { g = { manga: u.manga, chapters: [] }; grupUpdate.push(g); }
      g.chapters.push(u.chapter);
    });
    var update = grupUpdate.slice(0, 8);

    var html = '<h2 class="section-title">Update Terbaru</h2>' +
      '<div class="update-grid">' +
      update.map(function (g) {
        var chLinks = g.chapters.slice(0, 3).map(function (c) {
          var linkCh = c.vip ? '#/vip/' : '#/baca/';
          if (c.vip) {
            return '<a class="update-ch-link" href="' + linkCh + esc(g.manga.id) + '/' + c.nomor + '"><span class="update-ch-teks"><span class="update-ch-nomor">Chapter ' + c.nomor + '</span>' + (c.judul ? '<span class="update-ch-judul"> — ' + esc(c.judul) + '</span>' : '') + ' &#128274;</span></a>';
          }
          var up = isHariIni(c.tanggal) ? ' <span class="up-badge">UP</span>' : '';
          return '<a class="update-ch-link" href="' + linkCh + esc(g.manga.id) + '/' + c.nomor + '"><span class="update-ch-teks"><span class="update-ch-nomor">Chapter ' + c.nomor + '</span>' + up + (c.judul ? '<span class="update-ch-judul"> — ' + esc(c.judul) + '</span>' : '') + '</span><span class="update-ch-time">' + waktuRelatif(c.tanggal).replace(' lalu', '') + '</span></a>';
        }).join('');
        return '<div class="update-card">' +
          '<a href="#/manga/' + esc(g.manga.id) + '"><img src="' + esc(g.manga.cover) + '" alt="Cover ' + esc(g.manga.judul) + '" loading="lazy"></a>' +
          '<h3><a href="#/manga/' + esc(g.manga.id) + '">' + esc(g.manga.judul) + '</a></h3>' +
          '<div class="update-chapters">' + chLinks + '</div>' +
        '</div>';
      }).join('') + '</div>';

    html += '<h2 class="section-title">Semua Manga</h2>' +
      '<div class="update-list">' +
      DATA.manga.slice().sort(function (a, b) {
        var cb = chapterTerbaru(b), ca = chapterTerbaru(a);
        var da = (ca && ca.tanggal) || '', db = (cb && cb.tanggal) || '';
        var d = db.localeCompare(da);
        if (d !== 0) return d;
        if (!da) return a.judul.localeCompare(b.judul);
        return DATA.manga.indexOf(b) - DATA.manga.indexOf(a);
      }).map(function (m) {
        var chs = m.chapters.slice().sort(function (a, b) { return b.nomor - a.nomor; });
        var chLinks = chs.slice(0, 3).map(function (c) {
          var linkCh = c.vip ? '#/vip/' : '#/baca/';
          return '<a class="chapter-link" href="' + linkCh + esc(m.id) + '/' + c.nomor + '">Chapter ' + c.nomor + (c.judul ? ' — ' + esc(c.judul) : '') + (c.vip ? ' &#128274;' : '') + '</a>';
        }).join('');
        if (chs.length > 3) {
          chLinks += '<a class="chapter-link" href="#/manga/' + esc(m.id) + '">Lihat semua chapter &raquo;</a>';
        }
        if (!chLinks) chLinks = '<span class="chapter-link" style="color:var(--muted)">Belum ada chapter</span>';
        return '<div class="update-item">' +
          '<a href="#/manga/' + esc(m.id) + '"><img src="' + esc(m.cover) + '" alt="Cover ' + esc(m.judul) + '" loading="lazy"></a>' +
          '<div><h3><a href="#/manga/' + esc(m.id) + '">' + esc(m.judul) + '</a></h3>' +
          '<div class="chapter-links">' + chLinks + '</div>' +
          '<div class="manga-meta"><span>' + esc(m.genre.join(', ')) + '</span></div></div>' +
          (chs.length ? '<span class="update-time"><span class="up-label">UP</span> &middot; ' + fmtTanggal(chs[0].tanggal) + '</span>' : '') +
        '</div>';
      }).join('') + '</div>';

    app.innerHTML = html;

  }

  /* ---------- Halaman: Daftar Manga + filter genre ---------- */
  function renderDaftar() {
    var genres = ['Semua'];
    DATA.manga.forEach(function (m) {
      m.genre.forEach(function (g) { if (genres.indexOf(g) === -1) genres.push(g); });
    });
    genres.sort();

    var daftar = DATA.manga.filter(function (m) {
      return genreAktif === 'Semua' || m.genre.indexOf(genreAktif) !== -1;
    }).sort(function (a, b) { return a.judul.localeCompare(b.judul); });

    app.innerHTML =
      '<h2 class="section-title">Daftar Manga</h2>' +
      '<p class="section-sub">' + daftar.length + ' judul &middot; diurutkan A&ndash;Z</p>' +
      '<div class="chips">' +
        genres.map(function (g) {
          return '<button class="chip' + (g === genreAktif ? ' active' : '') + '" data-genre="' + esc(g) + '">' + esc(g) + '</button>';
        }).join('') +
      '</div>' +
      (daftar.length
        ? '<div class="manga-grid">' + daftar.map(function (m) { return kartuManga(m); }).join('') + '</div>'
        : '<p class="empty">Tidak ada manga untuk genre ini.</p>');

    app.querySelectorAll('.chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        genreAktif = btn.getAttribute('data-genre');
        renderDaftar();
      });
    });
  }

  /* ---------- Halaman: Detail manga ---------- */
  function renderDetail(id) {
    var m = cariManga(id);
    if (!m) { app.innerHTML = '<p class="empty">Manga tidak ditemukan. <a href="#/daftar">Kembali ke Daftar Manga</a></p>'; return; }

    var chapters = m.chapters.slice().sort(function (a, b) { return b.nomor - a.nomor; });
    var prog = progress[m.id];
    var sudahBaca = prog ? prog.chapter : 0;

    var html =
      '<div class="detail">' +
        '<div class="detail-cover"><img src="' + esc(m.cover) + '" alt="Cover ' + esc(m.judul) + '"></div>' +
        '<div class="detail-info">' +
          '<h1>' + esc(m.judul) + '</h1>' +
          '<div class="manga-meta">' +
            '<span class="badge status">' + esc(m.status) + '</span>' +
            '<span class="rating">&#9733; ' + m.rating.toFixed(1) + '</span>' +
            '<span>' + esc(m.genre.join(' &middot; ')) + '</span>' +
            '<span id="total-dibaca">&middot; ' + m.views.toLocaleString('id-ID') + ' dibaca</span>' +
          '</div>' +
          '<p class="sinopsis">' + esc(m.sinopsis) + '</p>' +
          '<div class="btn-row">' +
            (chapters.length
              ? (chapters[0].vip
                  ? '<a class="btn" href="#/vip/' + esc(m.id) + '/' + chapters[0].nomor + '">&#128274; Baca Chapter ' + chapters[0].nomor + '</a>'
                  : '<a class="btn" href="#/baca/' + esc(m.id) + '/' + chapters[0].nomor + '">Baca Chapter ' + chapters[0].nomor + '</a>')
              : '<span class="btn" style="opacity:.4">Belum ada chapter</span>') +
            '<button class="btn ghost" id="btn-bookmark">' + (isBookmark(m.id) ? '&#9733; Sudah di Bookmark' : '&#9734; Bookmark') + '</button>' +
          '</div>' +
          (prog
            ? '<p class="progress-note">Terakhir dibaca: Chapter ' + prog.chapter + ' &middot; ' + fmtTanggal(prog.tanggal) + ' — <a href="#/baca/' + esc(m.id) + '/' + prog.chapter + '" style="color:var(--accent-2);font-weight:700">Lanjutkan membaca</a></p>'
            : '') +
        '</div>' +
      '</div>' +
      '<h2 class="section-title">Daftar Chapter</h2>' +
      '<div class="chapter-list">' +
      chapters.map(function (c) {
        var dibaca = c.nomor <= sudahBaca;
        var linkCh = c.vip ? '#/vip/' : '#/baca/';
        return '<div class="chapter-row-wrap">' +
          '<a class="chapter-row' + (c.vip ? ' vip-row' : '') + '" href="' + linkCh + esc(m.id) + '/' + c.nomor + '">' +
          '<span class="ch-num">Chapter ' + c.nomor + '</span>' +
          '<span class="ch-title">' + esc(c.judul || '') + '</span>' +
          (c.vip ? '<span class="vip-badge">&#128274;</span>' : '') +
          (dibaca ? '<span class="read-badge">Sudah dibaca</span>' : '') +
          '<span class="ch-views" data-vc="' + esc(m.id) + '-' + c.nomor + '">&#128065; <span class="vc-num"></span></span>' +
          '<time>' + waktuRelatif(c.tanggal) + '</time>' +
        '</a>' +
        (c.download ? '<a class="btn-dl" href="' + esc(c.download) + '" target="_blank" rel="noopener">&#11015; Download</a>' : '') +
        '</div>';
      }).join('') + '</div>' +
      komentarHtml();

    app.innerHTML = html;
    muatKomentar('manga-' + m.id, m.judul);

    document.getElementById('btn-bookmark').addEventListener('click', function () {
      if (isBookmark(m.id)) {
        bookmarks = bookmarks.filter(function (b) { return b !== m.id; });
      } else {
        bookmarks.push(m.id);
      }
      saveJSON('mt_bookmarks', bookmarks);
      renderDetail(m.id);
    });

    /* Isi jumlah view per chapter + total dibaca (dari layanan counter). */
    var totalEl = document.getElementById('total-dibaca');
    var total = 0, selesai = 0;
    app.querySelectorAll('[data-vc]').forEach(function (el) {
      var key = el.getAttribute('data-vc');
      var dash = key.lastIndexOf('-');
      counterGet(key.slice(0, dash), parseFloat(key.slice(dash + 1))).then(function (v) {
        selesai++;
        if (v === null) { el.style.display = 'none'; }
        else {
          el.querySelector('.vc-num').textContent = v.toLocaleString('id-ID');
          total += v;
        }
        if (selesai === chapters.length && totalEl && total > 0) {
          totalEl.textContent = '· ' + total.toLocaleString('id-ID') + ' dibaca';
        }
      });
    });
  }

  /* ---------- Halaman: Chapter VIP (terkunci, baca di Trakteer) ---------- */
  function renderVip(mangaId, nomor) {
    var m = cariManga(mangaId);
    if (!m) { app.innerHTML = '<p class="empty">Manga tidak ditemukan.</p>'; return; }
    var ch = m.chapters.find(function (c) { return c.nomor === nomor; });
    if (!ch) { app.innerHTML = '<p class="empty">Chapter tidak ditemukan.</p>'; return; }
    app.innerHTML =
      '<div class="vip-lock">' +
        '<div class="vip-lock-icon">&#128274;</div>' +
        '<h1>' + esc(m.judul) + ' — Chapter ' + ch.nomor + '</h1>' +
        '<p class="vip-lock-sub">&#128274; ' + fmtTanggal(ch.tanggal) + '</p>' +
        '<p>Chapter ini tersedia lebih awal khusus untuk pendukung di Trakteer. Dukung kreator untuk membaca chapter ini sekarang.</p>' +
        (ch.trakteer ? '<a class="btn vip-btn" href="' + esc(ch.trakteer) + '" target="_blank" rel="noopener">Dukung di Trakteer &raquo;</a>' : '') +
        '<a class="btn ghost" href="#/manga/' + esc(m.id) + '">Kembali ke Daftar Chapter</a>' +
      '</div>' +
      komentarHtml();
    muatKomentar('vip-' + m.id + '-' + ch.nomor, m.judul + ' — Chapter ' + ch.nomor + ' (VIP)');
    window.scrollTo(0, 0);
  }

  /* ---------- Halaman: Reader vertikal ---------- */
  function renderReader(mangaId, nomor) {
    var m = cariManga(mangaId);
    if (!m) { app.innerHTML = '<p class="empty">Manga tidak ditemukan.</p>'; return; }
    var ch = m.chapters.find(function (c) { return c.nomor === nomor; });
    if (!ch) { app.innerHTML = '<p class="empty">Chapter tidak ditemukan.</p>'; return; }
    if (ch.vip) { renderVip(mangaId, nomor); return; }

    // Simpan progress baca
    progress[m.id] = { chapter: nomor, tanggal: ch.tanggal };
    saveJSON('mt_progress', progress);

    // Hitung 1 view untuk chapter ini
    counterHit(mangaId, nomor);

    var semua = m.chapters.slice().sort(function (a, b) { return a.nomor - b.nomor; });
    var idx = semua.findIndex(function (c) { return c.nomor === nomor; });
    var prev = idx > 0 ? semua[idx - 1] : null;
    var next = idx < semua.length - 1 ? semua[idx + 1] : null;

    var nav = '<div class="reader-nav">' +
      (prev ? '<a class="btn ghost" href="#/baca/' + esc(m.id) + '/' + prev.nomor + '">&laquo; Chapter ' + prev.nomor + '</a>' : '<span class="btn ghost" style="opacity:.4">&laquo; Sebelumnya</span>') +
      '<a class="btn ghost" href="#/manga/' + esc(m.id) + '">Daftar Chapter</a>' +
      (ch.download ? '<a class="btn" href="' + esc(ch.download) + '" target="_blank" rel="noopener">&#11015; Download</a>' : '') +
      (next ? '<a class="btn" href="#/baca/' + esc(m.id) + '/' + next.nomor + '">Chapter ' + next.nomor + ' &raquo;</a>' : '<span class="btn" style="opacity:.4">Chapter Berikutnya &raquo;</span>') +
    '</div>';

    app.innerHTML =
      '<div class="reader">' +
        '<div class="reader-head"><h1>' + esc(m.judul) + ' — Chapter ' + ch.nomor + '</h1>' +
        '<p>' + esc(ch.judul || '') + ' &middot; ' + fmtTanggal(ch.tanggal) + '</p></div>' +
        nav +
        '<div class="reader-pages">' +
          (ch.pages && ch.pages.length
            ? ch.pages.map(function (p, i) {
                return '<img src="' + esc(p) + '" alt="Halaman ' + (i + 1) + '" loading="lazy">';
              }).join('')
            : '<p class="empty" style="padding:24px">Halaman chapter ini belum diunggah. Upload gambar halaman ke folder images/ lalu isi daftar pages di data.json.</p>') +
        '</div>' +
        nav +
      '</div>' +
      komentarHtml();
    muatKomentar('baca-' + m.id + '-' + ch.nomor, m.judul + ' — Chapter ' + ch.nomor);
    window.scrollTo(0, 0);
  }

  /* ---------- Halaman: Koleksiku (bookmark + lanjut baca) ---------- */
  function renderKoleksi() {
    var bookmarked = DATA.manga.filter(function (m) { return isBookmark(m.id); });
    var lanjut = DATA.manga.filter(function (m) { return progress[m.id]; })
      .sort(function (a, b) { return (progress[b.id].tanggal || '').localeCompare(progress[a.id].tanggal || ''); });

    var html = '<h2 class="section-title">Koleksiku</h2>' +
      '<p class="section-sub">Bookmark dan progres baca tersimpan di browser ini (localStorage).</p>' +
      '<h2 class="section-title">Lanjutkan Membaca</h2>' +
      (lanjut.length
        ? '<div class="update-list">' + lanjut.map(function (m) {
            var p = progress[m.id];
            return '<div class="update-item">' +
              '<a href="#/manga/' + esc(m.id) + '"><img src="' + esc(m.cover) + '" alt="Cover ' + esc(m.judul) + '" loading="lazy"></a>' +
              '<div><h3><a href="#/manga/' + esc(m.id) + '">' + esc(m.judul) + '</a></h3>' +
              '<a class="chapter-link" href="#/baca/' + esc(m.id) + '/' + p.chapter + '">Lanjut Chapter ' + p.chapter + '</a></div>' +
              '<span class="update-time">' + fmtTanggal(p.tanggal) + '</span></div>';
          }).join('') + '</div>'
        : '<p class="empty">Belum ada progres baca. Buka sebuah chapter untuk mulai membaca.</p>') +
      '<h2 class="section-title">Bookmark</h2>' +
      (bookmarked.length
        ? '<div class="manga-grid">' + bookmarked.map(function (m) { return kartuManga(m); }).join('') + '</div>'
        : '<p class="empty">Belum ada bookmark. Buka halaman manga lalu ketuk tombol Bookmark.</p>');

    app.innerHTML = html;
  }

  /* ---------- Pencarian ---------- */
  function renderCari(q) {
    q = q.trim().toLowerCase();
    var hasil = DATA.manga.filter(function (m) {
      return m.judul.toLowerCase().indexOf(q) !== -1 ||
        m.sinopsis.toLowerCase().indexOf(q) !== -1 ||
        m.genre.join(' ').toLowerCase().indexOf(q) !== -1;
    });
    app.innerHTML = '<h2 class="section-title">Hasil Pencarian: &ldquo;' + esc(q) + '&rdquo;</h2>' +
      '<p class="section-sub">' + hasil.length + ' judul ditemukan</p>' +
      (hasil.length
        ? '<div class="manga-grid">' + hasil.map(function (m) { return kartuManga(m); }).join('') + '</div>'
        : '<p class="empty">Tidak ditemukan. Coba kata kunci lain.</p>');
  }

  /* ---------- Router ---------- */
  function router() {
    var hash = location.hash || '#/';
    var parts = hash.replace(/^#\//, '').split('/');
    document.title = judulHalaman();
    document.querySelectorAll('.nav a').forEach(function (a) { a.classList.remove('active'); });

    var q = searchInput.value.trim();
    if (q) {
      var navBeranda = document.querySelector('[data-nav="beranda"]');
      if (navBeranda) navBeranda.classList.add('active');
      renderCari(q);
      return;
    }

    if (parts[0] === 'daftar') {
      document.querySelector('[data-nav="daftar"]').classList.add('active');
      renderDaftar();
    } else if (parts[0] === 'koleksi') {
      document.querySelector('[data-nav="koleksi"]').classList.add('active');
      renderKoleksi();
    } else if (parts[0] === 'manga' && parts[1]) {
      renderDetail(decodeURIComponent(parts[1]));
    } else if (parts[0] === 'vip' && parts[1] && parts[2]) {
      renderVip(decodeURIComponent(parts[1]), parseFloat(parts[2]));
    } else if (parts[0] === 'baca' && parts[1] && parts[2]) {
      renderReader(decodeURIComponent(parts[1]), parseFloat(parts[2]));
    } else {
      document.querySelector('[data-nav="beranda"]').classList.add('active');
      renderBeranda();
    }
    window.scrollTo(0, 0);
  }

  searchInput.addEventListener('input', function () { router(); });

  var toTop = document.getElementById('to-top');
  if (toTop) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 600) toTop.classList.add('show');
      else toTop.classList.remove('show');
    });
    toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }
  window.addEventListener('hashchange', function () {
    searchInput.value = '';
    if (typeof gtag === 'function') gtag('event', 'page_view', { page_path: location.pathname + location.hash, page_title: judulHalaman() });
    router();
  });

  fetch('data.json?_=' + Date.now())
    .then(function (r) { if (!r.ok) throw new Error('data.json tidak ditemukan'); return r.json(); })
    .then(function (data) {
      DATA = data; renderSidebar(); router();
      if (typeof gtag === 'function') gtag('event', 'page_view', { page_path: location.pathname + location.hash, page_title: judulHalaman() });
    })
    .catch(function (err) {
      app.innerHTML = '<p class="empty">Gagal memuat data.json: ' + esc(err.message) + '</p>';
      if (typeof gtag === 'function') gtag('event', 'page_view', { page_path: location.pathname + location.hash });
    });
})();
