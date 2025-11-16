-- Win Room v2.0 - Add created_by field to queue table
-- IMPORTANT: Review before running!

SET search_path TO wr, public;

-- Add created_by field to queue table
-- This field tracks who manually added the subscription to the queue
-- NULL means it was automatically added by the poller
ALTER TABLE wr.queue
ADD COLUMN IF NOT EXISTS created_by TEXT NULL;

-- Create index on created_by for faster lookups
CREATE INDEX IF NOT EXISTS idx_queue_created_by ON wr.queue(created_by);

-- Add comment to explain the field
COMMENT ON COLUMN wr.queue.created_by IS 'Seller ID who manually added this to queue. NULL = auto-added by poller';
