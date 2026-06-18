import { query } from '../config/database.js';

const TABLE = 'clientes';

const clienteRepository = {
  async findAll({ page = 1, pageSize = 20, search = null, statusId = null }) {
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (nome ILIKE $${paramIndex} OR codigo ILIKE $${paramIndex} OR documento ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (statusId) {
      whereClause += ` AND status_id = $${paramIndex}`;
      params.push(statusId);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM ${TABLE} ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, pageSize, offset];
    const result = await query(`
      SELECT c.*, sp.nome as status, sp.codigo as status_codigo,
             fp.nome as forma_pagamento_nome, cp.nome as condicao_pagamento_nome
      FROM ${TABLE} c
      LEFT JOIN status_pessoa sp ON c.status_id = sp.id
      LEFT JOIN formas_pagamento fp ON c.forma_pagamento_id = fp.id
      LEFT JOIN condicoes_pagamento cp ON c.condicao_pagamento_id = cp.id
      ${whereClause}
      ORDER BY c.nome
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
      SELECT c.*, sp.nome as status, sp.codigo as status_codigo, tp.nome as tipo_pessoa_nome,
             fp.nome as forma_pagamento_nome, cp.nome as condicao_pagamento_nome
      FROM ${TABLE} c
      LEFT JOIN status_pessoa sp ON c.status_id = sp.id
      LEFT JOIN tipos_pessoa tp ON c.tipo_pessoa_id = tp.codigo
      LEFT JOIN formas_pagamento fp ON c.forma_pagamento_id = fp.id
      LEFT JOIN condicoes_pagamento cp ON c.condicao_pagamento_id = cp.id
      WHERE c.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async findByIdRaw(id) {
    const result = await query(`
      SELECT c.*, sp.nome as status, sp.codigo as status_codigo, tp.nome as tipo_pessoa_nome,
             fp.nome as forma_pagamento_nome, cp.nome as condicao_pagamento_nome
      FROM ${TABLE} c
      LEFT JOIN status_pessoa sp ON c.status_id = sp.id
      LEFT JOIN tipos_pessoa tp ON c.tipo_pessoa_id = tp.codigo
      LEFT JOIN formas_pagamento fp ON c.forma_pagamento_id = fp.id
      LEFT JOIN condicoes_pagamento cp ON c.condicao_pagamento_id = cp.id
      WHERE c.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async findByDocumento(documento, excludeId = null) {
    let sql = `SELECT id FROM ${TABLE} WHERE documento = $1`;
    const params = [documento];
    if (excludeId) {
      sql += ` AND id != $2`;
      params.push(excludeId);
    }
    const result = await query(sql, params);
    return result.rows[0] || null;
  },

  async create(data) {
    const { 
      codigo, nome, tipo_pessoa_id, documento, telefone, celular, email,
      cep, endereco, numero, bairro, cidade, estado, inscricao_estadual,
      observacoes, status_id = 1, forma_pagamento_id = null, condicao_pagamento_id = null
    } = data;

    const result = await query(`
      INSERT INTO ${TABLE} (
        codigo, nome, tipo_pessoa_id, documento, telefone, celular, email,
        cep, endereco, numero, bairro, cidade, estado, inscricao_estadual,
        observacoes, status_id, forma_pagamento_id, condicao_pagamento_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
      RETURNING *
    `, [
      codigo, nome, tipo_pessoa_id, documento, telefone, celular, email,
      cep, endereco, numero, bairro, cidade, estado, inscricao_estadual,
      observacoes, status_id, forma_pagamento_id, condicao_pagamento_id
    ]);

    return result.rows[0];
  },

  async update(id, data) {
    const { 
      nome, tipo_pessoa_id, documento, telefone, celular, email,
      cep, endereco, numero, bairro, cidade, estado, inscricao_estadual,
      observacoes, status_id, forma_pagamento_id = null, condicao_pagamento_id = null
    } = data;

    const result = await query(`
      UPDATE ${TABLE} SET
        nome = $1,
        tipo_pessoa_id = $2,
        documento = $3,
        telefone = $4,
        celular = $5,
        email = $6,
        cep = $7,
        endereco = $8,
        numero = $9,
        bairro = $10,
        cidade = $11,
        estado = $12,
        inscricao_estadual = $13,
        observacoes = $14,
        status_id = $15,
        forma_pagamento_id = $16,
        condicao_pagamento_id = $17,
        updated_at = NOW()
      WHERE id = $18
      RETURNING *
    `, [
      nome, tipo_pessoa_id, documento, telefone, celular, email,
      cep, endereco, numero, bairro, cidade, estado, inscricao_estadual,
      observacoes, status_id, forma_pagamento_id, condicao_pagamento_id, id
    ]);

    return result.rows[0];
  },

  async delete(id) {
    await query(`UPDATE ${TABLE} SET status_id = 2, updated_at = NOW() WHERE id = $1`, [id]);
    return true;
  },

  async generateCodigo() {
    const result = await query(`
      SELECT codigo FROM ${TABLE} WHERE codigo ~ '^CLI[0-9]+$' 
      ORDER BY codigo DESC LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return 'CLI0001';
    }
    
    const lastCode = result.rows[0].codigo;
    const num = parseInt(lastCode.substring(3)) + 1;
    return `CLI${num.toString().padStart(4, '0')}`;
  }
};

export default clienteRepository;
