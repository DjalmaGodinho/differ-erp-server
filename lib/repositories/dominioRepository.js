import { query } from '../config/database.js';

const dominioRepository = {
  async listar(tabela) {
    const tabelasPermitidas = {
      'tipos-pessoa': 'tipos_pessoa',
      'status-pessoa': 'status_pessoa',
      'categorias-fornecedor': 'categorias_fornecedor',
      'unidades-medida': 'unidades_medida',
      'tipos-material': 'tipos_material',
      'status-material': 'status_material',
      'tipos-maquina': 'tipos_maquina',
      'status-maquina': 'status_maquina',
      'categorias-servico': 'categorias_servico',
      'tipos-pedido': 'tipos_pedido',
      'status-pedido': 'status_pedido',
      'prioridades-pedido': 'prioridades_pedido',
      'status-op': 'status_op',
      'tipos-conta': 'tipos_conta',
      'status-conta': 'status_conta',
      'tipos-pagamento': 'tipos_pagamento',
      'formas-pagamento': 'formas_pagamento',
      'condicoes-pagamento': 'condicoes_pagamento',
      'tipos-movimentacao': 'tipos_movimentacao',
      'motivos-saida': 'motivos_saida_estoque'
    };

    const tableName = tabelasPermitidas[tabela];
    if (!tableName) {
      throw new Error(`Tabela '${tabela}' não encontrada`);
    }

    const result = await query(`SELECT * FROM ${tableName} ORDER BY nome`);
    return result.rows;
  }
};

export default dominioRepository;
