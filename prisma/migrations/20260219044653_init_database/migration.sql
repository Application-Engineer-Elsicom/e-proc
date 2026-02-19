-- CreateTable
CREATE TABLE `MaterialRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` VARCHAR(191) NOT NULL,
    `projectName` VARCHAR(191) NULL,
    `itemDescription` VARCHAR(191) NULL,
    `qty` INTEGER NULL,
    `unit` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
