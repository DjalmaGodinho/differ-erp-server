import { formaPagamentoRepository } from '../repositories/index.js';

export const formaPagamentoService = {
  async listar() {
    return await formaPagamentoRepository.findAll();
  },

  async obter(id) {
    const forma = await formaPagamentoRepository.findById(id);
    if (!forma) throw new Error('Forma de pagamento não encontrada');
    return forma;
  },

  async criar(data) {
    return await formaPagamentoRepository.create(data);
  },

  async atualizar(id, data) {
    return await formaPagamentoRepository.update(id, data);
  },

  async excluir(id) {
    return await formaPagamentoRepository.delete(id);
  }
};
