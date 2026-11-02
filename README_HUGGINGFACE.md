# 🚀 Panduan Pasang di Hugging Face Spaces (100% Gratis & Tanpa Kartu Kredit)

Jika Render.com meminta verifikasi kartu kredit, **Hugging Face Spaces** adalah alternatif terbaik di dunia saat ini:
- ✅ **100% GRATIS SELAMANYA**
- ❌ **TIDAK BUTUH KARTU KREDIT SAMA SEKALI** (Cukup daftar dengan Email)
- 🚀 **RAM 16 GB Gratis** (Jauh lebih besar dibanding Render yang hanya 512 MB)

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
- Di halaman Space baru Anda, klik tab **Files** &rarr; upload file atau hubungkan dengan repository GitHub Anda.

#### 4. Konfigurasi Environment Variables (Supabase)
1. Di halaman Space Anda, klik tab **"Settings"** di kanan atas.
2. Gulir ke bawah ke bagian **"Variables and secrets"**.
3. Tambahkan variables dari Supabase:
   - `VITE_SUPABASE_URL`: URL project Supabase Anda
   - `VITE_SUPABASE_ANON_KEY`: Anon Public Key Supabase
   - `SUPABASE_STORAGE_BUCKET`: `opf-attachments`
4. Selesai! Hugging Face akan otomatis mem-build Docker dan menampilkan website Anda secara langsung di alamat `https://username-hino-opf-monitoring.hf.space`.
