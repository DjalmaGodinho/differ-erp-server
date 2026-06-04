import { condicaoPagamentoRepository } from '../repositories/index.js';

export const condicaoPagamentoService = {
  async listar() {
    return await condicaoPagamentoRepository.findAll();
  },

  async obter(id) {
    const condicao = await condicaoPagamentoRepository.findById(id);
    if (!condicao) throw new Error('Condição de pagamento não encontrada');
    return condicao;
  },

  async criar(data) {
    return await condicaoPagamentoRepository.create(data);
  },

  async atualizar(id, data) {
    return await condicaoPagamentoRepository.update(id, data);
  },

  async excluir(id) {
    return await condicaoPagamentoRepository.delete(id);
  }
};
