import { financeiroRepository } from '../repositories/index.js';

const financeiroService = {
  async listar({ page, pageSize, search, tipoId, statusId, dataInicio, dataFim }) {
    return await financeiroRepository.findAll({ page, pageSize, search, tipoId, statusId, dataInicio, dataFim });
  },

  async listarPagar({ page, pageSize, search, statusId, dataInicio, dataFim }) {
    return await financeiroRepository.findAll({ page, pageSize, search, tipoId: 1, statusId, dataInicio, dataFim });
  },

  async listarReceber({ page, pageSize, search, statusId, dataInicio, dataFim }) {
    return await financeiroRepository.findAll({ page, pageSize, search, tipoId: 2, statusId, dataInicio, dataFim });
  },

  async obter(id) {
    const conta = await financeiroRepository.findById(id);
    if (!conta) throw new Error('Conta não encontrada');
    return conta;
  },

  async criar(data) {
    if (!data.tipo_id || !data.valor || !data.data_vencimento) {
      throw new Error('Tipo, valor e data de vencimento são obrigatórios');
    }

    data.documento = await financeiroRepository.generateDocumento(data.tipo_id);
    data.status_id = data.status_id || 1;

    return await financeiroRepository.create(data);
  },

  async atualizar(id, data) {
    const conta = await financeiroRepository.findById(id);
    if (!conta) throw new Error('Conta não encontrada');

    return await financeiroRepository.update(id, data);
  },

  async baixar(id, { data_pagamento, valor_pago }) {
    const conta = await financeiroRepository.findById(id);
    if (!conta) throw new Error('Conta não encontrada');
    if (conta.status_id === 2) throw new Error('Conta já está paga');

    return await financeiroRepository.baixar(id, { data_pagamento, valor_pago });
  },

  async resumo() {
    return await financeiroRepository.getResumo();
  }
};

export default financeiroService;
