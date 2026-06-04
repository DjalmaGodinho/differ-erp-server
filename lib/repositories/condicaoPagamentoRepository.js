import { query } from '../config/database.js';

export const condicaoPagamentoRepository = {
  async findAll() {
    const result = await query(
      'SELECT * FROM condicoes_pagamento WHERE ativo = true ORDER BY parcelas, dias_entre_parcelas'
    );
    return result.rows;
  },

  async findById(id) {
    const result = await query(
      'SELECT * FROM condicoes_pagamento WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async create(data) {
    const { codigo, nome, parcelas, dias_entre_parcelas, entrada_percentual } = data;
    const result = await query(
      `INSERT INTO condicoes_pagamento (codigo, nome, parcelas, dias_entre_parcelas, entrada_percentual) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [codigo, nome, parcelas, dias_entre_parcelas, entrada_percentual]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const { nome, parcelas, dias_entre_parcelas, entrada_percentual, ativo } = data;
    const result = await query(
      `UPDATE condicoes_pagamento 
       SET nome = $1, parcelas = $2, dias_entre_parcelas = $3, entrada_percentual = $4, ativo = $5, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [nome, parcelas, dias_entre_parcelas, entrada_percentual, ativo, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await query('DELETE FROM condicoes_pagamento WHERE id = $1', [id]);
    return true;
  }
};
