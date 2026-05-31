import { query, getClient } from '../config/database.js';

const TABLE = 'pedidos';

const pedidoRepository = {
  async findAll({ page = 1, pageSize = 20, search = null, tipoId = null, statusId = null, prioridadeId = null, clienteId = null }) {
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (p.numero ILIKE $${paramIndex} OR p.observacao ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (tipoId) {
      whereClause += ` AND p.tipo_id = $${paramIndex}`;
      params.push(tipoId);
      paramIndex++;
    }

    if (statusId) {
      whereClause += ` AND p.status_id = $${paramIndex}`;
      params.push(statusId);
      paramIndex++;
    }

    if (prioridadeId) {
      whereClause += ` AND p.prioridade_id = $${paramIndex}`;
      params.push(prioridadeId);
      paramIndex++;
    }

    if (clienteId) {
      whereClause += ` AND p.cliente_id = $${paramIndex}`;
      params.push(clienteId);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM ${TABLE} p ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, pageSize, offset];
    const result = await query(`
      SELECT p.*, c.nome as cliente_nome, tp.nome as tipo_nome, 
             sp.nome as status_nome, pp.nome as prioridade_nome
      FROM ${TABLE} p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN tipos_pedido tp ON p.tipo_id = tp.id
      LEFT JOIN status_pedido sp ON p.status_id = sp.id
      LEFT JOIN prioridades_pedido pp ON p.prioridade_id = pp.id
      ${whereClause}
      ORDER BY p.created_at DESC
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
    const pedidoResult = await query(`
      SELECT p.*, c.nome as cliente_nome, c.codigo as cliente_codigo,
             tp.nome as tipo_nome, sp.nome as status_nome, pp.nome as prioridade_nome
      FROM ${TABLE} p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN tipos_pedido tp ON p.tipo_id = tp.id
      LEFT JOIN status_pedido sp ON p.status_id = sp.id
      LEFT JOIN prioridades_pedido pp ON p.prioridade_id = pp.id
      WHERE p.id = $1
    `, [id]);

    if (pedidoResult.rows.length === 0) return null;

    const pedido = pedidoResult.rows[0];

    const materiaisResult = await query(`
      SELECT pm.*, m.descricao as material_descricao, m.codigo as material_codigo,
             um.nome as unidade_nome, um.codigo as unidade_codigo
      FROM pedido_materiais pm
      LEFT JOIN materiais m ON pm.material_id = m.id
      LEFT JOIN unidades_medida um ON pm.unidade_id = um.id
      WHERE pm.pedido_id = $1
    `, [id]);

    const servicosResult = await query(`
      SELECT ps.*, s.nome as servico_nome, s.codigo as servico_codigo,
             um.nome as unidade_nome, um.codigo as unidade_codigo
      FROM pedido_servicos ps
      LEFT JOIN servicos s ON ps.servico_id = s.id
      LEFT JOIN unidades_medida um ON ps.unidade_id = um.id
      WHERE ps.pedido_id = $1
    `, [id]);

    pedido.materiais = materiaisResult.rows;
    pedido.servicos = servicosResult.rows;

    return pedido;
  },

  async create(data, materiais = [], servicos = []) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { numero, cliente_id, tipo_id, status_id = 1, prioridade_id = 3, data_emissao, data_entrega, observacao, valor_total = 0 } = data;

      const pedidoResult = await client.query(`
        INSERT INTO ${TABLE} (numero, cliente_id, tipo_id, status_id, prioridade_id, data_emissao, data_entrega, observacao, valor_total, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `, [numero, cliente_id, tipo_id, status_id, prioridade_id, data_emissao, data_entrega, observacao, valor_total]);

      const pedido = pedidoResult.rows[0];

      for (const mat of materiais) {
        await client.query(`
          INSERT INTO pedido_materiais (pedido_id, material_id, quantidade, unidade_id, valor_unitario, valor_total, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [pedido.id, mat.material_id, mat.quantidade, mat.unidade_id, mat.valor_unitario, mat.valor_total]);
      }

      for (const srv of servicos) {
        await client.query(`
          INSERT INTO pedido_servicos (pedido_id, servico_id, quantidade, unidade_id, valor_unitario, valor_total, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [pedido.id, srv.servico_id, srv.quantidade, srv.unidade_id, srv.valor_unitario, srv.valor_total]);
      }

      await client.query('COMMIT');
      return pedido;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id, data, materiais = [], servicos = []) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { cliente_id, tipo_id, status_id, prioridade_id, data_emissao, data_entrega, observacao, valor_total } = data;

      const pedidoResult = await client.query(`
        UPDATE ${TABLE} SET
          cliente_id = $1, tipo_id = $2, status_id = $3, prioridade_id = $4,
          data_emissao = $5, data_entrega = $6, observacao = $7, valor_total = $8, updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `, [cliente_id, tipo_id, status_id, prioridade_id, data_emissao, data_entrega, observacao, valor_total, id]);

      if (pedidoResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      if (materiais.length > 0) {
        await client.query('DELETE FROM pedido_materiais WHERE pedido_id = $1', [id]);
        for (const mat of materiais) {
          await client.query(`
            INSERT INTO pedido_materiais (pedido_id, material_id, quantidade, unidade_id, valor_unitario, valor_total, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
          `, [id, mat.material_id, mat.quantidade, mat.unidade_id, mat.valor_unitario, mat.valor_total]);
        }
      }

      if (servicos.length > 0) {
        await client.query('DELETE FROM pedido_servicos WHERE pedido_id = $1', [id]);
        for (const srv of servicos) {
          await client.query(`
            INSERT INTO pedido_servicos (pedido_id, servico_id, quantidade, unidade_id, valor_unitario, valor_total, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
          `, [id, srv.servico_id, srv.quantidade, srv.unidade_id, srv.valor_unitario, srv.valor_total]);
        }
      }

      await client.query('COMMIT');
      return pedidoResult.rows[0];
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

  async generateNumero() {
    const result = await query(`
      SELECT numero FROM ${TABLE} WHERE numero ~ '^PED[0-9]+$' 
      ORDER BY numero DESC LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return 'PED0001';
    }
    
    const lastNum = result.rows[0].numero;
    const num = parseInt(lastNum.substring(3)) + 1;
    return `PED${num.toString().padStart(4, '0')}`;
  }
};

export default pedidoRepository;
