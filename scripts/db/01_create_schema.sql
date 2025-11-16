-- Win Room v2.0 - Schema Creation
-- IMPORTANT: This creates the wr schema - DO NOT run without review!
-- Core schema remains untouched (read-only)

-- Create wr schema if not exists
CREATE SCHEMA IF NOT EXISTS wr;

-- Set search path for this session
SET search_path TO wr, public;
