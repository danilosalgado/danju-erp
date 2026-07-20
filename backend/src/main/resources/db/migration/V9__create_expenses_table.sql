-- =============================================
-- DanJu - Migration V9: Create expenses table
-- For tracking business expenses (rent, utilities, etc.)
-- =============================================

CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    paid BOOLEAN DEFAULT FALSE,
    recurrence VARCHAR(20) DEFAULT 'UNICA',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_due_date ON expenses(due_date);
CREATE INDEX idx_expenses_paid ON expenses(paid);
