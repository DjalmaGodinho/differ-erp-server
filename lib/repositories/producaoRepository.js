import { query, getClient } from '../config/database.js';

const TABLE = 'ordens_producao';

const producaoRepository = {
  async findAll({ page = 1, pageSize = 20, search = null, statusId = null, clienteId = null, maquinaId = null }) {
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (op.codigo ILIKE $${paramIndex} OR op.produto_descricao ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (statusId) {
      whereClause += ` AND op.status_id = $${paramIndex}`;
      params.push(statusId);
      paramIndex++;
    }

    if (clienteId) {
      whereClause += ` AND op.cliente_id = $${paramIndex}`;
      params.push(clienteId);
      paramIndex++;
    }

    if (maquinaId) {
      whereClause += ` AND op.maquina_id = $${paramIndex}`;
      params.push(maquinaId);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM ${TABLE} op ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, pageSize, offset];
    const result = await query(`
      SELECT op.*, c.nome as cliente_nome, c.codigo as cliente_codigo,
             so.nome as status_nome, m.nome as maquina_nome,
             p.numero as pedido_numero
      FROM ${TABLE} op
      LEFT JOIN clientes c ON op.cliente_id = c.id
      LEFT JOIN status_op so ON op.status_id = so.id
      LEFT JOIN maquinas m ON op.maquina_id = m.id
      LEFT JOIN pedidos p ON op.pedido_id = p.id
      ${whereClause}
      ORDER BY op.created_at DESC
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
    const opResult = await query(`
      SELECT op.*, c.nome as cliente_nome, c.codigo as cliente_codigo,
             so.nome as status_nome, m.nome as maquina_nome,
             p.numero as pedido_numero
      FROM ${TABLE} op
      LEFT JOIN clientes c ON op.cliente_id = c.id
      LEFT JOIN status_op so ON op.status_id = so.id
      LEFT JOIN maquinas m ON op.maquina_id = m.id
      LEFT JOIN pedidos p ON op.pedido_id = p.id
      WHERE op.id = $1
    `, [id]);

    if (opResult.rows.length === 0) return null;

    const op = opResult.rows[0];

    const materiaisResult = await query(`
      SELECT om.*, m.descricao as material_descricao, m.codigo as material_codigo,
             um.nome as unidade_nome
      FROM op_materiais om
      LEFT JOIN materiais m ON om.material_id = m.id
      LEFT JOIN unidades_medida um ON om.unidade_id = um.id
      WHERE om.op_id = $1
    `, [id]);

    op.materiais = materiaisResult.rows;
    return op;
  },

  async create(data, materiais = []) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { codigo, pedido_id, cliente_id, produto_descricao, quantidade, maquina_id, operador, status_id = 1, observacoes } = data;
      const data_inicio = data.data_inicio || data.data_inicio_prevista || null;
      const data_fim = data.data_fim || data.data_fim_prevista || null;

      const opResult = await client.query(`
        INSERT INTO ${TABLE} (codigo, pedido_id, cliente_id, produto_descricao, quantidade, data_inicio, data_fim, maquina_id, operador, status_id, observacoes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `, [codigo, pedido_id, cliente_id, produto_descricao, quantidade, data_inicio, data_fim, maquina_id, operador, status_id, observacoes]);

      const op = opResult.rows[0];

      for (const mat of materiais) {
        await client.query(`
          INSERT INTO op_materiais (op_id, material_id, quantidade, unidade_id, quantidade_consumida, baixado, created_at, updated_at)
          VALUES ($1, $2, $3, $4, 0, false, NOW(), NOW())
        `, [op.id, mat.material_id, mat.quantidade, mat.unidade_id]);
      }

      await client.query('COMMIT');
      return op;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id, data, materiais = []) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { pedido_id, cliente_id, produto_descricao, quantidade, data_inicio, data_fim, maquina_id, operador, status_id, observacoes } = data;

      const opResult = await client.query(`
        UPDATE ${TABLE} SET
          pedido_id = $1, cliente_id = $2, produto_descricao = $3, quantidade = $4,
          data_inicio = $5, data_fim = $6, maquina_id = $7, operador = $8, status_id = $9, observacoes = $10, updated_at = NOW()
        WHERE id = $11
        RETURNING *
      `, [pedido_id, cliente_id, produto_descricao, quantidade, data_inicio, data_fim, maquina_id, operador, status_id, observacoes, id]);

      if (opResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      if (materiais.length > 0) {
        await client.query('DELETE FROM op_materiais WHERE op_id = $1', [id]);
        for (const mat of materiais) {
          await client.query(`
            INSERT INTO op_materiais (op_id, material_id, quantidade, unidade_id, quantidade_consumida, baixado, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 0, false, NOW(), NOW())
          `, [id, mat.material_id, mat.quantidade, mat.unidade_id]);
        }
      }

      await client.query('COMMIT');
      return opResult.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async updateStatus(id, statusId) {
    const result = await query(`
      UPDATE ${TABLE} SET status_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *
    `, [statusId, id]);
    return result.rows[0];
  },

  async cancelar(id) {
    const result = await query(`
      UPDATE ${TABLE} SET status_id = 6, updated_at = NOW() WHERE id = $1 RETURNING *
    `, [id]);
    return result.rows[0];
  },

  async generateCodigo() {
    const result = await query(`
      SELECT codigo FROM ${TABLE} WHERE codigo ~ '^OP[0-9]+$' 
      ORDER BY codigo DESC LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return 'OP0001';
    }
    
    const lastCode = result.rows[0].codigo;
    const num = parseInt(lastCode.substring(2)) + 1;
    return `OP${num.toString().padStart(4, '0')}`;
  }
};

export default producaoRepository;
