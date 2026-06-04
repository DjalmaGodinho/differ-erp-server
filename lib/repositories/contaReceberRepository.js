import { query, getClient } from '../config/database.js';

export const contaReceberRepository = {
  async findAll({ page = 1, pageSize = 20, clienteId, status, dataInicio, dataFim }) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (clienteId) {
      whereClause += ` AND cr.cliente_id = $${paramIndex++}`;
      params.push(clienteId);
    }

    if (status) {
      whereClause += ` AND cr.status = $${paramIndex++}`;
      params.push(status);
    }

    if (dataInicio) {
      whereClause += ` AND cr.data_vencimento >= $${paramIndex++}`;
      params.push(dataInicio);
    }

    if (dataFim) {
      whereClause += ` AND cr.data_vencimento <= $${paramIndex++}`;
      params.push(dataFim);
    }

    const countResult = await query(`SELECT COUNT(*) FROM contas_receber cr ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

    const result = await query(
      `SELECT cr.*, 
              c.nome as cliente_nome, 
              c.codigo as cliente_codigo,
              p.numero as pedido_numero,
              fp.nome as forma_pagamento_nome
       FROM contas_receber cr
       LEFT JOIN clientes c ON cr.cliente_id = c.id
       LEFT JOIN pedidos p ON cr.pedido_id = p.id
       LEFT JOIN formas_pagamento fp ON cr.forma_pagamento_id = fp.id
       ${whereClause}
       ORDER BY cr.data_vencimento, cr.id
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    return {
      items: result.rows,
      total,
      page,
      pageSize
    };
  },

  async findById(id) {
    const result = await query(
      `SELECT cr.*, 
              c.nome as cliente_nome, 
              c.codigo as cliente_codigo,
              p.numero as pedido_numero,
              fp.nome as forma_pagamento_nome
       FROM contas_receber cr
       LEFT JOIN clientes c ON cr.cliente_id = c.id
       LEFT JOIN pedidos p ON cr.pedido_id = p.id
       LEFT JOIN formas_pagamento fp ON cr.forma_pagamento_id = fp.id
       WHERE cr.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findByPedido(pedidoId) {
    const result = await query(
      `SELECT cr.*, fp.nome as forma_pagamento_nome
       FROM contas_receber cr
       LEFT JOIN formas_pagamento fp ON cr.forma_pagamento_id = fp.id
       WHERE cr.pedido_id = $1
       ORDER BY cr.parcela`,
      [pedidoId]
    );
    return result.rows;
  },

  async create(data) {
    const {
      pedido_id,
      cliente_id,
      numero_documento,
      data_emissao,
      data_vencimento,
      valor_original,
      parcela,
      total_parcelas,
      forma_pagamento_id,
      observacao
    } = data;

    const result = await query(
      `INSERT INTO contas_receber 
       (pedido_id, cliente_id, numero_documento, data_emissao, data_vencimento, 
        valor_original, saldo, parcela, total_parcelas, forma_pagamento_id, observacao)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10) RETURNING *`,
      [pedido_id, cliente_id, numero_documento, data_emissao, data_vencimento,
       valor_original, parcela, total_parcelas, forma_pagamento_id, observacao]
    );
    return result.rows[0];
  },


  async createMany(contas) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const created = [];
      
      for (const conta of contas) {
        const result = await client.query(
          `INSERT INTO contas_receber 
           (pedido_id, cliente_id, numero_documento, data_emissao, data_vencimento, 
            valor_original, saldo, parcela, total_parcelas, forma_pagamento_id, observacao)
           VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10) RETURNING *`,
          [conta.pedido_id, String(conta.cliente_id), conta.numero_documento, conta.data_emissao, conta.data_vencimento,
           conta.valor_original, conta.parcela, conta.total_parcelas, conta.forma_pagamento_id, conta.observacao]
        );
        created.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      return created;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async update(id, data) {
    const { data_pagamento, valor_pago, status, observacao } = data;
    
    const conta = await this.findById(id);
    const novoSaldo = conta.valor_original - (valor_pago || conta.valor_pago || 0);
    
    const result = await query(
      `UPDATE contas_receber 
       SET data_pagamento = $1, valor_pago = $2, saldo = $3, status = $4, 
           observacao = $5, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [data_pagamento, valor_pago, novoSaldo, status, observacao, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await query('DELETE FROM contas_receber WHERE id = $1', [id]);
    return true;
  },

  async deleteByPedido(pedidoId) {
    await query('DELETE FROM contas_receber WHERE pedido_id = $1', [pedidoId]);
    return true;
  }
};
