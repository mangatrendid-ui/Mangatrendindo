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
      return new Date(tgl + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return tgl; }
  }
  function chapterTerbaru(m) {
    return m.chapters.slice().sort(function (a, b) { return b.nomor - a.nomor; })[0];
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

  /* ---------- Halaman: Beranda ---------- */
  function renderBeranda() {
    var semuaChapter = [];
    DATA.manga.forEach(function (m) {
      m.chapters.forEach(function (c) {
        semuaChapter.push({ manga: m, chapter: c });
      });
    });
    semuaChapter.sort(function (a, b) { return b.chapter.tanggal.localeCompare(a.chapter.tanggal); });
    var update = semuaChapter.slice(0, 8);

    var populer = DATA.manga.slice().sort(function (a, b) { return b.views - a.views; }).slice(0, 4);

    var html = '<h2 class="section-title">Update Terbaru</h2>' +
      '<div class="update-list">' +
      update.map(function (u) {
        return '<div class="update-item">' +
          '<a href="#/manga/' + esc(u.manga.id) + '"><img src="' + esc(u.manga.cover) + '" alt="Cover ' + esc(u.manga.judul) + '" loading="lazy"></a>' +
          '<div><h3><a href="#/manga/' + esc(u.manga.id) + '">' + esc(u.manga.judul) + '</a></h3>' +
          '<a class="chapter-link" href="#/baca/' + esc(u.manga.id) + '/' + u.chapter.nomor + '">Chapter ' + u.chapter.nomor + (u.chapter.judul ? ' — ' + esc(u.chapter.judul) : '') + '</a>' +
          '<div class="manga-meta"><span>' + esc(u.manga.genre.join(', ')) + '</span></div></div>' +
          '<span class="update-time"><span class="up-label">UP</span> &middot; ' + fmtTanggal(u.chapter.tanggal) + '</span>' +
        '</div>';
      }).join('') + '</div>';

    html += '<h2 class="section-title">Manga Populer</h2>' +
      '<p class="section-sub">Paling banyak dibaca minggu ini.</p>' +
      '<div class="manga-grid">' +
      populer.map(function (m, i) {
        return kartuManga(m, { cls: 'hot', teks: '#' + (i + 1) + ' Populer' });
      }).join('') + '</div>';

    html += '<h2 class="section-title">Semua Manga</h2>' +
      '<div class="manga-grid">' +
      DATA.manga.map(function (m) { return kartuManga(m); }).join('') +
      '</div>';

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
    });

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
            '<span>&middot; ' + m.views.toLocaleString('id-ID') + ' dibaca</span>' +
          '</div>' +
          '<p class="sinopsis">' + esc(m.sinopsis) + '</p>' +
          '<div class="btn-row">' +
            '<a class="btn" href="#/baca/' + esc(m.id) + '/' + chapters[0].nomor + '">Baca Chapter ' + chapters[0].nomor + '</a>' +
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
        return '<a class="chapter-row" href="#/baca/' + esc(m.id) + '/' + c.nomor + '">' +
          '<span class="ch-num">Chapter ' + c.nomor + '</span>' +
          '<span class="ch-title">' + esc(c.judul || '') + '</span>' +
          (dibaca ? '<span class="read-badge">Sudah dibaca</span>' : '') +
          '<time>' + fmtTanggal(c.tanggal) + '</time>' +
        '</a>';
      }).join('') + '</div>';

    app.innerHTML = html;

    document.getElementById('btn-bookmark').addEventListener('click', function () {
      if (isBookmark(m.id)) {
        bookmarks = bookmarks.filter(function (b) { return b !== m.id; });
      } else {
        bookmarks.push(m.id);
      }
      saveJSON('mt_bookmarks', bookmarks);
      renderDetail(m.id);
    });
  }

  /* ---------- Halaman: Reader vertikal ---------- */
  function renderReader(mangaId, nomor) {
    var m = cariManga(mangaId);
    if (!m) { app.innerHTML = '<p class="empty">Manga tidak ditemukan.</p>'; return; }
    var ch = m.chapters.find(function (c) { return c.nomor === nomor; });
    if (!ch) { app.innerHTML = '<p class="empty">Chapter tidak ditemukan.</p>'; return; }

    // Simpan progress baca
    progress[m.id] = { chapter: nomor, tanggal: ch.tanggal };
    saveJSON('mt_progress', progress);

    var semua = m.chapters.slice().sort(function (a, b) { return a.nomor - b.nomor; });
    var idx = semua.findIndex(function (c) { return c.nomor === nomor; });
    var prev = idx > 0 ? semua[idx - 1] : null;
    var next = idx < semua.length - 1 ? semua[idx + 1] : null;

    var nav = '<div class="reader-nav">' +
      (prev ? '<a class="btn ghost" href="#/baca/' + esc(m.id) + '/' + prev.nomor + '">&laquo; Chapter ' + prev.nomor + '</a>' : '<span class="btn ghost" style="opacity:.4">&laquo; Sebelumnya</span>') +
      '<a class="btn ghost" href="#/manga/' + esc(m.id) + '">Daftar Chapter</a>' +
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
      '</div>';
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
    } else if (parts[0] === 'baca' && parts[1] && parts[2]) {
      renderReader(decodeURIComponent(parts[1]), parseInt(parts[2], 10));
    } else {
      document.querySelector('[data-nav="beranda"]').classList.add('active');
      renderBeranda();
    }
    window.scrollTo(0, 0);
  }

  searchInput.addEventListener('input', function () { router(); });
  window.addEventListener('hashchange', function () {
    searchInput.value = '';
    router();
  });

  fetch('data.json')
    .then(function (r) { if (!r.ok) throw new Error('data.json tidak ditemukan'); return r.json(); })
    .then(function (data) { DATA = data; router(); })
    .catch(function (err) {
      app.innerHTML = '<p class="empty">Gagal memuat data.json: ' + esc(err.message) + '</p>';
    });
})();
