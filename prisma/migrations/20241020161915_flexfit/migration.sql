-- CreateTable
CREATE TABLE `authorizationrequests` (
    `request_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `role_id` INTEGER NULL,
    `status_id` INTEGER NULL,
    `request_date` DATE NULL,

    INDEX `role_id`(`role_id`),
    INDEX `status_id`(`status_id`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chatbotqueries` (
    `query_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `question` TEXT NULL,
    `response` TEXT NULL,
    `query_date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`query_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class` (
    `class_id` INTEGER NOT NULL AUTO_INCREMENT,
    `class_name` VARCHAR(50) NULL,
    `class_description` VARCHAR(255) NULL,
    `status_id` INTEGER NULL,
    `class_type` INTEGER NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `fee` DECIMAL(10, 2) NULL,
    `image_url` TEXT NULL,

    INDEX `status_id`(`status_id`),
    PRIMARY KEY (`class_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `membership` (
    `membership_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `membership_type` INTEGER NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `price` DECIMAL(10, 2) NULL,
    `status_id` INTEGER NULL,

    INDEX `status_id`(`status_id`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`membership_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule` (
    `schedule_id` INTEGER NOT NULL AUTO_INCREMENT,
    `class_id` INTEGER NULL,
    `days` VARCHAR(50) NULL,
    `start_hour` TIME(0) NULL,
    `end_hour` TIME(0) NULL,

    INDEX `fk_class_id`(`class_id`),
    PRIMARY KEY (`schedule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(64) NULL,
    `password` VARCHAR(64) NULL,
    `email` VARCHAR(255) NOT NULL,
    `phoneNum` VARCHAR(20) NULL,
    `role_id` INTEGER NULL,
    `status_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `unique_username`(`username`),
    INDEX `role_id`(`role_id`),
    INDEX `status_id`(`status_id`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_class` (
    `user_id` INTEGER NOT NULL,
    `class_id` INTEGER NOT NULL,
    `status_id` INTEGER NULL,

    INDEX `class_id`(`class_id`),
    INDEX `status_id`(`status_id`),
    PRIMARY KEY (`user_id`, `class_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercisepost` (
    `post_id` INTEGER NOT NULL AUTO_INCREMENT,
    `exercise_id` VARCHAR(10) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `body_part` VARCHAR(50) NOT NULL,
    `equipment` VARCHAR(50) NULL,
    `target` VARCHAR(100) NOT NULL,
    `gif_url` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`post_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `instructions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `post_id` INTEGER NULL,
    `step_number` INTEGER NULL,
    `instruction` TEXT NULL,

    INDEX `post_id`(`post_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `secondarymuscles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `post_id` INTEGER NULL,
    `muscle_name` VARCHAR(100) NULL,

    INDEX `post_id`(`post_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
