-- Win Room v2.0 - Queue Finance Approval Migration
-- Add finance approval columns to queue table

-- Add finance_status column (waiting, approved, installment, problem)
ALTER TABLE wr.queue
ADD COLUMN IF NOT EXISTS finance_status TEXT NOT NULL DEFAULT 'waiting'
CHECK (finance_status IN ('waiting', 'approved', 'installment', 'problem'));

-- Add finance approval tracking columns
ALTER TABLE wr.queue
ADD COLUMN IF NOT EXISTS finance_approved_by TEXT NULL;

ALTER TABLE wr.queue
ADD COLUMN IF NOT EXISTS finance_approved_at TIMESTAMPTZ NULL;

ALTER TABLE wr.queue
ADD COLUMN IF NOT EXISTS finance_notes TEXT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_queue_finance_status ON wr.queue(finance_status);
CREATE INDEX IF NOT EXISTS idx_queue_finance_approved_by ON wr.queue(finance_approved_by);
CREATE INDEX IF NOT EXISTS idx_queue_finance_approved_at ON wr.queue(finance_approved_at);

-- Add comments for documentation
COMMENT ON COLUMN wr.queue.finance_status IS 'Finance approval status: waiting (default), approved, installment, problem';
COMMENT ON COLUMN wr.queue.finance_approved_by IS 'seller_id of finance user who approved/changed status';
COMMENT ON COLUMN wr.queue.finance_approved_at IS 'Timestamp when finance status was last updated';
COMMENT ON COLUMN wr.queue.finance_notes IS 'Finance notes/comments about the queue item';
