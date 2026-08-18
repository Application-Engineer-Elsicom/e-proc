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
    <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
      {/* SISI KIRI: FORM */}
      <div className="flex w-full flex-col items-center justify-center p-8 lg:p-16 md:w-[45%]">
        <div className="mb-10 flex w-full max-w-md flex-col items-center">
          <div className="relative mb-6 h-20 w-64">
            <Image src="/logo-elsicom.png" alt="Logo" fill className="object-contain" priority />
          </div>
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-semibold leading-tight text-foreground md:text-3xl">
              Elsicom Procurement Systems Management
            </h2>
            <p className="text-sm font-medium tracking-[0.3em] text-muted-foreground">
              E-PROC
            </p>
          </div>
        </div>

        <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
          {error && (
            <div className="mb-5 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Masukkan Username"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Memproses…' : 'Masuk'}
            </button>
          </form>

          {/* Tidak ada tautan daftar mandiri: akun dibuat oleh pihak berwenang. */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Belum punya akun? Hubungi administrator sistem.
          </p>
        </div>
      </div>

      {/* SISI KANAN: GAMBAR */}
      <div className="hidden flex-col bg-muted/30 md:flex md:w-[55%]">
        <div className="relative w-full flex-1">
          <Image src="/illustration-top.jpg" alt="Top" fill className="object-contain p-6" />
        </div>
        <div className="relative w-full flex-1">
          <Image src="/illustration-bottom.jpg" alt="Bottom" fill className="object-contain p-6" />
        </div>
      </div>
    </div>
  );
}