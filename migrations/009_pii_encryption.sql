-- Migration: Add PII Encryption Support
-- This migration prepares the database for encrypted PII storage
-- Note: Existing data will be encrypted by the application layer

-- Add column to track encryption version (for future migrations)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS pii_version INTEGER DEFAULT 1;

-- Create index for performance (email searches will use application-layer decryption)
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);

-- Add comment explaining security
COMMENT ON TABLE clientes IS 'Client data - email field is encrypted at application layer using AES-256-GCM';

-- Add security audit log table
CREATE TABLE IF NOT EXISTS security_audit (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  user_id INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_audit_event ON security_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_created ON security_audit(created_at DESC);

COMMENT ON TABLE security_audit IS 'Security events logging for compliance and breach detection';
