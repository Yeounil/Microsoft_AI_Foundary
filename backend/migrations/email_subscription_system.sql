-- ================================================
-- Email Subscription System - Supabase Tables
-- ================================================

-- 1. 이메일 구독 테이블
CREATE TABLE IF NOT EXISTS email_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    symbols TEXT[], -- ['AAPL', 'GOOGL', 'TSLA']
    report_types TEXT[], -- ['news', 'technical', 'comprehensive']
    send_time TIME DEFAULT '09:00:00',
    timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
    is_active BOOLEAN DEFAULT true,
    next_send_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 이메일 발송 이력 테이블
CREATE TABLE IF NOT EXISTS email_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID REFERENCES email_subscriptions(id) ON DELETE CASCADE,
    report_ids INTEGER[],
    recipient_email VARCHAR(255),
    subject TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PDF 생성 이력 테이블 (추가)
CREATE TABLE IF NOT EXISTS pdf_generation_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type VARCHAR(50), -- 'news_report', 'stock_analysis', 'comprehensive'
    symbols TEXT[],
    file_url TEXT,
    file_size_kb INTEGER,
    generation_time_ms INTEGER,
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed')),
    error_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- Indexes for Performance
-- ================================================

-- 구독 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_user_id ON email_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_next_send_at ON email_subscriptions(next_send_at);
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_is_active ON email_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_frequency ON email_subscriptions(frequency);

-- 이메일 이력 인덱스
CREATE INDEX IF NOT EXISTS idx_email_history_subscription_id ON email_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_email_history_status ON email_history(status);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON email_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_history_recipient_email ON email_history(recipient_email);

-- PDF 생성 이력 인덱스
CREATE INDEX IF NOT EXISTS idx_pdf_generation_user_id ON pdf_generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_generation_status ON pdf_generation_history(status);
CREATE INDEX IF NOT EXISTS idx_pdf_generation_created_at ON pdf_generation_history(created_at);

-- ================================================
-- Row Level Security (RLS) Policies
-- ================================================

-- 구독 테이블 RLS 활성화
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 구독만 관리
CREATE POLICY "Users can manage own subscriptions" ON email_subscriptions
    FOR ALL USING (user_id = auth.uid());

-- 이메일 이력 RLS 활성화
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 이메일 이력만 조회
CREATE POLICY "Users can view own email history" ON email_history
    FOR SELECT USING (
        subscription_id IN (
            SELECT id FROM email_subscriptions WHERE user_id = auth.uid()
        )
    );

-- PDF 생성 이력 RLS 활성화
ALTER TABLE pdf_generation_history ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 PDF 생성 이력만 관리
CREATE POLICY "Users can manage own PDF history" ON pdf_generation_history
    FOR ALL USING (user_id = auth.uid());

-- ================================================
-- Functions and Triggers
-- ================================================

-- 구독 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_email_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_subscriptions_updated_at
    BEFORE UPDATE ON email_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_email_subscription_updated_at();

-- ================================================
-- Initial Data / Sample Data (Optional)
-- ================================================

-- 필요시 샘플 데이터 추가
-- INSERT INTO email_subscriptions (user_id, email, frequency, symbols, report_types)
-- VALUES
--     ('sample-user-uuid', 'sample@example.com', 'daily', ARRAY['AAPL', 'GOOGL'], ARRAY['news', 'comprehensive']);

-- ================================================
-- Migration Complete
-- ================================================

COMMENT ON TABLE email_subscriptions IS '이메일 구독 관리 테이블 - 사용자별 보고서 이메일 구독 설정';
COMMENT ON TABLE email_history IS '이메일 발송 이력 테이블 - 모든 이메일 발송 기록 추적';
COMMENT ON TABLE pdf_generation_history IS 'PDF 생성 이력 테이블 - PDF 생성 기록 및 파일 관리';
