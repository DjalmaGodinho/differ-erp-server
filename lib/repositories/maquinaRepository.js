import { query } from '../config/database.js';

const TABLE = 'maquinas';

const maquinaRepository = {
  async findAll({ page = 1, pageSize = 20, search = null, tipoId = null, statusId = null }) {
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (nome ILIKE $${paramIndex} OR codigo ILIKE $${paramIndex})`;
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

    const countResult = await query(`SELECT COUNT(*) FROM ${TABLE} ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, pageSize, offset];
    const result = await query(`
      SELECT m.*, tm.nome as tipo_nome, tm.codigo as tipo_codigo,
             sm.nome as status_nome, sm.codigo as status_codigo
      FROM ${TABLE} m
      LEFT JOIN tipos_maquina tm ON m.tipo_id = tm.id
      LEFT JOIN status_maquina sm ON m.status_id = sm.id
      ${whereClause}
      ORDER BY m.nome
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
      SELECT m.*, tm.nome as tipo_nome, sm.nome as status_nome
      FROM ${TABLE} m
      LEFT JOIN tipos_maquina tm ON m.tipo_id = tm.id
      LEFT JOIN status_maquina sm ON m.status_id = sm.id
      WHERE m.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async create(data) {
    const { 
      codigo, nome, tipo_id, fabricante, modelo, ano_fabricacao,
      patrimonio, local, hores_mes, status_id = 1, 
      ultima_manutencao, proxima_manutencao, observacoes
    } = data;

    const result = await query(`
      INSERT INTO ${TABLE} (
        codigo, nome, tipo_id, fabricante, modelo, ano_fabricacao,
        patrimonio, local, hores_mes, status_id, 
        ultima_manutencao, proxima_manutencao, observacoes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `, [
      codigo, nome, tipo_id, fabricante, modelo, ano_fabricacao,
      patrimonio, local, hores_mes, status_id, 
      ultima_manutencao, proxima_manutencao, observacoes
    ]);

    return result.rows[0];
  },

  async update(id, data) {
    const { 
      nome, tipo_id, fabricante, modelo, ano_fabricacao,
      patrimonio, local, hores_mes, status_id, 
      ultima_manutencao, proxima_manutencao, observacoes
    } = data;

    const result = await query(`
      UPDATE ${TABLE} SET
        nome = $1,
        tipo_id = $2,
        fabricante = $3,
        modelo = $4,
        ano_fabricacao = $5,
        patrimonio = $6,
        local = $7,
        hores_mes = $8,
        status_id = $9,
        ultima_manutencao = $10,
        proxima_manutencao = $11,
        observacoes = $12,
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      nome, tipo_id, fabricante, modelo, ano_fabricacao,
      patrimonio, local, hores_mes, status_id, 
      ultima_manutencao, proxima_manutencao, observacoes, id
    ]);

    return result.rows[0];
  },

  async delete(id) {
    await query(`UPDATE ${TABLE} SET status_id = 2, updated_at = NOW() WHERE id = $1`, [id]);
    return true;
  },

  async generateCodigo() {
    const result = await query(`
      SELECT codigo FROM ${TABLE} WHERE codigo ~ '^MAQ[0-9]+$' 
      ORDER BY codigo DESC LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return 'MAQ0001';
    }
    
    const lastCode = result.rows[0].codigo;
    const num = parseInt(lastCode.substring(3)) + 1;
    return `MAQ${num.toString().padStart(4, '0')}`;
  }
};

export default maquinaRepository;
