-- ============================================
-- FEEDBACK SYSTEM - DATABASE SCHEMA (MySQL)
-- ============================================
-- Database: MySQL 5.7+
-- Version: 1.0
-- Date: March 1, 2026
-- ============================================
-- Direct paste into SQL editor (MySQL)
-- ============================================

-- Optional: Drop existing tables (CAUTION: Deletes all data)
DROP TABLE IF EXISTS response_emails;
DROP TABLE IF EXISTS form_analytics;
DROP TABLE IF EXISTS ai_analysis;
DROP TABLE IF EXISTS responses;
DROP TABLE IF EXISTS forms;
DROP TABLE IF EXISTS users;

-- ============================================
-- TABLE 1: USERS
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (role IN ('admin', 'super_admin'))
);

-- ============================================
-- TABLE 2: FORMS
-- ============================================
CREATE TABLE forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_id VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    general_details_config JSON NOT NULL,
    sections JSON NOT NULL,
    settings JSON,
    allowed_domains JSON,
    one_response_per_email BOOLEAN DEFAULT false,
    deadline TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT true,
    is_anonymous BOOLEAN DEFAULT false,
    total_responses INT DEFAULT 0,
    total_possible_score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- TABLE 3: RESPONSES
-- ============================================
CREATE TABLE responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    response_id VARCHAR(100) UNIQUE NOT NULL,
    form_id VARCHAR(100) NOT NULL,
    general_details JSON NOT NULL,
    answers JSON NOT NULL,
    total_score INT DEFAULT 0,
    section_scores JSON,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    submission_time_seconds INT,
    FOREIGN KEY (form_id) REFERENCES forms(form_id) ON DELETE CASCADE
);

-- ============================================
-- TABLE 4: AI_ANALYSIS
-- ============================================
CREATE TABLE ai_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_id VARCHAR(100) NOT NULL,
    question_id VARCHAR(100) NOT NULL,
    filter_criteria JSON,
    sentiment_summary JSON,
    themes JSON,
    key_insights JSON,
    top_positive_comments JSON,
    top_negative_comments JSON,
    suggestions JSON,
    total_responses INT DEFAULT 0,
    analyzed_responses INT DEFAULT 0,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analysis_version VARCHAR(50) DEFAULT '1.0',
    FOREIGN KEY (form_id) REFERENCES forms(form_id) ON DELETE CASCADE
);

-- ============================================
-- TABLE 5: FORM_ANALYTICS
-- ============================================
CREATE TABLE form_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_id VARCHAR(100) NOT NULL,
    filter_criteria JSON,
    filter_hash VARCHAR(64),
    response_count INT DEFAULT 0,
    overall_score DECIMAL(5,2) DEFAULT 0,
    overall_percentage DECIMAL(5,2) DEFAULT 0,
    section_scores JSON,
    question_analysis JSON,
    score_distribution JSON,
    response_rate DECIMAL(5,2) DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (form_id) REFERENCES forms(form_id) ON DELETE CASCADE,
    UNIQUE KEY unique_form_filter (form_id, filter_hash)
);

-- ============================================
-- TABLE 6: RESPONSE_EMAILS
-- ============================================
CREATE TABLE response_emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    form_id VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    response_id VARCHAR(100),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES forms(form_id) ON DELETE CASCADE,
    FOREIGN KEY (response_id) REFERENCES responses(response_id) ON DELETE CASCADE,
    UNIQUE KEY unique_form_email (form_id, email)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_forms_form_id ON forms(form_id);
CREATE INDEX idx_forms_created_by ON forms(created_by);
CREATE INDEX idx_forms_is_active ON forms(is_active);
CREATE INDEX idx_forms_created_at ON forms(created_at);
CREATE INDEX idx_forms_deadline ON forms(deadline);

CREATE INDEX idx_responses_form_id ON responses(form_id);
CREATE INDEX idx_responses_submitted_at ON responses(submitted_at);
CREATE INDEX idx_responses_total_score ON responses(total_score);

CREATE INDEX idx_ai_analysis_form_id ON ai_analysis(form_id);
CREATE INDEX idx_ai_analysis_question_id ON ai_analysis(question_id);
CREATE INDEX idx_ai_analysis_analyzed_at ON ai_analysis(analyzed_at);

CREATE INDEX idx_form_analytics_form_id ON form_analytics(form_id);
CREATE INDEX idx_form_analytics_filter_hash ON form_analytics(filter_hash);
CREATE INDEX idx_form_analytics_calculated_at ON form_analytics(calculated_at);

CREATE INDEX idx_response_emails_form_id ON response_emails(form_id);
CREATE INDEX idx_response_emails_email ON response_emails(email);

-- ============================================
-- INSERT DEFAULT ADMIN USER
-- ============================================
INSERT INTO users (email, password_hash, name, role, is_active)
VALUES (
    'admin@klu.ac.in',
    '$2a$10$rXK3Xg8h5j6EZqVXKp8kQeYGZMWZ7YHvL0P8xMTL5Kj3vP9xJK6qa',
    'System Administrator',
    'super_admin',
    true
);

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT 'Database schema created successfully!' as status;
SHOW TABLES;
