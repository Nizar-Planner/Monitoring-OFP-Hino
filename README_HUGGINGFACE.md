# 🚀 Panduan Pasang di Hugging Face Spaces (100% Gratis & Tanpa Kartu Kredit)

Jika Render.com meminta verifikasi kartu kredit, **Hugging Face Spaces** adalah alternatif terbaik di dunia saat ini:
- ✅ **100% GRATIS SELAMANYA**
- ❌ **TIDAK BUTUH KARTU KREDIT SAMA SEKALI** (Cukup daftar dengan Email)
- 🚀 **RAM 16 GB Gratis** (Jauh lebih besar dibanding Render yang hanya 512 MB, robot penarik data HIS berjalan super kencang!)

---

### Langkah Mudah 5 Menit:

#### 1. Buat Akun Hugging Face (Gratis)
Buka [huggingface.co/join](https://huggingface.co/join) lalu daftar gratis menggunakan email Anda.

#### 2. Buat "Space" Baru
1. Di pojok kanan atas, klik foto profil Anda &rarr; pilih **"New Space"**.
2. Isi data berikut:
   - **Space name**: `hino-opf-monitoring`
   - **License**: `mit` (atau biarkan default)
   - **Select the Space SDK**: Pilih **Docker** &rarr; **Blank**
   - **Space hardware**: Pilih **CPU basic · 2 vCPU · 16 GB RAM · Free** (Rp 0)
   - **Visibility**: Pilih **Private** atau **Public**
3. Klik tombol **"Create Space"**.

#### 3. Masukkan Kode dari GitHub
- Jika kode Anda sudah ada di GitHub: Di halaman Space baru Anda, klik tab **Files** &rarr; Anda bisa upload file atau hubungkan dengan GitHub repo Anda.

#### 4. Masukkan Username & Password HIS
1. Di halaman Space Anda, klik tab **"Settings"** di kanan atas.
2. Gulir ke bawah ke bagian **"Variables and secrets"**.
3. Klik **"New secret"**:
   - Name: `HIS_USER`
   - Value: `tws.tech` (username HIS Anda)
4. Klik **"New secret"** lagi:
   - Name: `HIS_PASSWORD`
   - Value: `password_his_anda`
5. Selesai! Hugging Face akan otomatis mem-build Docker dan menampilkan website Anda secara langsung di alamat `https://username-hino-opf-monitoring.hf.space`.
