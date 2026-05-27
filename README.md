# Taskly

Taskly adalah browser extension untuk menangkap task, catatan, teks terpilih, dan link langsung dari halaman web. Extension ini menyimpan konteks sumber seperti judul halaman, URL, domain, dan teks pilihan agar task mudah dilacak kembali.

Data Taskly disimpan secara lokal di browser menggunakan `chrome.storage.local`. Tidak ada server yang dibutuhkan untuk menjalankan extension ini.

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

## Instalasi di Google Chrome

1. Buka `chrome://extensions`.
2. Aktifkan `Developer mode`.
3. Klik `Load unpacked`.
4. Pilih folder `extension` dari project Taskly.
5. Pastikan extension `Taskly` muncul di daftar extension.
6. Pin icon Taskly ke toolbar jika ingin akses cepat.

## Instalasi di Microsoft Edge

1. Buka `edge://extensions`.
2. Aktifkan `Developer mode`.
3. Klik `Load unpacked`.
4. Pilih folder `extension` dari project Taskly.
5. Pastikan extension `Taskly` muncul di daftar extension.
6. Pin icon Taskly ke toolbar jika ingin akses cepat.

## Browser yang Didukung

Taskly menggunakan Manifest V3 dan API `chrome.*`, sehingga target utamanya adalah browser berbasis Chromium.

Browser yang bisa digunakan:

- Google Chrome.
- Microsoft Edge.
- Brave.
- Vivaldi.
- Opera.

Catatan dukungan:

- Chrome dan Edge adalah target utama yang paling direkomendasikan.
- Brave, Vivaldi, dan Opera umumnya bisa menjalankan extension Chromium melalui fitur `Load unpacked`, tetapi tetap perlu dites pada versi browser masing-masing.
- Firefox belum menjadi target resmi karena implementasi Manifest V3 dan API extension bisa berbeda.
- Safari belum didukung karena sistem extension dan proses packaging-nya berbeda.

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
