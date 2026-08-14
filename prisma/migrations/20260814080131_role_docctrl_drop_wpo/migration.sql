-- Perancangan Terpadu Bab 4: hapus peran WPO berdiri-sendiri (tumpang tindih
-- dengan ENGINEER sub-role WPO) dan tambah peran DOCUMENT_CONTROL (Tahap 4).
-- PENTING: pastikan tidak ada User berperan 'WPO' sebelum migrasi ini di
-- production (kalau ada, pindahkan dulu perannya). Di lokal sudah dipastikan
-- tidak ada.

-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('ENGINEER', 'PROCUREMENT', 'MARKETING', 'PROJECT_MANAGER', 'FINANCE', 'WAREHOUSE', 'DOCUMENT_CONTROL') NOT NULL DEFAULT 'ENGINEER';
