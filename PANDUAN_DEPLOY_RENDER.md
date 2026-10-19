# 🚚 Panduan Lengkap Dashboard Monitoring & Tracking OPF Hino (HMSI -> HMMI/HML)
*Solusi Pengendalian Lead Time &le; 30 Hari &amp; Bukti Foto Serah Terima Fisik Part*

---

## 🎯 Latar Belakang & Solusi
Di sistem garansi Hino, seringkali terjadi part **OPF (Original Part Failure)** yang diambil dari Dealer terlambat dikirim ke Supplier pabrik (**HMMI/HML**) melebihi batas waktu **30 hari**. Akibatnya, klaim investigasi di-**REJECT** oleh supplier dengan alasan ***"OFP Not Return"***.

Website ini dibuat khusus untuk memonitor alur ini secara transparan:
1. **Dealer &rarr; HMSI**: Tim Area mengonfirmasi saat part tiba di transit HMSI + meng-upload foto bukti fisik penerimaan part.
2. **Notifikasi ke Tim Quality**: Tim Quality menerima notifikasi untuk mengecek kondisi fisik part + meng-upload foto verifikasi teknis.
3. **HMSI &rarr; HMMI / HML**: Tim Quality memperbarui data pengiriman (tanggal kirim & no. resi/surat jalan), mengubah status menjadi **Delivered** sebelum batas 30 hari!

---

## 📂 1. Integrasi Excel OneDrive Kantor & Upload Data

Sumber data master sekarang menggunakan file Excel dari sharing folder OneDrive kantor:
1. Klik tombol **"Template Excel"** di kanan atas untuk mengunduh template resmi (.xlsx).
2. Format kolom yang terbaca otomatis:
   - **Nomor DTR**
   - **Part Name**
   - **Quantity**
   - **Model Kendaraan**
   - **No. Chassis (Ch)**
   - **No. Engine (EG)**
   - **Mileage**
   - **Dealer**
   - **Nomor QPI**
   - **Judgement QPI**
   - **Tanggal DTR**
3. Klik tombol hijau **"Upload Excel"** di dashboard untuk meng-upload file dari OneDrive kantor.
4. **Anti-Duplikasi Cerdas:** Jika DTR & Part yang sama di-upload ulang, data master diperbarui tanpa menghapus foto bukti fisik yang sudah diambil oleh Tim Area atau Tim Quality.
5. **Multi-Part dalam 1 DTR:** Jika satu nomor DTR memiliki beberapa jenis sparepart berbeda, sistem akan menyimpannya sebagai baris terpisah secara rapi.

---

## 💻 2. Cara Menjalankan di Komputer / Laptop Kantor (100% Gratis)

Tidak perlu sewa server atau bayar hosting:
1. Download seluruh berkas proyek ini dalam format `.zip`.
2. Ekstrak di laptop atau komputer kantor Anda.
3. Pastikan sudah terpasang Node.js (download gratis di [nodejs.org](https://nodejs.org)).
4. Cukup **klik dua kali file `jalankan.bat`**.
5. Server akan otomatis aktif dan browser Chrome Anda akan langsung membuka `http://localhost:3000`.
6. Data tersimpan di file database lokal SQLite `data/opf_database.sqlite`.

---

## ☁️ 3. Tautan Online Langsung (Google Cloud Run)

Aplikasi ini sudah otomatis online dan aktif di Google Cloud Run:
👉 **[Shared App URL](https://ais-pre-6gsrhdahlfwecnih2vf7og-162095645871.asia-southeast1.run.app)**

Tautan ini bisa dibuka langsung oleh Tim Area di lapangan menggunakan kamera ponsel mereka untuk memotret fisik part saat tiba di gudang transit HMSI!
