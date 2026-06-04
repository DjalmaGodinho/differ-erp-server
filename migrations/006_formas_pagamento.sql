-- Criar tabela de formas de pagamento
CREATE TABLE IF NOT EXISTS formas_pagamento (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir formas de pagamento padrão
INSERT INTO formas_pagamento (codigo, nome, descricao) VALUES
    ('DIN', 'Dinheiro', 'Pagamento em espécie'),
    ('PIX', 'PIX', 'Pagamento via PIX'),
    ('CC', 'Cartão de Crédito', 'Pagamento com cartão de crédito'),
    ('CD', 'Cartão de Débito', 'Pagamento com cartão de débito'),
    ('BOLETO', 'Boleto Bancário', 'Pagamento via boleto bancário'),
    ('TRANSF', 'Transferência', 'Transferência bancária/depósito'),
    ('CHEQUE', 'Cheque', 'Pagamento via cheque'),
    ('CRED', 'Crédito Cliente', 'Utilização de crédito do cliente')
ON CONFLICT (codigo) DO NOTHING;

-- Criar tabela de condições de pagamento
CREATE TABLE IF NOT EXISTS condicoes_pagamento (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    parcelas INTEGER DEFAULT 1,
    dias_entre_parcelas INTEGER DEFAULT 0,
    entrada_percentual DECIMAL(5,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir condições de pagamento padrão
INSERT INTO condicoes_pagamento (codigo, nome, parcelas, dias_entre_parcelas, entrada_percentual) VALUES
    ('AV', 'À Vista', 1, 0, 0),
    ('30', '30 Dias', 1, 30, 0),
    ('30-60', '30/60 Dias', 2, 30, 0),
    ('30-60-90', '30/60/90 Dias', 3, 30, 0),
    ('ENT30', 'Entrada + 30', 2, 30, 50),
    ('ENT30-60', 'Entrada + 30/60', 3, 30, 33.33),
    ('7', '7 Dias', 1, 7, 0),
    ('15', '15 Dias', 1, 15, 0),
    ('60', '60 Dias', 1, 60, 0),
    ('90', '90 Dias', 1, 90, 0)
ON CONFLICT (codigo) DO NOTHING;

-- Adicionar campos de pagamento aos clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS forma_pagamento_id INTEGER REFERENCES formas_pagamento(id);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS condicao_pagamento_id INTEGER REFERENCES condicoes_pagamento(id);

-- Adicionar campos de pagamento aos fornecedores
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS forma_pagamento_id INTEGER REFERENCES formas_pagamento(id);
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS condicao_pagamento_id INTEGER REFERENCES condicoes_pagamento(id);

-- Criar tabela de contas a receber
CREATE TABLE IF NOT EXISTS contas_receber (
    id SERIAL PRIMARY KEY,
    pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    numero_documento VARCHAR(20),
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    valor_original DECIMAL(15,4) NOT NULL,
    valor_pago DECIMAL(15,4) DEFAULT 0,
    saldo DECIMAL(15,4) NOT NULL,
    parcela INTEGER DEFAULT 1,
    total_parcelas INTEGER DEFAULT 1,
    forma_pagamento_id INTEGER REFERENCES formas_pagamento(id),
    status VARCHAR(20) DEFAULT 'Pendente', -- Pendente, Pago, Cancelado, Vencido
    observacao TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contas_receber_pedido ON contas_receber(pedido_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_cliente ON contas_receber(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status ON contas_receber(status);
CREATE INDEX IF NOT EXISTS idx_contas_receber_vencimento ON contas_receber(data_vencimento);
