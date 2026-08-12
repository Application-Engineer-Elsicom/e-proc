"use client";

import Image from 'next/image';
import { useState } from 'react';
import { signIn } from 'next-auth/react'; // Tambahkan ini

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // Untuk menampilkan pesan error
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Menggunakan NextAuth untuk memverifikasi ke MySQL via Prisma
    const result = await signIn('credentials', {
      username: username,
      password: password,
      redirect: false, // Kita handle redirect manual agar lebih smooth
    });

    if (result?.error) {
      setError('Username atau Password salah!');
      setLoading(false);
      return;
    }

    // Pindah halaman penuh, bukan router.push.
    //
    // Halaman "/" adalah server component yang memanggil redirect() ke dashboard
    // sesuai role. Lewat navigasi klien, router harus mengambil RSC "/" lalu
    // menyusulnya dengan RSC tujuan redirect — dan pengambilan kedua itu batal
    // (net::ERR_ABORTED) karena bertabrakan dengan router.refresh() yang masih
    // berjalan. Hasilnya cangkang kosong: URL tetap "/" dan layar gelap.
    //
    // Navigasi dokumen penuh mengirim cookie sesi yang baru dibuat dan membiarkan
    // server menjawab dengan redirect HTTP biasa, sehingga tidak ada balapan dan
    // tidak perlu menebak-nebak dengan setTimeout.
    //
    // window.location tidak lewat router Next.js, jadi tidak ikut di-prefix
    // basePath secara otomatis seperti <Link>/redirect() — di deploy cPanel
    // (NEXT_PUBLIC_BASE_PATH="/e-proc") ini wajib ditambahkan manual, kalau
    // tidak browser akan lompat ke domain root dan sesi terlihat hilang.
    window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/`;
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      {/* SISI KIRI: FORM */}
      <div className="w-full md:w-[45%] flex flex-col items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md mb-10 flex flex-col items-center">
          <div className="relative w-64 h-20 mb-6">
            <Image src="/logo-elsicom.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 leading-tight">
              Elsicom Procurement Systems Management
            </h2>
            <p className="text-xl md:text-2xl font-extrabold text-gray-700 tracking-[0.2em]">
              E-PROC
            </p>
          </div>
        </div>

        <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-100 shadow-2xl shadow-gray-200/50">
          {/* Pesan Error jika login gagal */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm font-bold rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Username
              </label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-gray-50 text-gray-900 font-medium focus:ring-2 focus:ring-red-600 focus:bg-white focus:border-transparent outline-none transition-all"
                placeholder="Masukkan Username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Password
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-400 bg-gray-50 text-gray-900 font-medium focus:ring-2 focus:ring-red-600 focus:bg-white focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full ${loading ? 'bg-gray-400' : 'bg-[#2d2d2d] hover:bg-black'} text-white py-4 rounded-lg font-bold text-lg transition-all shadow-lg`}
            >
              {loading ? 'Memproses…' : 'Masuk'}
            </button>
          </form>

          {/* Tidak ada tautan daftar mandiri: akun dibuat oleh pihak berwenang. */}
          <p className="text-center mt-6 text-sm text-gray-600">
            Belum punya akun? Hubungi administrator sistem.
          </p>
        </div>
      </div>

      {/* SISI KANAN: GAMBAR */}
      <div className="hidden md:flex w-full md:w-[55%] flex-col bg-white">
        <div className="relative flex-1 w-full">
          <Image src="/illustration-top.jpg" alt="Top" fill className="object-contain p-4" />
        </div>
        <div className="relative flex-1 w-full">
          <Image src="/illustration-bottom.jpg" alt="Bottom" fill className="object-contain p-4" />
        </div>
      </div>
    </div>
  );
}