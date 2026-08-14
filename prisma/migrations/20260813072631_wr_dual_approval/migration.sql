-- Warehouse Release: ganti rantai approval WPO/SYSTEM/PM dengan approval ganda
-- independen Warehouse + Procurement (lihat Perancangan Terpadu Bab 6.2).
-- Tabel WarehouseRelease production terkonfirmasi kosong saat migrasi ini
-- dibuat, jadi perubahan tipe kolom `status` (enum lama -> WrStatus) aman.

-- DropForeignKey
ALTER TABLE `WarehouseRelease` DROP FOREIGN KEY `WarehouseRelease_wpoApprovedBy_fkey`;

-- DropForeignKey
ALTER TABLE `WarehouseRelease` DROP FOREIGN KEY `WarehouseRelease_systemApprovedBy_fkey`;

-- DropForeignKey
ALTER TABLE `WarehouseRelease` DROP FOREIGN KEY `WarehouseRelease_pmApprovedBy_fkey`;

-- AlterTable
ALTER TABLE `WarehouseRelease` DROP COLUMN `pmApprovedAt`,
    DROP COLUMN `pmApprovedBy`,
    DROP COLUMN `systemApprovedAt`,
    DROP COLUMN `systemApprovedBy`,
    DROP COLUMN `wpoApprovedAt`,
    DROP COLUMN `wpoApprovedBy`,
    ADD COLUMN `procurementApprovedAt` DATETIME(3) NULL,
    ADD COLUMN `procurementApprovedBy` VARCHAR(191) NULL,
    ADD COLUMN `rejectedReason` VARCHAR(191) NULL,
    ADD COLUMN `rejectedSide` VARCHAR(191) NULL,
    ADD COLUMN `warehouseApprovedAt` DATETIME(3) NULL,
    ADD COLUMN `warehouseApprovedBy` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PENDING_APPROVAL', 'WAREHOUSE_APPROVED', 'PROCUREMENT_APPROVED', 'APPROVED', 'REJECTED', 'SHIPPED') NOT NULL DEFAULT 'PENDING_APPROVAL';

-- AddForeignKey
ALTER TABLE `WarehouseRelease` ADD CONSTRAINT `WarehouseRelease_warehouseApprovedBy_fkey` FOREIGN KEY (`warehouseApprovedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WarehouseRelease` ADD CONSTRAINT `WarehouseRelease_procurementApprovedBy_fkey` FOREIGN KEY (`procurementApprovedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
