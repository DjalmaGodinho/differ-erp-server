import { query } from '../config/database.js';

const TABLE = 'contas_financeiro';

const financeiroRepository = {
  async findAll({ page = 1, pageSize = 20, search = null, tipoId = null, statusId = null, dataInicio = null, dataFim = null }) {
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (documento ILIKE $${paramIndex} OR pessoa_nome ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (tipoId) {
      whereClause += ` AND tipo_id = $${paramIndex}`;
      params.push(tipoId);
      paramIndex++;
    }

    if (statusId) {
      whereClause += ` AND status_id = $${paramIndex}`;
      params.push(statusId);
      paramIndex++;
    }

    if (dataInicio) {
      whereClause += ` AND data_vencimento >= $${paramIndex}`;
      params.push(dataInicio);
      paramIndex++;
    }

    if (dataFim) {
      whereClause += ` AND data_vencimento <= $${paramIndex}`;
      params.push(dataFim);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM ${TABLE} ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, pageSize, offset];
    const result = await query(`
      SELECT cf.*, tc.nome as tipo_nome, sc.nome as status_nome,
             c.nome as cliente_nome, f.nome as fornecedor_nome,
             tp.nome as tipo_pagamento_nome, fp.nome as forma_pagamento_nome
      FROM ${TABLE} cf
      LEFT JOIN tipos_conta tc ON cf.tipo_id = tc.id
      LEFT JOIN status_conta sc ON cf.status_id = sc.id
      LEFT JOIN clientes c ON cf.cliente_id = c.id
      LEFT JOIN fornecedores f ON cf.fornecedor_id = f.id
      LEFT JOIN tipos_pagamento tp ON cf.tipo_pagamento_id = tp.id
      LEFT JOIN formas_pagamento fp ON cf.forma_pagamento_id = fp.id
      ${whereClause}
      ORDER BY cf.data_vencimento DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, dataParams);

    return {
      items: result.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async findById(id) {
    const result = await query(`
      SELECT cf.*, tc.nome as tipo_nome, sc.nome as status_nome,
             c.nome as cliente_nome, f.nome as fornecedor_nome
      FROM ${TABLE} cf
      LEFT JOIN tipos_conta tc ON cf.tipo_id = tc.id
      LEFT JOIN status_conta sc ON cf.status_id = sc.id
      LEFT JOIN clientes c ON cf.cliente_id = c.id
      LEFT JOIN fornecedores f ON cf.fornecedor_id = f.id
      WHERE cf.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async create(data) {
    const { 
      documento, tipo_id, status_id = 1, cliente_id, fornecedor_id, pessoa_nome,
      data_emissao, data_vencimento, valor, tipo_pagamento_id, forma_pagamento_id,
      condicao_pagamento_id, parcelas, nota_fiscal, observacao
    } = data;

    const result = await query(`
      INSERT INTO ${TABLE} (
        documento, tipo_id, status_id, cliente_id, fornecedor_id, pessoa_nome,
        data_emissao, data_vencimento, valor, tipo_pagamento_id, forma_pagamento_id,
        condicao_pagamento_id, parcelas, nota_fiscal, observacao, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *
    `, [
      documento, tipo_id, status_id, cliente_id, fornecedor_id, pessoa_nome,
      data_emissao, data_vencimento, valor, tipo_pagamento_id, forma_pagamento_id,
      condicao_pagamento_id, parcelas, nota_fiscal, observacao
    ]);

    return result.rows[0];
  },

  async update(id, data) {
    const { 
      documento, tipo_id, status_id, cliente_id, fornecedor_id, pessoa_nome,
      data_emissao, data_vencimento, valor, tipo_pagamento_id, forma_pagamento_id,
      condicao_pagamento_id, parcelas, nota_fiscal, observacao
    } = data;

    const result = await query(`
      UPDATE ${TABLE} SET
        documento = $1, tipo_id = $2, status_id = $3, cliente_id = $4, fornecedor_id = $5, pessoa_nome = $6,
        data_emissao = $7, data_vencimento = $8, valor = $9, tipo_pagamento_id = $10, forma_pagamento_id = $11,
        condicao_pagamento_id = $12, parcelas = $13, nota_fiscal = $14, observacao = $15, updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `, [
      documento, tipo_id, status_id, cliente_id, fornecedor_id, pessoa_nome,
      data_emissao, data_vencimento, valor, tipo_pagamento_id, forma_pagamento_id,
      condicao_pagamento_id, parcelas, nota_fiscal, observacao, id
    ]);

    return result.rows[0];
  },

  async baixar(id, { data_pagamento, valor_pago }) {
    const result = await query(`
      UPDATE ${TABLE} SET
        status_id = 2, data_pagamento = $1, valor_pago = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [data_pagamento, valor_pago, id]);
    return result.rows[0];
  },

  async getResumo() {
    const result = await query(`
      SELECT 
        SUM(CASE WHEN tipo_id = 1 AND status_id != 2 THEN valor ELSE 0 END) as total_pagar_pendente,
        SUM(CASE WHEN tipo_id = 1 AND status_id = 2 THEN valor ELSE 0 END) as total_pagar_pago,
        SUM(CASE WHEN tipo_id = 2 AND status_id != 2 THEN valor ELSE 0 END) as total_receber_pendente,
        SUM(CASE WHEN tipo_id = 2 AND status_id = 2 THEN valor ELSE 0 END) as total_receber_recebido,
        COUNT(CASE WHEN tipo_id = 1 AND status_id != 2 AND data_vencimento < CURRENT_DATE THEN 1 END) as contas_atrasadas_pagar,
        COUNT(CASE WHEN tipo_id = 2 AND status_id != 2 AND data_vencimento < CURRENT_DATE THEN 1 END) as contas_atrasadas_receber
      FROM ${TABLE}
    `);
    return result.rows[0];
  },

  async generateDocumento(tipoId) {
    const prefix = tipoId === 1 ? 'PAG' : 'REC';
    const result = await query(`
      SELECT documento FROM ${TABLE} WHERE documento ~ '^${prefix}[0-9]+$' 
      ORDER BY documento DESC LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return `${prefix}0001`;
    }
    
    const lastDoc = result.rows[0].documento;
    const num = parseInt(lastDoc.substring(3)) + 1;
    return `${prefix}${num.toString().padStart(4, '0')}`;
  }
};

export default financeiroRepository;
