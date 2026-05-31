import { servicoRepository } from '../repositories/index.js';

const servicoService = {
  async listar({ page, pageSize, search, categoriaId, ativo }) {
    return await servicoRepository.findAll({ page, pageSize, search, categoriaId, ativo });
  },

  async obter(id) {
    const servico = await servicoRepository.findById(id);
    if (!servico) throw new Error('Serviço não encontrado');
    return servico;
  },

  async criar(data) {
    if (!data.nome) {
      throw new Error('Nome é obrigatório');
    }

    data.codigo = await servicoRepository.generateCodigo();
    data.ativo = data.ativo !== false;

    return await servicoRepository.create(data);
  },

  async atualizar(id, data) {
    const servico = await servicoRepository.findById(id);
    if (!servico) throw new Error('Serviço não encontrado');

    return await servicoRepository.update(id, data);
  },

  async excluir(id) {
    const servico = await servicoRepository.findById(id);
    if (!servico) throw new Error('Serviço não encontrado');
    await servicoRepository.delete(id);
    return true;
  }
};

export default servicoService;
