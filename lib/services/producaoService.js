import { producaoRepository } from '../repositories/index.js';

const producaoService = {
  async listar({ page, pageSize, search, statusId, clienteId, maquinaId }) {
    return await producaoRepository.findAll({ page, pageSize, search, statusId, clienteId, maquinaId });
  },

  async obter(id) {
    const op = await producaoRepository.findById(id);
    if (!op) throw new Error('Ordem de produção não encontrada');
    return op;
  },

  async criar(data) {
    if (!data.cliente_id || !data.produto_descricao) {
      throw new Error('Cliente e descrição do produto são obrigatórios');
    }

    data.codigo = await producaoRepository.generateCodigo();
    data.status_id = data.status_id || 1;

    const materiais = data.materiais || [];

    return await producaoRepository.create(data, materiais);
  },

  async atualizar(id, data) {
    const op = await producaoRepository.findById(id);
    if (!op) throw new Error('Ordem de produção não encontrada');

    const materiais = data.materiais || [];

    return await producaoRepository.update(id, data, materiais);
  },

  async atualizarStatus(id, statusId) {
    const op = await producaoRepository.findById(id);
    if (!op) throw new Error('Ordem de produção não encontrada');
    return await producaoRepository.updateStatus(id, statusId);
  },

  async cancelar(id) {
    const op = await producaoRepository.findById(id);
    if (!op) throw new Error('Ordem de produção não encontrada');
    return await producaoRepository.cancelar(id);
  }
};

export default producaoService;
