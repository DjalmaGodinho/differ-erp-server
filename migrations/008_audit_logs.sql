-- Tabela de log de auditoria
-- Registra todas as alterações (INSERT, UPDATE, DELETE) feitas por usuários no sistema
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID,
    usuario_email VARCHAR(255) NOT NULL,
    usuario_nome VARCHAR(255) NOT NULL,
    modulo VARCHAR(100) NOT NULL,
    acao VARCHAR(50) NOT NULL,        -- INSERT, UPDATE, DELETE, STATUS_UPDATE, CANCELAR, EFETIVAR, BAIXAR
    entidade_id TEXT,                  -- UUID ou ID numérico do registro afetado
    descricao TEXT,                    -- Descrição legível da operação
    dados_extras JSONB,                -- Dados adicionais (ex: campos alterados)
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario_id ON audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_modulo ON audit_logs(modulo);
CREATE INDEX IF NOT EXISTS idx_audit_logs_acao ON audit_logs(acao);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
