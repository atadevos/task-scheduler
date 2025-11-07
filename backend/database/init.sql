-- This script runs when MySQL container starts
-- Create initial tables if needed

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_user_id INT,
  assigned_by_id INT,
  status ENUM('in_progress', 'completed') NOT NULL DEFAULT 'in_progress',
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_by_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_dates (assigned_user_id, start_date, end_date),
  INDEX idx_status (status),
  FULLTEXT INDEX ft_title_desc (title, description)
);

-- Initial data (users) are seeded by the NestJS SetupService
-- See backend/config/initial-data.json for configuration