import { query } from '../config/database.js';

export const formaPagamentoRepository = {
  async findAll() {
    const result = await query(
      'SELECT * FROM formas_pagamento WHERE ativo = true ORDER BY nome'
    );
    return result.rows;
  },

  async findById(id) {
    const result = await query(
      'SELECT * FROM formas_pagamento WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async create(data) {
    const { codigo, nome, descricao } = data;
    const result = await query(
      `INSERT INTO formas_pagamento (codigo, nome, descricao) 
       VALUES ($1, $2, $3) RETURNING *`,
      [codigo, nome, descricao]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const { nome, descricao, ativo } = data;
    const result = await query(
      `UPDATE formas_pagamento 
       SET nome = $1, descricao = $2, ativo = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [nome, descricao, ativo, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await query('DELETE FROM formas_pagamento WHERE id = $1', [id]);
    return true;
  }
};
