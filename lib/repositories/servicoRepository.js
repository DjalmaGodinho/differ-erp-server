import { query } from '../config/database.js';

const TABLE = 'servicos';

const servicoRepository = {
  async findAll({ page = 1, pageSize = 20, search = null, categoriaId = null, ativo = true }) {
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (nome ILIKE $${paramIndex} OR codigo ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (categoriaId) {
      whereClause += ` AND categoria_id = $${paramIndex}`;
      params.push(categoriaId);
      paramIndex++;
    }

    if (ativo !== null) {
      whereClause += ` AND ativo = $${paramIndex}`;
      params.push(ativo);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM ${TABLE} ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, pageSize, offset];
    const result = await query(`
      SELECT s.*, cs.nome as categoria_nome, cs.codigo as categoria_codigo,
             um.nome as unidade_nome, um.codigo as unidade_codigo
      FROM ${TABLE} s
      LEFT JOIN categorias_servico cs ON s.categoria_id = cs.id
      LEFT JOIN unidades_medida um ON s.unidade_id = um.id
      ${whereClause}
      ORDER BY s.nome
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
      SELECT s.*, cs.nome as categoria_nome, um.nome as unidade_nome
      FROM ${TABLE} s
      LEFT JOIN categorias_servico cs ON s.categoria_id = cs.id
      LEFT JOIN unidades_medida um ON s.unidade_id = um.id
      WHERE s.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async create(data) {
    const { 
      codigo, nome, descricao, categoria_id, unidade_id, 
      valor_padrao, tempo_estimado_minutos, observacoes, ativo = true
    } = data;

    const result = await query(`
      INSERT INTO ${TABLE} (
        codigo, nome, descricao, categoria_id, unidade_id, 
        valor_padrao, tempo_estimado_minutos, observacoes, ativo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [codigo, nome, descricao, categoria_id, unidade_id, valor_padrao, tempo_estimado_minutos, observacoes, ativo]);

    return result.rows[0];
  },

  async update(id, data) {
    const { 
      nome, descricao, categoria_id, unidade_id, 
      valor_padrao, tempo_estimado_minutos, observacoes, ativo
    } = data;

    const result = await query(`
      UPDATE ${TABLE} SET
        nome = $1,
        descricao = $2,
        categoria_id = $3,
        unidade_id = $4,
        valor_padrao = $5,
        tempo_estimado_minutos = $6,
        observacoes = $7,
        ativo = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [nome, descricao, categoria_id, unidade_id, valor_padrao, tempo_estimado_minutos, observacoes, ativo, id]);

    return result.rows[0];
  },

  async delete(id) {
    await query(`UPDATE ${TABLE} SET ativo = false, updated_at = NOW() WHERE id = $1`, [id]);
    return true;
  },

  async generateCodigo() {
    const result = await query(`
      SELECT codigo FROM ${TABLE} WHERE codigo ~ '^SRV[0-9]+$' 
      ORDER BY codigo DESC LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return 'SRV0001';
    }
    
    const lastCode = result.rows[0].codigo;
    const num = parseInt(lastCode.substring(3)) + 1;
    return `SRV${num.toString().padStart(4, '0')}`;
  }
};

export default servicoRepository;
