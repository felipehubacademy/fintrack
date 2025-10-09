-- FinTrack Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  owner TEXT,
  split BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'pluggy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_owner ON expenses(owner);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);

-- Add comments to columns for documentation
COMMENT ON TABLE expenses IS 'Stores all financial transactions from various sources';
COMMENT ON COLUMN expenses.id IS 'Unique identifier for each expense';
COMMENT ON COLUMN expenses.date IS 'Transaction date';
COMMENT ON COLUMN expenses.description IS 'Transaction description from bank';
COMMENT ON COLUMN expenses.amount IS 'Transaction amount (positive for expenses)';
COMMENT ON COLUMN expenses.owner IS 'Who is responsible: Felipe, Letícia, or Compartilhado';
COMMENT ON COLUMN expenses.split IS 'Whether this is a shared expense';
COMMENT ON COLUMN expenses.source IS 'Source of transaction: pluggy, manual, etc';

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to read expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated users to insert expenses" ON expenses;

-- Policy: Allow authenticated users to read all expenses
CREATE POLICY "Allow authenticated users to read expenses"
  ON expenses
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow service role to insert expenses (backend)
CREATE POLICY "Allow service role to insert expenses"
  ON expenses
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow service role to update expenses (backend)
CREATE POLICY "Allow service role to update expenses"
  ON expenses
  FOR UPDATE
  USING (true);

-- Create a view for monthly summaries (optional)
CREATE OR REPLACE VIEW monthly_summary AS
SELECT 
  DATE_TRUNC('month', date) as month,
  owner,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount
FROM expenses
WHERE owner IS NOT NULL
GROUP BY DATE_TRUNC('month', date), owner
ORDER BY month DESC, owner;

-- Grant access to the view
GRANT SELECT ON monthly_summary TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ FinTrack database schema created successfully!';
  RAISE NOTICE 'Tables: expenses';
  RAISE NOTICE 'Views: monthly_summary';
  RAISE NOTICE 'Indexes: 3 indexes created for performance';
END $$;

