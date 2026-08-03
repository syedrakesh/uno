-- UNO Platform database initialization
CREATE DATABASE IF NOT EXISTS `uno_platform` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON `uno_platform`.* TO 'uno_user'@'%';
FLUSH PRIVILEGES;
