# KasirPro — Aplikasi Kasir & Penjualan

Aplikasi Point of Sale (POS) siap pakai: splash screen, login PIN dengan 3
role (Admin, Kasir, Supervisor), kasir/transaksi, cetak struk, pembayaran
Cash & QRIS dengan hitung otomatis kembalian, dashboard admin dengan grafik,
laporan harian/bulanan/tahunan, manajemen produk/pelanggan/promo/pengguna,
dan halaman pengaturan.

Frontend murni HTML/CSS/JS (tanpa build tool) — tinggal di-hosting di mana
saja: **GitHub Pages**, **Blogger**, atau server statis lain. Backend
opsional menggunakan **Google Apps Script + Google Sheets** sebagai database
gratis agar data (produk, transaksi, pengguna) tersimpan permanen dan bisa
diakses dari banyak perangkat.

```
kasirpro/
├── index.html                 ← aplikasi utama (upload ke GitHub Pages)
├── manifest.json              ← file manifest PWA (agar bisa "Install" seperti app Android)
├── service-worker.js          ← service worker (cache offline)
├── icon-192.png               ← ikon aplikasi 192x192
├── icon-512.png                ← ikon aplikasi 512x512
├── icon-maskable-512.png       ← ikon adaptif Android (maskable)
├── apps-script/
│   └── Code.gs                 ← backend API (tempel ke Google Apps Script)
└── README.md                    ← panduan ini
```

> **Penting:** upload SEMUA file di atas (index.html, manifest.json,
> service-worker.js, dan 3 file ikon) ke root repository GitHub yang sama —
> jangan hanya index.html — agar fitur PWA/Install berfungsi.

---

## 1. Coba dulu secara lokal / cepat

`index.html` bisa langsung dibuka di browser (double click) — sudah berjalan
penuh dengan data contoh (demo) tersimpan di memory browser (reset setiap
refresh). Untuk penyimpanan permanen, sambungkan ke backend Apps Script
(lihat langkah 3).

**PIN demo:**
| Role | PIN |
|---|---|
| Admin | `1234` |
| Kasir | `1111` |
| Supervisor | `2222` |

---

## 2. Hosting Frontend di GitHub Pages

1. Buat repository baru di GitHub, misalnya `kasirpro`.
2. Upload file `index.html` ke root repository (via web UI "Add file →
   Upload files", atau via git):
   ```bash
   git init
   git add index.html
   git commit -m "Initial commit: KasirPro POS app"
   git branch -M main
   git remote add origin https://github.com/USERNAME/kasirpro.git
   git push -u origin main
   ```
3. Di repository: **Settings → Pages → Build and deployment → Source:
   Deploy from a branch → Branch: `main` / folder `/ (root)` → Save**.
4. Tunggu 1–2 menit, aplikasi akan online di:
   `https://USERNAME.github.io/kasirpro/`

---

## 3. Backend Google Apps Script (database Google Sheets)

Backend ini opsional tapi disarankan agar data produk, transaksi, dan
pengguna tersimpan permanen (bukan hanya di memory browser).

1. Buka [sheets.google.com](https://sheets.google.com) → buat spreadsheet
   baru, beri nama misalnya "KasirPro Database".
2. Menu **Extensions → Apps Script**.
3. Hapus kode default di `Code.gs`, lalu salin-tempel seluruh isi file
   `apps-script/Code.gs` dari folder ini.
4. Di dropdown fungsi (atas toolbar), pilih **setupSheets**, lalu klik
   **Run (▶)**. Izinkan akses saat diminta (klik akun Google Anda → Advanced
   → Go to project (unsafe) → Allow — ini normal untuk script milik sendiri).
5. Cek spreadsheet Anda: sheet `Produk`, `Transaksi`, `TransaksiItem`,
   `Pengguna`, `Pelanggan`, `Promo`, `Pengaturan` akan otomatis terbuat
   lengkap dengan data awal.
6. Klik **Deploy → New deployment**:
   - Klik ikon gerigi → pilih tipe **Web app**.
   - Description: `KasirPro API`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy**, lalu **izinkan akses** lagi jika diminta.
7. Salin **URL Web app** yang muncul (formatnya
   `https://script.google.com/macros/s/AKfycb.../exec`).
8. Buka aplikasi KasirPro → menu **Pengaturan → Backup Data** → tempel URL
   tersebut di kolom "URL Web App Apps Script" → Simpan.

> Catatan: setiap kali Anda mengedit ulang `Code.gs`, Anda perlu membuat
> **New deployment** baru (atau "Manage deployments → Edit → New version")
> agar perubahan aktif di URL yang sama.

### Endpoint yang tersedia
| Method | Contoh URL / Body | Fungsi |
|---|---|---|
| GET | `?action=getProducts` | Ambil semua produk |
| GET | `?action=getTransactions` | Ambil semua transaksi + item |
| GET | `?action=getReport&period=harian` | Laporan harian/bulanan/tahunan |
| GET | `?action=getSettings` | Ambil pengaturan toko |
| POST | `{action:'login', role, pin}` | Login PIN |
| POST | `{action:'createTransaction', items, diskon, metode, uangDiterima, kasir}` | Buat transaksi baru (server hitung ulang total, pajak, kembalian, & kurangi stok otomatis) |
| POST | `{action:'addProduct', nama, kategori, harga, stok, icon}` | Tambah produk |
| POST | `{action:'addUser', nama, role, pin}` | Tambah pengguna baru |
| POST | `{action:'changePin', userId, newPin}` | Ganti PIN |
| POST | `{action:'saveSettings', storeName, phone, address, tax}` | Simpan pengaturan toko |

---

## 4. Menampilkan di Blogger (embed)

Karena Blogger tidak bisa meng-host file HTML mandiri secara langsung,
gunakan salah satu cara berikut:

### Cara A — Iframe ke GitHub Pages (disarankan, paling stabil)
1. Selesaikan langkah 2 (hosting di GitHub Pages) terlebih dahulu.
2. Di dashboard Blogger → **Halaman/Postingan baru** → mode **HTML view**.
3. Tempel kode berikut:
   ```html
   <iframe
     src="https://USERNAME.github.io/kasirpro/"
     style="width:100%; height:100vh; border:0; border-radius:12px; overflow:hidden;"
     allow="camera; clipboard-write"
     loading="lazy">
   </iframe>
   ```
4. Publikasikan halaman. Aplikasi KasirPro akan tampil penuh di dalam
   halaman Blogger tersebut.

### Cara B — Tempel langsung sebagai HTML Gadget
1. Buka isi `index.html`, salin **seluruh isinya**.
2. Di Blogger: **Tata Letak (Layout) → Tambah Gadget → HTML/JavaScript**.
3. Tempel seluruh kode HTML ke kotak konten gadget → Simpan.
4. Catatan: beberapa fitur (misalnya shortcut keyboard F2, atau elemen
   `position:fixed` full-screen seperti splash & login) bisa berperilaku
   sedikit berbeda di dalam gadget karena berbagi ruang dengan tema Blogger
   Anda — Cara A (iframe) memberi hasil paling identik dengan desain asli.

---

## 5. PWA — Install seperti aplikasi Android

Aplikasi ini sudah dilengkapi `manifest.json` + `service-worker.js` sehingga:
- Muncul banner **"Pasang KasirPro"** otomatis di bagian bawah layar (mobile)
  yang memungkinkan pengguna menambahkan aplikasi ke layar utama tanpa
  melalui Play Store.
- Setelah dipasang, aplikasi terbuka **full-screen tanpa address bar**,
  persis seperti aplikasi Android native, lengkap dengan ikon sendiri.
- Bisa tetap dibuka meski koneksi internet terputus (app shell di-cache).
- Tampilan sudah responsif dengan **bottom navigation bar** ala aplikasi
  mobile saat dibuka di layar kecil, serta sidebar geser (drawer) dengan
  overlay gelap.

Syarat agar tombol "Install" muncul: aplikasi harus diakses lewat **HTTPS**
(GitHub Pages otomatis HTTPS) — tidak akan muncul jika dibuka langsung dari
file lokal (`file://`).

## 6. Fitur yang tersedia

- **Splash screen** animasi saat aplikasi dibuka.
- **Login PIN 4 digit** dengan 3 role: Admin, Kasir, Supervisor — setiap
  role melihat menu sidebar yang berbeda sesuai wewenangnya.
- **Kasir / POS**: pencarian produk, filter kategori, scan barcode (manual
  input demo), keranjang dengan kontrol qty, diskon (persen/nominal), pajak
  otomatis, dua metode bayar (Cash & QRIS dengan QR code), **hitung kembalian
  otomatis**, cetak struk siap print (ukuran 80mm thermal).
- **Dashboard Admin/Supervisor**: kartu statistik (total penjualan,
  transaksi, produk terjual, pelanggan baru), grafik garis penjualan, grafik
  donat kategori, produk terlaris, transaksi terbaru — filter periode 7
  hari/30 hari/1 tahun.
- **Manajemen Produk**: tambah/hapus produk, kategori, **harga jual & harga
  modal**, stok, dan **upload foto produk** langsung dari galeri/kamera HP
  (foto tampil otomatis menggantikan ikon di kasir & tabel produk).
- **Riwayat Penjualan**: cari & cetak ulang struk transaksi lama.
- **Pelanggan**: data pelanggan & riwayat belanja.
- **Laporan**: harian, bulanan, tahunan — grafik batang (Pendapatan vs HPP),
  tabel rincian, **ringkasan Laba Rugi otomatis** (Pendapatan − HPP = Laba
  Kotor + margin %), dan **Cetak Laporan Penjualan** resmi (kop toko,
  ringkasan, rincian per periode, laba rugi, dan kolom tanda tangan +
  stempel toko) siap print/PDF.
- **Promo**: diskon persen/nominal.
- **Manajemen Pengguna (Admin)**: tambah kasir/admin/supervisor baru & atur
  PIN masing-masing.
- **Pengaturan**: info toko (nama, alamat, telepon), pajak, mode tampilan,
  **upload stempel toko** (otomatis tercetak di struk & laporan), ganti PIN
  sendiri, koneksi ke backend Apps Script.

## 7. Menghubungkan Frontend ke Backend (opsional, untuk developer)

Saat ini `index.html` berjalan dengan data di memory (mode demo/offline).
Untuk menyambungkannya ke Google Sheets secara nyata, ganti fungsi-fungsi
seperti `processPayment()`, `addProduk()`, dll di dalam `<script>` agar
memanggil `fetch(API_URL, {...})` ke endpoint Apps Script pada langkah 3 di
atas, alih-alih langsung memanipulasi array JavaScript lokal. Contoh
pemanggilan:

```js
const API_URL = 'https://script.google.com/macros/s/XXXXX/exec';

async function apiPost(action, payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action, ...payload })
  });
  return res.json();
}

async function apiGet(action, params = '') {
  const res = await fetch(`${API_URL}?action=${action}${params}`);
  return res.json();
}
```

Ini sengaja dipisah agar aplikasi tetap bisa dipakai instan tanpa setup
backend (cocok untuk demo/testing), namun siap diintegrasikan penuh saat
Anda butuh data permanen multi-perangkat.
