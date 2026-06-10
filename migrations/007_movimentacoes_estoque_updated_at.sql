-- Migration: Adicionar coluna updated_at na tabela movimentacoes_estoque
-- Data: 2026-06-09

-- Adicionar coluna updated_at
ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Atualizar registros existentes com o valor de created_at
UPDATE movimentacoes_estoque SET updated_at = created_at WHERE updated_at IS NULL;

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger na tabela movimentacoes_estoque (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_movimentacoes_estoque_updated_at'
    ) THEN
        CREATE TRIGGER update_movimentacoes_estoque_updated_at
            BEFORE UPDATE ON movimentacoes_estoque
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;
