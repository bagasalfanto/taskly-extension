# Taskly

Taskly adalah browser extension untuk menangkap task, catatan, teks terpilih, dan link langsung dari halaman web. Extension ini menyimpan konteks sumber seperti judul halaman, URL, domain, dan teks pilihan agar task mudah dilacak kembali.

Data Taskly disimpan secara lokal di browser menggunakan `chrome.storage.local`. Tidak ada server yang dibutuhkan untuk menjalankan extension ini.

## Installasi Project

Ikuti langkah ini jika ingin menjalankan Taskly dari source code.

### 1. Requirement

Pastikan sudah tersedia:

- Git.
- Browser berbasis Chromium, disarankan Google Chrome atau Microsoft Edge.

Taskly tidak membutuhkan Node.js, `npm install`, database, atau server lokal.

### 2. Instalasi

Clone project

```bash
git clone https://github.com/bagasalfanto/taskly-extension.git
```

Masuk direktori

```bash
cd taskly-extension
```

Pastikan file `manifest.json` ada di folder utama project. Folder utama yang berisi `manifest.json` inilah yang dipilih saat instalasi extension di browser.

Struktur folder utama:

```text
taskly-extension/
|-- assets/
|   `-- favicon.svg
|-- dashboard/
|   |-- dashboard.html
|   |-- dashboard.css
|   `-- dashboard.js
|-- popup/
|   |-- popup.html
|   |-- popup.css
|   `-- popup.js
|-- scripts/
|   |-- background.js
|   |-- content.js
|   |-- rnotes-store.js
|   |-- rnotes-utils.js
|   `-- file JavaScript pendukung lainnya
|-- manifest.json
`-- README.md
```

### 3. Install di Google Chrome

1. Buka Google Chrome.
2. Ketik `chrome://extensions` di address bar, lalu tekan Enter.
3. Aktifkan `Developer mode` di pojok kanan atas.
4. Klik tombol `Load unpacked`.
5. Pilih folder hasil clone, yaitu folder `taskly-extension` yang berisi file `manifest.json`.
6. Klik `Select Folder`.
7. Pastikan extension `Taskly` muncul di daftar extension.
8. Klik icon puzzle di toolbar Chrome, lalu pin `Taskly` agar mudah dibuka.

### 4. Install di Microsoft Edge

1. Buka Microsoft Edge.
2. Ketik `edge://extensions` di address bar, lalu tekan Enter.
3. Aktifkan `Developer mode`.
4. Klik tombol `Load unpacked`.
5. Pilih folder hasil clone, yaitu folder `taskly-extension` yang berisi file `manifest.json`.
6. Klik `Select Folder`.
7. Pastikan extension `Taskly` muncul di daftar extension.
8. Pin `Taskly` ke toolbar jika ingin akses cepat.

### 5. Coba jalankan Taskly

1. Buka halaman website apa pun, misalnya artikel atau halaman tugas.
2. Klik icon `Taskly` di toolbar browser.
3. Isi atau sesuaikan data task jika diperlukan.
4. Klik tombol simpan.
5. Buka `Dashboard` dari popup Taskly untuk melihat dan mengelola task.

### 6. Jika ada perubahan kode

Setelah mengubah file extension, buka kembali halaman extension browser:

- Chrome: `chrome://extensions`
- Edge: `edge://extensions`

Lalu klik tombol reload pada card `Taskly` agar perubahan terbaru aktif di browser.

## Fitur Utama

- Menyimpan halaman aktif sebagai task.
- Menyimpan teks yang diseleksi melalui klik kanan.
- Menyimpan link melalui klik kanan.
- Mengambil judul halaman yang relevan, misalnya judul video YouTube atau nama kuis di LMS jika tersedia dari halaman.
- Mengelola task dalam status `To Do`, `On Progress`, dan `Done`.
- Mengatur priority, due date, notes, dan tag.
- Membuka kembali sumber task dari URL yang tersimpan.
- Export data ke Markdown, CSV, PDF, dan JSON.

## Alur Pakai Extension

### 1. Menyimpan halaman aktif

1. Buka halaman web yang ingin disimpan.
2. Klik icon Taskly di toolbar browser.
3. Taskly akan membaca judul halaman dan URL aktif.
4. Sesuaikan judul, notes, tag, priority, atau due date jika perlu.
5. Klik tombol simpan.
6. Task baru masuk ke status `To Do`.

### 2. Menyimpan teks dari halaman

1. Blok atau seleksi teks pada halaman web.
2. Klik kanan pada teks yang diseleksi.
3. Pilih `Tambahkan teks ke Taskly`.
4. Taskly menyimpan teks tersebut sebagai konteks task.
5. Task tetap menyimpan URL dan judul halaman asal.

### 3. Menyimpan link

1. Klik kanan pada link di halaman web.
2. Pilih `Tambahkan link ke Taskly`.
3. Taskly menyimpan URL link tersebut.
4. Jika judul link tersedia, judul tersebut dipakai sebagai nama task.

### 4. Mengelola task

1. Klik `Dashboard` dari popup Taskly.
2. Gunakan filter status, priority, domain, atau pencarian.
3. Pilih task untuk melihat detail.
4. Ubah status ke `To Do`, `On Progress`, atau `Done`.
5. Edit notes, tag, priority, due date, dan judul jika diperlukan.
6. Klik source URL untuk membuka kembali halaman asal.

### 5. Export data

1. Buka dashboard Taskly.
2. Klik tombol export yang tersedia:
   - `Export MD` untuk Markdown.
   - `Export CSV` untuk spreadsheet.
   - `Export PDF` untuk laporan rapi yang mudah dibaca.
   - `Export JSON` untuk backup atau kebutuhan teknis.
3. File export akan diunduh dengan nama `taskly-export`.

## Browser yang Didukung

Taskly menggunakan Manifest V3 dan API `chrome.*`, sehingga target utamanya adalah browser berbasis Chromium.

Browser yang bisa digunakan:

- Google Chrome.
- Microsoft Edge.
- Brave.
- Vivaldi.
- Opera.

## License

Project ini menggunakan MIT License. Detail lisensi tersedia di file `LICENSE`.

## Permission yang Digunakan

Taskly meminta beberapa permission di `manifest.json`:

- `storage`: menyimpan data task secara lokal di browser.
- `tabs`: membaca informasi tab aktif seperti URL dan judul.
- `contextMenus`: membuat menu klik kanan untuk menyimpan teks, link, atau halaman.
- `scripting`: membantu mengambil konteks halaman saat content script belum aktif.
- `<all_urls>`: mengizinkan Taskly membaca konteks dari berbagai website yang dibuka user.

## Batasan

- Extension tidak bisa berjalan pada halaman internal browser seperti `chrome://extensions`, `chrome://settings`, atau halaman khusus browser lain.
- Beberapa website dapat membatasi akses content script, sehingga data yang bisa dibaca mungkin lebih terbatas.
- Data tersimpan lokal di browser. Jika data browser dihapus atau extension dihapus, data Taskly juga bisa hilang.
- Setelah mengubah file extension, reload extension dari halaman extension browser agar perubahan aktif.
