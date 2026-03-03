-- ============================================
-- FEEDBACK SYSTEM - DATABASE SCHEMA
-- ============================================
-- Database: PostgreSQL
-- Version: 1.0
-- Date: March 1, 2026
-- ============================================
-- Direct paste into SQL editor (PostgreSQL)
-- ============================================

-- Optional: Drop existing tables (CAUTION: Deletes all data)
DROP TABLE IF EXISTS response_emails CASCADE;
DROP TABLE IF EXISTS form_analytics CASCADE;
DROP TABLE IF EXISTS ai_analysis CASCADE;
DROP TABLE IF EXISTS responses CASCADE;
DROP TABLE IF EXISTS forms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- TABLE 1: USERS
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE 2: FORMS
-- ============================================
CREATE TABLE forms (
    id SERIAL PRIMARY KEY,
    form_id VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    general_details_config JSONB NOT NULL DEFAULT '{"fields": []}',
    sections JSONB NOT NULL DEFAULT '{"scoring": [], "non_scoring": []}',
    settings JSONB DEFAULT '{}',
    allowed_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
    one_response_per_email BOOLEAN DEFAULT false,
    deadline TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    is_anonymous BOOLEAN DEFAULT false,
    total_responses INTEGER DEFAULT 0,
    total_possible_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    closed_at TIMESTAMP
);

-- ============================================
-- TABLE 3: RESPONSES
-- ============================================
CREATE TABLE responses (
    id SERIAL PRIMARY KEY,
    response_id VARCHAR(100) UNIQUE NOT NULL,
    form_id VARCHAR(100) NOT NULL REFERENCES forms(form_id) ON DELETE CASCADE,
    general_details JSONB NOT NULL DEFAULT '{}',
    answers JSONB NOT NULL DEFAULT '{}',
    total_score INTEGER DEFAULT 0,
    section_scores JSONB DEFAULT '{}',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    submission_time_seconds INTEGER
);

-- ============================================
-- TABLE 4: AI_ANALYSIS
-- ============================================
CREATE TABLE ai_analysis (
    id SERIAL PRIMARY KEY,
    form_id VARCHAR(100) NOT NULL REFERENCES forms(form_id) ON DELETE CASCADE,
    question_id VARCHAR(100) NOT NULL,
    filter_criteria JSONB DEFAULT '{}',
    sentiment_summary JSONB DEFAULT '{"positive": 0, "negative": 0, "neutral": 0}',
    themes JSONB DEFAULT '[]',
    key_insights TEXT[],
    top_positive_comments TEXT[],
    top_negative_comments TEXT[],
    suggestions TEXT[],
    total_responses INTEGER DEFAULT 0,
    analyzed_responses INTEGER DEFAULT 0,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analysis_version VARCHAR(50) DEFAULT '1.0'
);

-- ============================================
-- TABLE 5: FORM_ANALYTICS
-- ============================================
CREATE TABLE form_analytics (
    id SERIAL PRIMARY KEY,
    form_id VARCHAR(100) NOT NULL REFERENCES forms(form_id) ON DELETE CASCADE,
    filter_criteria JSONB DEFAULT '{}',
    filter_hash VARCHAR(64),
    response_count INTEGER DEFAULT 0,
    overall_score DECIMAL(5,2) DEFAULT 0,
    overall_percentage DECIMAL(5,2) DEFAULT 0,
    section_scores JSONB DEFAULT '{}',
    question_analysis JSONB DEFAULT '{}',
    score_distribution JSONB DEFAULT '{}',
    response_rate DECIMAL(5,2) DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- ============================================
-- TABLE 6: RESPONSE_EMAILS
-- ============================================
CREATE TABLE response_emails (
    id SERIAL PRIMARY KEY,
    form_id VARCHAR(100) NOT NULL REFERENCES forms(form_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    response_id VARCHAR(100) REFERENCES responses(response_id) ON DELETE CASCADE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(form_id, email)
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
CREATE INDEX idx_forms_created_at ON forms(created_at DESC);
CREATE INDEX idx_forms_deadline ON forms(deadline);

CREATE INDEX idx_responses_form_id ON responses(form_id);
CREATE INDEX idx_responses_submitted_at ON responses(submitted_at DESC);
CREATE INDEX idx_responses_total_score ON responses(total_score);
CREATE INDEX idx_responses_general_details ON responses USING GIN (general_details);
CREATE INDEX idx_responses_answers ON responses USING GIN (answers);
CREATE INDEX idx_responses_section_scores ON responses USING GIN (section_scores);

CREATE INDEX idx_ai_analysis_form_id ON ai_analysis(form_id);
CREATE INDEX idx_ai_analysis_question_id ON ai_analysis(question_id);
CREATE INDEX idx_ai_analysis_analyzed_at ON ai_analysis(analyzed_at DESC);
CREATE INDEX idx_ai_analysis_filter_criteria ON ai_analysis USING GIN (filter_criteria);

CREATE INDEX idx_form_analytics_form_id ON form_analytics(form_id);
CREATE INDEX idx_form_analytics_filter_hash ON form_analytics(filter_hash);
CREATE INDEX idx_form_analytics_calculated_at ON form_analytics(calculated_at DESC);

CREATE INDEX idx_response_emails_form_id ON response_emails(form_id);
CREATE INDEX idx_response_emails_email ON response_emails(email);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION increment_form_response_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE forms
    SET total_responses = total_responses + 1
    WHERE form_id = NEW.form_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_response_count
    AFTER INSERT ON responses
    FOR EACH ROW
    EXECUTE FUNCTION increment_form_response_count();

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
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
