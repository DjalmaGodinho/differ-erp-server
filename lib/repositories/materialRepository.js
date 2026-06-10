import { query } from '../config/database.js';

const TABLE = 'materiais';

const materialRepository = {
  async findAll({ page = 1, pageSize = 20, search = null, tipoId = null, statusId = null, tipoNome = null, statusNome = null, ativo = true }) {
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE m.ativo = true';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (m.descricao ILIKE $${paramIndex} OR m.codigo ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (tipoId) {
      whereClause += ` AND m.tipo_id = $${paramIndex}`;
      params.push(tipoId);
      paramIndex++;
    }

    if (tipoNome) {
      whereClause += ` AND tm.nome = $${paramIndex}`;
      params.push(tipoNome);
      paramIndex++;
    }

    if (statusId) {
      whereClause += ` AND m.status_id = $${paramIndex}`;
      params.push(statusId);
      paramIndex++;
    }

    if (statusNome) {
      whereClause += ` AND sm.nome = $${paramIndex}`;
      params.push(statusNome);
      paramIndex++;
    }


    const fromClause = `
      FROM ${TABLE} m
      LEFT JOIN tipos_material tm ON m.tipo_id = tm.id
      LEFT JOIN status_material sm ON m.status_id = sm.id
      LEFT JOIN unidades_medida um ON m.unidade_id = um.id
      LEFT JOIN fornecedores f ON m.fornecedor_padrao_id = f.id
    `;

    const countResult = await query(`SELECT COUNT(DISTINCT m.id) ${fromClause} ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, pageSize, offset];
    const result = await query(`
      SELECT m.*, tm.nome as tipo_nome, tm.codigo as tipo_codigo, 
             sm.nome as status_nome, um.nome as unidade_nome, um.codigo as unidade_codigo,
             f.nome as fornecedor_nome
      ${fromClause}
      ${whereClause}
      ORDER BY m.descricao
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
      SELECT m.*, tm.nome as tipo_nome, sm.nome as status_nome, 
             um.nome as unidade_nome, f.nome as fornecedor_nome
      FROM ${TABLE} m
      LEFT JOIN tipos_material tm ON m.tipo_id = tm.id
      LEFT JOIN status_material sm ON m.status_id = sm.id
      LEFT JOIN unidades_medida um ON m.unidade_id = um.id
      LEFT JOIN fornecedores f ON m.fornecedor_padrao_id = f.id
      WHERE m.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async findLowStock() {
    const result = await query(`
      SELECT m.*, tm.nome as tipo_nome, sm.nome as status_nome, 
             um.nome as unidade_nome
      FROM ${TABLE} m
      LEFT JOIN tipos_material tm ON m.tipo_id = tm.id
      LEFT JOIN status_material sm ON m.status_id = sm.id
      LEFT JOIN unidades_medida um ON m.unidade_id = um.id
      WHERE m.ativo = true AND m.minimo IS NOT NULL 
        AND (m.quantidade - m.quantidade_reservada) < m.minimo
      ORDER BY m.descricao
    `);
    return result.rows;
  },

  async create(data) {
    const { 
      codigo, descricao, tipo_id, unidade_id, quantidade = 0, quantidade_reservada = 0,
      minimo, local, status_id = 1, valor_unitario, ncm, 
      fornecedor_padrao_id, observacoes, ativo = true
    } = data;

    const result = await query(`
      INSERT INTO ${TABLE} (
        codigo, descricao, tipo_id, unidade_id, quantidade, quantidade_reservada,
        minimo, local, status_id, valor_unitario, ncm, 
        fornecedor_padrao_id, observacoes, ativo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *
    `, [
      codigo, descricao, tipo_id, unidade_id, quantidade, quantidade_reservada,
      minimo, local, status_id, valor_unitario, ncm, 
      fornecedor_padrao_id, observacoes, ativo
    ]);

    return result.rows[0];
  },

  async update(id, data) {
    const { 
      descricao, tipo_id, unidade_id, minimo, local, 
      status_id, valor_unitario, ncm, fornecedor_padrao_id, observacoes, ativo
    } = data;

    const result = await query(`
      UPDATE ${TABLE} SET
        descricao = $1,
        tipo_id = $2,
        unidade_id = $3,
        minimo = $4,
        local = $5,
        status_id = $6,
        valor_unitario = $7,
        ncm = $8,
        fornecedor_padrao_id = $9,
        observacoes = $10,
        ativo = $11,
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      descricao, tipo_id, unidade_id, minimo, local,
      status_id, valor_unitario, ncm, fornecedor_padrao_id, observacoes, ativo, id
    ]);

    return result.rows[0];
  },

  async updateQuantidade(id, quantidade, quantidadeReservada) {
    const result = await query(`
      UPDATE ${TABLE} SET
        quantidade = $1,
        quantidade_reservada = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [quantidade, quantidadeReservada, id]);
    return result.rows[0];
  },

  async delete(id) {
    await query(`UPDATE ${TABLE} SET ativo = false, updated_at = NOW() WHERE id = $1`, [id]);
    return true;
  },

  async generateCodigo() {
    const result = await query(`
      SELECT codigo FROM ${TABLE} WHERE codigo ~ '^MAT[0-9]+$' 
      ORDER BY codigo DESC LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return 'MAT0001';
    }
    
    const lastCode = result.rows[0].codigo;
    const num = parseInt(lastCode.substring(3)) + 1;
    return `MAT${num.toString().padStart(4, '0')}`;
  }
};

export default materialRepository;
