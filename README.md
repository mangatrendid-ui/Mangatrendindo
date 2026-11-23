# MANGATRENDINDO

Website baca manga statis untuk GitHub Pages. Bahasa antarmuka: Indonesia.
Gaya: gelap (#0A0E17), aksen oranye #FF7A00, seperti Voratoon.

Semua judul di situs ini adalah **karya fiksi orisinal untuk contoh**.
Jangan mengunggah manga berhak cipta tanpa izin pemiliknya.

## Cara menampilkan di GitHub Pages

1. Repo ini sudah dibuat di GitHub (misalnya `mangatrendid-ui/Mangatrendindo`).
2. Upload semua file di folder ini ke branch `main` repo tersebut.
3. Di GitHub, buka **Settings → Pages**.
4. Pada **Build and deployment → Source**, pilih **Deploy from a branch**,
   lalu pilih branch `main` dan folder `/ (root)`, lalu **Save**.
5. Tunggu 1–2 menit. Situsmu bisa dibuka di:
   `https://mangatrendid-ui.github.io/Mangatrendindo/`

## File

| File | Fungsi |
|---|---|
| `index.html` | Kerangka halaman (header, menu, footer) |
| `style.css` | Semua tampilan: warna gelap, grid 2 kolom di HP, reader |
| `app.js` | Logika situs: beranda, pencarian, filter genre, detail, reader, bookmark, progres baca |
| `data.json` | **SATU-SATUNYA file yang perlu kamu edit** untuk nambah judul/chapter |
| `images/` | Folder untuk gambar cover & halaman chapter milikmu sendiri |

File lain **tidak perlu** diedit.

## Cara nambah judul / chapter — cukup edit `data.json`

Buka `data.json` di GitHub (klik file → ikon pensil), lalu ikuti pola yang sudah ada.

### 1. Nambah judul manga baru

Salin satu blok manga yang sudah ada, tempel di dalam daftar `"manga": [ ... ]`,
lalu ubah isinya:

```json
{
    "id": "judul-baru-ku",
    "judul": "Judul Baru Ku",
    "cover": "images/judul-baru-ku.jpg",
    "sinopsis": "Tulis sinopsis singkat di sini.",
    "genre": ["Action", "Fantasy"],
    "status": "Ongoing",
    "rating": 4.5,
    "views": 0,
    "chapters": [
        {
            "nomor": 1,
            "judul": "Awal Petualangan",
            "tanggal": "2026-11-20",
            "pages": [
                "images/judul-baru-ku-c1-p1.jpg",
                "images/judul-baru-ku-c1-p2.jpg"
            ]
        }
    ]
}
```

Aturan penting:

- `"id"` — huruf kecil, tanpa spasi, tanpa karakter aneh. Contoh: `pedang-langit-senja`.
  Jangan sampai ada dua manga dengan `id` yang sama.
- `"status"` — isi `Ongoing` atau `Completed`.
- `"rating"` — angka 0 sampai 5, pakai titik (contoh: `4.5`, bukan `4,5`).
- `"tanggal"` — format `YYYY-MM-DD`, contoh: `2026-11-20`.
- Perhatikan koma: setiap baris kecuali baris terakhir dalam `{ ... }` atau `[ ... ]`
  harus diakhiri koma. Kalau koma salah, situs tidak tampil — cek lagi tanda kurungnya.

### 2. Nambah chapter baru ke judul yang sudah ada

Cari judul itu di `data.json`, lalu tambahkan satu blok chapter di **awal**
daftar `"chapters"` (chapter terbaru ditulis paling atas):

```json
{
    "nomor": 4,
    "judul": "Judul Chapter Baru",
    "tanggal": "2026-11-21",
    "pages": [
        "images/judul-ku-c4-p1.jpg",
        "images/judul-ku-c4-p2.jpg",
        "images/judul-ku-c4-p3.jpg"
    ]
}
```

`"nomor"` harus berurutan dan tidak boleh sama dengan chapter lain di judul itu.

### 2a. Link download chapter (opsional)

Kalau mau ada tombol Download di sebuah chapter, tambahkan `"download"` di
blok chapter itu, isinya link file ZIP chapter tersebut (misalnya dari
Safefileku):

```json
"download": "https://safefileku.com/download/xxxx"
```

Tombol Download muncul di daftar chapter dan di halaman baca. Chapter tanpa
`"download"` tidak menampilkan tombol.

### 2b. Chapter VIP / terkunci (Trakteer, opsional)

Kalau sebuah chapter hanya tersedia untuk pendukung di Trakteer (akses lebih
awal dan berbayar), tambahkan `"vip": true` dan `"trakteer"` di blok chapter
itu, isinya link reward Trakteer untuk chapter tersebut:

```json
"vip": true,
"trakteer": "https://trakteer.id/krul_teppes/reward/nama-manga-chapter-xxx"
```

Chapter VIP muncul di situs dengan ikon gembok dan label VIP. Kalau diklik,
yang terbuka bukan halaman baca, melainkan halaman kunci dengan tombol
"Dukung di Trakteer" yang mengarah ke link di atas.

Penting: **jangan upload halaman chapter VIP ke repo ini**. Halaman VIP
cukup ada di Trakteer saja — situs ini statis, jadi kalau gambar halamannya
sudah di-upload ke sini, siapa pun bisa menemukannya walau chapter-nya
terkunci. Kalau chapter VIP sudah mau digratiskan, upload halamannya seperti
biasa lalu hapus `"vip"` dan `"trakteer"` dari blok chapter itu.

### 2c. Chapter terjadwal / publish otomatis (opsional)

Kalau gambar chapter sudah di-upload tapi chapter itu belum mau diterbitkan,
isi `"tanggal"` dengan tanggal dan jam terbit yang diinginkan (WIB), format
`YYYY-MM-DDTHH:MM`:

```json
"tanggal": "2026-11-23T10:00"
```

Situs menyembunyikan chapter itu dari semua daftar dan dari halaman baca
sampai waktunya tiba, lalu chapter muncul sendiri secara otomatis — tidak
perlu di-push lagi. Kalau ada yang membuka link chapter itu sebelum waktunya,
yang tampil halaman "Belum terbit" beserta jadwal terbitnya.

Catatan: repo ini publik, jadi siapa pun yang membuka file `data.json` atau
daftar file di repo tetap bisa melihat chapter terjadwal dan nama file
gambarnya. Jadwal ini menyembunyikan chapter dari situs, bukan mengunci
file-nya.

### 2d. Tampilkan chapter di beranda (opsional)

Secara default, beranda hanya menampilkan cover + judul (tanpa daftar
chapter), supaya pengunjung harus klik cover dulu. Kalau sebuah judul mau
menampilkan daftar chapternya langsung di kartu beranda, tambahkan
`"tampilChapter": true` di blok manga itu:

```json
"tampilChapter": true,
```

Kartunya menampilkan maksimal 3 chapter terbaru (1 gratis terbaru + 2 VIP
terbaru). Hapus baris itu kalau judulnya mau kembali cover saja. Tidak ada
tulisan atau label apa pun yang tampil di kartu — penanda ini hanya untuk
mengatur tampilan.

### 3. Upload gambar

1. Di GitHub, buka folder `images/` → **Add file → Upload files**.
2. Upload gambar cover dan halaman chapter ke sana.
3. Di `data.json`, tulis alamatnya persis seperti nama file-nya, contoh:
   `"cover": "images/judul-baru-ku.jpg"`.

Tips gambar:

- Cover: rasio 2:3 (contoh: 400 × 600 px), format JPG.
- Halaman chapter: lebar 800 px, format JPG, dikompres agar ringan.
- Nama file huruf kecil, tanpa spasi (pakai `-`).

Kalau belum punya gambar sendiri, cover dan halaman di `data.json` saat ini
memakai gambar placeholder dari `picsum.photos` — aman dipakai sebagai contoh.

## Fitur

- Beranda: Update Terbaru (diurutkan tanggal chapter terbaru) dan Manga Populer
- Pencarian judul / genre / sinopsis
- Filter genre di halaman Daftar Manga
- Halaman detail manga dengan daftar chapter + waktu update
- Reader vertikal dengan tombol Chapter Sebelumnya / Berikutnya
- Tombol Download per chapter (kalau diisi link download di data.json)
- Chapter terjadwal: isi `tanggal` dengan tanggal dan jam di masa depan,
  chapter tersembunyi sampai waktunya tiba lalu terbit otomatis
- Bookmark (tombol Bookmark di halaman detail, dilihat di menu Koleksiku)
- Progres baca tersimpan otomatis di browser (localStorage) — terakhir dibaca
  dan tanda "Sudah dibaca" di daftar chapter

## Catatan

- Situs ini statis: tidak ada server dan tidak ada database. Semua data
  berasal dari `data.json`.
- Bookmark dan progres baca tersimpan di browser masing-masing pengunjung,
  bukan di server, jadi tidak terlihat oleh pengunjung lain.
- Repo GitHub Pages gratis punya batas sekitar 1 GB — kompres gambar
  sebelum upload.
