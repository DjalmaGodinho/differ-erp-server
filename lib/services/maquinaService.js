import { maquinaRepository } from '../repositories/index.js';

const maquinaService = {
  async listar({ page, pageSize, search, tipoId, statusId }) {
    return await maquinaRepository.findAll({ page, pageSize, search, tipoId, statusId });
  },

  async obter(id) {
    const maquina = await maquinaRepository.findById(id);
    if (!maquina) throw new Error('Máquina não encontrada');
    return maquina;
  },

  async criar(data) {
    if (!data.nome) {
      throw new Error('Nome é obrigatório');
    }
    if (!data.tipo_id) {
      throw new Error('Tipo de máquina é obrigatório');
    }

    data.codigo = await maquinaRepository.generateCodigo();
    data.status_id = data.status_id || 1;

    return await maquinaRepository.create(data);
  },

  async atualizar(id, data) {
    const maquina = await maquinaRepository.findById(id);
    if (!maquina) throw new Error('Máquina não encontrada');

    return await maquinaRepository.update(id, data);
  },

  async excluir(id) {
    const maquina = await maquinaRepository.findById(id);
    if (!maquina) throw new Error('Máquina não encontrada');
    await maquinaRepository.delete(id);
    return true;
  }
};

export default maquinaService;
