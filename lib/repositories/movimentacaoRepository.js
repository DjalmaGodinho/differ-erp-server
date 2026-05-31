import { query, getClient } from '../config/database.js';

const TABLE = 'movimentacoes_estoque';

const movimentacaoRepository = {
  async findAll({ page = 1, pageSize = 20, materialId = null, tipoId = null, dataInicio = null, dataFim = null }) {
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (materialId) {
      whereClause += ` AND m.material_id = $${paramIndex}`;
      params.push(materialId);
      paramIndex++;
    }

    if (tipoId) {
      whereClause += ` AND m.tipo_id = $${paramIndex}`;
      params.push(tipoId);
      paramIndex++;
    }

    if (dataInicio) {
      whereClause += ` AND m.created_at >= $${paramIndex}`;
      params.push(dataInicio);
      paramIndex++;
    }

    if (dataFim) {
      whereClause += ` AND m.created_at <= $${paramIndex}`;
      params.push(dataFim);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM ${TABLE} m ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, pageSize, offset];
    const result = await query(`
      SELECT m.*, tm.nome as tipo_nome, mat.descricao as material_descricao,
             f.nome as fornecedor_nome, mse.nome as motivo_nome
      FROM ${TABLE} m
      LEFT JOIN tipos_movimentacao tm ON m.tipo_id = tm.id
      LEFT JOIN materiais mat ON m.material_id = mat.id
      LEFT JOIN fornecedores f ON m.fornecedor_id = f.id
      LEFT JOIN motivos_saida_estoque mse ON m.motivo_id = mse.id
      ${whereClause}
      ORDER BY m.created_at DESC
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
      SELECT m.*, tm.nome as tipo_nome, mat.descricao as material_descricao,
             f.nome as fornecedor_nome
      FROM ${TABLE} m
      LEFT JOIN tipos_movimentacao tm ON m.tipo_id = tm.id
      LEFT JOIN materiais mat ON m.material_id = mat.id
      LEFT JOIN fornecedores f ON m.fornecedor_id = f.id
      WHERE m.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async create(data) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { 
        material_id, tipo_id, quantidade, quantidade_anterior, quantidade_nova,
        valor_unitario, fornecedor_id, motivo_id, op_id, nota_fiscal, observacao, usuario
      } = data;

      const movResult = await client.query(`
        INSERT INTO ${TABLE} (
          material_id, tipo_id, quantidade, quantidade_anterior, quantidade_nova,
          valor_unitario, fornecedor_id, motivo_id, op_id, nota_fiscal, observacao, usuario, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *
      `, [
        material_id, tipo_id, quantidade, quantidade_anterior, quantidade_nova,
        valor_unitario, fornecedor_id, motivo_id, op_id, nota_fiscal, observacao, usuario
      ]);

      await client.query(`
        UPDATE materiais SET quantidade = $1, updated_at = NOW() WHERE id = $2
      `, [quantidade_nova, material_id]);

      await client.query('COMMIT');
      return movResult.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};

export default movimentacaoRepository;
